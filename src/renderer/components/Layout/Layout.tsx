import React from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useSidebarCollapsed } from "../../hooks/useAppStore";

export const Layout: React.FC = () => {
  const sidebarCollapsed = useSidebarCollapsed();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          sidebarCollapsed ? "ml-16" : "ml-64"
        }`}
      >
        {/* Header */}
        <Header />

        {/* Page content */}
        <main className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0 overflow-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
