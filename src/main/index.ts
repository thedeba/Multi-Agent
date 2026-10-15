import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { IPC_CHANNELS } from '../security/ipc-contracts';
import { AppPaths } from '../platform/paths';
import { getPlatformInfo } from '../platform/platform-info';
import { ProfileManager } from '../profiles/profile-manager';
import { ProfileLock } from '../profiles/profile-lock';
import { verifyFirebaseIdToken } from '../security/firebase-auth-verifier';

// Set secure Chromium command-line switches
app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling');
app.commandLine.appendSwitch('enable-features', 'NetworkService,NetworkServiceInProcess');

// Isolate development userData from installed production app so LevelDB LOCK files never collide
if (!app.isPackaged) {
  const devUserData = path.join(app.getPath('appData'), 'Multi-Agent-Dev');
  app.setPath('userData', devUserData);
}

let mainWindow: BrowserWindow | null = null;
let authenticatedUserId: string | null = null;
let authTransition = 0;
const profileManager = new ProfileManager();

function createMainWindow() {
  const platform = getPlatformInfo();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 800,
    minHeight: 600,
    title: 'Multi Agent',
    titleBarStyle: platform.isMac ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 12, y: 12 },
    backgroundColor: '#121316',
    webPreferences: {
      preload: path.join(__dirname, '../preload/browser-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      partition: 'persist:main-window',
    },
  });

  BrowserInstanceManager.setMainWindow(mainWindow);
  BrowserInstanceManager.setProfileManager(profileManager);
  AppUpdaterManager.getInstance().setMainWindow(mainWindow);

  const uiPath = path.join(__dirname, '../ui/index.html');
  mainWindow.loadFile(uiPath);

  mainWindow.on('closed', () => {
    AppUpdaterManager.getInstance().setMainWindow(null);
    mainWindow = null;
  });
}

import { BrowserWindowManager } from '../browser/window-manager';
import { BrowserInstanceManager } from '../browser/instance-manager';
import { AppUpdaterManager } from './updater-manager';

function requireAuthenticatedUser(): string {
  if (!authenticatedUserId) {
    throw new Error('Sign in before creating or using profiles.');
  }
  return authenticatedUserId;
}

