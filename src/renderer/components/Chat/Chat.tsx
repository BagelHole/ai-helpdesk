import React, { useState, useRef, useEffect } from "react";
import { useAppStore } from "../../hooks/useAppStore";
import { ModelSelector } from "../ModelSelector/ModelSelector";
import { AIModel, AIProvider, ChatImageAttachment } from "@shared/types";
import {
  PaperAirplaneIcon,
  XMarkIcon,
  PlusIcon,
  PhotoIcon,
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
  const [images, setImages] = useState<ChatImageAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      (!inputValue.trim() && images.length === 0) ||
      !activeSession ||
      !activeSession.providerId ||
      !activeSession.modelId
    ) {
      if (!activeSession?.providerId || !activeSession?.modelId) {
        toast.error("Please select an AI model first");
      } else if (!inputValue.trim() && images.length === 0) {
        toast.error("Please enter a message or add an image");
      }
      return;
    }

    const messageContent = inputValue.trim();
    const hasImages = images.length > 0;

    // Create display content for the user message
    let displayContent = messageContent;
    if (hasImages) {
      displayContent += hasImages && messageContent ? "\n\n" : "";
      displayContent += `📎 ${images.length} image${images.length > 1 ? "s" : ""} attached`;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: displayContent,
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
    setImages([]); // Clear images after sending
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
        images: hasImages ? images : undefined,
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

  // Image handling functions
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newImages: ChatImageAttachment[] = [];
    const maxImages = 3;
    const maxFileSize = 10; // MB
    const maxSizeBytes = maxFileSize * 1024 * 1024;

    Array.from(files).forEach((file) => {
      // Check file type
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image file`);
        return;
      }

      // Check file size
      if (file.size > maxSizeBytes) {
        toast.error(
          `${file.name} is too large. Maximum size is ${maxFileSize}MB`
        );
        return;
      }

      // Check total count
      if (images.length + newImages.length >= maxImages) {
        toast.error(`Maximum ${maxImages} images allowed`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Data = (e.target?.result as string)?.split(",")[1];
        if (base64Data) {
          const imageAttachment: ChatImageAttachment = {
            id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            type: file.type,
            data: base64Data,
            size: file.size,
          };

          // Get image dimensions
          const img = new Image();
          img.onload = () => {
            imageAttachment.width = img.width;
            imageAttachment.height = img.height;

            newImages.push(imageAttachment);
            if (newImages.length === Array.from(files).length) {
              setImages([...images, ...newImages]);
            }
          };
          img.src = `data:${file.type};base64,${base64Data}`;
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const removeImage = (imageId: string) => {
    setImages(images.filter((img) => img.id !== imageId));
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {!activeSession && (
          <div className="text-center py-8">
            <div className="text-3xl mb-3">🤖</div>
            <h2 className="text-base font-medium text-gray-900 dark:text-white">
              Loading chat sessions...
            </h2>
          </div>
        )}

        {activeSession && activeSession.messages.length === 0 && (
          <div className="text-center py-8">
            <div className="text-3xl mb-3">🤖</div>
            <h2 className="text-base font-medium text-gray-900 dark:text-white mb-2">
              Start a conversation
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {enabledProviders.length === 0
                ? "Configure AI providers in Settings to start chatting"
                : activeSession.providerId
                  ? "Type a message below to chat with AI"
                  : "Select an AI model to start chatting"}
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
              className={`max-w-[75%] px-3 py-2 rounded-lg ${
                message.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
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
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin h-3 w-3 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  AI is thinking...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-800 p-3">
        {/* Image Previews */}
        {images.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {images.map((image) => (
              <div
                key={image.id}
                className="relative group rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800"
              >
                <img
                  src={`data:${image.type};base64,${image.data}`}
                  alt={image.name}
                  className="w-16 h-16 object-cover"
                />
                {/* Remove button */}
                <button
                  onClick={() => removeImage(image.id)}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  title="Remove image"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
                {/* Image info */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1">
                  <div className="truncate text-center">
                    {Math.round(image.size / 1024)}KB
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="relative">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />

          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            placeholder={
              !activeSession
                ? "Loading..."
                : enabledProviders.length === 0
                  ? "Configure AI providers in Settings first..."
                  : activeSession.providerId
                    ? "Type your message... (Enter to send, Shift+Enter for new line, or drag images here)"
                    : "Select an AI model first..."
            }
            disabled={
              !activeSession ||
              enabledProviders.length === 0 ||
              !activeSession.providerId
            }
            className={`w-full resize-none border rounded-lg px-3 py-2 pr-64 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
              isDragOver
                ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20 border-2"
                : "border-gray-200 dark:border-gray-700"
            }`}
            rows={3}
          />

          {/* Model Selector - inline with buttons */}
          {activeSession && (
            <div className="absolute bottom-3 right-24">
              <ModelSelector
                selectedProviderId={activeSession.providerId}
                selectedModelId={activeSession.modelId}
                onModelChange={handleModelChange}
                enabledProviders={enabledProviders}
                className="w-40"
                showProviderInfo={false}
                label=""
                dropUp={true}
              />
            </div>
          )}

          {/* Image Upload Button */}
          <button
            onClick={openFileDialog}
            disabled={
              !activeSession ||
              enabledProviders.length === 0 ||
              !activeSession.providerId
            }
            className="absolute bottom-3 right-12 p-2 hover:bg-gray-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-md transition-colors flex items-center justify-center"
            title="Upload images"
          >
            <PhotoIcon className="w-4 h-4" />
          </button>

          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={
              (!inputValue.trim() && images.length === 0) ||
              isLoading ||
              !activeSession?.providerId ||
              enabledProviders.length === 0
            }
            className="absolute bottom-3 right-2 p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-md transition-colors flex items-center justify-center"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
