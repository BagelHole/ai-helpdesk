import axios, { AxiosInstance } from "axios";
import { Logger } from "./logger-service";
import {
  AIProvider,
  AIResponse,
  AIModel,
  SlackMessage,
  SystemPrompt,
  MessageContext,
} from "@shared/types";

interface AIProviderConfig {
  name: string;
  type: "openai" | "anthropic" | "google" | "ollama" | "custom";
  apiKey?: string;
  baseUrl?: string;
  models: AIModel[];
}

export class AIService {
  private providers: Map<string, AIProviderConfig> = new Map();
  private clients: Map<string, AxiosInstance> = new Map();
  private logger: Logger;
  private defaultProvider: string | null = null;
  private customSystemPrompts: any[] = [];
  private activeSystemPromptId: string | null = null;

  constructor() {
    this.logger = new Logger();
  }

  public async initialize(providers: AIProvider[]): Promise<void> {
    this.logger.info(
      "Initializing AI service with providers:",
      providers.map((p) => p.name)
    );

    for (const provider of providers) {
      if (provider.isEnabled) {
        await this.addProvider(provider);
      }
    }

    // Set the first enabled provider as default if none is set
    if (!this.defaultProvider && providers.length > 0) {
      const firstEnabled = providers.find((p) => p.isEnabled);
      if (firstEnabled) {
        this.defaultProvider = firstEnabled.id;
      }
    }
  }

  public async addProvider(provider: AIProvider): Promise<void> {
    try {
      const config: AIProviderConfig = {
        name: provider.name,
        type: provider.type,
        apiKey: provider.apiKey,
        baseUrl: provider.baseUrl,
        models: provider.models,
      };

      this.providers.set(provider.id, config);

      // Create HTTP client for this provider
      if (provider.type !== "ollama" && provider.apiKey) {
        const client = this.createHttpClient(provider);
        this.clients.set(provider.id, client);

        // Test the connection
        await this.testProviderConnection(provider.id);
      } else if (provider.type === "ollama") {
        // For Ollama, create a simple client
        const client = axios.create({
          baseURL: provider.baseUrl || "http://localhost:11434",
          timeout: 60000, // Ollama can be slow
        });
        this.clients.set(provider.id, client);
      }

      this.logger.info(`AI provider ${provider.name} added successfully`);
    } catch (error) {
      this.logger.error(`Failed to add AI provider ${provider.name}:`, error);
      throw error;
    }
  }

  private createHttpClient(provider: AIProvider): AxiosInstance {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Set authorization header based on provider type
    switch (provider.type) {
      case "openai":
        headers["Authorization"] = `Bearer ${provider.apiKey}`;
        break;
      case "anthropic":
        headers["x-api-key"] = provider.apiKey!;
        headers["anthropic-version"] = "2023-06-01";
        break;
      case "google":
        // Google uses API key in URL parameters
        break;
    }

    const baseURL = provider.baseUrl || this.getDefaultBaseUrl(provider.type);

    return axios.create({
      baseURL,
      headers,
      timeout: 30000,
    });
  }

  private getDefaultBaseUrl(type: AIProvider["type"]): string {
    switch (type) {
      case "openai":
        return "https://api.openai.com/v1";
      case "anthropic":
        return "https://api.anthropic.com/v1";
      case "google":
        return "https://generativelanguage.googleapis.com";
      case "ollama":
        return "http://localhost:11434";
      default:
        throw new Error(`Unknown AI provider type: ${type}`);
    }
  }

