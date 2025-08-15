import React, { useState, useEffect } from "react";
import { CustomSystemPrompt } from "@shared/types";

interface AIPromptsSettingsProps {
  customSystemPrompts: CustomSystemPrompt[];
  activeSystemPrompt: string;
  onUpdate: (prompts: CustomSystemPrompt[], activePromptId: string) => void;
}

export const AIPromptsSettings: React.FC<AIPromptsSettingsProps> = ({
  customSystemPrompts,
  activeSystemPrompt,
  onUpdate,
}) => {
  const [prompts, setPrompts] = useState<CustomSystemPrompt[]>(
    customSystemPrompts || []
  );
  const [activePromptId, setActivePromptId] = useState(
    activeSystemPrompt || "default"
  );
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPrompt, setNewPrompt] = useState({
    name: "",
    content: "",
  });

  useEffect(() => {
    setPrompts(customSystemPrompts || []);
    setActivePromptId(activeSystemPrompt || "default");
  }, [customSystemPrompts, activeSystemPrompt]);

  const handleCreatePrompt = () => {
    if (!newPrompt.name.trim() || !newPrompt.content.trim()) return;

    const prompt: CustomSystemPrompt = {
      id: `custom-${Date.now()}`,
      name: newPrompt.name.trim(),
      content: newPrompt.content.trim(),
      isDefault: false,
      isActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedPrompts = [...prompts, prompt];
    setPrompts(updatedPrompts);
    onUpdate(updatedPrompts, activePromptId);
    setNewPrompt({ name: "", content: "" });
    setShowCreateForm(false);
  };

  const handleUpdatePrompt = (
    promptId: string,
    updates: Partial<CustomSystemPrompt>
  ) => {
    const updatedPrompts = prompts.map((prompt) => {
      if (prompt.id === promptId) {
        return {
          ...prompt,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
      }
      return prompt;
    });

    setPrompts(updatedPrompts);
    onUpdate(updatedPrompts, activePromptId);
  };

  const handleDeletePrompt = (promptId: string) => {
    if (promptId === "default") return; // Can't delete default prompt

    const updatedPrompts = prompts.filter((prompt) => prompt.id !== promptId);
    const newActivePromptId =
      activePromptId === promptId ? "default" : activePromptId;

    setPrompts(updatedPrompts);
    setActivePromptId(newActivePromptId);
    onUpdate(updatedPrompts, newActivePromptId);
  };

  const handleSetActive = (promptId: string) => {
    setActivePromptId(promptId);
    onUpdate(prompts, promptId);
  };

  const getPromptPreview = (content: string) => {
    return content.length > 150 ? content.substring(0, 150) + "..." : content;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          AI System Prompts
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Customize how the AI responds to support requests. Create different
          prompts for different scenarios or organizations.
        </p>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Active Prompt:{" "}
          <span className="font-medium text-gray-900 dark:text-white">
            {prompts.find((p) => p.id === activePromptId)?.name || "Default"}
          </span>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          Create New Prompt
        </button>
      </div>

      {showCreateForm && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
            Create New System Prompt
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Prompt Name
              </label>
              <input
                type="text"
                value={newPrompt.name}
                onChange={(e) =>
                  setNewPrompt({ ...newPrompt, name: e.target.value })
                }
                placeholder="e.g., Clair Support Assistant"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                System Prompt Content
              </label>
              <textarea
                value={newPrompt.content}
                onChange={(e) =>
                  setNewPrompt({ ...newPrompt, content: e.target.value })
                }
                rows={8}
                placeholder="You are an AI assistant for Clair..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewPrompt({ name: "", content: "" });
                }}
                className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePrompt}
                disabled={!newPrompt.name.trim() || !newPrompt.content.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
              >
                Create Prompt
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {prompts.map((prompt) => (
          <div
            key={prompt.id}
            className={`border rounded-lg p-4 ${
              activePromptId === prompt.id
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-200 dark:border-gray-700"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <h4 className="text-md font-medium text-gray-900 dark:text-white">
                  {prompt.name}
                </h4>
                {activePromptId === prompt.id && (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    Active
                  </span>
                )}
                {prompt.isDefault && (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                    Default
                  </span>
                )}
              </div>
              <div className="flex space-x-2">
                {activePromptId !== prompt.id && (
                  <button
                    onClick={() => handleSetActive(prompt.id)}
                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                  >
                    Set Active
                  </button>
                )}
                <button
                  onClick={() => setEditingPrompt(prompt.id)}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Edit
                </button>
                {!prompt.isDefault && (
                  <button
                    onClick={() => handleDeletePrompt(prompt.id)}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {editingPrompt === prompt.id ? (
              <div className="space-y-4">
                {!prompt.isDefault && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Prompt Name
                    </label>
                    <input
                      type="text"
                      value={prompt.name}
                      onChange={(e) =>
                        handleUpdatePrompt(prompt.id, { name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    System Prompt Content
                  </label>
                  <textarea
                    value={prompt.content}
                    onChange={(e) =>
                      handleUpdatePrompt(prompt.id, { content: e.target.value })
                    }
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setEditingPrompt(null)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >
                    Done Editing
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p className="mb-2">{getPromptPreview(prompt.content)}</p>
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  Created: {new Date(prompt.createdAt).toLocaleDateString()} •
                  Updated: {new Date(prompt.updatedAt).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-yellow-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              <strong>Tips for effective prompts:</strong>
              <br />• Be specific about your organization's tone and style
              <br />• Include escalation procedures and contact information
              <br />• Mention available tools and systems users might need help
              with
              <br />• Set clear boundaries for what the AI should and shouldn't
              do
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
