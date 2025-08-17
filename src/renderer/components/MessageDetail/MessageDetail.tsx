import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "react-query";
import {
  SlackMessage,
  AIProvider,
  AIModel,
  ChatImageAttachment,
} from "@shared/types";
import {
  ArrowLeftIcon,
  PaperAirplaneIcon,
  PhotoIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { ModelSelector } from "../ModelSelector/ModelSelector";
import { useAppStore } from "../../hooks/useAppStore";
import toast from "react-hot-toast";

import { MarkdownRenderer } from "../MarkdownRenderer";

export const MessageDetail: React.FC = () => {
  const { messageId } = useParams<{ messageId: string }>();
  const navigate = useNavigate();
  const { settings } = useAppStore();
  const [aiInput, setAiInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiAttachments, setAiAttachments] = useState<any[]>([]);
  const [enabledProviders, setEnabledProviders] = useState<AIProvider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [images, setImages] = useState<ChatImageAttachment[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch the specific message
  const { data: message, isLoading } = useQuery<SlackMessage | null>(
    ["message", messageId],
    async () => {
      try {
        const result = await window.electronAPI.db.getMessages({
          messageId,
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

  // Build enabled providers
  useEffect(() => {
    if (settings?.ai?.providers) {
      const providers = settings.ai.providers.filter(
        (p) => p.isEnabled && p.apiKey
      );
      setEnabledProviders(providers);
    }
  }, [settings]);

  const handleModelChange = (
    providerId: string,
    modelId: string,
    _model: AIModel
  ) => {
    setSelectedProviderId(providerId);
    setSelectedModelId(modelId);
  };

  const handleGenerateResponse = async () => {
    if (!message || (!aiInput.trim() && images.length === 0)) return;

    setIsGenerating(true);
    setAiResponse(null);
    setAiAttachments([]);

    try {
      const response = await window.electronAPI.ai.sendChatMessage({
        content: aiInput.trim(),
        providerId: selectedProviderId,
        modelId: selectedModelId,
        conversationHistory: [
          {
            role: "user",
            content: `Context: This is a Slack message from ${message.user} in #${message.channel}: "${message.text}". ${
              threadMessages.length > 1
                ? `Thread context: ${threadMessages
                    .filter((msg) => msg.id !== message.id)
                    .map((msg) => `${msg.user}: ${msg.text}`)
                    .join("\n")}`
                : ""
            }`,
          },
        ],
        images: images.length > 0 ? images : undefined,
      });

      setAiResponse(response.content);
      console.log("AI response generated:", response);

      // Display which model was used
      const usedProvider = enabledProviders.find(
        (p) => p.id === selectedProviderId
      );
      if (usedProvider) {
        console.log(
          `Response generated using ${usedProvider.name} - ${selectedModelId}`
        );
      }
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
                {enabledProviders.length > 0 && (
                  <ModelSelector
                    selectedProviderId={selectedProviderId}
                    selectedModelId={selectedModelId}
                    onModelChange={handleModelChange}
                    enabledProviders={enabledProviders}
                    label="Select AI Model"
                    className="w-full"
                    dropUp={false}
                  />
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ask the AI about this issue
                  </label>

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
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      placeholder="How should I respond to this request? (You can also drag screenshots here)"
                      className={`w-full p-3 pr-12 border rounded-lg resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors ${
                        isDragOver
                          ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20 border-2"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                      rows={4}
                    />

                    {/* Image Upload Button */}
                    <button
                      onClick={openFileDialog}
                      className="absolute top-3 right-3 p-2 hover:bg-gray-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-gray-400 hover:text-white rounded-md transition-colors flex items-center justify-center"
                      title="Upload screenshots"
                    >
                      <PhotoIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleGenerateResponse}
                  disabled={
                    (!aiInput.trim() && images.length === 0) ||
                    isGenerating ||
                    !selectedProviderId ||
                    !selectedModelId
                  }
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
                    <div className="text-gray-900 dark:text-white whitespace-pre-wrap prose prose-sm max-w-none dark:prose-invert">
                      <MarkdownRenderer content={aiResponse} />
                    </div>

                    {/* Attachments */}
                    {aiAttachments.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
                        <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                          Referenced Documents:
                        </h5>
                        <div className="space-y-2">
                          {aiAttachments.map((attachment) => (
                            <div
                              key={attachment.id}
                              className="flex items-center space-x-2 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md"
                            >
                              <div className="flex-shrink-0">
                                {attachment.type === "pdf" ? (
                                  <svg
                                    className="w-5 h-5 text-red-500"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                ) : (
                                  <svg
                                    className="w-5 h-5 text-blue-500"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {attachment.name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {Math.round(attachment.size / 1024)} KB •{" "}
                                  {attachment.type.toUpperCase()}
                                </p>
                              </div>
                              <div className="flex space-x-1">
                                <button
                                  onClick={async () => {
                                    try {
                                      await window.electronAPI.docs.showInFolder(
                                        attachment.documentId
                                      );
                                      console.log(
                                        "Opened file location in explorer"
                                      );
                                    } catch (error) {
                                      console.error(
                                        "Failed to show in folder:",
                                        error
                                      );
                                    }
                                  }}
                                  className="flex-shrink-0 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                                  title="Show in Finder/Explorer (then drag from there to Slack)"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                                    />
                                  </svg>
                                </button>
                                <button
                                  onClick={async () => {
                                    try {
                                      const result =
                                        await window.electronAPI.docs.viewDocument(
                                          attachment.documentId
                                        );
                                      console.log(
                                        "Document view result:",
                                        result
                                      );
                                    } catch (error) {
                                      console.error(
                                        "Failed to view document:",
                                        error
                                      );
                                    }
                                  }}
                                  className="flex-shrink-0 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                  title="View document"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

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
                        onClick={() => {
                          setAiResponse(null);
                          setAiAttachments([]);
                          setImages([]);
                          setAiInput("");
                        }}
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