  public async testProviderConnection(providerId: string): Promise<boolean> {
    const provider = this.providers.get(providerId);
    const client = this.clients.get(providerId);

    if (!provider || !client) {
      throw new Error(`Provider ${providerId} not found`);
    }

    try {
      switch (provider.type) {
        case "openai":
          await client.get("/models");
          break;
        case "anthropic":
          // Anthropic doesn't have a simple health check, so we'll just verify the client is created
          break;
        case "google":
          // Test with a simple request to list models
          await client.get(
            `/v1beta/models?key=${this.providers.get(providerId)?.apiKey}`
          );
          break;
        case "ollama":
          await client.get("/api/tags");
          break;
      }

      this.logger.debug(`Provider ${provider.name} connection test successful`);
      return true;
    } catch (error) {
      this.logger.error(
        `Provider ${provider.name} connection test failed:`,
        error
      );
      throw error;
    }
  }

  // Test provider connection with API key directly (for settings testing)
  public async testProviderWithApiKey(
    providerType: "openai" | "anthropic" | "google" | "ollama",
    apiKey: string
  ): Promise<boolean> {
    try {
      const baseURL = this.getDefaultBaseUrl(providerType);
      const client = this.createHttpClient({
        id: `test-${providerType}`,
        name: `test-${providerType}`,
        type: providerType,
        apiKey,
        baseUrl: baseURL,
        models: [],
        isEnabled: true,
        rateLimits: {
          requestsPerMinute: 60,
          requestsPerDay: 1000,
          tokensPerMinute: 40000,
          tokensPerDay: 100000,
        },
      });

      switch (providerType) {
        case "openai":
          await client.get("/models");
          break;
        case "anthropic":
          // Anthropic doesn't have a simple health check endpoint
          // Just verify we can create a client with the API key
          break;
        case "google":
          await client.get(`/v1beta/models?key=${apiKey}`);
          break;
        case "ollama":
          await client.get("/api/tags");
          break;
      }

      this.logger.debug(`Provider ${providerType} connection test successful`);
      return true;
    } catch (error) {
      this.logger.error(
        `Provider ${providerType} connection test failed:`,
        error
      );
      return false;
    }
  }

  public async generateResponse(
    message: SlackMessage,
    threadMessages?: SlackMessage[],
    documents?: any[],
    userDevices?: any[],
    systemPrompt?: SystemPrompt,
    providerId?: string,
    modelId?: string
  ): Promise<AIResponse> {
    const startTime = Date.now();
    const providerToUse = providerId || this.defaultProvider;

    if (!providerToUse) {
      throw new Error("No AI provider available");
    }

    const provider = this.providers.get(providerToUse);
    const client = this.clients.get(providerToUse);

    if (!provider || !client) {
      throw new Error(`Provider ${providerToUse} not found or not initialized`);
    }

    try {
      this.logger.debug("Generating AI response:", {
        provider: provider.name,
        messageId: message.id,
        hasContext: !!message.context,
      });

      // Build the context for the AI
      const context = this.buildMessageContext(
        message,
        threadMessages,
        documents,
        userDevices,
        systemPrompt
      );

      // Get the specified model or default model for this provider
      let model: AIModel;
      if (modelId) {
        model = provider.models.find((m) => m.id === modelId) || 
                provider.models.find((m) => m.isDefault) || 
                provider.models[0];
      } else {
        model = provider.models.find((m) => m.isDefault) || provider.models[0];
      }

      if (!model) {
        throw new Error(`No models available for provider ${provider.name}`);
      }

      // Generate response based on provider type
      let response: string;
      let tokensUsed: number;
      let cost: number;

      switch (provider.type) {
        case "openai":
          ({ response, tokensUsed, cost } = await this.generateOpenAIResponse(
            client,
            model,
            context
          ));
          break;
        case "anthropic":
          ({ response, tokensUsed, cost } =
            await this.generateAnthropicResponse(client, model, context));
          break;
        case "google":
          ({ response, tokensUsed, cost } = await this.generateGoogleResponse(
            client,
            model,
            context,
            provider.apiKey!
          ));
          break;
        case "ollama":
          ({ response, tokensUsed, cost } = await this.generateOllamaResponse(
            client,
            model,
            context
          ));
          break;
        default:
          throw new Error(`Unsupported provider type: ${provider.type}`);
      }

      const responseTime = Date.now() - startTime;
      const confidence = this.calculateConfidence(response, message);

      const aiResponse: AIResponse = {
        id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        messageId: message.id,
        provider: {
          id: providerToUse,
          name: provider.name,
          type: provider.type,
        } as AIProvider,
        model: model.name,
        response,
        confidence,
        tokensUsed,
        cost,
        responseTime,
        timestamp: new Date().toISOString(),
        isEdited: false,
        status: "generated",
      };

      this.logger.debug("AI response generated successfully:", {
        responseId: aiResponse.id,
        responseTime,
        tokensUsed,
        confidence,
      });

      return aiResponse;
    } catch (error) {
      this.logger.error("Failed to generate AI response:", error);
      throw error;
    }
  }

