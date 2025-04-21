import { globalShortcut, app } from "electron";

export class ShortcutsHelper {
  constructor(deps) {
    this.deps = deps;
  }

  adjustOpacity(delta) {
    const mainWindow = this.deps.getMainWindow();
    if (!mainWindow) return;

    let currentOpacity = mainWindow.getOpacity();
    let newOpacity = Math.max(0.1, Math.min(1.0, currentOpacity + delta));
    console.log(`Adjusting opacity from ${currentOpacity} to ${newOpacity}`);

    mainWindow.setOpacity(newOpacity);

    try {
      config.opacity = newOpacity;
    } catch (error) {
      console.error("Error saving opacity to config:", error);
    }

    if (newOpacity > 0.1 && !this.deps.isVisible()) {
      this.deps.toggleMainWindow();
    }
  }

  registerGlobalShortcuts() {
    // globalShortcut.register("CommandOrControl+H", async () => {
    //   const mainWindow = this.deps.getMainWindow();
    //   if (mainWindow) {
    //     console.log("Taking screenshot...");
    //     try {
    //       const screenshotPath = await this.deps.takeScreenshot();
    //       const preview = await this.deps.getImagePreview(screenshotPath);
    //       mainWindow.webContents.send("screenshot-taken", {
    //         path: screenshotPath,
    //         preview
    //       });
    //     } catch (error) {
    //       console.error("Error capturing screenshot:", error);
    //     }
    //   }
    // });

    // globalShortcut.register("CommandOrControl+Enter", async () => {
    //   await this.deps.processingHelper?.processScreenshots();
    // });

    // globalShortcut.register("CommandOrControl+R", () => {
    //   console.log(
    //     "Command + R pressed. Canceling requests and resetting queues..."
    //   );

    //   this.deps.processingHelper?.cancelOngoingRequests();
    //   this.deps.clearQueues();
    //   console.log("Cleared queues.");
    //   this.deps.setView("queue");

    //   const mainWindow = this.deps.getMainWindow();
    //   if (mainWindow && !mainWindow.isDestroyed()) {
    //     mainWindow.webContents.send("reset-view");
    //     mainWindow.webContents.send("reset");
    //   }
    // });

    globalShortcut.register("CommandOrControl+Left", () => {
      console.log("Command/Ctrl + Left pressed. Moving window left.");
      this.deps.moveWindowLeft();
    });

    globalShortcut.register("CommandOrControl+Right", () => {
      console.log("Command/Ctrl + Right pressed. Moving window right.");
      this.deps.moveWindowRight();
    });

    globalShortcut.register("CommandOrControl+Down", () => {
      console.log("Command/Ctrl + down pressed. Moving window down.");
      this.deps.moveWindowDown();
    });

    globalShortcut.register("CommandOrControl+Up", () => {
      console.log("Command/Ctrl + Up pressed. Moving window Up.");
      this.deps.moveWindowUp();
    });

    globalShortcut.register("CommandOrControl+B", () => {
      console.log("Command/Ctrl + B pressed. Toggling window visibility.");
      this.deps.toggleMainWindow();
    });

    globalShortcut.register("CommandOrControl+Q", () => {
      console.log("Command/Ctrl + Q pressed. Quitting application.");
      app.quit();
    });

    globalShortcut.register("CommandOrControl+[", () => {
      console.log("Command/Ctrl + [ pressed. Decreasing opacity.");
      this.adjustOpacity(-0.1);
    });

    globalShortcut.register("CommandOrControl+]", () => {
      console.log("Command/Ctrl + ] pressed. Increasing opacity.");
      this.adjustOpacity(0.1);
    });

    globalShortcut.register("CommandOrControl+-", () => {
      console.log("Command/Ctrl + - pressed. Zooming out.");
      const mainWindow = this.deps.getMainWindow();
      if (mainWindow) {
        const currentZoom = mainWindow.webContents.getZoomLevel();
        mainWindow.webContents.setZoomLevel(currentZoom - 0.5);
      }
    });

    globalShortcut.register("CommandOrControl+0", () => {
      console.log("Command/Ctrl + 0 pressed. Resetting zoom.");
      const mainWindow = this.deps.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.setZoomLevel(0);
      }
    });

    globalShortcut.register("CommandOrControl+=", () => {
      console.log("Command/Ctrl + = pressed. Zooming in.");
      const mainWindow = this.deps.getMainWindow();
      if (mainWindow) {
        const currentZoom = mainWindow.webContents.getZoomLevel();
        mainWindow.webContents.setZoomLevel(currentZoom + 0.5);
      }
    });

    // globalShortcut.register("CommandOrControl+L", () => {
    //   console.log("Command/Ctrl + L pressed. Deleting last screenshot.");
    //   const mainWindow = this.deps.getMainWindow();
    //   if (mainWindow) {
    //     mainWindow.webContents.send("delete-last-screenshot");
    //   }
    // });

    app.on("will-quit", () => {
      globalShortcut.unregisterAll();
    });
  }
}
