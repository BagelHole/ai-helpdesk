import React, { useState, useEffect } from "react";
import { AIModel, AIProvider } from "@shared/types";
import { getModelsForProvider } from "@shared/models/latest-models";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

interface ModelSelectorProps {
  selectedProviderId?: string;
  selectedModelId?: string;
  onModelChange: (providerId: string, modelId: string, model: AIModel) => void;
  enabledProviders: AIProvider[];
  className?: string;
  label?: string;
  showProviderInfo?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedProviderId,
  selectedModelId,
  onModelChange,
  enabledProviders,
  className = "",
  label = "Select Model",
  showProviderInfo = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [availableModels, setAvailableModels] = useState<
    Record<string, AIModel[]>
  >({});

  // Load available models for each enabled provider
  useEffect(() => {
    const loadModels = async () => {
      const models: Record<string, AIModel[]> = {};

      for (const provider of enabledProviders) {
        if (provider.isEnabled && provider.apiKey) {
          try {
            // First try to get models from the provider (dynamic discovery)
            const discoveredModels = await window.electronAPI.ai.getAvailableModels(
              provider.id
            );
            if (discoveredModels && discoveredModels.length > 0) {
              models[provider.id] = discoveredModels;
            } else {
              // Fallback to hardcoded latest models
              models[provider.id] = getModelsForProvider(provider.type);
            }
          } catch (error) {
            console.warn(
              `Failed to discover models for ${provider.name}, using defaults:`,
              error
            );
            // Use hardcoded models as fallback
            models[provider.id] = getModelsForProvider(provider.type);
          }
        }
      }

      setAvailableModels(models);
    };

    loadModels();
  }, [enabledProviders]);

  // Get the currently selected model
  const selectedModel = selectedProviderId && selectedModelId
    ? availableModels[selectedProviderId]?.find(m => m.id === selectedModelId)
    : null;

  // Get the selected provider
  const selectedProvider = selectedProviderId
    ? enabledProviders.find(p => p.id === selectedProviderId)
    : null;

  const handleModelSelect = (providerId: string, model: AIModel) => {
    onModelChange(providerId, model.id, model);
    setIsOpen(false);
  };

  const formatCost = (cost: number) => {
    if (cost === 0) return "Free";
    if (cost < 0.001) return `$${(cost * 1000).toFixed(4)}/1K tokens`;
    return `$${cost.toFixed(3)}/1K tokens`;
  };

  const getProviderIcon = (type: string) => {
    switch (type) {
      case "openai":
        return "🤖";
      case "anthropic":
        return "🧠";
      case "google":
        return "🌟";
      case "ollama":
        return "🦙";
      default:
        return "🔮";
    }
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}
      
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className="flex items-center">
            {selectedModel && selectedProvider ? (
              <>
                <span className="mr-2 text-lg">
                  {getProviderIcon(selectedProvider.type)}
                </span>
                <span className="block truncate">
                  {selectedModel.name}
                  {showProviderInfo && (
                    <span className="text-sm text-gray-500 ml-2">
                      ({selectedProvider.name})
                    </span>
                  )}
                </span>
              </>
            ) : (
              <span className="block truncate text-gray-500">
                {Object.keys(availableModels).length === 0
                  ? "No models available"
                  : "Select a model..."}
              </span>
            )}
          </span>
          <span className="ml-3 absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <ChevronDownIcon
              className={`h-5 w-5 text-gray-400 transform transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </span>
        </button>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 shadow-lg max-h-80 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
            {Object.entries(availableModels).map(([providerId, models]) => {
              const provider = enabledProviders.find(p => p.id === providerId);
              if (!provider) return null;

              return (
                <div key={providerId}>
                  {/* Provider header */}
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800">
                    <span className="mr-2">{getProviderIcon(provider.type)}</span>
                    {provider.name}
                  </div>
                  
                  {/* Models for this provider */}
                  {models.map((model) => (
                    <button
                      key={`${providerId}-${model.id}`}
                      type="button"
                      onClick={() => handleModelSelect(providerId, model)}
                      className={`relative cursor-pointer select-none py-2 pl-3 pr-9 w-full text-left hover:bg-blue-50 dark:hover:bg-gray-600 ${
                        selectedProviderId === providerId && selectedModelId === model.id
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100"
                          : "text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium truncate">{model.name}</span>
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <span className="mr-3">
                            {formatCost(model.costPer1kTokens)}
                          </span>
                          <span className="mr-3">
                            {model.contextWindow.toLocaleString()} ctx
                          </span>
                          {model.isDefault && (
                            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-xs">
                              Default
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {selectedProviderId === providerId && selectedModelId === model.id && (
                        <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                          <svg
                            className="h-5 w-5 text-blue-600"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              );
            })}
            
            {Object.keys(availableModels).length === 0 && (
              <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-center">
                No AI providers configured. Please add API keys in Settings.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};