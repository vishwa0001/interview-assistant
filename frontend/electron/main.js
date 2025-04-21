import { app, BrowserWindow, screen, shell, ipcMain } from "electron";
import path from "path";
import fs from "fs";
import { initializeIpcHandlers } from "./ipcHandlers.js";
import { ShortcutsHelper } from "./shortcuts.js";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const isDev = process.env.NODE_ENV === "development";

// Application State
const state = {
  // Window management properties
  mainWindow: null,
  isWindowVisible: false,
  windowPosition: null,
  windowSize: null,
  screenWidth: 0,
  screenHeight: 0,
  step: 0,
  currentX: 0,
  currentY: 0,
};

// Initialize helpers
function initializeHelpers() {
  state.shortcutsHelper = new ShortcutsHelper({
    getMainWindow,
    isVisible: () => state.isWindowVisible,
    toggleMainWindow,
    moveWindowLeft: () =>
      moveWindowHorizontal((x) =>
        Math.max(-(state.windowSize?.width || 0) / 2, x - state.step)
      ),
    moveWindowRight: () =>
      moveWindowHorizontal((x) =>
        Math.min(
          state.screenWidth - (state.windowSize?.width || 0) / 2,
          x + state.step
        )
      ),
    moveWindowUp: () => moveWindowVertical((y) => y - state.step),
    moveWindowDown: () => moveWindowVertical((y) => y + state.step),
  });
}

// Register the interview-assistant protocol
if (process.platform === "darwin") {
  app.setAsDefaultProtocolClient("interview-assistant");
} else {
  app.setAsDefaultProtocolClient("interview-assistant", process.execPath, [
    path.resolve(process.argv[1] || ""),
  ]);
}

// Handle the protocol. In this case, we choose to show an Error Box.
if (process.defaultApp && process.argv.length >= 2) {
  app.setAsDefaultProtocolClient("interview-assistant", process.execPath, [
    path.resolve(process.argv[1]),
  ]);
}

// Force Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (event, commandLine) => {
    // Someone tried to run a second instance, we should focus our window.
    if (state.mainWindow) {
      if (state.mainWindow.isMinimized()) state.mainWindow.restore();
      state.mainWindow.focus();
    }
  });
}

