import React from "react";

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = "Initializing application...",
}) => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-primary-500 to-purple-600 flex flex-col items-center justify-center z-50">
      <div className="text-center text-white">
        {/* Logo */}
        <div className="mb-8">
          <div className="text-6xl mb-4 animate-pulse">🤖</div>
          <h1 className="text-4xl font-bold mb-2">AI Helpdesk</h1>
          <p className="text-primary-100 text-lg">
            Intelligent Slack Assistant
          </p>
        </div>

        {/* Loading spinner */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-white/30 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-white rounded-full animate-spin"></div>
          </div>
        </div>

        {/* Loading message */}
        <p className="text-primary-100 text-lg animate-pulse">{message}</p>

        {/* Progress dots */}
        <div className="flex justify-center mt-4 space-x-2">
          <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse"></div>
          <div
            className="w-2 h-2 bg-white/50 rounded-full animate-pulse"
            style={{ animationDelay: "0.2s" }}
          ></div>
          <div
            className="w-2 h-2 bg-white/50 rounded-full animate-pulse"
            style={{ animationDelay: "0.4s" }}
          ></div>
        </div>
      </div>

      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white rounded-full blur-xl"></div>
        <div className="absolute top-3/4 right-1/4 w-48 h-48 bg-white rounded-full blur-xl"></div>
        <div className="absolute bottom-1/4 left-1/3 w-24 h-24 bg-white rounded-full blur-xl"></div>
      </div>
    </div>
  );
};
