import Store from "electron-store";
import { safeStorage } from "electron";
import { AppSettings, DeepPartial } from "@shared/types";
import { Logger } from "./logger-service";

interface EncryptedData {
  encrypted: string;
  iv: string;
}

export class SettingsService {
  private store: Store<Record<string, unknown>>;
  private logger: Logger;
  private defaultSettings: AppSettings;

  constructor() {
    this.logger = new Logger();
    this.store = new Store<Record<string, unknown>>({
      name: "settings",
      encryptionKey: "ai-helpdesk-settings-key",
      schema: {
        slack: {
          type: "object",
          properties: {
            botToken: { type: "string" },
            appToken: { type: "string" },
            userToken: { type: "string" },
            workspaceId: { type: "string" },
            monitoredChannels: { type: "array", items: { type: "string" } },
            ignoredChannels: { type: "array", items: { type: "string" } },
            enableDMs: { type: "boolean" },
            enableMentions: { type: "boolean" },
            enableThreads: { type: "boolean" },
            autoMarkAsRead: { type: "boolean" },
          },
        },
        rippling: {
          type: "object",
          properties: {
            apiKey: { type: "string" },
            baseUrl: { type: "string" },
            syncInterval: { type: "number" },
            cacheExpiry: { type: "number" },
            enableUserSync: { type: "boolean" },
            enableDeviceSync: { type: "boolean" },
            enableApplicationSync: { type: "boolean" },
          },
        },
      },
    });

    this.defaultSettings = this.getDefaultSettings();
  }

  public async initialize(): Promise<void> {
    try {
      // Ensure default settings exist
      const currentSettings = this.store.store;
      if (Object.keys(currentSettings).length === 0) {
        await this.resetToDefaults();
      }

      this.logger.info("Settings service initialized");
    } catch (error) {
      this.logger.error("Failed to initialize settings service:", error);
      throw error;
    }
  }

  public async getSettings(): Promise<AppSettings> {
    try {
      const settings = { ...this.defaultSettings };

      // Merge stored settings with defaults
      const storedSettings = this.store.store as Partial<AppSettings>;
      this.mergeSettings(settings, storedSettings);

      // Decrypt sensitive data
      settings.slack = await this.decryptSlackSettings(settings.slack);
      settings.rippling = await this.decryptRipplingSettings(settings.rippling);
      settings.ai = await this.decryptAISettings(settings.ai);

      return settings;
    } catch (error) {
      this.logger.error("Failed to get settings:", error);
      return this.defaultSettings;
    }
  }

