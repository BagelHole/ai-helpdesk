import axios, { AxiosInstance } from "axios";
import { Logger } from "./logger-service";
import { RipplingUser, DeviceInfo, InstalledApplication } from "@shared/types";

export class RipplingService {
  private client: AxiosInstance | null = null;
  private logger: Logger;
  private isConnected = false;
  private baseUrl: string;
  private apiKey: string | null = null;

  constructor() {
    this.logger = new Logger();
    this.baseUrl = "https://api.rippling.com";
  }

  public async connect(apiKey: string, baseUrl?: string): Promise<void> {
    try {
      this.logger.info("Connecting to Rippling API...");

      this.apiKey = apiKey;
      if (baseUrl) {
        this.baseUrl = baseUrl;
      }

      // Initialize axios client
      this.client = axios.create({
        baseURL: this.baseUrl,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 30000, // 30 seconds
      });

      // Add response interceptor for error handling
      this.client.interceptors.response.use(
        (response) => response,
        (error) => {
          this.logger.error("Rippling API error:", {
            status: error.response?.status,
            message: error.response?.data?.message || error.message,
            url: error.config?.url,
          });
          return Promise.reject(error);
        }
      );

      // Test the connection
      await this.testConnection();

      this.isConnected = true;
      this.logger.info("Successfully connected to Rippling API");
    } catch (error) {
      this.logger.error("Failed to connect to Rippling:", error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    this.client = null;
    this.apiKey = null;
    this.isConnected = false;
    this.logger.info("Disconnected from Rippling API");
  }

  public isRipplingConnected(): boolean {
    return this.isConnected;
  }

  public async testConnection(): Promise<boolean> {
    if (!this.client) {
      throw new Error("Rippling client not initialized");
    }

    try {
      // Try to fetch a small amount of data to test the connection
      const response = await this.client.get("/employees", {
        params: { limit: 1 },
      });

      return response.status === 200;
    } catch (error) {
      this.logger.error("Rippling connection test failed:", error);
      throw new Error(
        "Failed to connect to Rippling API. Please check your API key and permissions."
      );
    }
  }

  public async getUserInfo(email: string): Promise<RipplingUser | null> {
    if (!this.client) {
      throw new Error("Rippling client not connected");
    }

    try {
      this.logger.debug("Fetching user info from Rippling:", email);

      // Search for user by email
      const response = await this.client.get("/employees", {
        params: {
          email,
          include: "devices,applications",
        },
      });

      if (
        response.data &&
        response.data.results &&
        response.data.results.length > 0
      ) {
        const userData = response.data.results[0];

        // Get user's devices
        const devices = await this.getUserDevices(userData.id);

        const user: RipplingUser = {
          id: userData.id,
          employeeId: userData.employee_id,
          firstName: userData.first_name,
          lastName: userData.last_name,
          email: userData.email,
          title: userData.title || "",
          department: userData.department || "",
          manager: userData.manager?.email,
          startDate: userData.start_date,
          status: userData.status,
          workLocation: userData.work_location || "",
          phoneNumber: userData.phone_number,
          devices,
        };

        this.logger.debug("Successfully fetched user info:", user.email);
        return user;
      }

      this.logger.warn("User not found in Rippling:", email);
      return null;
    } catch (error) {
      this.logger.error("Error fetching user info from Rippling:", error);
      throw error;
    }
  }

  public async getUserDevices(userId: string): Promise<DeviceInfo[]> {
    if (!this.client) {
      throw new Error("Rippling client not connected");
    }

    try {
      const response = await this.client.get(`/employees/${userId}/devices`);

      if (response.data && response.data.results) {
        const devices: DeviceInfo[] = [];

        for (const deviceData of response.data.results) {
          // Get applications for this device
          const applications = await this.getDeviceApplications(deviceData.id);

          const device: DeviceInfo = {
            id: deviceData.id,
            userId,
            deviceName: deviceData.name,
            operatingSystem: deviceData.operating_system,
            osVersion: deviceData.os_version,
            model: deviceData.model,
            serialNumber: deviceData.serial_number,
            macAddress: deviceData.mac_address,
            ipAddress: deviceData.ip_address,
            lastSeen: deviceData.last_seen,
            applications,
            specifications: {
              cpu: deviceData.specifications?.cpu || "",
              memory: deviceData.specifications?.memory || "",
              storage: deviceData.specifications?.storage || "",
              gpu: deviceData.specifications?.gpu,
              networkAdapters:
                deviceData.specifications?.network_adapters || [],
            },
          };

          devices.push(device);
        }

        return devices;
      }

      return [];
    } catch (error) {
      this.logger.error("Error fetching user devices from Rippling:", error);
      return [];
    }
  }

  public async getDeviceApplications(
    deviceId: string
  ): Promise<InstalledApplication[]> {
    if (!this.client) {
      throw new Error("Rippling client not connected");
    }

    try {
      const response = await this.client.get(
        `/devices/${deviceId}/applications`
      );

      if (response.data && response.data.results) {
        return response.data.results.map(
          (app: any): InstalledApplication => ({
            name: app.name,
            version: app.version,
            vendor: app.vendor || "Unknown",
            installDate: app.install_date,
            category: app.category || "Other",
          })
        );
      }

      return [];
    } catch (error) {
      this.logger.error(
        "Error fetching device applications from Rippling:",
        error
      );
      return [];
    }
  }

  public async getAllUsers(
    limit: number = 100,
    offset: number = 0
  ): Promise<RipplingUser[]> {
    if (!this.client) {
      throw new Error("Rippling client not connected");
    }

    try {
      this.logger.debug("Fetching all users from Rippling:", { limit, offset });

      const response = await this.client.get("/employees", {
        params: {
          limit,
          offset,
          status: "active", // Only get active employees
        },
      });

      if (response.data && response.data.results) {
        const users: RipplingUser[] = [];

        for (const userData of response.data.results) {
          // Get devices for each user (this might be slow for large datasets)
          const devices = await this.getUserDevices(userData.id);

          const user: RipplingUser = {
            id: userData.id,
            employeeId: userData.employee_id,
            firstName: userData.first_name,
            lastName: userData.last_name,
            email: userData.email,
            title: userData.title || "",
            department: userData.department || "",
            manager: userData.manager?.email,
            startDate: userData.start_date,
            status: userData.status,
            workLocation: userData.work_location || "",
            phoneNumber: userData.phone_number,
            devices,
          };

          users.push(user);
        }

        this.logger.debug(`Fetched ${users.length} users from Rippling`);
        return users;
      }

      return [];
    } catch (error) {
      this.logger.error("Error fetching all users from Rippling:", error);
      throw error;
    }
  }

  public async searchUsers(query: string): Promise<RipplingUser[]> {
    if (!this.client) {
      throw new Error("Rippling client not connected");
    }

    try {
      const response = await this.client.get("/employees/search", {
        params: {
          q: query,
          limit: 20,
        },
      });

      if (response.data && response.data.results) {
        const users: RipplingUser[] = [];

        for (const userData of response.data.results) {
          const devices = await this.getUserDevices(userData.id);

          const user: RipplingUser = {
            id: userData.id,
            employeeId: userData.employee_id,
            firstName: userData.first_name,
            lastName: userData.last_name,
            email: userData.email,
            title: userData.title || "",
            department: userData.department || "",
            manager: userData.manager?.email,
            startDate: userData.start_date,
            status: userData.status,
            workLocation: userData.work_location || "",
            phoneNumber: userData.phone_number,
            devices,
          };

          users.push(user);
        }

        return users;
      }

      return [];
    } catch (error) {
      this.logger.error("Error searching users in Rippling:", error);
      throw error;
    }
  }

  public async syncAllUsers(): Promise<{
    success: number;
    failed: number;
    total: number;
  }> {
    this.logger.info("Starting full user sync from Rippling...");

    let offset = 0;
    const limit = 50; // Process in batches
    let allUsers: RipplingUser[] = [];
    let hasMore = true;
    const success = 0;
    const failed = 0;

    try {
      while (hasMore) {
        const users = await this.getAllUsers(limit, offset);

        if (users.length === 0) {
          hasMore = false;
        } else {
          allUsers = allUsers.concat(users);
          offset += limit;

          // If we got fewer users than the limit, we've reached the end
          if (users.length < limit) {
            hasMore = false;
          }
        }

        // Add a small delay to avoid hitting rate limits
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      this.logger.info(`Synced ${allUsers.length} users from Rippling`);

      return {
        success: allUsers.length,
        failed: 0,
        total: allUsers.length,
      };
    } catch (error) {
      this.logger.error("Error during user sync:", error);
      return {
        success,
        failed: failed + 1,
        total: success + failed + 1,
      };
    }
  }

  // Utility methods
  public async getDeviceById(deviceId: string): Promise<DeviceInfo | null> {
    if (!this.client) {
      throw new Error("Rippling client not connected");
    }

    try {
      const response = await this.client.get(`/devices/${deviceId}`);

      if (response.data) {
        const deviceData = response.data;
        const applications = await this.getDeviceApplications(deviceId);

        return {
          id: deviceData.id,
          userId: deviceData.user_id,
          deviceName: deviceData.name,
          operatingSystem: deviceData.operating_system,
          osVersion: deviceData.os_version,
          model: deviceData.model,
          serialNumber: deviceData.serial_number,
          macAddress: deviceData.mac_address,
          ipAddress: deviceData.ip_address,
          lastSeen: deviceData.last_seen,
          applications,
          specifications: {
            cpu: deviceData.specifications?.cpu || "",
            memory: deviceData.specifications?.memory || "",
            storage: deviceData.specifications?.storage || "",
            gpu: deviceData.specifications?.gpu,
            networkAdapters: deviceData.specifications?.network_adapters || [],
          },
        };
      }

      return null;
    } catch (error) {
      this.logger.error("Error fetching device by ID:", error);
      return null;
    }
  }

  public async getUserBySlackEmail(
    slackEmail: string
  ): Promise<RipplingUser | null> {
    // This is a convenience method that tries to match Slack users with Rippling users
    return await this.getUserInfo(slackEmail);
  }

  public async getDepartments(): Promise<string[]> {
    if (!this.client) {
      throw new Error("Rippling client not connected");
    }

    try {
      const response = await this.client.get("/departments");

      if (response.data && response.data.results) {
        return response.data.results.map((dept: any) => dept.name);
      }

      return [];
    } catch (error) {
      this.logger.error("Error fetching departments from Rippling:", error);
      return [];
    }
  }

  public async getApplicationCatalog(): Promise<any[]> {
    if (!this.client) {
      throw new Error("Rippling client not connected");
    }

    try {
      const response = await this.client.get("/applications/catalog");

      if (response.data && response.data.results) {
        return response.data.results.map((app: any) => ({
          id: app.id,
          name: app.name,
          vendor: app.vendor,
          category: app.category,
          version: app.latest_version,
          description: app.description,
        }));
      }

      return [];
    } catch (error) {
      this.logger.error(
        "Error fetching application catalog from Rippling:",
        error
      );
      return [];
    }
  }
}