  private buildMessageContext(
    message: SlackMessage,
    threadMessages?: SlackMessage[],
    documents?: any[],
    userDevices?: any[],
    systemPrompt?: SystemPrompt
  ): string {
    let context = "";

    // Add system prompt
    if (systemPrompt) {
      context += this.processSystemPrompt(systemPrompt, message.context);
    } else if (
      this.activeSystemPromptId &&
      this.customSystemPrompts.length > 0
    ) {
      // Use active custom system prompt
      const activePrompt = this.customSystemPrompts.find(
        (p) => p.id === this.activeSystemPromptId
      );
      if (activePrompt) {
        context += activePrompt.content;
      } else {
        context += this.getDefaultSystemPrompt();
      }
    } else {
      context += this.getDefaultSystemPrompt();
    }

    context += "\n\n";

    // Add user context if available
    if (message.context?.userInfo) {
      const user = message.context.userInfo;
      context += `User Information:\n`;
      context += `- Name: ${user.name}\n`;
      context += `- Email: ${user.email}\n`;
      if (user.title) context += `- Title: ${user.title}\n`;
      if (user.department) context += `- Department: ${user.department}\n`;
    }

    // Add device information if available
    if (message.context?.deviceInfo) {
      const device = message.context.deviceInfo;
      context += `\nDevice Information:\n`;
      context += `- Device: ${device.deviceName}\n`;
      context += `- OS: ${device.operatingSystem} ${device.osVersion}\n`;
      context += `- Model: ${device.model}\n`;
      if (device.applications.length > 0) {
        context += `- Installed Software: ${device.applications
          .slice(0, 10)
          .map((app) => app.name)
          .join(", ")}\n`;
      }
    }

    // Add thread history if available
    if (threadMessages && threadMessages.length > 0) {
      context += "\n\nConversation History:\n";
      threadMessages
        .sort((a, b) => parseFloat(a.timestamp) - parseFloat(b.timestamp))
        .forEach((msg, index) => {
          context += `${index + 1}. [${msg.user}]: ${msg.text}\n`;
        });
    } else if (
      message.context?.threadHistory &&
      message.context.threadHistory.length > 0
    ) {
      context += "\n\nConversation History:\n";
      message.context.threadHistory.slice(-5).forEach((msg, index) => {
        context += `${index + 1}. ${msg.text}\n`;
      });
    }

    // Add available documentation
    if (documents && documents.length > 0) {
      context += "\n\nAvailable IT Documentation:\n";
      documents.forEach((doc, index) => {
        context += `${index + 1}. ${doc.name}`;
        if (doc.content) {
          context += `:\n${doc.content.substring(0, 1000)}${doc.content.length > 1000 ? "..." : ""}\n\n`;
        } else {
          context += ` (${doc.type} file)\n`;
        }
      });
    }

    // Add user device information
    if (userDevices && userDevices.length > 0) {
      context += "\n\nUser Device Information:\n";
      userDevices.forEach((device, index) => {
        context += `${index + 1}. ${device.assignedTo?.name || "Unknown User"}'s ${device.deviceName}:\n`;
        context += `   - Model: ${device.model}\n`;
        context += `   - OS: ${device.operatingSystem} ${device.osVersion}\n`;
        context += `   - Status: ${device.status}\n`;
        if (device.applications && device.applications.length > 0) {
          context += `   - Key Software: ${device.applications
            .slice(0, 10)
            .map((app: any) => app.name)
            .join(", ")}\n`;
        }
        context += "\n";
      });
    }

    // Add the current message
    context += `\n\nCurrent Message: ${message.text}\n\n`;
    context += "Please provide a helpful response to this IT support request.";

    return context;
  }

