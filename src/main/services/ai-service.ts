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
        return "https://generativelanguage.googleapis.com/v1";
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
          // Test with a simple request
          await client.get(
            `/models?key=${this.providers.get(providerId)?.apiKey}`
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
          await client.get(`/models?key=${apiKey}`);
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
    systemPrompt?: SystemPrompt,
    providerId?: string
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
      const context = this.buildMessageContext(message, systemPrompt);

      // Get the default model for this provider
      const model =
        provider.models.find((m) => m.isDefault) || provider.models[0];

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
    systemPrompt?: SystemPrompt
  ): string {
    let context = "";

    // Add system prompt
    if (systemPrompt) {
      context += this.processSystemPrompt(systemPrompt, message.context);
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
    if (
      message.context?.threadHistory &&
      message.context.threadHistory.length > 0
    ) {
      context += "\n\nConversation History:\n";
      message.context.threadHistory.slice(-5).forEach((msg, index) => {
        context += `${index + 1}. ${msg.text}\n`;
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
      `/models/${model.id}:generateContent?key=${apiKey}`,
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
}
