import { contextBridge, ipcRenderer } from "electron";
import {
  AppSettings,
  SlackMessage,
  AIResponse,
  RipplingUser,
} from "@shared/types";

// Define the API interface
interface ElectronAPI {
  // Settings
  settings: {
    get: () => Promise<AppSettings>;
    update: (settings: Partial<AppSettings>) => Promise<{ success: boolean }>;
  };

  // Slack
  slack: {
    connect: (token: string) => Promise<{ success: boolean }>;
    disconnect: () => Promise<{ success: boolean }>;
    sendMessage: (channelId: string, message: string) => Promise<any>;
  };

  // Rippling
  rippling: {
    connect: (apiKey: string) => Promise<{ success: boolean }>;
    getUserInfo: (email: string) => Promise<RipplingUser>;
  };

  // AI
  ai: {
    generateResponse: (messageData: any) => Promise<AIResponse>;
    getProviders: () => Promise<any[]>;
  };

  // Database
  db: {
    getMessages: (filters?: any) => Promise<SlackMessage[]>;
    saveMessage: (message: SlackMessage) => Promise<any>;
  };

  // System
  system: {
    openExternal: (url: string) => Promise<{ success: boolean }>;
    showSaveDialog: (options: any) => Promise<any>;
    showOpenDialog: (options: any) => Promise<any>;
  };

  // Window
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
  };

  // Event listeners
  on: (channel: string, callback: (...args: any[]) => void) => void;
  off: (channel: string, callback: (...args: any[]) => void) => void;
  once: (channel: string, callback: (...args: any[]) => void) => void;
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const electronAPI: ElectronAPI = {
  settings: {
    get: () => ipcRenderer.invoke("settings:get"),
    update: (settings: Partial<AppSettings>) =>
      ipcRenderer.invoke("settings:update", settings),
  },

  slack: {
    connect: (token: string) => ipcRenderer.invoke("slack:connect", token),
    disconnect: () => ipcRenderer.invoke("slack:disconnect"),
    sendMessage: (channelId: string, message: string) =>
      ipcRenderer.invoke("slack:sendMessage", channelId, message),
  },

  rippling: {
    connect: (apiKey: string) => ipcRenderer.invoke("rippling:connect", apiKey),
    getUserInfo: (email: string) =>
      ipcRenderer.invoke("rippling:getUserInfo", email),
  },

  ai: {
    generateResponse: (messageData: any) =>
      ipcRenderer.invoke("ai:generateResponse", messageData),
    getProviders: () => ipcRenderer.invoke("ai:getProviders"),
  },

  db: {
    getMessages: (filters?: any) =>
      ipcRenderer.invoke("db:getMessages", filters),
    saveMessage: (message: SlackMessage) =>
      ipcRenderer.invoke("db:saveMessage", message),
  },

  system: {
    openExternal: (url: string) =>
      ipcRenderer.invoke("system:openExternal", url),
    showSaveDialog: (options: any) =>
      ipcRenderer.invoke("system:showSaveDialog", options),
    showOpenDialog: (options: any) =>
      ipcRenderer.invoke("system:showOpenDialog", options),
  },

  window: {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    maximize: () => ipcRenderer.invoke("window:maximize"),
    close: () => ipcRenderer.invoke("window:close"),
  },

  on: (channel: string, callback: (...args: any[]) => void) => {
    // Validate channel names to prevent security issues
    const validChannels = [
      "slack:message",
      "slack:connected",
      "slack:disconnected",
      "rippling:userSynced",
      "ai:responseGenerated",
      "settings:updated",
      "app:notification",
    ];

    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    } else {
      console.warn(`Invalid channel name: ${channel}`);
    }
  },

  off: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.off(channel, callback);
  },

  once: (channel: string, callback: (...args: any[]) => void) => {
    // Validate channel names to prevent security issues
    const validChannels = [
      "slack:message",
      "slack:connected",
      "slack:disconnected",
      "rippling:userSynced",
      "ai:responseGenerated",
      "settings:updated",
      "app:notification",
    ];

    if (validChannels.includes(channel)) {
      ipcRenderer.once(channel, callback);
    } else {
      console.warn(`Invalid channel name: ${channel}`);
    }
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld("electronAPI", electronAPI);

// Add type definition for the global window object
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
