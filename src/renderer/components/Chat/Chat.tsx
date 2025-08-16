import React, { useState, useRef, useEffect } from "react";
import { useAppStore } from "../../hooks/useAppStore";
import { ModelSelector } from "../ModelSelector/ModelSelector";
import { AIModel, AIProvider } from "@shared/types";
import {
  PaperAirplaneIcon,
  XMarkIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { MarkdownRenderer } from "../MarkdownRenderer";

interface ChatMessage {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  providerId?: string;
  modelId?: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  providerId?: string;
  modelId?: string;
  model?: AIModel;
  createdAt: Date;
  lastActive: Date;
}

export const Chat: React.FC = () => {
  const { settings } = useAppStore();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Storage keys
  const CHAT_SESSIONS_KEY = "ai-chat-sessions";
  const ACTIVE_SESSION_KEY = "ai-chat-active-session";

  // Get enabled AI providers
  const enabledProviders: AIProvider[] =
    settings?.ai?.providers?.filter(
      (provider) => provider.isEnabled && provider.apiKey
    ) || [];

  // Get active session
  const activeSession =
    sessions.find((session) => session.id === activeSessionId) || null;

  // Load saved sessions on mount
  useEffect(() => {
    try {
      const savedSessions = localStorage.getItem(CHAT_SESSIONS_KEY);
      const savedActiveSession = localStorage.getItem(ACTIVE_SESSION_KEY);

      if (savedSessions) {
        const parsedSessions = JSON.parse(savedSessions).map(
          (session: any) => ({
            ...session,
            messages: session.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            })),
            createdAt: new Date(session.createdAt),
            lastActive: new Date(session.lastActive),
          })
        );
        setSessions(parsedSessions);

        // Restore active session if it exists
        if (
          savedActiveSession &&
          parsedSessions.find((s: any) => s.id === savedActiveSession)
        ) {
          setActiveSessionId(savedActiveSession);
        } else if (parsedSessions.length > 0) {
          setActiveSessionId(parsedSessions[0].id);
        }
      } else {
        // Create first session if none exist
        createNewSession();
      }
    } catch (error) {
      console.warn("Failed to load saved chat sessions:", error);
      createNewSession();
    }
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(sessions));
    }
  }, [sessions]);

  // Save active session ID
  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId);
    }
  }, [activeSessionId]);

  // Auto-scroll to bottom when active session messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages]);

  // Session management functions
  const createNewSession = (title?: string) => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: title || `Chat ${sessions.length + 1}`,
      messages: [],
      createdAt: new Date(),
      lastActive: new Date(),
    };

    setSessions((prev) => [...prev, newSession]);
    setActiveSessionId(newSession.id);
    return newSession.id;
  };

  const closeSession = (sessionId: string) => {
    setSessions((prev) => {
      const newSessions = prev.filter((s) => s.id !== sessionId);

      // If we closed the active session, switch to another one
      if (sessionId === activeSessionId) {
        if (newSessions.length > 0) {
          setActiveSessionId(newSessions[0].id);
        } else {
          // If no sessions left, create a new one
          const newSession: ChatSession = {
            id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: "Chat 1",
            messages: [],
            createdAt: new Date(),
            lastActive: new Date(),
          };
          setActiveSessionId(newSession.id);
          return [newSession];
        }
      }

      return newSessions;
    });
  };

  const switchToSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    // Update last active time
    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? { ...session, lastActive: new Date() }
          : session
      )
    );
  };

  const updateSessionTitle = (sessionId: string, newTitle: string) => {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? { ...session, title: newTitle.trim() || session.title }
          : session
      )
    );
  };

  const startEditingTitle = (sessionId: string, currentTitle: string) => {
    setEditingSessionId(sessionId);
    setEditingTitle(currentTitle);
  };

  const finishEditingTitle = () => {
    if (editingSessionId) {
      updateSessionTitle(editingSessionId, editingTitle);
    }
    setEditingSessionId(null);
    setEditingTitle("");
  };

  const cancelEditingTitle = () => {
    setEditingSessionId(null);
    setEditingTitle("");
  };

  const handleModelChange = (
    providerId: string,
    modelId: string,
    model: AIModel
  ) => {
    if (!activeSessionId) return;

    setSessions((prev) =>
      prev.map((session) =>
        session.id === activeSessionId
          ? { ...session, providerId, modelId, model, lastActive: new Date() }
          : session
      )
    );
  };

  const handleSendMessage = async () => {
    if (
      !inputValue.trim() ||
      !activeSession ||
      !activeSession.providerId ||
      !activeSession.modelId
    ) {
      if (!activeSession?.providerId || !activeSession?.modelId) {
        toast.error("Please select an AI model first");
      }
      return;
    }

    const messageContent = inputValue.trim();
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: messageContent,
      role: "user",
      timestamp: new Date(),
    };

    // Add user message to active session
    setSessions((prev) =>
      prev.map((session) =>
        session.id === activeSessionId
          ? {
              ...session,
              messages: [...session.messages, userMessage],
              lastActive: new Date(),
              // Auto-generate title from first message if still default
              title:
                session.messages.length === 0 &&
                session.title.startsWith("Chat ")
                  ? messageContent.slice(0, 30) +
                    (messageContent.length > 30 ? "..." : "")
                  : session.title,
            }
          : session
      )
    );

    setInputValue("");
    setIsLoading(true);

    try {
      // Convert messages to conversation history for context
      const conversationHistory = activeSession.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Send chat message using the simplified API
      const response = await window.electronAPI.ai.sendChatMessage({
        content: messageContent,
        providerId: activeSession.providerId,
        modelId: activeSession.modelId,
        conversationHistory:
          conversationHistory.length > 0 ? conversationHistory : undefined,
      });

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        content: response.content,
        role: "assistant",
        timestamp: new Date(),
        providerId: activeSession.providerId,
        modelId: activeSession.modelId,
      };

      // Add assistant response to active session
      setSessions((prev) =>
        prev.map((session) =>
          session.id === activeSessionId
            ? {
                ...session,
                messages: [...session.messages, assistantMessage],
                lastActive: new Date(),
              }
            : session
        )
      );
    } catch (error) {
      console.error("Failed to get AI response:", error);
      toast.error("Failed to get AI response. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearActiveSession = () => {
    if (!activeSessionId) return;

    setSessions((prev) =>
      prev.map((session) =>
        session.id === activeSessionId
          ? { ...session, messages: [], lastActive: new Date() }
          : session
      )
    );
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Tab Bar */}
      <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center overflow-x-auto">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`flex items-center min-w-0 max-w-48 group ${
                session.id === activeSessionId
                  ? "bg-white dark:bg-gray-900 border-b-2 border-blue-500"
                  : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <button
                onClick={() => switchToSession(session.id)}
                onDoubleClick={() =>
                  startEditingTitle(session.id, session.title)
                }
                className="flex-1 px-3 py-2 text-left min-w-0"
              >
                {editingSessionId === session.id ? (
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={finishEditingTitle}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        finishEditingTitle();
                      } else if (e.key === "Escape") {
                        cancelEditingTitle();
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full text-sm font-medium bg-transparent border-none outline-none text-gray-900 dark:text-gray-100"
                    autoFocus
                  />
                ) : (
                  <div className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                    {session.title}
                  </div>
                )}
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {session.messages.length} messages
                </div>
              </button>
              {sessions.length > 1 && (
                <button
                  onClick={() => closeSession(session.id)}
                  className="p-1 mr-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <XMarkIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              )}
            </div>
          ))}

          {/* New Tab Button */}
          <button
            onClick={() => createNewSession()}
            className="p-2 m-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400"
            title="New Chat Session"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            {activeSession?.title || "AI Chat"}
          </h1>
          {activeSession && activeSession.messages.length > 0 && (
            <button
              onClick={clearActiveSession}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors"
            >
              Clear Session
            </button>
          )}
        </div>

        {/* Model Selector */}
        {activeSession && (
          <ModelSelector
            selectedProviderId={activeSession.providerId}
            selectedModelId={activeSession.modelId}
            onModelChange={handleModelChange}
            enabledProviders={enabledProviders}
            className="max-w-md"
            label="Select AI Model"
            showProviderInfo={true}
          />
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!activeSession && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🤖</div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Loading chat sessions...
            </h2>
          </div>
        )}

        {activeSession && activeSession.messages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🤖</div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Start a conversation
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              {enabledProviders.length === 0
                ? "Configure AI providers in Settings to start chatting"
                : activeSession.providerId
                  ? "Type a message below to chat with AI"
                  : "Select an AI model above to start chatting"}
            </p>
          </div>
        )}

        {activeSession?.messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[70%] p-3 rounded-lg ${
                message.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              }`}
            >
              {message.role === "assistant" ? (
                <MarkdownRenderer content={message.content} />
              ) : (
                <div className="whitespace-pre-wrap break-words">
                  {message.content}
                </div>
              )}
              <div className={`text-xs mt-2 opacity-70`}>
                {message.timestamp.toLocaleTimeString()}
                {message.role === "assistant" && (
                  <span className="ml-2">
                    •{" "}
                    {message.providerId
                      ? enabledProviders.find(
                          (p) => p.id === message.providerId
                        )?.name || message.providerId
                      : "AI"}
                    {message.modelId && ` (${message.modelId})`}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                <span className="text-gray-600 dark:text-gray-400">
                  AI is thinking...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex space-x-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              !activeSession
                ? "Loading..."
                : enabledProviders.length === 0
                  ? "Configure AI providers in Settings first..."
                  : activeSession.providerId
                    ? "Type your message... (Enter to send, Shift+Enter for new line)"
                    : "Select an AI model above first..."
            }
            disabled={
              !activeSession ||
              enabledProviders.length === 0 ||
              !activeSession.providerId
            }
            className="flex-1 resize-none border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            rows={3}
          />
          <button
            onClick={handleSendMessage}
            disabled={
              !inputValue.trim() ||
              isLoading ||
              !activeSession?.providerId ||
              enabledProviders.length === 0
            }
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-md transition-colors flex items-center"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
