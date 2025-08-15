import React, { useState } from "react";
import { useQuery } from "react-query";
import {
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  MagnifyingGlassIcon,
  UserIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";

interface Device {
  id: string;
  deviceName: string;
  model: string;
  operatingSystem: string;
  osVersion: string;
  serialNumber: string;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
    department?: string;
  };
  status: "active" | "inactive" | "maintenance";
  lastSeen: string;
  applications: Array<{
    name: string;
    version: string;
  }>;
}

export const Devices: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  // Fetch devices from Rippling API
  const {
    data: devices = [],
    isLoading,
    refetch,
  } = useQuery<Device[]>(
    "devices",
    async () => {
      try {
        const result = await window.electronAPI.rippling?.getDevices();
        return result || [];
      } catch (error) {
        console.error("Failed to fetch devices:", error);
        return [];
      }
    },
    {
      refetchInterval: 60000, // Refresh every minute
    }
  );

  const filteredDevices = devices.filter(
    (device) =>
      device.deviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.assignedTo?.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      device.assignedTo?.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDeviceIcon = (os: string) => {
    if (
      os.toLowerCase().includes("ios") ||
      os.toLowerCase().includes("android")
    ) {
      return DevicePhoneMobileIcon;
    }
    return ComputerDesktopIcon;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return "badge badge-success";
      case "inactive":
        return "badge badge-secondary";
      case "maintenance":
        return "badge badge-warning";
      default:
        return "badge badge-secondary";
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const viewDeviceMessages = async (device: Device) => {
    try {
      // Navigate to messages view with user filter if user is assigned
      if (device.assignedTo?.email) {
        // This would filter messages by the user's email - feature for future implementation
        console.log("Viewing messages for device user:", device.assignedTo.email);
      } else {
        console.log("No user assigned to device:", device.deviceName);
      }
    } catch (error) {
      console.error("Failed to view device messages:", error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Device Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage devices from Rippling integration
          </p>
        </div>
        <button onClick={() => refetch()} className="btn btn-secondary">
          Refresh Devices
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search devices, users, or models..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Devices List */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Devices ({filteredDevices.length})
              </h2>
            </div>
            <div className="card-body">
              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400">
                    Loading devices...
                  </p>
                </div>
              ) : filteredDevices.length === 0 ? (
                <div className="text-center py-8">
                  <ComputerDesktopIcon className="mx-auto h-16 w-16 text-gray-400" />
                  <p className="text-gray-600 dark:text-gray-400 mt-4">
                    {searchTerm ? "No devices found" : "No devices available"}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    {searchTerm
                      ? "Try adjusting your search terms"
                      : "Connect to Rippling to see devices"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredDevices.map((device) => {
                    const DeviceIcon = getDeviceIcon(device.operatingSystem);
                    return (
                      <div
                        key={device.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedDevice?.id === device.id
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                        onClick={() => setSelectedDevice(device)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <DeviceIcon className="w-8 h-8 text-blue-600" />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {device.deviceName}
                              </p>
                              <p className="text-sm text-gray-500">
                                {device.model} • {device.operatingSystem}{" "}
                                {device.osVersion}
                              </p>
                              {device.assignedTo && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Assigned to: {device.assignedTo.name}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={getStatusBadge(device.status)}>
                              {device.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Device Details */}
        <div className="lg:col-span-1">
          {selectedDevice ? (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Device Details
                </h3>
              </div>
              <div className="card-body space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Basic Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Name:</span>
                      <span className="text-gray-900 dark:text-white">
                        {selectedDevice.deviceName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Model:</span>
                      <span className="text-gray-900 dark:text-white">
                        {selectedDevice.model}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">OS:</span>
                      <span className="text-gray-900 dark:text-white">
                        {selectedDevice.operatingSystem}{" "}
                        {selectedDevice.osVersion}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Serial:</span>
                      <span className="text-gray-900 dark:text-white text-xs">
                        {selectedDevice.serialNumber}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status:</span>
                      <span className={getStatusBadge(selectedDevice.status)}>
                        {selectedDevice.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last Seen:</span>
                      <span className="text-gray-900 dark:text-white">
                        {formatDate(selectedDevice.lastSeen)}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedDevice.assignedTo && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                      <UserIcon className="w-4 h-4 mr-1" />
                      Assigned User
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Name:</span>
                        <span className="text-gray-900 dark:text-white">
                          {selectedDevice.assignedTo.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Email:</span>
                        <span className="text-gray-900 dark:text-white text-xs">
                          {selectedDevice.assignedTo.email}
                        </span>
                      </div>
                      {selectedDevice.assignedTo.department && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Department:</span>
                          <span className="text-gray-900 dark:text-white">
                            {selectedDevice.assignedTo.department}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedDevice.applications.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                      <ClipboardDocumentListIcon className="w-4 h-4 mr-1" />
                      Installed Software ({selectedDevice.applications.length})
                    </h4>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {selectedDevice.applications
                        .slice(0, 10)
                        .map((app, index) => (
                          <div
                            key={index}
                            className="flex justify-between text-xs"
                          >
                            <span className="text-gray-600 dark:text-gray-400">
                              {app.name}
                            </span>
                            <span className="text-gray-500">{app.version}</span>
                          </div>
                        ))}
                      {selectedDevice.applications.length > 10 && (
                        <p className="text-xs text-gray-500 italic">
                          +{selectedDevice.applications.length - 10} more apps
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                  <button
                    onClick={() => viewDeviceMessages(selectedDevice)}
                    className="btn btn-primary w-full"
                  >
                    View Related Messages
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-body text-center py-8">
                <ComputerDesktopIcon className="mx-auto h-16 w-16 text-gray-400" />
                <p className="text-gray-600 dark:text-gray-400 mt-4">
                  Select a device to view details
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Device Summary Cards */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-body text-center">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {devices.filter((d) => d.status === "active").length}
            </h3>
            <p className="text-sm text-gray-500">Active Devices</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {devices.filter((d) => d.status === "inactive").length}
            </h3>
            <p className="text-sm text-gray-500">Inactive Devices</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {devices.filter((d) => d.status === "maintenance").length}
            </h3>
            <p className="text-sm text-gray-500">Under Maintenance</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {
                new Set(devices.map((d) => d.assignedTo?.email).filter(Boolean))
                  .size
              }
            </h3>
            <p className="text-sm text-gray-500">Unique Users</p>
          </div>
        </div>
      </div>
    </div>
  );
};
