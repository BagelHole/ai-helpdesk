import { AIModel } from "@shared/types";

// Latest OpenAI Models (GPT-5 and others)
export const OPENAI_MODELS: AIModel[] = [
  {
    id: "gpt-5",
    name: "GPT-5",
    contextWindow: 128000,
    maxTokens: 4096,
    isDefault: true,
    supportsVision: true,
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    contextWindow: 128000,
    maxTokens: 4096,
    supportsVision: true,
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    contextWindow: 128000,
    maxTokens: 16384,
    supportsVision: true,
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    contextWindow: 128000,
    maxTokens: 4096,
    supportsVision: true,
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    contextWindow: 16385,
    maxTokens: 4096,
    supportsVision: false,
  },
];

// Latest Anthropic Models (Claude 4 Sonnet and others)
export const ANTHROPIC_MODELS: AIModel[] = [
  {
    id: "claude-4-sonnet-20241220",
    name: "Claude 4 Sonnet",
    contextWindow: 200000,
    maxTokens: 8192,
    isDefault: true,
    supportsVision: true,
  },
  {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    contextWindow: 200000,
    maxTokens: 8192,
    supportsVision: true,
  },
  {
    id: "claude-3-5-haiku-20241022",
    name: "Claude 3.5 Haiku",
    contextWindow: 200000,
    maxTokens: 8192,
    supportsVision: true,
  },
  {
    id: "claude-3-opus-20240229",
    name: "Claude 3 Opus",
    contextWindow: 200000,
    maxTokens: 4096,
    supportsVision: true,
  },
];

// Latest Google Models (Gemini 2.5 Pro and others)
export const GOOGLE_MODELS: AIModel[] = [
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    contextWindow: 2000000,
    maxTokens: 8192,
    isDefault: true,
    supportsVision: true,
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    contextWindow: 2000000,
    maxTokens: 8192,
    supportsVision: true,
  },
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    contextWindow: 1000000,
    maxTokens: 8192,
    supportsVision: true,
  },
  {
    id: "gemini-1.0-pro",
    name: "Gemini 1.0 Pro",
    contextWindow: 32760,
    maxTokens: 2048,
    supportsVision: false,
  },
];

// Ollama models (these would be discovered dynamically)
export const OLLAMA_DEFAULT_MODELS: AIModel[] = [
  {
    id: "llama3.1:8b",
    name: "Llama 3.1 8B",
    contextWindow: 8192,
    maxTokens: 4096,
    isDefault: true,
    supportsVision: false,
  },
  {
    id: "llama3.1:70b",
    name: "Llama 3.1 70B",
    contextWindow: 8192,
    maxTokens: 4096,
    supportsVision: false,
  },
  {
    id: "codellama:13b",
    name: "Code Llama 13B",
    contextWindow: 4096,
    maxTokens: 2048,
    supportsVision: false,
  },
];

// Function to get models for a specific provider type
export function getModelsForProvider(
  providerType: "openai" | "anthropic" | "google" | "ollama" | "custom"
): AIModel[] {
  switch (providerType) {
    case "openai":
      return OPENAI_MODELS;
    case "anthropic":
      return ANTHROPIC_MODELS;
    case "google":
      return GOOGLE_MODELS;
    case "ollama":
      return OLLAMA_DEFAULT_MODELS;
    case "custom":
      return []; // Custom providers should define their own models
    default:
      return [];
  }
}

// Function to get all available models
export function getAllAvailableModels(): Record<string, AIModel[]> {
  return {
    openai: OPENAI_MODELS,
    anthropic: ANTHROPIC_MODELS,
    google: GOOGLE_MODELS,
    ollama: OLLAMA_DEFAULT_MODELS,
  };
}