  private processSystemPrompt(
    systemPrompt: SystemPrompt,
    context?: MessageContext
  ): string {
    let processedPrompt = systemPrompt.content;

    // Replace variables in the system prompt
    if (systemPrompt.variables && context) {
      for (const variable of systemPrompt.variables) {
        const placeholder = `{{${variable.name}}}`;
        let value = variable.defaultValue || "";

        // Extract actual values from context based on variable name
        switch (variable.name) {
          case "user_name":
            value = context.userInfo?.name || value;
            break;
          case "user_email":
            value = context.userInfo?.email || value;
            break;
          case "user_department":
            value = context.userInfo?.department || value;
            break;
          case "device_os":
            value = context.deviceInfo?.operatingSystem || value;
            break;
          case "company_name":
            value = "Your Company"; // This could come from settings
            break;
        }

        processedPrompt = processedPrompt.replace(
          new RegExp(placeholder, "g"),
          value
        );
      }
    }

    return processedPrompt;
  }

  private getDefaultSystemPrompt(): string {
    return `You are an AI assistant helping with IT support requests. You provide helpful, accurate, and professional responses to technical questions. Always be concise but thorough, and escalate complex issues when appropriate.

Guidelines:
- Be friendly and professional
- Provide step-by-step instructions when helpful
- Ask for clarification if the request is unclear
- Escalate hardware issues or complex problems
- Include relevant links or resources when possible`;
  }

  private async generateOpenAIResponse(
    client: AxiosInstance,
    model: AIModel,
    context: string
  ): Promise<{ response: string; tokensUsed: number; cost: number }> {
    const response = await client.post("/chat/completions", {
      model: model.id,
      messages: [{ role: "user", content: context }],
      max_tokens: Math.min(model.maxTokens, 1000),
      temperature: 0.7,
    });

    const responseText = response.data.choices[0]?.message?.content || "";
    const tokensUsed = response.data.usage?.total_tokens || 0;
    const cost = (tokensUsed / 1000) * model.costPer1kTokens;

    return { response: responseText, tokensUsed, cost };
  }

  private async generateAnthropicResponse(
    client: AxiosInstance,
    model: AIModel,
    context: string
  ): Promise<{ response: string; tokensUsed: number; cost: number }> {
    const response = await client.post("/messages", {
      model: model.id,
      max_tokens: Math.min(model.maxTokens, 1000),
      messages: [{ role: "user", content: context }],
    });

    const responseText = response.data.content[0]?.text || "";
    const tokensUsed =
      response.data.usage?.input_tokens + response.data.usage?.output_tokens ||
      0;
    const cost = (tokensUsed / 1000) * model.costPer1kTokens;

    return { response: responseText, tokensUsed, cost };
  }

