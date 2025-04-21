console.log("Preload script starting...");

import { contextBridge, ipcRenderer, shell } from "electron";

const electronAPI = {
  updateContentDimensions: (dimensions) =>
    ipcRenderer.invoke("update-content-dimensions", dimensions),
  clearStore: () => ipcRenderer.invoke("clear-store"),

  toggleMainWindow: async () => {
    console.log("toggleMainWindow called from preload");
    try {
      const result = await ipcRenderer.invoke("toggle-window");
      console.log("toggle-window result:", result);
      return result;
    } catch (error) {
      console.error("Error in toggleMainWindow:", error);
      throw error;
    }
  },

  triggerMoveLeft: () => ipcRenderer.invoke("trigger-move-left"),
  triggerMoveRight: () => ipcRenderer.invoke("trigger-move-right"),
  triggerMoveUp: () => ipcRenderer.invoke("trigger-move-up"),
  triggerMoveDown: () => ipcRenderer.invoke("trigger-move-down"),

  getPlatform: () => process.platform,

  getConfig: () => ipcRenderer.invoke("get-config"),
  updateConfig: (config) => ipcRenderer.invoke("update-config", config),

  openExternal: (url) => ipcRenderer.invoke("openExternal", url),

  removeListener: (eventName, callback) => {
    ipcRenderer.removeListener(eventName, callback);
  },
};

console.log(
  "About to expose electronAPI with methods:",
  Object.keys(electronAPI)
);

contextBridge.exposeInMainWorld("electronAPI", electronAPI);

console.log("electronAPI exposed to window");

ipcRenderer.on("restore-focus", () => {
  const activeElement = document.activeElement;
  if (activeElement && typeof activeElement.focus === "function") {
    activeElement.focus();
  }
});

// window.addEventListener("DOMContentLoaded", () => {
//   console.log("Clearing localStorage on app launch...");
//   localStorage.clear();
// });