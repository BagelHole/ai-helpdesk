import React from "react";

export const Header: React.FC = () => {
  return (
    <header
      className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          AI Helpdesk
        </h1>
        <div
          className="flex items-center space-x-4"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
        </div>
      </div>
    </header>
  );
};
