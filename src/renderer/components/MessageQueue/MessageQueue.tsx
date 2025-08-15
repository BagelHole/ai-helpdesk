import React from "react";

export const MessageQueue: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Message Queue
      </h1>
      <div className="card">
        <div className="card-body">
          <p className="text-gray-600 dark:text-gray-400 text-center py-8">
            No messages in queue. Connect to Slack to start monitoring messages.
          </p>
        </div>
      </div>
    </div>
  );
};
