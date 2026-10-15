import { z } from 'zod';

export const PrivacyLevelSchema = z.enum(['standard', 'balanced', 'strict']);
export type PrivacyLevel = z.infer<typeof PrivacyLevelSchema>;

export const WebRTCPolicySchema = z.enum([
  'default',
  'default_public_interface_only',
  'disable_non_proxied_udp',
  'disabled',
]);
export type WebRTCPolicy = z.infer<typeof WebRTCPolicySchema>;

export const ProxyConfigSchema = z.object({
  enabled: z.boolean(),
  mode: z.enum(['direct', 'http', 'https', 'socks5']),
  host: z.string().default(''),
  port: z.number().int().min(1).max(65535).default(8080),
  username: z.string().optional(),
  password: z.string().optional(),
  changeIpUrl: z.string().optional(),
  proxyType: z.enum(['manual', 'free', 'direct']).optional(),
  freeProxyId: z.string().optional(),
});
export type ProxyConfig = z.infer<typeof ProxyConfigSchema>;

export const SavedProxySchema = z.object({
  id: z.string(),
  name: z.string(),
  mode: z.enum(['http', 'https', 'socks5']),
  host: z.string(),
  port: z.number().int().min(1).max(65535),
  username: z.string().optional(),
  password: z.string().optional(),
  changeIpUrl: z.string().optional(),
  group: z.string().default('Default'),
  createdAt: z.number(),
});
export type SavedProxy = z.infer<typeof SavedProxySchema>;

export const BrowserTypeSchema = z.enum(['chrome', 'edge', 'brave']);
export type BrowserType = z.infer<typeof BrowserTypeSchema>;

export const ProfileSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(64),
  isTemporary: z.boolean().default(false),
  privacyLevel: PrivacyLevelSchema.default('balanced'),
  webrtcPolicy: WebRTCPolicySchema.default('default_public_interface_only'),
  proxy: ProxyConfigSchema.default({
    enabled: false,
    mode: 'direct',
    host: '',
    port: 8080,
  }),
  os: z.enum(['mac', 'windows']).default('mac'),
  browserType: BrowserTypeSchema.default('chrome'),
  browserVersion: z.string().default('150.0.0.0'),
  customUserAgent: z.string().max(512).optional(),
  language: z.string().default('en-US'),
  timezone: z.string().default('auto'),
  storagePath: z.string().default(''),
  status: z.enum(['stopped', 'running', 'crashed']).default('stopped'),
  lastUsedAt: z.number().nullable().default(null),
  notes: z.string().default(''),
  group: z.string().default('Default'),
  tags: z.array(z.string()).default([]),
  color: z.string().default('#3b82f6'),
  remoteDebuggingPort: z.number().int().min(1024).max(65535).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const TabInfoSchema = z.object({
  id: z.string(),
  url: z.string(),
  title: z.string(),
  favicon: z.string().optional(),
  isLoading: z.boolean(),
  canGoBack: z.boolean(),
  canGoForward: z.boolean(),
  profileId: z.string(),
});
export type TabInfo = z.infer<typeof TabInfoSchema>;

export const PrivacyStatsSchema = z.object({
  trackersBlocked: z.number(),
  fingerprintingAttemptsBlocked: z.number(),
  cookiesBlocked: z.number(),
  privacyScore: z.number(),
  webrtcProtected: z.boolean(),
  proxyConnected: z.boolean(),
  httpsSecure: z.boolean(),
});
export type PrivacyStats = z.infer<typeof PrivacyStatsSchema>;

// Channel string constants to prevent typos
export const IPC_CHANNELS = {
  // Tabs
  TAB_CREATE: 'tab:create',
  TAB_CLOSE: 'tab:close',
  TAB_SWITCH: 'tab:switch',
  TAB_NAVIGATE: 'tab:navigate',
  TAB_GO_BACK: 'tab:go-back',
  TAB_GO_FORWARD: 'tab:go-forward',
  TAB_RELOAD: 'tab:reload',
  TAB_LIST: 'tab:list',
  
  // Tab Events (push to UI)
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

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',

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