// Window management functions
async function createWindow() {
  if (state.mainWindow) {
    if (state.mainWindow.isMinimized()) state.mainWindow.restore();
    state.mainWindow.focus();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const workArea = primaryDisplay.workAreaSize;
  state.screenWidth = workArea.width;
  state.screenHeight = workArea.height;
  state.step = 60;
  state.currentY = 50;

  const windowSettings = {
    width: 800,
    height: 600,
    minWidth: 100,
    minHeight: 100,
    x: state.currentX,
    y: 50,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: isDev
        ? path.join(__dirname, "../electron/preload.js")
        : path.join(__dirname, "preload.js"),
      scrollBounce: true,
    },
    show: true,
    frame: false,
    transparent: true,
    fullscreenable: false,
    hasShadow: false,
    opacity: 1.0,
    backgroundColor: "#00000000",
    focusable: true,
    skipTaskbar: true,
    type: "panel",
    paintWhenInitiallyHidden: true,
    titleBarStyle: "hidden",
    enableLargerThanScreen: true,
    movable: true,
  };

  state.mainWindow = new BrowserWindow(windowSettings);

  // Enhanced screen capture resistance
  console.log("mainWindow is", state.mainWindow); // should be a BrowserWindow instance
  state.mainWindow.setContentProtection(true);

  // Add more detailed logging for window events
  state.mainWindow.webContents.on("did-finish-load", () => {
    console.log("Window finished loading");
  });
  state.mainWindow.webContents.on(
    "did-fail-load",
    async (event, errorCode, errorDescription) => {
      console.error("Window failed to load:", errorCode, errorDescription);
      if (isDev) {
        console.log("Retrying to load development server...");
        setTimeout(() => {
          state.mainWindow
            ?.loadURL(
              "https://interview-assistant.log1.com/?sessionId=9fb5c0cc-3ccb-471c-be36-ffb04869faa8"
            )
            .catch((error) => {
              console.error("Failed to load dev server on retry:", error);
            });
        }, 1000);
      }
    }
  );

  if (isDev) {
    console.log(
      "Loading from development server: https://interview-assistant.log1.com/?sessionId=9fb5c0cc-3ccb-471c-be36-ffb04869faa8"
    );
    state.mainWindow
      .loadURL(
        "https://interview-assistant.log1.com/?sessionId=9fb5c0cc-3ccb-471c-be36-ffb04869faa8"
      )
      .catch((error) => {
        console.error(
          "Failed to load dev server, falling back to local file:",
          error
        );
        const indexPath = path.join(__dirname, "../build/index.html");
        console.log("Falling back to:", indexPath);
        if (fs.existsSync(indexPath)) {
          console.log(indexPath);
          state.mainWindow.loadFile(indexPath);
        } else {
          console.error("Could not find index.html in dist folder");
        }
      });
  } else {
    const indexPath = path.join(__dirname, "../build/index.html");
    console.log("Loading production build:", indexPath);

    if (fs.existsSync(indexPath)) {
      state.mainWindow.loadFile(indexPath);
    } else {
      console.error("Could not find index.html in dist folder");
    }
  }

  // Configure window behavior
  state.mainWindow.webContents.setZoomFactor(1);
  if (isDev) {
    state.mainWindow.webContents.openDevTools();
  }
  state.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.log("Attempting to open URL:", url);
    if (url.includes("google.com") || url.includes("supabase.co")) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  state.mainWindow.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
  });
  state.mainWindow.setAlwaysOnTop(true, "screen-saver", 1);

  // Additional screen capture resistance settings
  if (process.platform === "darwin") {
    state.mainWindow.setHiddenInMissionControl(true);
    state.mainWindow.setWindowButtonVisibility(false);
    state.mainWindow.setBackgroundColor("#00000000");
    state.mainWindow.setSkipTaskbar(true);
    state.mainWindow.setHasShadow(false);
  }

  state.mainWindow.webContents.setBackgroundThrottling(false);
  state.mainWindow.webContents.setFrameRate(60);

  // Set up window listeners
  state.mainWindow.on("move", handleWindowMove);
  state.mainWindow.on("resize", handleWindowResize);
  state.mainWindow.on("closed", handleWindowClosed);

  // Initialize window state
  const bounds = state.mainWindow.getBounds();
  state.windowPosition = { x: bounds.x, y: bounds.y };
  state.windowSize = { width: bounds.width, height: bounds.height };
  state.currentX = bounds.x;
  state.currentY = bounds.y;
  state.isWindowVisible = true;

  const savedOpacity = 1.0;
  // configHelper.getOpacity();
  console.log(`Initial opacity from config: ${savedOpacity}`);

  state.mainWindow.showInactive();

  if (savedOpacity <= 0.1) {
    console.log("Initial opacity too low, setting to 0 and hiding window");
    state.mainWindow.setOpacity(0);
    state.isWindowVisible = false;
  } else {
    console.log(`Setting initial opacity to ${savedOpacity}`);
    state.mainWindow.setOpacity(savedOpacity);
    state.isWindowVisible = true;
  }
}

function handleWindowMove() {
  if (!state.mainWindow) return;
  const bounds = state.mainWindow.getBounds();
  state.windowPosition = { x: bounds.x, y: bounds.y };
  state.currentX = bounds.x;
  state.currentY = bounds.y;
}

function handleWindowResize() {
  if (!state.mainWindow) return;
  const bounds = state.mainWindow.getBounds();
  state.windowSize = { width: bounds.width, height: bounds.height };
}

function handleWindowClosed() {
  state.mainWindow = null;
  state.isWindowVisible = false;
  state.windowPosition = null;
  state.windowSize = null;
}

// Window visibility functions
function hideMainWindow() {
  if (!state.mainWindow?.isDestroyed()) {
    const bounds = state.mainWindow.getBounds();
    state.windowPosition = { x: bounds.x, y: bounds.y };
    state.windowSize = { width: bounds.width, height: bounds.height };
    state.mainWindow.setIgnoreMouseEvents(true, { forward: true });
    state.mainWindow.setOpacity(0);
    state.isWindowVisible = false;
    console.log("Window hidden, opacity set to 0");
  }
}

function showMainWindow() {
  if (!state.mainWindow?.isDestroyed()) {
    if (state.windowPosition && state.windowSize) {
      state.mainWindow.setBounds({
        ...state.windowPosition,
        ...state.windowSize,
      });
    }
    state.mainWindow.setIgnoreMouseEvents(false);
    state.mainWindow.setAlwaysOnTop(true, "screen-saver", 1);
    state.mainWindow.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
    });
    state.mainWindow.setContentProtection(true);
    state.mainWindow.setOpacity(0);
    state.mainWindow.showInactive();
    state.mainWindow.setOpacity(1);
    state.isWindowVisible = true;
    console.log("Window shown with showInactive(), opacity set to 1");
  }
}

