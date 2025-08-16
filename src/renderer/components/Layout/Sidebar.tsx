import React from "react";
import { NavLink } from "react-router-dom";
import {
  DocumentIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from "@heroicons/react/24/outline";
import { useAppStore } from "../../hooks/useAppStore";

const baseNavigation = [
  { name: "Messages", href: "/", icon: ChatBubbleLeftRightIcon },
  { name: "Docs", href: "/docs", icon: DocumentIcon },
  { name: "Settings", href: "/settings", icon: Cog6ToothIcon },
];

const devicesNavItem = { name: "Devices", href: "/devices", icon: ChartBarIcon };

export const Sidebar: React.FC = () => {
  const { sidebarCollapsed, setSidebarCollapsed, settings } = useAppStore();
  
  // Check if Rippling API key is configured to show devices tab
  const hasRipplingApiKey = Boolean(settings?.rippling?.apiKey);
  
  // Build navigation array conditionally
  const navigation = [...baseNavigation];
  if (hasRipplingApiKey) {
    // Insert devices tab before settings (at index 2)
    navigation.splice(2, 0, devicesNavItem);
  }

  return (
    <div
      className={`fixed inset-y-0 left-0 z-50 ${
        sidebarCollapsed ? "w-20" : "w-64"
      } bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300`}
    >
      <div className="flex flex-col h-full">
        {/* Logo/Header */}
        <div className="flex items-center justify-between h-16 px-4 pt-8 pb-2 border-b border-gray-200 dark:border-gray-700">
          {!sidebarCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">🤖</span>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto">
              <span className="text-white text-lg">🤖</span>
            </div>
          )}

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {sidebarCollapsed ? (
              <ChevronDoubleRightIcon className="w-5 h-5" />
            ) : (
              <ChevronDoubleLeftIcon className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-2 space-y-2">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) => `
                flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                ${
                  isActive
                    ? "bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                }
              `}
              title={sidebarCollapsed ? item.name : undefined}
            >
              <item.icon
                className={`${sidebarCollapsed ? "w-6 h-6" : "w-5 h-5 mr-3"} flex-shrink-0`}
              />
              {!sidebarCollapsed && item.name}
            </NavLink>
          ))}
        </nav>

        {/* Connection Status */}
        <div className="px-4 pb-4">
          <div className={`${sidebarCollapsed ? "hidden" : "block"} space-y-2`}>
            <ConnectionStatus service="slack" />
            <ConnectionStatus service="rippling" />
            <ConnectionStatus service="openai" />
            <ConnectionStatus service="google" />
            <ConnectionStatus service="anthropic" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const ConnectionStatus: React.FC<{
  service: "slack" | "rippling" | "openai" | "google" | "anthropic";
}> = ({ service }) => {
  const connections = useAppStore((state) => state.connections);
  const status = connections[service];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "text-green-500";
      case "connecting":
        return "text-yellow-500";
      case "error":
        return "text-red-500";
      default:
        return "text-gray-400";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "connected":
        return "Connected";
      case "connecting":
        return "Connecting...";
      case "error":
        return "Error";
      default:
        return "Disconnected";
    }
  };

  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-500 dark:text-gray-400 capitalize">
        {service}
      </span>
      <span className={getStatusColor(status)}>{getStatusText(status)}</span>
    </div>
  );
};
