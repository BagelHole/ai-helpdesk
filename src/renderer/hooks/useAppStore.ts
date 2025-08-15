import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import {
  AppSettings,
  SlackMessage,
  AIResponse,
  RipplingUser,
  MessageStatus,
  MessagePriority,
  MessageCategory,
  DeepPartial,
} from "@shared/types";

interface AppState {
  // Settings
  settings: AppSettings | null;
  isSettingsLoaded: boolean;

  // Messages
  messages: SlackMessage[];
  selectedMessage: SlackMessage | null;
  messageFilter: {
    status?: MessageStatus;
    priority?: MessagePriority;
    category?: MessageCategory;
    search?: string;
  };

  // AI Responses
  aiResponses: Record<string, AIResponse>;
  isGeneratingResponse: boolean;

  // User Data
  users: Record<string, RipplingUser>;

  // UI State
  sidebarCollapsed: boolean;
  activeView: "dashboard" | "messages" | "analytics" | "settings";

  // Connection Status
  connections: {
    slack: "disconnected" | "connecting" | "connected" | "error";
    rippling: "disconnected" | "connecting" | "connected" | "error";
    ai: "disconnected" | "connecting" | "connected" | "error";
  };

  // Actions
  updateSettings: (settings: DeepPartial<AppSettings>) => void;
  setMessages: (messages: SlackMessage[]) => void;
  addMessage: (message: SlackMessage) => void;
  updateMessage: (messageId: string, updates: Partial<SlackMessage>) => void;
  selectMessage: (message: SlackMessage | null) => void;
  setMessageFilter: (filter: Partial<AppState["messageFilter"]>) => void;
  setAIResponse: (messageId: string, response: AIResponse) => void;
  setGeneratingResponse: (isGenerating: boolean) => void;
  addUser: (user: RipplingUser) => void;
  updateUser: (userId: string, updates: Partial<RipplingUser>) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveView: (view: AppState["activeView"]) => void;
  setConnectionStatus: (
    service: keyof AppState["connections"],
    status: AppState["connections"]["slack"]
  ) => void;
  reset: () => void;
}

const initialState = {
  settings: null,
  isSettingsLoaded: false,
  messages: [],
  selectedMessage: null,
  messageFilter: {},
  aiResponses: {},
  isGeneratingResponse: false,
  users: {},
  sidebarCollapsed: false,
  activeView: "dashboard" as const,
  connections: {
    slack: "disconnected" as const,
    rippling: "disconnected" as const,
    ai: "disconnected" as const,
  },
};

export const useAppStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    updateSettings: (newSettings) => {
      set((state) => {
        const currentSettings = state.settings || ({} as AppSettings);
        const updatedSettings = deepMerge(currentSettings, newSettings);

        return {
          settings: updatedSettings,
          isSettingsLoaded: true,
        };
      });
    },

    setMessages: (messages) => {
      set({ messages });
    },

    addMessage: (message) => {
      set((state) => ({
        messages: [message, ...state.messages],
      }));
    },

    updateMessage: (messageId, updates) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        ),
        selectedMessage:
          state.selectedMessage?.id === messageId
            ? { ...state.selectedMessage, ...updates }
            : state.selectedMessage,
      }));
    },

    selectMessage: (message) => {
      set({ selectedMessage: message });
    },

    setMessageFilter: (filter) => {
      set((state) => ({
        messageFilter: { ...state.messageFilter, ...filter },
      }));
    },

    setAIResponse: (messageId, response) => {
      set((state) => ({
        aiResponses: {
          ...state.aiResponses,
          [messageId]: response,
        },
      }));
    },

    setGeneratingResponse: (isGenerating) => {
      set({ isGeneratingResponse: isGenerating });
    },

    addUser: (user) => {
      set((state) => ({
        users: {
          ...state.users,
          [user.id]: user,
        },
      }));
    },

    updateUser: (userId, updates) => {
      set((state) => ({
        users: {
          ...state.users,
          [userId]: { ...state.users[userId], ...updates },
        },
      }));
    },

    setSidebarCollapsed: (collapsed) => {
      set({ sidebarCollapsed: collapsed });
    },

    setActiveView: (view) => {
      set({ activeView: view });
    },

    setConnectionStatus: (service, status) => {
      set((state) => ({
        connections: {
          ...state.connections,
          [service]: status,
        },
      }));
    },

    reset: () => {
      set(initialState);
    },
  }))
);

// Helper function for deep merging objects
function deepMerge<T>(target: T, source: DeepPartial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (
      source[key] !== null &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(result[key], source[key] as any);
    } else if (source[key] !== undefined) {
      result[key] = source[key] as any;
    }
  }

  return result;
}

// Selectors
export const useMessages = () => useAppStore((state) => state.messages);
export const useSelectedMessage = () =>
  useAppStore((state) => state.selectedMessage);
export const useMessageFilter = () =>
  useAppStore((state) => state.messageFilter);
export const useAIResponses = () => useAppStore((state) => state.aiResponses);
export const useIsGeneratingResponse = () =>
  useAppStore((state) => state.isGeneratingResponse);
export const useUsers = () => useAppStore((state) => state.users);
export const useSettings = () => useAppStore((state) => state.settings);
export const useIsSettingsLoaded = () =>
  useAppStore((state) => state.isSettingsLoaded);
export const useSidebarCollapsed = () =>
  useAppStore((state) => state.sidebarCollapsed);
export const useActiveView = () => useAppStore((state) => state.activeView);
export const useConnections = () => useAppStore((state) => state.connections);

// Filtered messages selector
export const useFilteredMessages = () => {
  return useAppStore((state) => {
    const { messages, messageFilter } = state;

    return messages.filter((message) => {
      if (messageFilter.status && message.status !== messageFilter.status) {
        return false;
      }

      if (
        messageFilter.priority &&
        message.priority !== messageFilter.priority
      ) {
        return false;
      }

      if (
        messageFilter.category &&
        message.category !== messageFilter.category
      ) {
        return false;
      }

      if (messageFilter.search) {
        const searchLower = messageFilter.search.toLowerCase();
        const textMatch = message.text.toLowerCase().includes(searchLower);
        const userMatch =
          state.users[message.user]?.firstName
            ?.toLowerCase()
            .includes(searchLower) ||
          state.users[message.user]?.lastName
            ?.toLowerCase()
            .includes(searchLower) ||
          state.users[message.user]?.email?.toLowerCase().includes(searchLower);

        if (!textMatch && !userMatch) {
          return false;
        }
      }

      return true;
    });
  });
};

// Connection status helpers
export const useIsSlackConnected = () =>
  useAppStore((state) => state.connections.slack === "connected");
export const useIsRipplingConnected = () =>
  useAppStore((state) => state.connections.rippling === "connected");
export const useIsAIConnected = () =>
  useAppStore((state) => state.connections.ai === "connected");