  private async generateGoogleResponse(
    client: AxiosInstance,
    model: AIModel,
    context: string,
    apiKey: string
  ): Promise<{ response: string; tokensUsed: number; cost: number }> {
    const response = await client.post(
      `/v1beta/models/${model.id}:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            parts: [{ text: context }],
          },
        ],
        generationConfig: {
          maxOutputTokens: Math.min(model.maxTokens, 1000),
          temperature: 0.7,
        },
      }
    );

    const responseText =
      response.data.candidates[0]?.content?.parts[0]?.text || "";
    const tokensUsed = response.data.usageMetadata?.totalTokenCount || 0;
    const cost = (tokensUsed / 1000) * model.costPer1kTokens;

    return { response: responseText, tokensUsed, cost };
  }

  private async generateOllamaResponse(
    client: AxiosInstance,
    model: AIModel,
    context: string
  ): Promise<{ response: string; tokensUsed: number; cost: number }> {
    const response = await client.post("/api/generate", {
      model: model.id,
      prompt: context,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: Math.min(model.maxTokens, 1000),
      },
    });

    const responseText = response.data.response || "";
    const tokensUsed = response.data.eval_count || 0;
    const cost = 0; // Ollama is free/local

    return { response: responseText, tokensUsed, cost };
  }

  private calculateConfidence(response: string, message: SlackMessage): number {
    // Simple confidence calculation based on response characteristics
    let confidence = 0.5; // Base confidence

    // Longer responses generally indicate more detailed answers
    if (response.length > 100) confidence += 0.1;
    if (response.length > 300) confidence += 0.1;

    // Check for structured responses (steps, lists, etc.)
    if (
      response.includes("1.") ||
      response.includes("-") ||
      response.includes("•")
    ) {
      confidence += 0.15;
    }

    // Check for specific keywords that indicate helpful responses
    const helpfulKeywords = [
      "step",
      "follow",
      "try",
      "check",
      "verify",
      "ensure",
      "click",
      "navigate",
    ];
    const keywordCount = helpfulKeywords.filter((keyword) =>
      response.toLowerCase().includes(keyword)
    ).length;
    confidence += Math.min(keywordCount * 0.05, 0.2);

    // Penalize very short responses
    if (response.length < 50) confidence -= 0.2;

    // Ensure confidence is between 0 and 1
    return Math.max(0, Math.min(1, confidence));
  }

  public getProviders(): AIProvider[] {
    return Array.from(this.providers.entries()).map(([id, config]) => ({
      id,
      name: config.name,
      type: config.type,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      models: config.models,
      isEnabled: true,
      rateLimits: {
        requestsPerMinute: 60,
        requestsPerDay: 1000,
        tokensPerMinute: 10000,
        tokensPerDay: 100000,
      },
    }));
  }

  public setDefaultProvider(providerId: string): void {
    if (this.providers.has(providerId)) {
      this.defaultProvider = providerId;
      this.logger.info(`Default AI provider set to: ${providerId}`);
    } else {
      throw new Error(`Provider ${providerId} not found`);
    }
  }

  public updateCustomSystemPrompts(
    prompts: any[],
    activePromptId: string
  ): void {
    this.customSystemPrompts = prompts;
    this.activeSystemPromptId = activePromptId;
    this.logger.debug(
      `Updated custom system prompts: ${prompts.length} prompts, active: ${activePromptId}`
    );
  }

  public getDefaultProvider(): string | null {
    return this.defaultProvider;
  }

  public removeProvider(providerId: string): void {
    this.providers.delete(providerId);
    this.clients.delete(providerId);

    if (this.defaultProvider === providerId) {
      // Set a new default provider if available
      const remainingProviders = Array.from(this.providers.keys());
      this.defaultProvider =
        remainingProviders.length > 0 ? remainingProviders[0] : null;
    }

    this.logger.info(`AI provider ${providerId} removed`);
  }

  public async testProvider(providerId: string): Promise<boolean> {
    try {
      return await this.testProviderConnection(providerId);
    } catch (error) {
      this.logger.error(`Provider test failed for ${providerId}:`, error);
      return false;
    }
  }

  public isProviderAvailable(providerId: string): boolean {
    return this.providers.has(providerId) && this.clients.has(providerId);
  }

  // Get available models from the provider API
  public async getAvailableModels(providerId: string): Promise<AIModel[]> {
    const provider = this.providers.get(providerId);
    const client = this.clients.get(providerId);

    if (!provider || !client) {
      throw new Error(`Provider ${providerId} not found or not initialized`);
    }

    try {
      switch (provider.type) {
        case "openai":
          return await this.getOpenAIModels(client);
        case "anthropic":
          return await this.getAnthropicModels();
        case "google":
          return await this.getGoogleModels(client, provider.apiKey!);
        case "ollama":
          return await this.getOllamaModels(client);
        default:
          this.logger.warn(`Model discovery not supported for ${provider.type}, using defaults`);
          return provider.models;
      }
    } catch (error) {
      this.logger.error(`Failed to fetch models for ${provider.name}:`, error);
      // Return configured models as fallback
      return provider.models;
    }
  }

  private async getOpenAIModels(client: AxiosInstance): Promise<AIModel[]> {
    const response = await client.get("/models");
    const models = response.data.data || [];
    
    // Map OpenAI models to our AIModel interface
    return models
      .filter((model: any) => 
        model.id.includes("gpt") && 
        !model.id.includes("instruct") && 
        !model.id.includes("edit")
      )
      .map((model: any) => ({
        id: model.id,
        name: this.formatModelName(model.id),
        contextWindow: this.getContextWindow(model.id),
        maxTokens: this.getMaxTokens(model.id),
        costPer1kTokens: this.getModelCost(model.id),
        isDefault: model.id === "gpt-4o" || model.id === "gpt-4-turbo",
      }))
      .sort((a: AIModel, b: AIModel) => {
        // Sort with newest/best models first
        const order = ["gpt-5", "gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"];
        const aIndex = order.findIndex(m => a.id.includes(m));
        const bIndex = order.findIndex(m => b.id.includes(m));
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.name.localeCompare(b.name);
      });
  }

  private async getAnthropicModels(): Promise<AIModel[]> {
    // Anthropic doesn't have a public models endpoint, so we use our predefined list
    // but we can validate which ones are available
    const knownModels = [
      {
        id: "claude-4-sonnet-20241220",
        name: "Claude 4 Sonnet",
        contextWindow: 200000,
        maxTokens: 8192,
        costPer1kTokens: 0.015,
        isDefault: true,
      },
      {
        id: "claude-3-5-sonnet-20241022",
        name: "Claude 3.5 Sonnet",
        contextWindow: 200000,
        maxTokens: 8192,
        costPer1kTokens: 0.003,
      },
      {
        id: "claude-3-5-haiku-20241022",
        name: "Claude 3.5 Haiku",
        contextWindow: 200000,
        maxTokens: 8192,
        costPer1kTokens: 0.00025,
      },
      {
        id: "claude-3-opus-20240229",
        name: "Claude 3 Opus",
        contextWindow: 200000,
        maxTokens: 4096,
        costPer1kTokens: 0.015,
      },
    ];
    
    return knownModels;
  }

  private async getGoogleModels(client: AxiosInstance, apiKey: string): Promise<AIModel[]> {
    try {
      const response = await client.get(`/v1beta/models?key=${apiKey}`);
      const models = response.data.models || [];
      
      return models
        .filter((model: any) => 
          model.name.includes("gemini") && 
          model.supportedGenerationMethods?.includes("generateContent")
        )
        .map((model: any) => {
          const modelId = model.name.split("/").pop(); // Extract model ID from full name
          return {
            id: modelId,
            name: this.formatGoogleModelName(modelId),
            contextWindow: model.inputTokenLimit || 32000,
            maxTokens: model.outputTokenLimit || 8192,
            costPer1kTokens: this.getGoogleModelCost(modelId),
            isDefault: modelId.includes("2.5-pro") || modelId.includes("1.5-pro"),
          };
        })
        .sort((a: AIModel, b: AIModel) => {
          // Sort with newest models first
          const order = ["2.5", "1.5", "1.0"];
          const aVersion = order.find(v => a.id.includes(v));
          const bVersion = order.find(v => b.id.includes(v));
          if (aVersion && bVersion) return order.indexOf(aVersion) - order.indexOf(bVersion);
          return a.name.localeCompare(b.name);
        });
    } catch (error) {
      this.logger.warn("Failed to fetch Google models, using defaults:", error);
      // Return known Google models as fallback
      return [
        {
          id: "gemini-2.5-pro",
          name: "Gemini 2.5 Pro",
          contextWindow: 2000000,
          maxTokens: 8192,
          costPer1kTokens: 0.002,
          isDefault: true,
        },
        {
          id: "gemini-1.5-pro",
          name: "Gemini 1.5 Pro",
          contextWindow: 2000000,
          maxTokens: 8192,
          costPer1kTokens: 0.00125,
        },
        {
          id: "gemini-1.5-flash",
          name: "Gemini 1.5 Flash",
          contextWindow: 1000000,
          maxTokens: 8192,
          costPer1kTokens: 0.000075,
        },
      ];
    }
  }

  private async getOllamaModels(client: AxiosInstance): Promise<AIModel[]> {
    try {
      const response = await client.get("/api/tags");
      const models = response.data.models || [];
      
      return models.map((model: any) => ({
        id: model.name,
        name: this.formatOllamaModelName(model.name),
        contextWindow: 8192, // Default for most Ollama models
        maxTokens: 4096,
        costPer1kTokens: 0, // Ollama is free/local
        isDefault: model.name.includes("llama3.1:8b"),
      }));
    } catch (error) {
      this.logger.warn("Failed to fetch Ollama models:", error);
      return [];
    }
  }

  private formatModelName(modelId: string): string {
    // Convert model IDs to user-friendly names
    const nameMap: Record<string, string> = {
      "gpt-5": "GPT-5",
      "gpt-4o": "GPT-4o",
      "gpt-4o-mini": "GPT-4o Mini",
      "gpt-4-turbo": "GPT-4 Turbo",
      "gpt-4-turbo-preview": "GPT-4 Turbo Preview",
      "gpt-3.5-turbo": "GPT-3.5 Turbo",
    };
    
    return nameMap[modelId] || modelId.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  }

  private formatGoogleModelName(modelId: string): string {
    return modelId
      .replace("gemini-", "Gemini ")
      .replace("-pro", " Pro")
      .replace("-flash", " Flash")
      .replace(/(\d+)\.(\d+)/, "$1.$2");
  }

  private formatOllamaModelName(modelId: string): string {
    return modelId
      .replace(":", " ")
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace("Llama", "Llama")
      .replace("Codellama", "Code Llama");
  }

  private getContextWindow(modelId: string): number {
    const contextMap: Record<string, number> = {
      "gpt-5": 128000,
      "gpt-4o": 128000,
      "gpt-4o-mini": 128000,
      "gpt-4-turbo": 128000,
      "gpt-3.5-turbo": 16385,
    };
    
    return contextMap[modelId] || 8192;
  }

  private getMaxTokens(modelId: string): number {
    const tokenMap: Record<string, number> = {
      "gpt-5": 4096,
      "gpt-4o": 4096,
      "gpt-4o-mini": 16384,
      "gpt-4-turbo": 4096,
      "gpt-3.5-turbo": 4096,
    };
    
    return tokenMap[modelId] || 4096;
  }

  private getModelCost(modelId: string): number {
    const costMap: Record<string, number> = {
      "gpt-5": 0.06,
      "gpt-4o": 0.03,
      "gpt-4o-mini": 0.00015,
      "gpt-4-turbo": 0.03,
      "gpt-3.5-turbo": 0.001,
    };
    
    return costMap[modelId] || 0.002;
  }

  private getGoogleModelCost(modelId: string): number {
    const costMap: Record<string, number> = {
      "gemini-2.5-pro": 0.002,
      "gemini-1.5-pro": 0.00125,
      "gemini-1.5-flash": 0.000075,
      "gemini-1.0-pro": 0.0005,
    };
    
    return costMap[modelId] || 0.001;
  }
}
