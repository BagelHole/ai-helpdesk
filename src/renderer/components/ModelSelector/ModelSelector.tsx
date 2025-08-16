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

  // Persistence key for localStorage
  const persistenceKey = "selected-ai-model";

  // Load available models for each enabled provider
  useEffect(() => {
    const loadModels = async () => {
      const models: Record<string, AIModel[]> = {};

      for (const provider of enabledProviders) {
        if (provider.isEnabled && provider.apiKey) {
          try {
            // First try to get models from the provider (dynamic discovery)
            const discoveredModels =
              await window.electronAPI.ai.getAvailableModels(provider.id);
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
  const selectedModel =
    selectedProviderId && selectedModelId
      ? availableModels[selectedProviderId]?.find(
          (m) => m.id === selectedModelId
        )
      : null;

  // Get the selected provider
  const selectedProvider = selectedProviderId
    ? enabledProviders.find((p) => p.id === selectedProviderId)
    : null;

  const handleModelSelect = (providerId: string, model: AIModel) => {
    // Save selection to localStorage for persistence
    const selection = { providerId, modelId: model.id };
    localStorage.setItem(persistenceKey, JSON.stringify(selection));

    onModelChange(providerId, model.id, model);
    setIsOpen(false);
  };

  // Load saved selection on mount or set default to most recent model
  useEffect(() => {
    if (
      Object.keys(availableModels).length === 0 ||
      enabledProviders.length === 0
    ) {
      return; // Wait for models and providers to load
    }

    // If already have a selection, don't override
    if (selectedProviderId && selectedModelId) {
      return;
    }

    const savedSelection = localStorage.getItem(persistenceKey);
    let selectionMade = false;

    // Try to restore saved selection first
    if (savedSelection) {
      try {
        const { providerId, modelId } = JSON.parse(savedSelection);
        // Check if the saved provider is still available
        const provider = enabledProviders.find((p) => p.id === providerId);
        const model = availableModels[providerId]?.find(
          (m) => m.id === modelId
        );
        if (provider && model) {
          onModelChange(providerId, modelId, model);
          selectionMade = true;
        }
      } catch (error) {
        console.warn("Failed to load saved model selection:", error);
      }
    }

    // If no saved selection or it's invalid, select the most recent model
    if (!selectionMade) {
      // Find the first enabled provider and use its first (most recent) model
      const firstProvider = enabledProviders[0];
      const firstModel = availableModels[firstProvider.id]?.[0];

      if (firstProvider && firstModel) {
        onModelChange(firstProvider.id, firstModel.id, firstModel);
      }
    }
  }, [
    enabledProviders,
    availableModels,
    selectedProviderId,
    selectedModelId,
    onModelChange,
  ]);

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          {label}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-sm pl-2 pr-7 py-1.5 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className="flex items-center">
            {selectedModel && selectedProvider ? (
              <>
                <span className="block truncate text-sm">
                  {selectedModel.name}
                  {showProviderInfo && (
                    <span className="text-xs text-gray-500 ml-1">
                      ({selectedProvider.name})
                    </span>
                  )}
                </span>
              </>
            ) : (
              <span className="block truncate text-gray-500 text-sm">
                {Object.keys(availableModels).length === 0
                  ? "No models available"
                  : "Select model..."}
              </span>
            )}
          </span>
          <span className="ml-2 absolute inset-y-0 right-0 flex items-center pr-1.5 pointer-events-none">
            <ChevronDownIcon
              className={`h-3.5 w-3.5 text-gray-400 transform transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </span>
        </button>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg max-h-64 rounded-md py-1 text-sm ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none border border-gray-200 dark:border-gray-600">
            {Object.entries(availableModels).map(([providerId, models]) => {
              const provider = enabledProviders.find(
                (p) => p.id === providerId
              );
              if (!provider) return null;

              return (
                <div key={providerId}>
                  {/* Provider header */}
                  <div className="px-2 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-700">
                    {provider.name}
                  </div>

                  {/* Models for this provider */}
                  {models.map((model) => (
                    <button
                      key={`${providerId}-${model.id}`}
                      type="button"
                      onClick={() => handleModelSelect(providerId, model)}
                      className={`relative cursor-pointer select-none py-1.5 pl-2 pr-8 w-full text-left hover:bg-blue-50 dark:hover:bg-gray-600 ${
                        selectedProviderId === providerId &&
                        selectedModelId === model.id
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100"
                          : "text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium truncate text-sm">
                          {model.name}
                        </span>
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <span>
                            {model.contextWindow.toLocaleString()} ctx
                          </span>
                        </div>
                      </div>

                      {selectedProviderId === providerId &&
                        selectedModelId === model.id && (
                          <span className="absolute inset-y-0 right-0 flex items-center pr-2">
                            <svg
                              className="h-4 w-4 text-blue-600"
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
              <div className="px-2 py-2 text-gray-500 dark:text-gray-400 text-center text-sm">
                No AI providers configured. Please add API keys in Settings.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