function toggleMainWindow() {
  console.log(
    `Toggling window. Current state: ${
      state.isWindowVisible ? "visible" : "hidden"
    }`
  );
  if (state.isWindowVisible) {
    hideMainWindow();
  } else {
    showMainWindow();
  }
}

// Window movement functions
function moveWindowHorizontal(updateFn) {
  if (!state.mainWindow) return;
  state.currentX = updateFn(state.currentX);
  state.mainWindow.setPosition(
    Math.round(state.currentX),
    Math.round(state.currentY)
  );
}

function moveWindowVertical(updateFn) {
  if (!state.mainWindow) return;

  const newY = updateFn(state.currentY);
  const maxUpLimit = (-(state.windowSize?.height || 0) * 2) / 3;
  const maxDownLimit =
    state.screenHeight + ((state.windowSize?.height || 0) * 2) / 3;

  console.log({
    newY,
    maxUpLimit,
    maxDownLimit,
    screenHeight: state.screenHeight,
    windowHeight: state.windowSize?.height,
    currentY: state.currentY,
  });

  if (newY >= maxUpLimit && newY <= maxDownLimit) {
    state.currentY = newY;
    state.mainWindow.setPosition(
      Math.round(state.currentX),
      Math.round(state.currentY)
    );
  }
}

// Window dimension functions
function setWindowDimensions(width, height) {
  if (!state.mainWindow?.isDestroyed()) {
    const [currentX, currentY] = state.mainWindow.getPosition();
    const primaryDisplay = screen.getPrimaryDisplay();
    const workArea = primaryDisplay.workAreaSize;
    const maxWidth = Math.floor(workArea.width * 0.5);

    state.mainWindow.setBounds({
      x: Math.min(currentX, workArea.width - maxWidth),
      y: currentY,
      width: Math.min(width + 32, maxWidth),
      height: Math.ceil(height),
    });
  }
}

// Environment setup
function loadEnvVariables() {
  if (isDev) {
    console.log(
      "Loading env variables from:",
      path.join(process.cwd(), ".env")
    );
    dotenv.config({ path: path.join(process.cwd(), ".env") });
  } else {
    console.log(
      "Loading env variables from:",
      path.join(process.resourcesPath, ".env")
    );
    dotenv.config({ path: path.join(process.resourcesPath, ".env") });
  }
  console.log("Environment variables loaded for open-source version");
}

// Initialize application
async function initializeApp() {
  try {
    // const appDataPath = path.join(app.getPath("appData"), "interview-coder-v1");
    // const sessionPath = path.join(appDataPath, "session");
    // const tempPath = path.join(appDataPath, "temp");
    // const cachePath = path.join(appDataPath, "cache");

    // for (const dir of [appDataPath, sessionPath, tempPath, cachePath]) {
    //   if (!fs.existsSync(dir)) {
    //     fs.mkdirSync(dir, { recursive: true });
    //   }
    // }

    // app.setPath("userData", appDataPath);
    // app.setPath("sessionData", sessionPath);
    // app.setPath("temp", tempPath);
    // app.setPath("cache", cachePath);

    loadEnvVariables();

    initializeHelpers();
    initializeIpcHandlers({
      getMainWindow,
      setWindowDimensions,

      toggleMainWindow,

      moveWindowLeft: () =>
        moveWindowHorizontal((x) =>
          Math.max(-(state.windowSize?.width || 0) / 2, x - state.step)
        ),
      moveWindowRight: () =>
        moveWindowHorizontal((x) =>
          Math.min(
            state.screenWidth - (state.windowSize?.width || 0) / 2,
            x + state.step
          )
        ),
      moveWindowUp: () => moveWindowVertical((y) => y - state.step),
      moveWindowDown: () => moveWindowVertical((y) => y + state.step),
    });
    await createWindow();
    state.shortcutsHelper?.registerGlobalShortcuts();
  } catch (error) {
    console.error("Failed to initialize application:", error);
    app.quit();
  }
}

app.on("second-instance", (event, commandLine) => {
  console.log("second-instance event received:", commandLine);

  if (!state.mainWindow) {
    createWindow();
  } else {
    if (state.mainWindow.isMinimized()) state.mainWindow.restore();
    state.mainWindow.focus();
  }
});

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
      state.mainWindow = null;
    }
  });
}

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// State getter/setter functions
function getMainWindow() {
  return state.mainWindow;
}

// Export state and functions for other modules
export {
  state,
  createWindow,
  hideMainWindow,
  showMainWindow,
  toggleMainWindow,
  setWindowDimensions,
  moveWindowHorizontal,
  moveWindowVertical,
  getMainWindow,
};

app.whenReady().then(initializeApp);
