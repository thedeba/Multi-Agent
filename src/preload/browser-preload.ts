import { contextBridge, ipcRenderer } from 'electron';
import type { Profile } from '../security/ipc-contracts';

const IPC_CHANNELS = {
  // Tabs
  TAB_CREATE: 'tab:create',
  TAB_CLOSE: 'tab:close',
  TAB_SWITCH: 'tab:switch',
  TAB_NAVIGATE: 'tab:navigate',
  TAB_GO_BACK: 'tab:go-back',
  TAB_GO_FORWARD: 'tab:go-forward',
  TAB_RELOAD: 'tab:reload',
  TAB_LIST: 'tab:list',
  
  // Tab Events
  TAB_UPDATED: 'tab:updated',
  TAB_CLOSED: 'tab:closed',

  // Profiles
  PROFILE_LIST: 'profile:list',
  PROFILE_CREATE: 'profile:create',
  PROFILE_UPDATE: 'profile:update',
  PROFILE_DELETE: 'profile:delete',
  PROFILE_DUPLICATE: 'profile:duplicate',
  PROFILE_EXPORT: 'profile:export',
  PROFILE_IMPORT: 'profile:import',
  PROFILE_SET_ACTIVE: 'profile:set-active',
  PROFILE_LAUNCH: 'profile:launch',
  PROFILE_STOP: 'profile:stop',
  PROFILE_GET_RUNNING: 'profile:get-running',
  PROFILE_RUNNING_UPDATED: 'profile:running-updated',
  PROFILE_SYNC_REPLACE: 'profile:sync-replace',
  PROFILE_SYNC_CHANGED: 'profile:sync-changed',
  AUTH_SET_USER: 'auth:set-user',

  // Cookies & Storage
  COOKIE_GET: 'cookie:get',
  COOKIE_DELETE: 'cookie:delete',
  COOKIE_CLEAR_ALL: 'cookie:clear-all',
  COOKIE_EXPORT: 'cookie:export',
  COOKIE_IMPORT: 'cookie:import',
  PROFILE_SESSION_EXITED: 'profile:session-exited',
  PROFILE_SESSION_UPDATED: 'profile:session-updated',
  PROFILE_GET_SAVED_SESSION: 'profile:get-saved-session',
  PROFILE_SET_SAVED_SESSION: 'profile:set-saved-session',
  PROFILE_ARCHIVE_SYNC: 'profile:archive-sync',
  PROFILE_ARCHIVE_UPLOAD: 'profile:archive-upload',
  STORAGE_CLEAR: 'storage:clear',
  CLIPBOARD_WRITE: 'clipboard:write',
  CLIPBOARD_READ: 'clipboard:read',

  // Network & Proxy
  PROXY_TEST: 'proxy:test',
  PROXY_ROTATE_IP: 'proxy:rotate-ip',
  PROXY_LIST_SAVED: 'proxy:list-saved',
  PROXY_SAVE: 'proxy:save',
  PROXY_DELETE_SAVED: 'proxy:delete-saved',
  PROXY_LIST_FREE: 'proxy:list-free',
  PROXY_GET_COUNTRIES: 'proxy:get-countries',

  // Permissions
  PERMISSION_LIST: 'permission:list',
  PERMISSION_SET: 'permission:set',
  PERMISSION_RESET: 'permission:reset',

  // Privacy & Stats
  PRIVACY_GET_STATS: 'privacy:get-stats',
  PRIVACY_STATS_UPDATED: 'privacy:stats-updated',

  // DevTools
  DEVTOOLS_TOGGLE: 'devtools:toggle',

  // Viewport Visibility
  VIEW_SET_VISIBILITY: 'view:set-visibility',

  // Auto Updater
  UPDATER_CHECK: 'updater:check',
  UPDATER_DOWNLOAD: 'updater:download',
  UPDATER_INSTALL: 'updater:install',
  UPDATER_STATUS_CHANGED: 'updater:status-changed',
} as const;