function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.AUTH_SET_USER, async (event, credentials: unknown) => {
    if (event.sender !== mainWindow?.webContents) {
      throw new Error('Only the application window can change the signed-in user.');
    }
    const transition = ++authTransition;
    if (credentials === null) {
      authenticatedUserId = null;
      return;
    }

    try {
      const verifiedUserId = await verifyFirebaseIdToken(credentials);
      if (transition === authTransition) authenticatedUserId = verifiedUserId;
    } catch (error) {
      if (transition === authTransition) {
        authenticatedUserId = null;
        await Promise.all(
          profileManager.listProfiles().map((profile) => BrowserWindowManager.stopProfileWindow(profile.id))
        );
      }
      throw error;
    }
  });

  // Profile handlers
  ipcMain.handle(IPC_CHANNELS.PROFILE_LIST, async () => {
    return profileManager.listProfiles();
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_CREATE, async (_event, data) => {
    requireAuthenticatedUser();
    const profile = profileManager.createProfile(data);
    mainWindow?.webContents.send(IPC_CHANNELS.PROFILE_SYNC_CHANGED, { type: 'upsert', profileId: profile.id });
    return profile;
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_UPDATE, async (_event, { profileId, data }) => {
    requireAuthenticatedUser();
    const profile = profileManager.updateProfile(profileId, data);
    mainWindow?.webContents.send(IPC_CHANNELS.PROFILE_SYNC_CHANGED, { type: 'upsert', profileId });
    return profile;
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_DELETE, async (_event, { profileId }) => {
    requireAuthenticatedUser();
    const wasRunning = ProfileLock.isLocked(profileId);
    const stopped = await BrowserWindowManager.stopProfileWindow(profileId);
    if (wasRunning && !stopped) {
      throw new Error(`Could not stop profile before deleting it: ${profileId}`);
    }
    const deleted = profileManager.deleteProfile(profileId);
    if (deleted) {
      mainWindow?.webContents.send(IPC_CHANNELS.PROFILE_SYNC_CHANGED, { type: 'delete', profileId });
    }
    return deleted;
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_DUPLICATE, async (_event, { profileId }) => {
    requireAuthenticatedUser();
    const profile = profileManager.duplicateProfile(profileId);
    mainWindow?.webContents.send(IPC_CHANNELS.PROFILE_SYNC_CHANGED, { type: 'upsert', profileId: profile.id });
    return profile;
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_EXPORT, async (_event, { profileId }) => {
    return profileManager.exportProfile(profileId);
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_IMPORT, async (_event, { jsonContent }) => {
    requireAuthenticatedUser();
    const profile = profileManager.importProfile(jsonContent);
    mainWindow?.webContents.send(IPC_CHANNELS.PROFILE_SYNC_CHANGED, { type: 'upsert', profileId: profile.id });
    return profile;
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_SYNC_REPLACE, async (_event, profiles: unknown[]) => {
    requireAuthenticatedUser();
    return profileManager.replaceSyncedProfiles(profiles);
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_SET_ACTIVE, async (_event, { profileId }) => {
    requireAuthenticatedUser();
    return profileManager.setActiveProfile(profileId);
  });

  // Launch each profile in its own Chromium app process and user-data directory.
  ipcMain.handle(IPC_CHANNELS.PROFILE_LAUNCH, async (_event, { profileId }) => {
    requireAuthenticatedUser();
    return BrowserInstanceManager.launchProfile(profileId);
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_STOP, async (_event, { profileId }) => {
    return BrowserWindowManager.stopProfileWindow(profileId);
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_GET_RUNNING, async () => {
    return BrowserWindowManager.getRunningProfileIds();
  });

  // Cookie & Storage IPC handlers
  ipcMain.handle(IPC_CHANNELS.COOKIE_GET, async (_event, { profileId, url }) => {
    const { CookieManager } = await import('../privacy/cookies/cookie-manager');
    return CookieManager.getCookies(profileId, url);
  });

  ipcMain.handle(IPC_CHANNELS.COOKIE_DELETE, async (_event, { profileId, url, name }) => {
    const { CookieManager } = await import('../privacy/cookies/cookie-manager');
    return CookieManager.deleteCookie(profileId, url, name);
  });

  ipcMain.handle(IPC_CHANNELS.COOKIE_CLEAR_ALL, async (_event, { profileId }) => {
    const { CookieManager } = await import('../privacy/cookies/cookie-manager');
    return CookieManager.clearAllCookies(profileId);
  });

  ipcMain.handle(IPC_CHANNELS.COOKIE_EXPORT, async (_event, { profileId, format }) => {
    const { CookieManager } = await import('../privacy/cookies/cookie-manager');
    return CookieManager.exportCookies(profileId, format);
  });

  ipcMain.handle(IPC_CHANNELS.COOKIE_IMPORT, async (_event, { profileId, cookieData }) => {
    const { CookieManager } = await import('../privacy/cookies/cookie-manager');
    return CookieManager.importCookies(profileId, cookieData);
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_GET_SAVED_SESSION, async (_event, { profileId }) => {
    const { SessionSyncServer } = await import('../browser/session-sync-server');
    return SessionSyncServer.getInstance().getSession(profileId);
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_SET_SAVED_SESSION, async (_event, { profileId, session }) => {
    const { SessionSyncServer } = await import('../browser/session-sync-server');
    SessionSyncServer.getInstance().setSession(
      profileId,
      session?.cookies || [],
      session?.openUrls || []
    );
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.STORAGE_CLEAR, async (_event, { profileId, categories }) => {
    const { StorageCleaner } = await import('../privacy/cookies/storage-cleaner');
    return StorageCleaner.clearProfileStorage(profileId, categories);
  });

  ipcMain.handle(IPC_CHANNELS.CLIPBOARD_WRITE, async (_event, { text }) => {
    const { clipboard } = await import('electron');
    clipboard.writeText(String(text ?? ''));
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.CLIPBOARD_READ, async () => {
    const { clipboard } = await import('electron');
    return clipboard.readText();
  });

  // Network & Proxy IPC handlers
  ipcMain.handle(IPC_CHANNELS.PROXY_TEST, async (_event, { config }) => {
    const { ProxyTester } = await import('../network/proxy/proxy-tester');
    return ProxyTester.testConnection(config);
  });

  ipcMain.handle(IPC_CHANNELS.PROXY_ROTATE_IP, async (_event, { changeIpUrl }) => {
    const { ProxyTester } = await import('../network/proxy/proxy-tester');
    return ProxyTester.rotateProxyIp(changeIpUrl);
  });

  ipcMain.handle(IPC_CHANNELS.PROXY_LIST_SAVED, async () => {
    const { SavedProxyStorage } = await import('../network/proxy/saved-proxy-storage');
    return SavedProxyStorage.list();
  });

  ipcMain.handle(IPC_CHANNELS.PROXY_SAVE, async (_event, { proxy }) => {
    const { SavedProxyStorage } = await import('../network/proxy/saved-proxy-storage');
    return SavedProxyStorage.save(proxy);
  });

  ipcMain.handle(IPC_CHANNELS.PROXY_DELETE_SAVED, async (_event, { id }) => {
    const { SavedProxyStorage } = await import('../network/proxy/saved-proxy-storage');
    return SavedProxyStorage.delete(id);
  });

  ipcMain.handle(IPC_CHANNELS.PROXY_LIST_FREE, async (_event, args?: { countryCode?: string; forceRefresh?: boolean }) => {
    const { FreeProxyService } = await import('../network/proxy/free-proxy-service');
    return FreeProxyService.fetchFreeProxies(args?.countryCode, args?.forceRefresh);
  });

  ipcMain.handle(IPC_CHANNELS.PROXY_GET_COUNTRIES, async () => {
    const { FreeProxyService } = await import('../network/proxy/free-proxy-service');
    return FreeProxyService.getCountries();
  });

  // Permission IPC handlers
  ipcMain.handle(IPC_CHANNELS.PERMISSION_LIST, async (_event, { profileId }) => {
    const { PermissionManager } = await import('../permissions/permission-manager');
    return PermissionManager.listPermissions(profileId);
  });

  ipcMain.handle(IPC_CHANNELS.PERMISSION_SET, async (_event, { profileId, origin, permission, decision }) => {
    const { PermissionManager } = await import('../permissions/permission-manager');
    return PermissionManager.setPermission(profileId, origin, permission, decision);
  });

  ipcMain.handle(IPC_CHANNELS.PERMISSION_RESET, async (_event, { profileId }) => {
    const { PermissionManager } = await import('../permissions/permission-manager');
    return PermissionManager.resetPermissions(profileId);
  });

  // Auto Updater Handlers
  AppUpdaterManager.getInstance().registerIpcHandlers();
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    AppPaths.getProfilesDir();
    registerIpcHandlers();
    BrowserInstanceManager.setProfileManager(profileManager);
    BrowserInstanceManager.startWatchdog();
    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });
}

app.on('before-quit', async () => {
  BrowserInstanceManager.stopWatchdog();
  await BrowserInstanceManager.stopAllProfiles();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
