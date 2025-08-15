import React from "react";
import { useQuery } from "react-query";
import { useNavigate } from "react-router-dom";
import { SlackMessage } from "@shared/types";

export const MessageQueue: React.FC = () => {
  const navigate = useNavigate();

  // Fetch messages from database
  const {
    data: messages,
    isLoading,
    refetch,
  } = useQuery<SlackMessage[]>(
    "messages",
    async () => {
      try {
        const result = await window.electronAPI.db.getMessages({});
        return result || [];
      } catch (error) {
        console.error("Failed to fetch messages:", error);
        return [];
      }
    },
    {
      refetchInterval: 5000, // Refresh every 5 seconds
      initialData: [], // Provide initial data so it doesn't start as undefined
    }
  );

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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Message Queue
        </h1>
        <div className="card">
          <div className="card-body">
            <p className="text-gray-600 dark:text-gray-400 text-center py-8">
              Loading messages...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Message Queue
        </h1>
        <div className="flex space-x-2">
          <button onClick={() => refetch()} className="btn btn-secondary">
            Refresh
          </button>
          <button
            onClick={async () => {
              try {
                await window.electronAPI.slack.forcePoll();
                console.log("Force poll triggered");
                // Refresh after polling
                setTimeout(() => refetch(), 2000);
              } catch (error) {
                console.error("Failed to force poll:", error);
              }
            }}
            className="btn btn-primary"
          >
            Force Poll
          </button>
          <button
            onClick={async () => {
              try {
                await window.electronAPI.db.clearMessages();
                console.log("Messages cleared");
                refetch();
              } catch (error) {
                console.error("Failed to clear messages:", error);
              }
            }}
            className="btn btn-warning"
          >
            Clear All
          </button>
        </div>
      </div>

      {messages?.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <p className="text-gray-600 dark:text-gray-400 text-center py-8">
              No messages in queue. Connect to Slack to start monitoring
              messages.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {messages?.map((message) => (
            <div
              key={message.id}
              className="card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/message/${message.id}`)}
            >
              <div className="card-body">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        User: {message.context?.userInfo?.name || message.user}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTimestamp(message.timestamp)}
                      </p>
                    </div>
                  </div>
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

                <div className="mb-3">
                  <p className="text-gray-900 dark:text-white">
                    {message.text}
                  </p>
                </div>

                {message.context?.userInfo && (
                  <div className="text-xs text-gray-500 mb-3">
                    <p>
                      Department: {message.context.userInfo.department || "N/A"}{" "}
                      | Email: {message.context.userInfo.email}
                    </p>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    Channel: #{message.channel} | Type: {message.type}
                  </span>
                  <div className="flex space-x-2">
                    <button className="btn btn-sm btn-primary">
                      Generate Response
                    </button>
                    <button className="btn btn-sm btn-secondary">
                      Mark as Read
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
