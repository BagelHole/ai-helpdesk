import { BrowserWindow, screen, app } from "electron";
import path from "path";
import isDev from "electron-is-dev";

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private settingsWindow: BrowserWindow | null = null;

  public createMainWindow(): BrowserWindow {
    // Get primary display dimensions
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    // Calculate window size (80% of screen size, minimum 1200x800)
    const windowWidth = Math.max(Math.floor(width * 0.8), 1200);
    const windowHeight = Math.max(Math.floor(height * 0.8), 800);

    this.mainWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      minWidth: 1000,
      minHeight: 700,
      show: false,
      titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
      frame: process.platform !== "darwin",
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,

        preload: path.join(__dirname, "../preload/preload.js"),
        webSecurity: !isDev,
      },
      icon: path.join(__dirname, "../../resources/icon.png"),
    });

    // Load the app
    if (process.env.NODE_ENV === "production") {
      this.mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
    } else {
      this.mainWindow.loadURL("http://localhost:3000");
      this.mainWindow.webContents.openDevTools();
    }

    // Show window when ready
    this.mainWindow.once("ready-to-show", () => {
      if (this.mainWindow) {
        this.mainWindow.show();

        // Focus window on creation
        if (process.env.NODE_ENV !== "production") {
          this.mainWindow.webContents.openDevTools();
        }
      }
    });

    // Handle window closed
    this.mainWindow.on("closed", () => {
      this.mainWindow = null;
    });

    // Handle window focus
    this.mainWindow.on("focus", () => {
      // Handle focus events if needed
    });

    // Handle window blur
    this.mainWindow.on("blur", () => {
      // Handle blur events if needed
    });

    // Prevent navigation away from the app
    this.mainWindow.webContents.on("will-navigate", (event, url) => {
      if (url !== this.mainWindow?.webContents.getURL()) {
        event.preventDefault();
      }
    });

    // Handle external links
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      require("electron").shell.openExternal(url);
      return { action: "deny" };
    });

    return this.mainWindow;
  }

  public createSettingsWindow(): BrowserWindow {
    if (this.settingsWindow) {
      this.settingsWindow.focus();
      return this.settingsWindow;
    }

    this.settingsWindow = new BrowserWindow({
      width: 900,
      height: 700,
      minWidth: 800,
      minHeight: 600,
      show: false,
      modal: true,
      parent: this.mainWindow || undefined,
      titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
      frame: process.platform !== "darwin",
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,

        preload: path.join(__dirname, "../preload/preload.js"),
        webSecurity: !isDev,
      },
    });

    // Load settings page
    if (process.env.NODE_ENV === "production") {
      this.settingsWindow.loadFile(
        path.join(__dirname, "../renderer/index.html"),
        {
          hash: "settings",
        }
      );
    } else {
      this.settingsWindow.loadURL("http://localhost:3000#/settings");
    }

    // Show when ready
    this.settingsWindow.once("ready-to-show", () => {
      if (this.settingsWindow) {
        this.settingsWindow.show();
      }
    });

    // Handle closed
    this.settingsWindow.on("closed", () => {
      this.settingsWindow = null;
    });

    return this.settingsWindow;
  }

  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  public getSettingsWindow(): BrowserWindow | null {
    return this.settingsWindow;
  }

  public closeAllWindows(): void {
    if (this.settingsWindow) {
      this.settingsWindow.close();
    }
    if (this.mainWindow) {
      this.mainWindow.close();
    }
  }

  public minimizeMainWindow(): void {
    if (this.mainWindow) {
      this.mainWindow.minimize();
    }
  }

  public restoreMainWindow(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }
      this.mainWindow.focus();
    }
  }

  public toggleMaximizeMainWindow(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow.maximize();
      }
    }
  }

  public isMainWindowVisible(): boolean {
    return this.mainWindow?.isVisible() || false;
  }

  public isMainWindowMinimized(): boolean {
    return this.mainWindow?.isMinimized() || false;
  }

  public isMainWindowMaximized(): boolean {
    return this.mainWindow?.isMaximized() || false;
  }

  public centerMainWindow(): void {
    if (this.mainWindow) {
      this.mainWindow.center();
    }
  }

  public setMainWindowAlwaysOnTop(flag: boolean): void {
    if (this.mainWindow) {
      this.mainWindow.setAlwaysOnTop(flag);
    }
  }

  public reloadMainWindow(): void {
    if (this.mainWindow) {
      this.mainWindow.reload();
    }
  }

  public toggleDevTools(): void {
    if (this.mainWindow) {
      this.mainWindow.webContents.toggleDevTools();
    }
  }

  public sendToMainWindow(channel: string, ...args: any[]): void {
    if (this.mainWindow) {
      this.mainWindow.webContents.send(channel, ...args);
    }
  }

  public sendToSettingsWindow(channel: string, ...args: any[]): void {
    if (this.settingsWindow) {
      this.settingsWindow.webContents.send(channel, ...args);
    }
  }
}
