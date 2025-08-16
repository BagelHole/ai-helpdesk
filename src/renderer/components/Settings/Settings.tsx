import React, { useState, useEffect } from "react";
import { useAppStore } from "../../hooks/useAppStore";
import {
  AppSettings,
  CategoryKeywords,
  CustomSystemPrompt,
  AIProvider,
  AIModel,
} from "@shared/types";
import { CategoriesSettings } from "./CategoriesSettings";
import { AIPromptsSettings } from "./AIPromptsSettings";


export const Settings: React.FC = () => {
  const { connections, settings, updateSettings, setConnectionStatus } =
    useAppStore();

  // Tab state
  const [activeTab, setActiveTab] = useState<string>("api");

  // Form state
  const [formData, setFormData] = useState({
    slackBotToken: "",
    enableMentions: true,
    enableThreads: true,
    autoMarkAsRead: false,
    monitoredChannels: "",
    ignoredChannels: "",
    ripplingApiKey: "",
    openaiApiKey: "",
    googleApiKey: "",
    anthropicApiKey: "",
  });



  const [isSaving, setIsSaving] = useState(false);

  const tabs = [
    { id: "api", label: "API Configuration", icon: "🔑" },
    { id: "categories", label: "Message Categories", icon: "🏷️" },
    { id: "prompts", label: "AI Prompts", icon: "🤖" },
  ];

  // Load settings from backend when component mounts
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const loadedSettings = await window.electronAPI.settings.get();
        if (loadedSettings) {
          // Update the store
          updateSettings(loadedSettings);

          // Update form data
          setFormData({
            slackBotToken: loadedSettings.slack?.botToken || "",
            enableMentions: loadedSettings.slack?.enableMentions ?? true,
            enableThreads: loadedSettings.slack?.enableThreads ?? true,
            autoMarkAsRead: loadedSettings.slack?.autoMarkAsRead ?? false,
            monitoredChannels:
              loadedSettings.slack?.monitoredChannels?.join(", ") || "",
            ignoredChannels:
              loadedSettings.slack?.ignoredChannels?.join(", ") || "",
            ripplingApiKey: loadedSettings.rippling?.apiKey || "",
            openaiApiKey:
              loadedSettings.ai?.providers?.find((p) => p.type === "openai")
                ?.apiKey || "",
            googleApiKey:
              loadedSettings.ai?.providers?.find((p) => p.type === "google")
                ?.apiKey || "",
            anthropicApiKey:
              loadedSettings.ai?.providers?.find((p) => p.type === "anthropic")
                ?.apiKey || "",
          });

          // Test connections for loaded API keys
          await testLoadedConnections(loadedSettings);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    };

    loadSettings();
  }, [updateSettings]);



  // Test connections when settings are loaded
  const testLoadedConnections = async (loadedSettings: AppSettings) => {
    // Test AI providers (main concern for Settings page)
    if (loadedSettings.ai?.providers) {
      for (const provider of loadedSettings.ai.providers) {
        if (provider.apiKey) {
          const connectionKey = provider.type as
            | "openai"
            | "google"
            | "anthropic";
          setConnectionStatus(connectionKey, "connecting");
          try {
            await window.electronAPI.ai.testProvider(
              provider.type,
              provider.apiKey
            );
            setConnectionStatus(connectionKey, "connected");
          } catch {
            setConnectionStatus(connectionKey, "error");
          }
        }
      }
    }
  };

  // Also update form when settings change in store
  useEffect(() => {
    if (settings) {
      setFormData({
        slackBotToken: settings.slack?.botToken || "",
        enableMentions: settings.slack?.enableMentions ?? true,
        enableThreads: settings.slack?.enableThreads ?? true,
        autoMarkAsRead: settings.slack?.autoMarkAsRead ?? false,
        monitoredChannels: settings.slack?.monitoredChannels?.join(", ") || "",
        ignoredChannels: settings.slack?.ignoredChannels?.join(", ") || "",
        ripplingApiKey: settings.rippling?.apiKey || "",
        openaiApiKey:
          settings.ai?.providers?.find((p) => p.type === "openai")?.apiKey ||
          "",
        googleApiKey:
          settings.ai?.providers?.find((p) => p.type === "google")?.apiKey ||
          "",
        anthropicApiKey:
          settings.ai?.providers?.find((p) => p.type === "anthropic")?.apiKey ||
          "",
      });
    }
  }, [settings]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      // Save to settings via IPC
      const result = await window.electronAPI.settings.update({
        slack: {
          botToken: formData.slackBotToken,
          appToken: settings?.slack?.appToken,
          userToken: settings?.slack?.userToken,
          workspaceId: settings?.slack?.workspaceId,
          monitoredChannels: formData.monitoredChannels
            ? formData.monitoredChannels
                .split(",")
                .map((ch) => ch.trim())
                .filter((ch) => ch)
            : [],
          ignoredChannels: formData.ignoredChannels
            ? formData.ignoredChannels
                .split(",")
                .map((ch) => ch.trim())
                .filter((ch) => ch)
            : [],
          enableMentions: formData.enableMentions,
          enableThreads: formData.enableThreads,
          autoMarkAsRead: formData.autoMarkAsRead,
        },
        rippling: {
          apiKey: formData.ripplingApiKey,
          baseUrl: settings?.rippling?.baseUrl,
          syncInterval: settings?.rippling?.syncInterval ?? 60,
          cacheExpiry: settings?.rippling?.cacheExpiry ?? 24,
          enableUserSync: settings?.rippling?.enableUserSync ?? true,
          enableDeviceSync: settings?.rippling?.enableDeviceSync ?? true,
          enableApplicationSync:
            settings?.rippling?.enableApplicationSync ?? true,
        },
        ai: {
          defaultProvider: settings?.ai?.defaultProvider || "openai",
          systemPrompts: settings?.ai?.systemPrompts || [],
          defaultPrompt: settings?.ai?.defaultPrompt || "default",
          customSystemPrompts: settings?.ai?.customSystemPrompts || [],
          activeSystemPrompt: settings?.ai?.activeSystemPrompt || "default",
          autoResponseEnabled: settings?.ai?.autoResponseEnabled ?? false,
          confidenceThreshold: settings?.ai?.confidenceThreshold ?? 0.8,
          maxTokensPerResponse: settings?.ai?.maxTokensPerResponse ?? 1000,
          temperature: settings?.ai?.temperature ?? 0.7,
          enableLocalModels: settings?.ai?.enableLocalModels ?? false,
          ollamaUrl: settings?.ai?.ollamaUrl,
          categoryKeywords: settings?.ai?.categoryKeywords || [],
          providers: [
            {
              id: "openai",
              name: "OpenAI",
              type: "openai" as const,
              apiKey: formData.openaiApiKey,
              isEnabled: !!formData.openaiApiKey,
              models: [],
              rateLimits: {
                requestsPerMinute: 60,
                requestsPerDay: 1000,
                tokensPerMinute: 40000,
                tokensPerDay: 100000,
              },
            },
            {
              id: "google",
              name: "Google Gemini",
              type: "google" as const,
              apiKey: formData.googleApiKey,
              isEnabled: !!formData.googleApiKey,
              models: [],
              rateLimits: {
                requestsPerMinute: 60,
                requestsPerDay: 1000,
                tokensPerMinute: 32000,
                tokensPerDay: 50000,
              },
            },
            {
              id: "anthropic",
              name: "Anthropic Claude",
              type: "anthropic" as const,
              apiKey: formData.anthropicApiKey,
              isEnabled: !!formData.anthropicApiKey,
              models: [],
              rateLimits: {
                requestsPerMinute: 50,
                requestsPerDay: 1000,
                tokensPerMinute: 40000,
                tokensPerDay: 100000,
              },
            },
          ].filter((p) => p.isEnabled),
        },
      });

      // Update local state - no need to call updateSettings since backend handles it
      console.log("Settings saved successfully:", result);

      // Test connections for enabled providers
      if (formData.slackBotToken) {
        setConnectionStatus("slack", "connecting");
        // Test Slack connection - this would be implemented in the main process
        window.electronAPI.slack
          .testConnection()
          .then(() => {
            setConnectionStatus("slack", "connected");
            console.log("✅ Slack monitoring is now active with polling!");
          })
          .catch(() => {
            setConnectionStatus("slack", "error");
          });
      }

      if (formData.ripplingApiKey) {
        setConnectionStatus("rippling", "connecting");
        window.electronAPI.rippling
          .testConnection()
          .then(() => {
            setConnectionStatus("rippling", "connected");
          })
          .catch(() => {
            setConnectionStatus("rippling", "error");
          });
      }

      // Test AI providers
      ["openai", "google", "anthropic"].forEach(async (provider) => {
        const apiKey = formData[
          `${provider}ApiKey` as keyof typeof formData
        ] as string;
        if (apiKey && typeof apiKey === "string") {
          setConnectionStatus(provider as any, "connecting");
          try {
            await window.electronAPI.ai.testProvider(provider, apiKey);
            setConnectionStatus(provider as any, "connected");
          } catch {
            setConnectionStatus(provider as any, "error");
          }
        }
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCategoriesUpdate = async (categories: CategoryKeywords[]) => {
    try {
      const updatedSettings: Partial<AppSettings> = {
        ...settings,
        ai: {
          ...settings?.ai,
          providers: settings?.ai?.providers || [],
          defaultProvider: settings?.ai?.defaultProvider || "",
          systemPrompts: settings?.ai?.systemPrompts || [],
          defaultPrompt: settings?.ai?.defaultPrompt || "",
          customSystemPrompts: settings?.ai?.customSystemPrompts || [],
          activeSystemPrompt: settings?.ai?.activeSystemPrompt || "default",
          autoResponseEnabled: settings?.ai?.autoResponseEnabled || false,
          confidenceThreshold: settings?.ai?.confidenceThreshold || 0.8,
          maxTokensPerResponse: settings?.ai?.maxTokensPerResponse || 1000,
          temperature: settings?.ai?.temperature || 0.7,
          enableLocalModels: settings?.ai?.enableLocalModels || false,
          categoryKeywords: categories,
        },
      };

      await window.electronAPI.settings.update(updatedSettings);
      updateSettings(updatedSettings);
    } catch (error) {
      console.error("Failed to update categories:", error);
    }
  };

  const handlePromptsUpdate = async (
    prompts: CustomSystemPrompt[],
    activePromptId: string
  ) => {
    try {
      const updatedSettings: Partial<AppSettings> = {
        ...settings,
        ai: {
          ...settings?.ai,
          providers: settings?.ai?.providers || [],
          defaultProvider: settings?.ai?.defaultProvider || "",
          systemPrompts: settings?.ai?.systemPrompts || [],
          defaultPrompt: settings?.ai?.defaultPrompt || "",
          autoResponseEnabled: settings?.ai?.autoResponseEnabled || false,
          confidenceThreshold: settings?.ai?.confidenceThreshold || 0.8,
          maxTokensPerResponse: settings?.ai?.maxTokensPerResponse || 1000,
          temperature: settings?.ai?.temperature || 0.7,
          enableLocalModels: settings?.ai?.enableLocalModels || false,
          categoryKeywords: settings?.ai?.categoryKeywords || [],
          customSystemPrompts: prompts,
          activeSystemPrompt: activePromptId,
        },
      };

      await window.electronAPI.settings.update(updatedSettings);
      updateSettings(updatedSettings);
    } catch (error) {
      console.error("Failed to update prompts:", error);
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "connected":
        return <span className="badge badge-success">Connected</span>;
      case "connecting":
        return <span className="badge badge-warning">Connecting...</span>;
      case "error":
        return <span className="badge badge-error">Error</span>;
      default:
        return <span className="badge badge-secondary">Disconnected</span>;
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Settings
      </h1>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "api" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  API Configuration
                </h2>
              </div>
              <div className="card-body space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Slack Bot Token
                  </label>
                  <input
                    type="password"
                    className="input"
                    placeholder="xoxb-your-bot-token"
                    value={formData.slackBotToken}
                    onChange={(e) =>
                      handleInputChange("slackBotToken", e.target.value)
                    }
                  />
                </div>

                {/* Slack Configuration Section */}
                {formData.slackBotToken && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-4">
                    <h3 className="text-md font-medium text-blue-900 dark:text-blue-100 flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      Slack Monitoring Settings
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            className="rounded"
                            checked={formData.enableMentions}
                            onChange={(e) =>
                              handleInputChange(
                                "enableMentions",
                                e.target.checked
                              )
                            }
                          />
                          <span className="text-sm text-blue-800 dark:text-blue-200">
                            Monitor @mentions
                          </span>
                        </label>
                      </div>

                      <div>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            className="rounded"
                            checked={formData.enableThreads}
                            onChange={(e) =>
                              handleInputChange(
                                "enableThreads",
                                e.target.checked
                              )
                            }
                          />
                          <span className="text-sm text-blue-800 dark:text-blue-200">
                            Monitor Thread Replies
                          </span>
                        </label>
                      </div>

                      <div>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            className="rounded"
                            checked={formData.autoMarkAsRead}
                            onChange={(e) =>
                              handleInputChange(
                                "autoMarkAsRead",
                                e.target.checked
                              )
                            }
                          />
                          <span className="text-sm text-blue-800 dark:text-blue-200">
                            Auto-mark as read
                          </span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                        Channels to Monitor (comma-separated)
                      </label>
                      <input
                        type="text"
                        className="input"
                        placeholder="general, it-support, help-desk"
                        value={formData.monitoredChannels}
                        onChange={(e) =>
                          handleInputChange("monitoredChannels", e.target.value)
                        }
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Leave empty to monitor all channels you have access to
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                        Channels to Ignore (comma-separated)
                      </label>
                      <input
                        type="text"
                        className="input"
                        placeholder="random, social, off-topic"
                        value={formData.ignoredChannels}
                        onChange={(e) =>
                          handleInputChange("ignoredChannels", e.target.value)
                        }
                      />
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Rippling API Key
                  </label>
                  <input
                    type="password"
                    className="input"
                    placeholder="Enter your Rippling API key"
                    value={formData.ripplingApiKey}
                    onChange={(e) =>
                      handleInputChange("ripplingApiKey", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    OpenAI API Key
                  </label>
                  <input
                    type="password"
                    className="input"
                    placeholder="sk-your-openai-key"
                    value={formData.openaiApiKey}
                    onChange={(e) =>
                      handleInputChange("openaiApiKey", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Google Gemini API Key
                  </label>
                  <input
                    type="password"
                    className="input"
                    placeholder="Your Google AI Studio API key"
                    value={formData.googleApiKey}
                    onChange={(e) =>
                      handleInputChange("googleApiKey", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Anthropic Claude API Key
                  </label>
                  <input
                    type="password"
                    className="input"
                    placeholder="sk-ant-your-anthropic-key"
                    value={formData.anthropicApiKey}
                    onChange={(e) =>
                      handleInputChange("anthropicApiKey", e.target.value)
                    }
                  />
                </div>
              </div>
              <div className="card-footer">
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Configuration"}
                </button>
              </div>
            </div>
          </div>
          <div>
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Connection Status
                </h2>
              </div>
              <div className="card-body space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Slack
                  </span>
                  {getStatusDisplay(connections.slack)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Rippling
                  </span>
                  {getStatusDisplay(connections.rippling)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    OpenAI
                  </span>
                  {getStatusDisplay(connections.openai)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Google Gemini
                  </span>
                  {getStatusDisplay(connections.google)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Anthropic Claude
                  </span>
                  {getStatusDisplay(connections.anthropic)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "categories" && (
        <CategoriesSettings
          categoryKeywords={settings?.ai?.categoryKeywords || []}
          onUpdate={handleCategoriesUpdate}
        />
      )}

      {activeTab === "prompts" && (
        <AIPromptsSettings
          customSystemPrompts={settings?.ai?.customSystemPrompts || []}
          activeSystemPrompt={settings?.ai?.activeSystemPrompt || "default"}
          onUpdate={handlePromptsUpdate}
        />
      )}
    </div>
  );
};
