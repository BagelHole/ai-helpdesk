import React from "react";

export const Dashboard: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Dashboard
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Messages Today
            </h3>
            <p className="text-3xl font-bold text-primary-600">0</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Auto Responses
            </h3>
            <p className="text-3xl font-bold text-green-600">0</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Response Time
            </h3>
            <p className="text-3xl font-bold text-blue-600">--</p>
          </div>
        </div>
      </div>
    </div>
  );
};
