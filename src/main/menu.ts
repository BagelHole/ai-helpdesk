import { Menu, MenuItemConstructorOptions, app, shell, dialog } from "electron";
import { WindowManager } from "./window-manager";

export function createApplicationMenu(): Menu {
  const template: MenuItemConstructorOptions[] = [];

  // macOS menu structure
  if (process.platform === "darwin") {
    template.push({
      label: app.getName(),
      submenu: [
        {
          label: `About ${app.getName()}`,
          role: "about",
        },
        {
          type: "separator",
        },
        {
          label: "Preferences...",
          accelerator: "Cmd+,",
          click: () => {
            // Open settings window
            const windowManager = new WindowManager();
            windowManager.createSettingsWindow();
          },
        },
        {
          type: "separator",
        },
        {
          label: "Services",
          role: "services",
          submenu: [],
        },
        {
          type: "separator",
        },
        {
          label: `Hide ${app.getName()}`,
          accelerator: "Command+H",
          role: "hide",
        },
        {
          label: "Hide Others",
          accelerator: "Command+Shift+H",
          role: "hideOthers",
        },
        {
          label: "Show All",
          role: "unhide",
        },
        {
          type: "separator",
        },
        {
          label: "Quit",
          accelerator: "Command+Q",
          click: () => {
            app.quit();
          },
        },
      ],
    });
  }

  // File menu
  template.push({
    label: "File",
    submenu: [
      {
        label: "New Message",
        accelerator: "CmdOrCtrl+N",
        click: () => {
          // Trigger new message action
        },
      },
      {
        type: "separator",
      },
      {
        label: "Import Settings...",
        click: async () => {
          const result = await dialog.showOpenDialog({
            title: "Import Settings",
            filters: [
              { name: "JSON Files", extensions: ["json"] },
              { name: "All Files", extensions: ["*"] },
            ],
            properties: ["openFile"],
          });

          if (!result.canceled && result.filePaths.length > 0) {
            // Handle settings import
            console.log("Import settings from:", result.filePaths[0]);
          }
        },
      },
      {
        label: "Export Settings...",
        click: async () => {
          const result = await dialog.showSaveDialog({
            title: "Export Settings",
            defaultPath: "ai-helpdesk-settings.json",
            filters: [
              { name: "JSON Files", extensions: ["json"] },
              { name: "All Files", extensions: ["*"] },
            ],
          });

          if (!result.canceled && result.filePath) {
            // Handle settings export
            console.log("Export settings to:", result.filePath);
          }
        },
      },
      {
        type: "separator",
      },
      ...(process.platform !== "darwin"
        ? [
            {
              label: "Settings...",
              accelerator: "Ctrl+,",
              click: () => {
                const windowManager = new WindowManager();
                windowManager.createSettingsWindow();
              },
            },
            {
              type: "separator" as const,
            },
            {
              label: "Exit",
              accelerator: "Ctrl+Q",
              click: () => {
                app.quit();
              },
            },
          ]
        : []),
    ],
  });

  // Edit menu
  template.push({
    label: "Edit",
    submenu: [
      {
        label: "Undo",
        accelerator: "CmdOrCtrl+Z",
        role: "undo",
      },
      {
        label: "Redo",
        accelerator: "Shift+CmdOrCtrl+Z",
        role: "redo",
      },
      {
        type: "separator",
      },
      {
        label: "Cut",
        accelerator: "CmdOrCtrl+X",
        role: "cut",
      },
      {
        label: "Copy",
        accelerator: "CmdOrCtrl+C",
        role: "copy",
      },
      {
        label: "Paste",
        accelerator: "CmdOrCtrl+V",
        role: "paste",
      },
      {
        label: "Select All",
        accelerator: "CmdOrCtrl+A",
        role: "selectAll",
      },
      {
        type: "separator",
      },
      {
        label: "Find",
        accelerator: "CmdOrCtrl+F",
        click: () => {
          // Trigger find action in renderer
        },
      },
    ],
  });

  // View menu
  template.push({
    label: "View",
    submenu: [
      {
        label: "Reload",
        accelerator: "CmdOrCtrl+R",
        click: (item, focusedWindow) => {
          if (focusedWindow) {
            focusedWindow.reload();
          }
        },
      },
      {
        label: "Force Reload",
        accelerator: "CmdOrCtrl+Shift+R",
        click: (item, focusedWindow) => {
          if (focusedWindow) {
            focusedWindow.webContents.reloadIgnoringCache();
          }
        },
      },
      {
        label: "Toggle Developer Tools",
        accelerator:
          process.platform === "darwin" ? "Alt+Command+I" : "Ctrl+Shift+I",
        click: (item, focusedWindow) => {
          if (focusedWindow) {
            focusedWindow.webContents.toggleDevTools();
          }
        },
      },
      {
        type: "separator",
      },
      {
        label: "Actual Size",
        accelerator: "CmdOrCtrl+0",
        click: (item, focusedWindow) => {
          if (focusedWindow) {
            focusedWindow.webContents.setZoomLevel(0);
          }
        },
      },
      {
        label: "Zoom In",
        accelerator: "CmdOrCtrl+Plus",
        click: (item, focusedWindow) => {
          if (focusedWindow) {
            const currentZoom = focusedWindow.webContents.getZoomLevel();
            focusedWindow.webContents.setZoomLevel(currentZoom + 1);
          }
        },
      },
      {
        label: "Zoom Out",
        accelerator: "CmdOrCtrl+-",
        click: (item, focusedWindow) => {
          if (focusedWindow) {
            const currentZoom = focusedWindow.webContents.getZoomLevel();
            focusedWindow.webContents.setZoomLevel(currentZoom - 1);
          }
        },
      },
      {
        type: "separator",
      },
      {
        label: "Toggle Fullscreen",
        accelerator: process.platform === "darwin" ? "Ctrl+Command+F" : "F11",
        click: (item, focusedWindow) => {
          if (focusedWindow) {
            focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
          }
        },
      },
    ],
  });

  // Tools menu
  template.push({
    label: "Tools",
    submenu: [
      {
        label: "Connect to Slack",
        click: () => {
          // Trigger Slack connection
        },
      },
      {
        label: "Connect to Rippling",
        click: () => {
          // Trigger Rippling connection
        },
      },
      {
        type: "separator",
      },
      {
        label: "Test AI Connection",
        click: () => {
          // Test AI provider connections
        },
      },
      {
        label: "Sync User Data",
        click: () => {
          // Sync data from Rippling
        },
      },
      {
        type: "separator",
      },
      {
        label: "Clear Cache",
        click: async () => {
          const result = await dialog.showMessageBox({
            type: "warning",
            buttons: ["Cancel", "Clear Cache"],
            defaultId: 0,
            title: "Clear Cache",
            message: "Are you sure you want to clear the application cache?",
            detail:
              "This will remove all cached data and you may need to reconnect to services.",
          });

          if (result.response === 1) {
            // Clear cache logic
            console.log("Clearing cache...");
          }
        },
      },
      {
        label: "Reset to Defaults",
        click: async () => {
          const result = await dialog.showMessageBox({
            type: "warning",
            buttons: ["Cancel", "Reset"],
            defaultId: 0,
            title: "Reset Settings",
            message: "Are you sure you want to reset all settings to defaults?",
            detail:
              "This action cannot be undone. All your custom settings will be lost.",
          });

          if (result.response === 1) {
            // Reset settings logic
            console.log("Resetting to defaults...");
          }
        },
      },
    ],
  });

  // Window menu
  template.push({
    label: "Window",
    submenu: [
      {
        label: "Minimize",
        accelerator: "CmdOrCtrl+M",
        role: "minimize",
      },
      {
        label: "Close",
        accelerator: "CmdOrCtrl+W",
        role: "close",
      },
      ...(process.platform === "darwin"
        ? [
            {
              type: "separator" as const,
            },
            {
              label: "Bring All to Front",
              role: "front" as const,
            },
          ]
        : []),
    ],
  });

  // Help menu
  template.push({
    label: "Help",
    submenu: [
      {
        label: "Learn More",
        click: () => {
          shell.openExternal("https://github.com/bagelhole/ai-helpdesk");
        },
      },
      {
        label: "Documentation",
        click: () => {
          shell.openExternal("https://github.com/bagelhole/ai-helpdesk/wiki");
        },
      },
      {
        label: "Report Issue",
        click: () => {
          shell.openExternal("https://github.com/bagelhole/ai-helpdesk/issues");
        },
      },
      {
        type: "separator",
      },
      {
        label: "Keyboard Shortcuts",
        accelerator: "CmdOrCtrl+/",
        click: () => {
          // Show keyboard shortcuts modal
        },
      },
      ...(process.platform !== "darwin"
        ? [
            {
              type: "separator" as const,
            },
            {
              label: "About",
              click: () => {
                dialog.showMessageBox({
                  type: "info",
                  title: "About AI Helpdesk",
                  message: "AI Helpdesk",
                  detail: `Version ${app.getVersion()}\n\nAI-powered helpdesk for Slack messages with Rippling integration.`,
                });
              },
            },
          ]
        : []),
    ],
  });

  return Menu.buildFromTemplate(template);
}