const browserAPI = {
  // Profile Management
  listProfiles: (): Promise<Profile[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILE_LIST),
  createProfile: (data: { name: string; isTemporary?: boolean; privacyLevel?: string; color?: string; customUserAgent?: string }): Promise<Profile> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILE_CREATE, data),
  updateProfile: (profileId: string, data: any): Promise<Profile> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILE_UPDATE, { profileId, data }),
  deleteProfile: (profileId: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILE_DELETE, { profileId }),
  duplicateProfile: (profileId: string): Promise<Profile> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILE_DUPLICATE, { profileId }),
  exportProfile: (profileId: string): Promise<string> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILE_EXPORT, { profileId }),
  importProfile: (jsonContent: string): Promise<Profile> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILE_IMPORT, { jsonContent }),
  setActiveProfile: (profileId: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILE_SET_ACTIVE, { profileId }),
  launchProfile: (profileId: string): Promise<{ success: boolean; profileId: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILE_LAUNCH, { profileId }),
  stopProfile: (profileId: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILE_STOP, { profileId }),
  getRunningProfiles: (): Promise<string[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILE_GET_RUNNING),
  replaceCloudProfiles: (profiles: Profile[]): Promise<Profile[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILE_SYNC_REPLACE, profiles),
  setAuthenticatedUser: (credentials: { idToken: string; apiKey: string } | null): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.AUTH_SET_USER, credentials),

  // Cookie & Storage Management
  getCookies: (profileId: string, url?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.COOKIE_GET, { profileId, url }),
  deleteCookie: (profileId: string, url: string, name: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.COOKIE_DELETE, { profileId, url, name }),
  clearAllCookies: (profileId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.COOKIE_CLEAR_ALL, { profileId }),
  exportCookies: (profileId: string, format: 'json' | 'netscape' = 'json'): Promise<string> =>
    ipcRenderer.invoke(IPC_CHANNELS.COOKIE_EXPORT, { profileId, format }),
  importCookies: (profileId: string, cookieData: string): Promise<{ imported: number; errors: number }> =>
    ipcRenderer.invoke(IPC_CHANNELS.COOKIE_IMPORT, { profileId, cookieData }),
  clearStorage: (profileId: string, categories?: string[]) =>
    ipcRenderer.invoke(IPC_CHANNELS.STORAGE_CLEAR, { profileId, categories }),
  copyToClipboard: (text: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.CLIPBOARD_WRITE, { text }),
  readFromClipboard: (): Promise<string> =>
    ipcRenderer.invoke(IPC_CHANNELS.CLIPBOARD_READ),

  // Network & Proxy
  testProxy: (config: any) =>
    ipcRenderer.invoke(IPC_CHANNELS.PROXY_TEST, { config }),
  rotateProxyIp: (changeIpUrl: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.PROXY_ROTATE_IP, { changeIpUrl }),
  listSavedProxies: () =>
    ipcRenderer.invoke(IPC_CHANNELS.PROXY_LIST_SAVED),
  saveProxy: (proxy: any) =>
    ipcRenderer.invoke(IPC_CHANNELS.PROXY_SAVE, { proxy }),
  deleteSavedProxy: (id: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.PROXY_DELETE_SAVED, { id }),
  listFreeProxies: (options?: { countryCode?: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.PROXY_LIST_FREE, options),
  getProxyCountries: () =>
    ipcRenderer.invoke(IPC_CHANNELS.PROXY_GET_COUNTRIES),

  // Permissions
  listPermissions: (profileId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.PERMISSION_LIST, { profileId }),
  setPermission: (profileId: string, origin: string, permission: string, decision: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.PERMISSION_SET, { profileId, origin, permission, decision }),
  resetPermissions: (profileId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.PERMISSION_RESET, { profileId }),

  // Event Listeners
  onRunningProfilesUpdated: (callback: (runningIds: string[]) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, runningIds: string[]) => callback(runningIds);
    ipcRenderer.on(IPC_CHANNELS.PROFILE_RUNNING_UPDATED, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.PROFILE_RUNNING_UPDATED, handler);
  },
  onProfileSyncChanged: (callback: (change: { type: 'upsert' | 'delete'; profileId: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, change: { type: 'upsert' | 'delete'; profileId: string }) => callback(change);
    ipcRenderer.on(IPC_CHANNELS.PROFILE_SYNC_CHANGED, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.PROFILE_SYNC_CHANGED, handler);
  },
  onProfileSessionExited: (callback: (data: { profileId: string; cookies: any[]; openUrls: string[] }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { profileId: string; cookies: any[]; openUrls: string[] }) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.PROFILE_SESSION_EXITED, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.PROFILE_SESSION_EXITED, handler);
  },
  onProfileSessionUpdated: (callback: (data: { profileId: string; cookies: any[]; openUrls: string[] }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { profileId: string; cookies: any[]; openUrls: string[] }) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.PROFILE_SESSION_UPDATED, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.PROFILE_SESSION_UPDATED, handler);
  },
  getSavedSession: (profileId: string): Promise<{ cookies: any[]; openUrls: string[] }> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILE_GET_SAVED_SESSION, { profileId }),
  saveSavedSession: (profileId: string, session: { cookies: any[]; openUrls: string[] }): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILE_SET_SAVED_SESSION, { profileId, session }),
  syncCloudProfileArchive: (
    profileId: string,
    credentials: { idToken: string; apiKey: string; passphrase: string; bucket: string }
  ): Promise<'restored' | 'uploaded' | 'already-local'> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILE_ARCHIVE_SYNC, { profileId, credentials }),
  uploadCloudProfileArchive: (
    profileId: string,
    credentials: { idToken: string; apiKey: string; passphrase: string; bucket: string }
  ): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILE_ARCHIVE_UPLOAD, { profileId, credentials }),

  // Auto Updater
  checkForUpdates: (): Promise<{ success: boolean; updateAvailable?: boolean; updateInfo?: any; error?: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATER_CHECK),
  downloadUpdate: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATER_DOWNLOAD),
  installUpdate: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATER_INSTALL),
  onUpdateStatusChanged: (callback: (status: any) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, status: any) => callback(status);
    ipcRenderer.on(IPC_CHANNELS.UPDATER_STATUS_CHANGED, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATER_STATUS_CHANGED, handler);
  },
};

export type BrowserAPI = typeof browserAPI;

contextBridge.exposeInMainWorld('browserAPI', browserAPI);
