import { app, BrowserWindow, Menu, ipcMain, dialog, shell } from "electron";
import { autoUpdater } from "electron-updater";
import path from "path";
import isDev from "electron-is-dev";
import { WindowManager } from "./window-manager";
import { createApplicationMenu } from "./menu";
import { DatabaseService } from "./services/database-service";
import { SettingsService } from "./services/settings-service";
import { SlackService } from "./services/slack-service";
import { RipplingService } from "./services/rippling-service";
import { AIService } from "./services/ai-service";
import { Logger } from "./services/logger-service";

class Application {
  private windowManager: WindowManager;
  private databaseService: DatabaseService;
  private settingsService: SettingsService;
  private slackService: SlackService;
  private ripplingService: RipplingService;
  private aiService: AIService;
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
    this.windowManager = new WindowManager();
    this.databaseService = new DatabaseService();
    this.settingsService = new SettingsService();
    this.slackService = new SlackService(this.databaseService);
    this.ripplingService = new RipplingService();
    this.aiService = new AIService();

    this.setupEventHandlers();
    this.setupIPC();
  }

  private setupEventHandlers(): void {
    // App event handlers
    app.whenReady().then(() => {
      this.initialize();
    });

    app.on("window-all-closed", () => {
      if (process.platform !== "darwin") {
        app.quit();
      }
    });

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.windowManager.createMainWindow();
      }
    });

    app.on("before-quit", async () => {
      await this.cleanup();
    });

    // Security: Prevent new window creation
    app.on("web-contents-created", (event, contents) => {
      contents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: "deny" };
      });
    });

    // Auto updater events
    autoUpdater.on("checking-for-update", () => {
      this.logger.info("Checking for updates...");
    });

    autoUpdater.on("update-available", () => {
      this.logger.info("Update available");
    });

    autoUpdater.on("update-not-available", () => {
      this.logger.info("Update not available");
    });

    autoUpdater.on("error", (err) => {
      this.logger.error("Error in auto-updater:", err);
    });

    autoUpdater.on("download-progress", (progressObj) => {
      this.logger.info(`Download progress: ${progressObj.percent}%`);
    });

    autoUpdater.on("update-downloaded", () => {
      this.logger.info("Update downloaded");
      autoUpdater.quitAndInstall();
    });
  }

  private setupIPC(): void {
    // Settings IPC
    ipcMain.handle("settings:get", async () => {
      try {
        return await this.settingsService.getSettings();
      } catch (error) {
        this.logger.error("Failed to get settings:", error);
        throw error;
      }
    });

    ipcMain.handle("settings:update", async (event, settings) => {
      try {
        await this.settingsService.updateSettings(settings);

        // Auto-connect to Slack if bot token is provided
        if (settings.slack?.botToken && !this.slackService.isSlackConnected()) {
          try {
            this.logger.info(
              `Attempting to auto-connect to Slack with bot token: ${settings.slack.botToken.substring(0, 10)}...`
            );
            await this.slackService.connect(
              settings.slack.botToken,
              settings.slack.appToken,
              settings.slack
            );
            this.logger.info("Auto-connected to Slack after settings update");
          } catch (slackError) {
            this.logger.error("Failed to auto-connect to Slack:", slackError);
          }
        } else {
          this.logger.info(
            `Slack auto-connect skipped: hasToken=${!!settings.slack?.botToken}, isConnected=${this.slackService.isSlackConnected()}`
          );
        }

        return { success: true };
      } catch (error) {
        this.logger.error("Failed to update settings:", error);
        throw error;
      }
    });

    // Slack IPC
    ipcMain.handle("slack:connect", async (event, token) => {
      try {
        // Get current settings to pass Slack configuration
        const settings = await this.settingsService.getSettings();
        await this.slackService.connect(
          token,
          settings.slack.appToken,
          settings.slack
        );
        return { success: true };
      } catch (error) {
        this.logger.error("Failed to connect to Slack:", error);
        throw error;
      }
    });

    ipcMain.handle("slack:disconnect", async () => {
      try {
        await this.slackService.disconnect();
        return { success: true };
      } catch (error) {
        this.logger.error("Failed to disconnect from Slack:", error);
        throw error;
      }
    });

    ipcMain.handle("slack:sendMessage", async (event, channelId, message) => {
      try {
        const result = await this.slackService.sendMessage(channelId, message);
        return result;
      } catch (error) {
        this.logger.error("Failed to send Slack message:", error);
        throw error;
      }
    });

    ipcMain.handle("slack:testConnection", async () => {
      try {
        const result = await this.slackService.testConnection();
        return { success: result };
      } catch (error) {
        this.logger.error("Failed to test Slack connection:", error);
        return { success: false };
      }
    });

    ipcMain.handle("slack:forcePoll", async () => {
      try {
        await this.slackService.forcePoll();
        return { success: true };
      } catch (error) {
        this.logger.error("Failed to force poll:", error);
        return { success: false };
      }
    });

    // Rippling IPC
    ipcMain.handle("rippling:connect", async (event, apiKey) => {
      try {
        await this.ripplingService.connect(apiKey);
        return { success: true };
      } catch (error) {
        this.logger.error("Failed to connect to Rippling:", error);
        throw error;
      }
    });

    ipcMain.handle("rippling:getUserInfo", async (event, email) => {
      try {
        const userInfo = await this.ripplingService.getUserInfo(email);
        return userInfo;
      } catch (error) {
        this.logger.error("Failed to get user info from Rippling:", error);
        throw error;
      }
    });

    ipcMain.handle("rippling:testConnection", async () => {
      try {
        const result = await this.ripplingService.testConnection();
        return { success: result };
      } catch (error) {
        this.logger.error("Failed to test Rippling connection:", error);
        return { success: false };
      }
    });

    // AI IPC
    ipcMain.handle("ai:generateResponse", async (event, messageData) => {
      try {
        const response = await this.aiService.generateResponse(messageData);
        return response;
      } catch (error) {
        this.logger.error("Failed to generate AI response:", error);
        throw error;
      }
    });

    ipcMain.handle("ai:getProviders", async () => {
      try {
        return await this.aiService.getProviders();
      } catch (error) {
        this.logger.error("Failed to get AI providers:", error);
        throw error;
      }
    });

    ipcMain.handle("ai:testProvider", async (event, provider, apiKey) => {
      try {
        // Use the new method that tests with API key directly
        const result = await this.aiService.testProviderWithApiKey(
          provider,
          apiKey
        );
        return { success: result };
      } catch (error) {
        this.logger.error("Failed to test AI provider:", error);
        return { success: false };
      }
    });

    // Database IPC
    ipcMain.handle("db:getMessages", async (event, filters) => {
      try {
        return await this.databaseService.getMessages(filters);
      } catch (error) {
        this.logger.error("Failed to get messages from database:", error);
        throw error;
      }
    });

    ipcMain.handle("db:clearMessages", async () => {
      try {
        await this.databaseService.clearAllMessages();
        return { success: true };
      } catch (error) {
        this.logger.error("Failed to clear messages from database:", error);
        throw error;
      }
    });

    ipcMain.handle("db:saveMessage", async (event, message) => {
      try {
        return await this.databaseService.saveMessage(message);
      } catch (error) {
        this.logger.error("Failed to save message to database:", error);
        throw error;
      }
    });

    // System IPC
    ipcMain.handle("system:openExternal", async (event, url) => {
      try {
        await shell.openExternal(url);
        return { success: true };
      } catch (error) {
        this.logger.error("Failed to open external URL:", error);
        throw error;
      }
    });

    ipcMain.handle("system:showSaveDialog", async (event, options) => {
      try {
        const result = await dialog.showSaveDialog(options);
        return result;
      } catch (error) {
        this.logger.error("Failed to show save dialog:", error);
        throw error;
      }
    });

    ipcMain.handle("system:showOpenDialog", async (event, options) => {
      try {
        const result = await dialog.showOpenDialog(options);
        return result;
      } catch (error) {
        this.logger.error("Failed to show open dialog:", error);
        throw error;
      }
    });

    // Window management IPC
    ipcMain.handle("window:minimize", () => {
      const mainWindow = this.windowManager.getMainWindow();
      if (mainWindow) {
        mainWindow.minimize();
      }
    });

    ipcMain.handle("window:maximize", () => {
      const mainWindow = this.windowManager.getMainWindow();
      if (mainWindow) {
        if (mainWindow.isMaximized()) {
          mainWindow.unmaximize();
        } else {
          mainWindow.maximize();
        }
      }
    });

    ipcMain.handle("window:close", () => {
      const mainWindow = this.windowManager.getMainWindow();
      if (mainWindow) {
        mainWindow.close();
      }
    });
  }

  private async autoConnectServices(): Promise<void> {
    try {
      const settings = await this.settingsService.getSettings();

      // Auto-connect to Slack if bot token exists
      if (settings.slack?.botToken && !this.slackService.isSlackConnected()) {
        try {
          this.logger.info("Auto-connecting to Slack on app startup...");
          await this.slackService.connect(
            settings.slack.botToken,
            settings.slack.appToken,
            settings.slack
          );
          this.logger.info("Auto-connected to Slack successfully");
        } catch (error) {
          this.logger.error("Failed to auto-connect to Slack:", error);
        }
      }
    } catch (error) {
      this.logger.error("Failed to auto-connect services:", error);
    }
  }

  private async initialize(): Promise<void> {
    try {
      this.logger.info("Initializing application...");

      // Initialize database
      await this.databaseService.initialize();

      // Initialize settings
      await this.settingsService.initialize();

      // Auto-connect to Slack if settings exist
      await this.autoConnectServices();

      // Create main window
      this.windowManager.createMainWindow();

      // Set application menu
      const menu = createApplicationMenu();
      Menu.setApplicationMenu(menu);

      // Check for updates in production
      if (!isDev) {
        autoUpdater.checkForUpdatesAndNotify();
      }

      this.logger.info("Application initialized successfully");
    } catch (error) {
      this.logger.error("Failed to initialize application:", error);

      // Show error dialog
      dialog.showErrorBox(
        "Initialization Error",
        "Failed to initialize the application. Please check the logs for more details."
      );

      app.quit();
    }
  }

  private async cleanup(): Promise<void> {
    try {
      this.logger.info("Cleaning up application...");

      // Disconnect from services
      await this.slackService.disconnect();
      await this.ripplingService.disconnect();

      // Close database connection
      await this.databaseService.close();

      this.logger.info("Application cleanup completed");
    } catch (error) {
      this.logger.error("Error during cleanup:", error);
    }
  }
}

// Initialize application
const application = new Application();

// Handle unhandled exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  app.quit();
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
