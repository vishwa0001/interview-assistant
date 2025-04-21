import { ipcMain, shell } from "electron";

export function initializeIpcHandlers(deps) {
  console.log("Initializing IPC handlers");

  ipcMain.handle("update-content-dimensions", (_event, { width, height }) => {
    if (width && height) {
      deps.setWindowDimensions(width, height);
    }
  });

  ipcMain.handle("set-window-dimensions", (_event, width, height) => {
    deps.setWindowDimensions(width, height);
  });

  ipcMain.handle("open-external-url", (_event, url) => {
    shell.openExternal(url);
  });

  ipcMain.handle("openLink", (_event, url) => {
    try {
      console.log(`Opening external URL: ${url}`);
      shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error(`Error opening URL ${url}:`, error);
      return { success: false, error: `Failed to open URL: ${error}` };
    }
  });

  ipcMain.handle("toggle-window", () => {
    try {
      deps.toggleMainWindow();
      return { success: true };
    } catch (error) {
      console.error("Error toggling window:", error);
      return { error: "Failed to toggle window" };
    }
  });

  ipcMain.handle("trigger-move-left", () => {
    try {
      deps.moveWindowLeft();
      return { success: true };
    } catch (error) {
      console.error("Error moving window left:", error);
      return { error: "Failed to move window left" };
    }
  });

  ipcMain.handle("trigger-move-right", () => {
    try {
      deps.moveWindowRight();
      return { success: true };
    } catch (error) {
      console.error("Error moving window right:", error);
      return { error: "Failed to move window right" };
    }
  });

  ipcMain.handle("trigger-move-up", () => {
    try {
      deps.moveWindowUp();
      return { success: true };
    } catch (error) {
      console.error("Error moving window up:", error);
      return { error: "Failed to move window up" };
    }
  });

  ipcMain.handle("trigger-move-down", () => {
    try {
      deps.moveWindowDown();
      return { success: true };
    } catch (error) {
      console.error("Error moving window down:", error);
      return { error: "Failed to move window down" };
    }
  });
}
