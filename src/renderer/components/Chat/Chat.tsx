import React, { useState, useRef, useEffect } from "react";
import { useAppStore } from "../../hooks/useAppStore";
import { ModelSelector } from "../ModelSelector/ModelSelector";
import { AIModel, AIProvider } from "@shared/types";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

interface ChatMessage {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  providerId?: string;
  modelId?: string;
}

export const Chat: React.FC = () => {
  const { settings } = useAppStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string>();
  const [selectedModelId, setSelectedModelId] = useState<string>();
  const [selectedModel, setSelectedModel] = useState<AIModel>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Storage keys
  const CHAT_MESSAGES_KEY = "ai-chat-messages";
  const CHAT_MODEL_KEY = "ai-chat-selected-model";

  // Get enabled AI providers
  const enabledProviders: AIProvider[] = settings?.ai?.providers?.filter(
    (provider) => provider.isEnabled && provider.apiKey
  ) || [];

  // Load saved messages and model selection on mount
  useEffect(() => {
    try {
      // Load saved messages
      const savedMessages = localStorage.getItem(CHAT_MESSAGES_KEY);
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(parsedMessages);
      }

      // Load saved model selection
      const savedModel = localStorage.getItem(CHAT_MODEL_KEY);
      if (savedModel) {
        const { providerId, modelId, model } = JSON.parse(savedModel);
        setSelectedProviderId(providerId);
        setSelectedModelId(modelId);
        setSelectedModel(model);
      }
    } catch (error) {
      console.warn("Failed to load saved chat data:", error);
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleModelChange = (
    providerId: string,
    modelId: string,
    model: AIModel
  ) => {
    setSelectedProviderId(providerId);
    setSelectedModelId(modelId);
    setSelectedModel(model);

    // Save model selection to localStorage
    try {
      localStorage.setItem(
        CHAT_MODEL_KEY,
        JSON.stringify({ providerId, modelId, model })
      );
    } catch (error) {
      console.warn("Failed to save model selection:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !selectedProviderId || !selectedModelId) {
      if (!selectedProviderId || !selectedModelId) {
        toast.error("Please select an AI model first");
      }
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: inputValue.trim(),
      role: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Convert messages to conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Send chat message using the simplified API
      const response = await window.electronAPI.ai.sendChatMessage({
        content: inputValue.trim(),
        providerId: selectedProviderId,
        modelId: selectedModelId,
        conversationHistory: conversationHistory.length > 0 ? conversationHistory : undefined,
      });

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        content: response.content,
        role: "assistant",
        timestamp: new Date(),
        providerId: selectedProviderId,
        modelId: selectedModelId,
      };

      setMessages((prev) => [...prev, assistantMessage]);
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

  const clearChat = () => {
    setMessages([]);
    // Also clear from localStorage
    localStorage.removeItem(CHAT_MESSAGES_KEY);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            AI Chat
          </h1>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors"
            >
              Clear Chat
            </button>
          )}
        </div>
        
        {/* Model Selector */}
        <ModelSelector
          selectedProviderId={selectedProviderId}
          selectedModelId={selectedModelId}
          onModelChange={handleModelChange}
          enabledProviders={enabledProviders}
          className="max-w-md"
          label="Select AI Model"
          showProviderInfo={true}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🤖</div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Start a conversation
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              {enabledProviders.length === 0
                ? "Configure AI providers in Settings to start chatting"
                : "Type a message below to chat with AI"}
            </p>
          </div>
        )}

        {messages.map((message) => (
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
              <div className="whitespace-pre-wrap break-words">{message.content}</div>
              <div className={`text-xs mt-2 opacity-70`}>
                {message.timestamp.toLocaleTimeString()}
                {message.role === "assistant" && (
                  <span className="ml-2">
                    • {message.providerId ? 
                      enabledProviders.find(p => p.id === message.providerId)?.name || message.providerId
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
              enabledProviders.length === 0
                ? "Configure AI providers in Settings first..."
                : selectedProviderId
                ? "Type your message... (Enter to send, Shift+Enter for new line)"
                : "Select an AI model above first..."
            }
            disabled={enabledProviders.length === 0 || !selectedProviderId}
            className="flex-1 resize-none border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            rows={3}
          />
          <button
            onClick={handleSendMessage}
            disabled={
              !inputValue.trim() ||
              isLoading ||
              !selectedProviderId ||
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