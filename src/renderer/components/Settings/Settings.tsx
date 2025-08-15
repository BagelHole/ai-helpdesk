import React from "react";

export const Settings: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Settings
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                API Configuration
              </h2>
            </div>
            <div className="card-body space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Slack Bot Token
                </label>
                <input
                  type="password"
                  className="input"
                  placeholder="xoxb-your-bot-token"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Rippling API Key
                </label>
                <input
                  type="password"
                  className="input"
                  placeholder="Enter your Rippling API key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  OpenAI API Key
                </label>
                <input
                  type="password"
                  className="input"
                  placeholder="sk-your-openai-key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Google Gemini API Key
                </label>
                <input
                  type="password"
                  className="input"
                  placeholder="Your Google AI Studio API key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Anthropic Claude API Key
                </label>
                <input
                  type="password"
                  className="input"
                  placeholder="sk-ant-your-anthropic-key"
                />
              </div>
            </div>
            <div className="card-footer">
              <button className="btn btn-primary">Save Configuration</button>
            </div>
          </div>
        </div>
        <div>
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Connection Status
              </h2>
            </div>
            <div className="card-body space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Slack
                </span>
                <span className="badge badge-secondary">Disconnected</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Rippling
                </span>
                <span className="badge badge-secondary">Disconnected</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  OpenAI
                </span>
                <span className="badge badge-secondary">Disconnected</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