  public async updateSettings(
    newSettings: DeepPartial<AppSettings>
  ): Promise<void> {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = { ...currentSettings };

      // Merge new settings
      this.mergeSettings(updatedSettings, newSettings);

      // Encrypt sensitive data before storing
      const settingsToStore = { ...updatedSettings };
      settingsToStore.slack = await this.encryptSlackSettings(
        settingsToStore.slack
      );
      settingsToStore.rippling = await this.encryptRipplingSettings(
        settingsToStore.rippling
      );
      settingsToStore.ai = await this.encryptAISettings(settingsToStore.ai);

      // Store settings
      this.store.store = settingsToStore as unknown as Record<string, unknown>;

      this.logger.info("Settings updated successfully");
    } catch (error) {
      this.logger.error("Failed to update settings:", error);
      throw error;
    }
  }

  public async resetToDefaults(): Promise<void> {
    try {
      this.store.clear();
      this.store.store = this.defaultSettings as unknown as Record<
        string,
        unknown
      >;
      this.logger.info("Settings reset to defaults");
    } catch (error) {
      this.logger.error("Failed to reset settings:", error);
      throw error;
    }
  }

  public async exportSettings(): Promise<string> {
    try {
      const settings = await this.getSettings();

      // Remove sensitive data from export
      const exportSettings = { ...settings };
      exportSettings.slack.botToken = undefined;
      exportSettings.slack.appToken = undefined;
      exportSettings.slack.userToken = undefined;
      exportSettings.rippling.apiKey = undefined;
      exportSettings.ai.providers.forEach((provider) => {
        provider.apiKey = undefined;
      });

      return JSON.stringify(exportSettings, null, 2);
    } catch (error) {
      this.logger.error("Failed to export settings:", error);
      throw error;
    }
  }

  public async importSettings(settingsJson: string): Promise<void> {
    try {
      const importedSettings = JSON.parse(
        settingsJson
      ) as DeepPartial<AppSettings>;
      await this.updateSettings(importedSettings);
      this.logger.info("Settings imported successfully");
    } catch (error) {
      this.logger.error("Failed to import settings:", error);
      throw error;
    }
  }

  private getDefaultSettings(): AppSettings {
    return {
      slack: {
        monitoredChannels: [],
        ignoredChannels: [],
        enableDMs: true,
        enableMentions: true,
        enableThreads: true,
        autoMarkAsRead: false,
      },
      rippling: {
        baseUrl: "https://api.rippling.com",
        syncInterval: 60, // 1 hour
        cacheExpiry: 24, // 24 hours
        enableUserSync: true,
        enableDeviceSync: true,
        enableApplicationSync: true,
      },
      ai: {
        providers: [],
        defaultProvider: "",
        systemPrompts: [],
        defaultPrompt: "",
        autoResponseEnabled: false,
        confidenceThreshold: 0.8,
        maxTokensPerResponse: 1000,
        temperature: 0.7,
        enableLocalModels: false,
      },
      ui: {
        theme: "system",
        language: "en",
        fontSize: 14,
        compactMode: false,
        showAvatars: true,
        enableAnimations: true,
        windowSize: { width: 1200, height: 800 },
        windowPosition: { x: 100, y: 100 },
      },
      security: {
        encryptLocalData: true,
        requireAuth: false,
        sessionTimeout: 60, // 1 hour
        enableAuditLog: true,
        dataRetentionDays: 30,
        allowRemoteAI: true,
        enableProxy: false,
      },
      notifications: {
        enableDesktopNotifications: true,
        enableSounds: true,
        soundVolume: 0.5,
        notifyOnNewMessage: true,
        notifyOnAIResponse: false,
        notifyOnError: true,
        quietHours: {
          enabled: false,
          start: "22:00",
          end: "08:00",
        },
      },
      automation: {
        enableAutoResponse: false,
        autoResponseRules: [],
        enableAutoEscalation: false,
        escalationRules: [],
        enableBatchProcessing: false,
        batchSize: 10,
        processingInterval: 5, // 5 minutes
      },
    };
  }

  private mergeSettings(target: any, source: any): void {
    for (const key in source) {
      if (
        source[key] !== null &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        if (!target[key]) target[key] = {};
        this.mergeSettings(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  private async encryptSlackSettings(settings: any): Promise<any> {
    if (!safeStorage.isEncryptionAvailable()) {
      this.logger.warn(
        "Encryption not available, storing settings in plain text"
      );
      return settings;
    }

    const encrypted = { ...settings };
    if (settings.botToken) {
      encrypted.botToken = safeStorage
        .encryptString(settings.botToken)
        .toString("base64");
    }
    if (settings.appToken) {
      encrypted.appToken = safeStorage
        .encryptString(settings.appToken)
        .toString("base64");
    }
    if (settings.userToken) {
      encrypted.userToken = safeStorage
        .encryptString(settings.userToken)
        .toString("base64");
    }

    return encrypted;
  }

  private async decryptSlackSettings(settings: any): Promise<any> {
    if (!safeStorage.isEncryptionAvailable()) {
      return settings;
    }

    const decrypted = { ...settings };
    try {
      if (settings.botToken) {
        decrypted.botToken = safeStorage.decryptString(
          Buffer.from(settings.botToken, "base64")
        );
      }
      if (settings.appToken) {
        decrypted.appToken = safeStorage.decryptString(
          Buffer.from(settings.appToken, "base64")
        );
      }
      if (settings.userToken) {
        decrypted.userToken = safeStorage.decryptString(
          Buffer.from(settings.userToken, "base64")
        );
      }
    } catch (error) {
      this.logger.error("Failed to decrypt Slack settings:", error);
    }

    return decrypted;
  }

  private async encryptRipplingSettings(settings: any): Promise<any> {
    if (!safeStorage.isEncryptionAvailable()) {
      return settings;
    }

    const encrypted = { ...settings };
    if (settings.apiKey) {
      encrypted.apiKey = safeStorage
        .encryptString(settings.apiKey)
        .toString("base64");
    }

    return encrypted;
  }

  private async decryptRipplingSettings(settings: any): Promise<any> {
    if (!safeStorage.isEncryptionAvailable()) {
      return settings;
    }

    const decrypted = { ...settings };
    try {
      if (settings.apiKey) {
        decrypted.apiKey = safeStorage.decryptString(
          Buffer.from(settings.apiKey, "base64")
        );
      }
    } catch (error) {
      this.logger.error("Failed to decrypt Rippling settings:", error);
    }

    return decrypted;
  }

  private async encryptAISettings(settings: any): Promise<any> {
    if (!safeStorage.isEncryptionAvailable()) {
      return settings;
    }

    const encrypted = { ...settings };
    if (settings.providers) {
      encrypted.providers = settings.providers.map((provider: any) => {
        const encryptedProvider = { ...provider };
        if (provider.apiKey) {
          encryptedProvider.apiKey = safeStorage
            .encryptString(provider.apiKey)
            .toString("base64");
        }
        return encryptedProvider;
      });
    }

    return encrypted;
  }

  private async decryptAISettings(settings: any): Promise<any> {
    if (!safeStorage.isEncryptionAvailable()) {
      return settings;
    }

    const decrypted = { ...settings };
    try {
      if (settings.providers) {
        decrypted.providers = settings.providers.map((provider: any) => {
          const decryptedProvider = { ...provider };
          if (provider.apiKey) {
            try {
              decryptedProvider.apiKey = safeStorage.decryptString(
                Buffer.from(provider.apiKey, "base64")
              );
            } catch (error) {
              this.logger.error(
                `Failed to decrypt API key for provider ${provider.name}:`,
                error
              );
            }
          }
          return decryptedProvider;
        });
      }
    } catch (error) {
      this.logger.error("Failed to decrypt AI settings:", error);
    }

    return decrypted;
  }
}
