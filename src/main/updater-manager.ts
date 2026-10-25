import { autoUpdater, UpdateInfo } from 'electron-updater';
import { BrowserWindow, ipcMain, app } from 'electron';
import { IPC_CHANNELS } from '../security/ipc-contracts';

export type UpdateStatus =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available'; version: string; releaseNotes?: string }
  | { status: 'not-available' }
  | { status: 'downloading'; percent: number; bytesPerSecond: number; total: number; transferred: number }
  | { status: 'downloaded'; version: string }
  | { status: 'error'; message: string };

export class AppUpdaterManager {
  private static instance: AppUpdaterManager;
  private currentStatus: UpdateStatus = { status: 'idle' };
  private mainWindow: BrowserWindow | null = null;

  private constructor() {
    this.configureUpdater();
    this.registerEvents();
  }

  public static getInstance(): AppUpdaterManager {
    if (!AppUpdaterManager.instance) {
      AppUpdaterManager.instance = new AppUpdaterManager();
    }
    return AppUpdaterManager.instance;
  }

  public setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window;
    // Broadcast latest status if window attaches
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.sendUpdateStatus(this.currentStatus);
    }
  }

  private configureUpdater(): void {
    // Logging and default behaviors
    autoUpdater.autoDownload = false; // User controls download or auto-updates smoothly
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowPrerelease = false;

    // In dev mode, updater usually throws unless forced or packaged
    if (!app.isPackaged) {
      autoUpdater.forceDevUpdateConfig = false;
    }
  }

  private registerEvents(): void {
    autoUpdater.on('checking-for-update', () => {
      this.updateStatus({ status: 'checking' });
    });

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      this.updateStatus({
        status: 'available',
        version: info.version,
        releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined,
      });
    });

    autoUpdater.on('update-not-available', () => {
      this.updateStatus({ status: 'not-available' });
    });

    autoUpdater.on('download-progress', (progress) => {
      this.updateStatus({
        status: 'downloading',
        percent: Math.round(progress.percent || 0),
        bytesPerSecond: progress.bytesPerSecond || 0,
        total: progress.total || 0,
        transferred: progress.transferred || 0,
      });
    });

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      this.updateStatus({
        status: 'downloaded',
        version: info.version,
      });
    });

    autoUpdater.on('error', (err: Error) => {
      let msg = err.message || 'Unknown update error';
      if (msg.includes('404') && (msg.includes('releases.atom') || msg.includes('latest.yml') || msg.includes('latest-mac.yml'))) {
        msg = 'No update releases published yet or repository release is not found.';
      }
      this.updateStatus({
        status: 'error',
        message: msg,
      });
    });
  }

  private updateStatus(status: UpdateStatus): void {
    this.currentStatus = status;
    this.sendUpdateStatus(status);
  }

  private sendUpdateStatus(status: UpdateStatus): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.UPDATER_STATUS_CHANGED, status);
    }
  }

  public registerIpcHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.UPDATER_CHECK, async () => {
      if (!app.isPackaged) {
        // Development builds always run the latest local source, so there is no update to fetch.
        this.updateStatus({ status: 'not-available' });
        return {
          success: true,
          updateAvailable: false,
        };
      }
      try {
        const result = await autoUpdater.checkForUpdates();
        const updateAvailable = Boolean(result?.isUpdateAvailable);

        if (!updateAvailable) {
          this.updateStatus({ status: 'not-available' });
        } else if (result?.updateInfo) {
          this.updateStatus({
            status: 'available',
            version: result.updateInfo.version,
            releaseNotes: typeof result.updateInfo.releaseNotes === 'string'
              ? result.updateInfo.releaseNotes
              : undefined,
          });
        }

        return {
          success: true,
          updateAvailable,
          updateInfo: result?.updateInfo,
        };
      } catch (err: any) {
        this.updateStatus({ status: 'error', message: err.message });
        return {
          success: false,
          error: err.message,
        };
      }
    });

    ipcMain.handle(IPC_CHANNELS.UPDATER_DOWNLOAD, async () => {
      try {
        await autoUpdater.downloadUpdate();
        return { success: true };
      } catch (err: any) {
        this.updateStatus({ status: 'error', message: err.message });
        return { success: false, error: err.message };
      }
    });

    ipcMain.handle(IPC_CHANNELS.UPDATER_INSTALL, () => {
      try {
        autoUpdater.quitAndInstall(false, true);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    });
  }
}

