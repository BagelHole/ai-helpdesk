import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "react-query";
import { SlackMessage } from "@shared/types";
import { ArrowLeftIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";

export const MessageDetail: React.FC = () => {
  const { messageId } = useParams<{ messageId: string }>();
  const navigate = useNavigate();
  const [aiInput, setAiInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  // Fetch the specific message
  const { data: message, isLoading } = useQuery<SlackMessage | null>(
    ["message", messageId],
    async () => {
      try {
        const result = await window.electronAPI.db.getMessages({
          messageId: messageId,
        });
        return result?.[0] || null;
      } catch (error) {
        console.error("Failed to fetch message:", error);
        return null;
      }
    },
    {
      enabled: !!messageId,
    }
  );

  // Fetch thread messages if this is part of a thread
  const { data: threadMessages = [] } = useQuery<SlackMessage[]>(
    ["thread", message?.thread_ts],
    async () => {
      if (!message?.thread_ts) return [];
      try {
        const result = await window.electronAPI.db.getMessages({
          thread_ts: message.thread_ts,
        });
        return result || [];
      } catch (error) {
        console.error("Failed to fetch thread messages:", error);
        return [];
      }
    },
    {
      enabled: !!message?.thread_ts,
    }
  );

  const handleGenerateResponse = async () => {
    if (!message || !aiInput.trim()) return;

    setIsGenerating(true);
    setAiResponse(null);

    try {
      const response = await window.electronAPI.ai.generateResponse({
        message,
        threadMessages: threadMessages || [],
        userInput: aiInput,
        // TODO: Add providerId selection from UI
      });

      setAiResponse(response.response);
      console.log("AI response generated:", response);
    } catch (error) {
      console.error("Failed to generate AI response:", error);
      setAiResponse(
        "Sorry, I encountered an error while generating a response. Please try again."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(parseFloat(timestamp) * 1000);
      return date.toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "badge badge-error";
      case "MEDIUM":
        return "badge badge-warning";
      case "LOW":
        return "badge badge-success";
      default:
        return "badge badge-secondary";
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "PASSWORD_RESET":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "SOFTWARE_INSTALL":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "VPN_ISSUE":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "HARDWARE_ISSUE":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate("/")}
            className="btn btn-secondary mr-4"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Messages
          </button>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-gray-600 dark:text-gray-400 text-center py-8">
              Loading message...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="p-6">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate("/")}
            className="btn btn-secondary mr-4"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Messages
          </button>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-gray-600 dark:text-gray-400 text-center py-8">
              Message not found.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate("/")} className="btn btn-secondary">
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Messages
        </button>
        <div className="flex items-center space-x-2">
          <span className={getPriorityBadge(message.priority)}>
            {message.priority}
          </span>
          <span
            className={`px-2 py-1 text-xs rounded-full ${getCategoryBadge(
              message.category
            )}`}
          >
            {message.category.replace("_", " ")}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Message Thread */}
        <div className="lg:col-span-2 space-y-4">
          {/* Original Message */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Original Message
              </h2>
              <p className="text-sm text-gray-500">
                {message.user} in #{message.channel} •{" "}
                {formatTimestamp(message.timestamp)}
              </p>
            </div>
            <div className="card-body">
              <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                {message.text}
              </p>
              {message.context?.userInfo && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    User Information
                  </h4>
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <p>Email: {message.context.userInfo.email}</p>
                    {message.context.userInfo.department && (
                      <p>Department: {message.context.userInfo.department}</p>
                    )}
                    {message.context.userInfo.title && (
                      <p>Title: {message.context.userInfo.title}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Thread Messages */}
          {threadMessages.length > 1 && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Thread Conversation ({threadMessages.length - 1} replies)
                </h3>
              </div>
              <div className="card-body space-y-4">
                {threadMessages
                  .filter((msg) => msg.id !== message.id)
                  .sort(
                    (a, b) => parseFloat(a.timestamp) - parseFloat(b.timestamp)
                  )
                  .map((msg) => (
                    <div
                      key={msg.id}
                      className="border-l-2 border-gray-200 dark:border-gray-700 pl-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {msg.user}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(msg.timestamp)}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {msg.text}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* AI Chat Interface */}
        <div className="lg:col-span-1">
          <div className="card h-fit">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                AI Assistant
              </h3>
              <p className="text-sm text-gray-500">
                Get help with this IT request
              </p>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ask the AI about this issue
                  </label>
                  <textarea
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="How should I respond to this request?"
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    rows={4}
                  />
                </div>
                <button
                  onClick={handleGenerateResponse}
                  disabled={!aiInput.trim() || isGenerating}
                  className="btn btn-primary w-full"
                >
                  {isGenerating ? (
                    "Generating..."
                  ) : (
                    <>
                      <PaperAirplaneIcon className="w-4 h-4 mr-2" />
                      Generate Response
                    </>
                  )}
                </button>
              </div>

              {/* AI Response Display */}
              {aiResponse && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    AI Suggested Response
                  </h4>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                      {aiResponse}
                    </p>
                    <div className="mt-3 flex space-x-2">
                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(aiResponse)
                        }
                        className="btn btn-sm btn-secondary"
                      >
                        Copy Response
                      </button>
                      <button
                        onClick={() => setAiResponse(null)}
                        className="btn btn-sm btn-secondary"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!aiResponse && !isGenerating && (
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    AI responses will appear here after generation.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
