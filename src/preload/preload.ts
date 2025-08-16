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
    testConnection: () => Promise<{ success: boolean }>;
    forcePoll: () => Promise<{ success: boolean }>;
  };

  // Rippling
  rippling: {
    connect: (apiKey: string) => Promise<{ success: boolean }>;
    getUserInfo: (email: string) => Promise<RipplingUser>;
    testConnection: () => Promise<{ success: boolean }>;
    getDevices: () => Promise<any[]>;
  };

  // AI
  ai: {
    generateResponse: (requestData: {
      message: SlackMessage;
      threadMessages?: SlackMessage[];
      userInput?: string;
      providerId?: string;
      modelId?: string;
    }) => Promise<AIResponse>;
    sendChatMessage: (requestData: {
      content: string;
      providerId: string;
      modelId: string;
      conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
    }) => Promise<{ content: string; usage?: any }>;
    getProviders: () => Promise<any[]>;
    getAvailableModels: (providerId: string) => Promise<any[]>;
    testProvider: (
      provider: string,
      apiKey: string
    ) => Promise<{ success: boolean }>;
  };

  // Database
  db: {
    getMessages: (filters?: any) => Promise<SlackMessage[]>;
    saveMessage: (message: SlackMessage) => Promise<any>;
    clearMessages: () => Promise<{ success: boolean }>;
  };
  docs: {
    getDocuments: () => Promise<any[]>;
    uploadDocument: (fileData: {
      name: string;
      type: string;
      size: number;
      arrayBuffer: ArrayBuffer;
    }) => Promise<any>;
    createNote: (noteData: { title: string; content: string }) => Promise<any>;
    updateNote: (noteData: {
      id: string;
      title: string;
      content: string;
    }) => Promise<any>;
    deleteDocument: (id: string) => Promise<any>;
    viewDocument: (id: string) => Promise<any>;
    getDocumentFile: (
      id: string
    ) => Promise<{ content: ArrayBuffer; name: string; type: string } | null>;
    getDocumentPath: (id: string) => Promise<string | null>;
    showInFolder: (id: string) => Promise<{ success: boolean }>;
  };

  // System
  system: {
    openExternal: (url: string) => Promise<{ success: boolean }>;
    showSaveDialog: (options: any) => Promise<any>;
    showOpenDialog: (options: any) => Promise<any>;
    startNativeDrag: (filePath: string) => Promise<void>;
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
    testConnection: () => ipcRenderer.invoke("slack:testConnection"),
    forcePoll: () => ipcRenderer.invoke("slack:forcePoll"),
  },

  rippling: {
    connect: (apiKey: string) => ipcRenderer.invoke("rippling:connect", apiKey),
    getUserInfo: (email: string) =>
      ipcRenderer.invoke("rippling:getUserInfo", email),
    testConnection: () => ipcRenderer.invoke("rippling:testConnection"),
    getDevices: () => ipcRenderer.invoke("rippling:getDevices"),
  },

  ai: {
    generateResponse: (requestData: {
      message: SlackMessage;
      threadMessages?: SlackMessage[];
      userInput?: string;
      providerId?: string;
      modelId?: string;
    }) => ipcRenderer.invoke("ai:generateResponse", requestData),
    sendChatMessage: (requestData: {
      content: string;
      providerId: string;
      modelId: string;
      conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
    }) => ipcRenderer.invoke("ai:sendChatMessage", requestData),
    getProviders: () => ipcRenderer.invoke("ai:getProviders"),
    getAvailableModels: (providerId: string) =>
      ipcRenderer.invoke("ai:getAvailableModels", providerId),
    testProvider: (provider: string, apiKey: string) =>
      ipcRenderer.invoke("ai:testProvider", provider, apiKey),
  },

  db: {
    getMessages: (filters?: any) =>
      ipcRenderer.invoke("db:getMessages", filters),
    saveMessage: (message: SlackMessage) =>
      ipcRenderer.invoke("db:saveMessage", message),
    clearMessages: () => ipcRenderer.invoke("db:clearMessages"),
  },

  docs: {
    getDocuments: () => ipcRenderer.invoke("docs:getDocuments"),
    uploadDocument: (fileData: {
      name: string;
      type: string;
      size: number;
      arrayBuffer: ArrayBuffer;
    }) => ipcRenderer.invoke("docs:uploadDocument", fileData),
    createNote: (noteData: { title: string; content: string }) =>
      ipcRenderer.invoke("docs:createNote", noteData),
    updateNote: (noteData: { id: string; title: string; content: string }) =>
      ipcRenderer.invoke("docs:updateNote", noteData),
    deleteDocument: (id: string) =>
      ipcRenderer.invoke("docs:deleteDocument", id),
    viewDocument: (id: string) => ipcRenderer.invoke("docs:viewDocument", id),
    getDocumentFile: (id: string) =>
      ipcRenderer.invoke("docs:getDocumentFile", id),
    getDocumentPath: (id: string) =>
      ipcRenderer.invoke("docs:getDocumentPath", id),
    showInFolder: (id: string) => ipcRenderer.invoke("docs:showInFolder", id),
  },

  system: {
    openExternal: (url: string) =>
      ipcRenderer.invoke("system:openExternal", url),
    showSaveDialog: (options: any) =>
      ipcRenderer.invoke("system:showSaveDialog", options),
    showOpenDialog: (options: any) =>
      ipcRenderer.invoke("system:showOpenDialog", options),
    startNativeDrag: (filePath: string) =>
      ipcRenderer.invoke("system:startNativeDrag", filePath),
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
