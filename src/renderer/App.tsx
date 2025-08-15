import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useQuery } from "react-query";
import toast from "react-hot-toast";

// Components
import { Layout } from "./components/Layout/Layout";
import { MessageQueue } from "./components/MessageQueue/MessageQueue";
import { MessageDetail } from "./components/MessageDetail/MessageDetail";
import { Docs } from "./components/Docs/Docs";
import { Devices } from "./components/Devices/Devices";
import { Settings } from "./components/Settings/Settings";
import { LoadingScreen } from "./components/LoadingScreen/LoadingScreen";
import { ErrorBoundary } from "./components/ErrorBoundary/ErrorBoundary";

// Hooks and services
import { useAppStore } from "./hooks/useAppStore";
import { useTheme } from "./hooks/useTheme";

// Types
import { AppSettings } from "@shared/types";

export const App: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const { settings, updateSettings, setConnectionStatus } = useAppStore();
  const { theme, toggleTheme } = useTheme();

  // Test saved connections on app startup
  const testSavedConnections = async (loadedSettings: AppSettings) => {
    try {
      // Test Slack connection
      if (loadedSettings.slack?.botToken) {
        setConnectionStatus("slack", "connecting");
        try {
          await window.electronAPI.slack.testConnection();
          setConnectionStatus("slack", "connected");
        } catch {
          setConnectionStatus("slack", "error");
        }
      }

      // Test Rippling connection
      if (loadedSettings.rippling?.apiKey) {
        setConnectionStatus("rippling", "connecting");
        try {
          await window.electronAPI.rippling.testConnection();
          setConnectionStatus("rippling", "connected");
        } catch {
          setConnectionStatus("rippling", "error");
        }
      }

      // Test AI providers
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
    } catch (error) {
      console.error("Failed to test connections:", error);
    }
  };

  // Load initial settings
  const {
    data: initialSettings,
    isLoading: settingsLoading,
    error: settingsError,
  } = useQuery<AppSettings>(
    "settings",
    async () => {
      const result = await window.electronAPI.settings.get();
      return result;
    },
    {
      onSuccess: async (data) => {
        updateSettings(data);

        // Test connections for saved API keys
        await testSavedConnections(data);

        setIsInitialized(true);
      },
      onError: (error) => {
        console.error("Failed to load settings:", error);
        toast.error("Failed to load application settings");
        setIsInitialized(true); // Still allow app to load with defaults
      },
      retry: 2,
      staleTime: Infinity, // Settings don't change often
    }
  );

  // Handle system events
  useEffect(() => {
    const handleAppNotification = (event: any, notification: any) => {
      switch (notification.type) {
        case "info":
          toast.success(notification.message);
          break;
        case "warning":
          toast(notification.message, { icon: "⚠️" });
          break;
        case "error":
          toast.error(notification.message);
          break;
        default:
          toast(notification.message);
      }
    };

    const handleSettingsUpdated = (
      event: any,
      updatedSettings: AppSettings
    ) => {
      updateSettings(updatedSettings);
      toast.success("Settings updated successfully");
    };

    // Register event listeners
    window.electronAPI.on("app:notification", handleAppNotification);
    window.electronAPI.on("settings:updated", handleSettingsUpdated);

    // Cleanup
    return () => {
      window.electronAPI.off("app:notification", handleAppNotification);
      window.electronAPI.off("settings:updated", handleSettingsUpdated);
    };
  }, [updateSettings]);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  // Show loading screen while initializing
  if (!isInitialized || settingsLoading) {
    return <LoadingScreen />;
  }

  // Show error if settings failed to load
  if (settingsError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Failed to Initialize
          </h1>
          <p className="text-gray-600 mb-6">
            Could not load application settings. Please check the logs for more
            details.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="app min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<MessageQueue />} />
            <Route path="message/:messageId" element={<MessageDetail />} />
            <Route path="docs" element={<Docs />} />
            <Route path="devices" element={<Devices />} />
            <Route path="settings/*" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </div>
    </ErrorBoundary>
  );
};
