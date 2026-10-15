import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  User,
  Plus,
  Play,
  Square,
  Trash2,
  Copy,
  Download,
  Upload,
  Search,
  CheckCircle2,
  Check,
  X,
  Shield,
  Radio,
  Globe,
  Settings,
  Apple,
  Monitor,
  Wifi,
  Edit2,
  Loader2,
  RotateCw,
  Cookie,
  Bookmark,
  Layers,
  Flame,
  Compass,
  RefreshCw,
  AlertCircle,
  ArrowDownCircle,
  CheckCircle,
  Zap,
  MoreVertical,
  LayoutGrid,
  List,
  Sparkles,
} from 'lucide-react';
import { Profile, ProxyConfig, SavedProxy } from '../../security/ipc-contracts';
import { getBrowserUserAgent } from '../../profiles/browser-definitions';
import { SUPPORTED_PROXY_COUNTRIES, POPULAR_PROXY_COUNTRIES, ProxyCountry } from '../../network/proxy/proxy-countries';
import {
  POPULAR_LANGUAGES,
  ALL_LANGUAGES,
  POPULAR_TIMEZONES,
  ALL_TIMEZONES,
} from '../../profiles/locales';
import { getFirebaseServices, isFirebaseConfigured } from '../services/firebase';
import { restoreProfileCookiesFromCloud } from '../services/cloud-profile-sync';

export interface ParsedProxyInfo {
  host: string;
  port: number;
  username?: string;
  password?: string;
  mode?: 'socks5' | 'http' | 'https';
  changeIpUrl?: string;
}

export function parseProxyString(raw: string): ParsedProxyInfo | null {
  if (!raw) return null;
  let text = raw.trim();
  if (!text) return null;

  let mode: 'socks5' | 'http' | 'https' | undefined;
  let changeIpUrl: string | undefined;

  // 1. Protocol prefix: socks5://, http://, https://
  const protoMatch = text.match(/^(socks5|socks4|http|https):\/\//i);
  if (protoMatch) {
    const proto = protoMatch[1].toLowerCase();
    mode = proto === 'https' ? 'https' : proto.startsWith('socks') ? 'socks5' : 'http';
    text = text.slice(protoMatch[0].length);
  }

  // 2. Format: user:pass@host:port
  if (text.includes('@')) {
    const atIdx = text.lastIndexOf('@');
    const authPart = text.slice(0, atIdx);
    const hostPortPart = text.slice(atIdx + 1);
    const authParts = authPart.split(':');
    const hostPortParts = hostPortPart.split(':');
    const host = hostPortParts[0]?.trim();
    const port = Number(hostPortParts[1]) || 8080;
    const username = authParts[0]?.trim() || undefined;
    const password = authParts[1]?.trim() || undefined;
    if (host && port) {
      return { host, port, username, password, mode, changeIpUrl };
    }
  }

  const parts = text.split(':');

  // Check if first part is protocol name without slashes: http:host:port:user:pass
  if (['http', 'https', 'socks5', 'socks4'].includes(parts[0]?.toLowerCase())) {
    mode = parts[0].toLowerCase().startsWith('socks') ? 'socks5' : parts[0].toLowerCase() === 'https' ? 'https' : 'http';
    parts.shift();
  }

  // Format A: host:port:username:password[:extra] (e.g. gw.dataimpulse.com:10000:user:pass:9050)
  const port1 = parseInt(parts[1]?.trim(), 10);
  if (!isNaN(port1) && port1 > 0 && port1 <= 65535 && parts[0]?.includes('.')) {
    const host = parts[0].trim();
    const port = port1;
    const username = parts[2] ? parts[2].trim() : undefined;
    const password = parts[3] ? parts[3].trim() : undefined;
    if (parts[4]) {
      const extra = parts.slice(4).join(':').trim();
      if (extra.startsWith('http://') || extra.startsWith('https://')) {
        changeIpUrl = extra;
      }
    }
    return { host, port, username, password, mode, changeIpUrl };
  }

  // Format B: username:password:host:port[:extra]
  if (parts.length >= 4) {
    const port3 = parseInt(parts[3]?.trim(), 10);
    if (!isNaN(port3) && port3 > 0 && port3 <= 65535 && parts[2]?.includes('.')) {
      const host = parts[2].trim();
      const port = port3;
      const username = parts[0]?.trim() || undefined;
      const password = parts[1]?.trim() || undefined;
      if (parts[4]) {
        const extra = parts.slice(4).join(':').trim();
        if (extra.startsWith('http://') || extra.startsWith('https://')) {
          changeIpUrl = extra;
        }
      }
      return { host, port, username, password, mode, changeIpUrl };
    }
  }

  // Fallback: host:port
  if (parts.length >= 2) {
    const host = parts[0].trim();
    const port = parseInt(parts[1].trim(), 10);
    if (!isNaN(port) && port > 0 && port <= 65535) {
      const username = parts[2] ? parts[2].trim() : undefined;
      const password = parts[3] ? parts[3].trim() : undefined;
      return { host, port, username, password, mode, changeIpUrl };
    }
  }

  return null;
}

const BROWSER_VERSION_OPTIONS: string[] = Array.from({ length: 165 - 145 + 1 }, (_, i) => `${165 - i}.0.0.0`);

interface ProfileSwitcherProps {
  profiles: Profile[];
  isAuthenticated: boolean;
  onRefreshProfiles: () => void;
}

export const ProfileSwitcher: React.FC<ProfileSwitcherProps> = ({
  profiles,
  isAuthenticated,
  onRefreshProfiles,
}) => {
  // Navigation & filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOS, setFilterOS] = useState<'all' | 'mac' | 'windows'>('all');
  const [filterBrowser, setFilterBrowser] = useState<'all' | 'chrome' | 'edge' | 'brave'>('all');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [runningProfileIds, setRunningProfileIds] = useState<string[]>([]);
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);

  // Creation & Editing modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editorTab, setEditorTab] = useState<'general' | 'proxy' | 'privacy' | 'cookies'>('general');

  // Profile Editor Cookies state
  const [profileCookiesContent, setProfileCookiesContent] = useState<string>('');
  const [profileCookiesFormat, setProfileCookiesFormat] = useState<'json' | 'netscape'>('json');
  const [profileCookiesCount, setProfileCookiesCount] = useState<number>(0);
  const [profileCookiesStatus, setProfileCookiesStatus] = useState<string>('');
  const [isSavingCookies, setIsSavingCookies] = useState<boolean>(false);
  const [isCopyingCookies, setIsCopyingCookies] = useState<boolean>(false);

  // Form fields
  const [name, setName] = useState('');
  const [group, setGroup] = useState('Default');
  const [os, setOs] = useState<'mac' | 'windows'>('mac');
  const [browserType, setBrowserType] = useState<'chrome' | 'edge' | 'brave'>('chrome');
  const [browserVersion, setBrowserVersion] = useState<string>('150.0.0.0');
  const [customUserAgent, setCustomUserAgent] = useState('');
  const [copiedUA, setCopiedUA] = useState(false);
  const [color, setColor] = useState('#3b82f6');
  const [notes, setNotes] = useState('');
  const [privacyLevel, setPrivacyLevel] = useState<'standard' | 'balanced' | 'strict'>('balanced');
  const [webrtcPolicy, setWebrtcPolicy] = useState<'default' | 'default_public_interface_only' | 'disable_non_proxied_udp' | 'disabled'>('default_public_interface_only');
  const [language, setLanguage] = useState<string>('en-US');
  const [timezone, setTimezone] = useState<string>('auto');
  const [isTemporary, setIsTemporary] = useState(false);
  const [remoteDebuggingPort, setRemoteDebuggingPort] = useState<number | ''>('');
  const [tags, setTags] = useState<string[]>([]);

  // Proxy form fields
  const [proxyEnabled, setProxyEnabled] = useState(false);
  const [proxyMode, setProxyMode] = useState<'direct' | 'http' | 'https' | 'socks5'>('http');
  const [proxyHost, setProxyHost] = useState('');
  const [proxyPort, setProxyPort] = useState<number>(9050);
  const [proxyUsername, setProxyUsername] = useState('');
  const [proxyPassword, setProxyPassword] = useState('');
  const [changeIpUrl, setChangeIpUrl] = useState('');
  const [savedProxies, setSavedProxies] = useState<SavedProxy[]>([]);
  const [selectedSavedProxyId, setSelectedSavedProxyId] = useState<string>('');
  const [freeProxies, setFreeProxies] = useState<any[]>([]);
  const [loadingFreeProxies, setLoadingFreeProxies] = useState(false);
  const [selectedFreeProxyId, setSelectedFreeProxyId] = useState<string>('');
  const [freeProxyHost, setFreeProxyHost] = useState('');
  const [freeProxyPort, setFreeProxyPort] = useState<number>(1080);
  const [freeProxyMode, setFreeProxyMode] = useState<'http' | 'https' | 'socks5'>('socks5');
  const [proxyCountries, setProxyCountries] = useState<ProxyCountry[]>(SUPPORTED_PROXY_COUNTRIES);
  const [popularProxyCountries] = useState<ProxyCountry[]>(POPULAR_PROXY_COUNTRIES);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('ALL');
  const [proxyFilterProtocol, setProxyFilterProtocol] = useState<'all' | 'socks5' | 'http'>('all');
  const [proxySearchText, setProxySearchText] = useState<string>('');
  const [quickProxyInput, setQuickProxyInput] = useState<string>('');
  const [proxySubTab, setProxySubTab] = useState<'manual' | 'free'>('manual');
  const [freeProxyViewMode, setFreeProxyViewMode] = useState<'grid' | 'table'>('grid');
  const [copiedProxyIp, setCopiedProxyIp] = useState<string | null>(null);

  // Proxy test and rotation state
  const [testingProxy, setTestingProxy] = useState(false);
  const [testingProxyIp, setTestingProxyIp] = useState<string | null>(null);
  const [testedProxyResults, setTestedProxyResults] = useState<Record<string, {
    success: boolean;
    latencyMs?: number;
    speedRating?: string;
    uptime?: string;
    error?: string;
  }>>({});
  const [proxyTestResult, setProxyTestResult] = useState<{
    success: boolean;
    latencyMs?: number;
    ip?: string;
    country?: string;
    city?: string;
    timezone?: string;
    error?: string;
  } | null>(null);

  const [rotatingProfileId, setRotatingProfileId] = useState<string | null>(null);

  // Live Proxy Connection Test Toast state
  const [proxyToast, setProxyToast] = useState<{
    id: string;
    type: 'testing' | 'success' | 'error';
    title: string;
    host: string;
    port: number | string;
    protocol?: string;
    countryFlag?: string;
    countryName?: string;
    latencyMs?: number;
    speedRating?: string;
    exitIp?: string;
    location?: string;
    error?: string;
  } | null>(null);

  const toastTimeoutRef = React.useRef<any>(null);

  const showProxyToast = (toastData: {
    id: string;
    type: 'testing' | 'success' | 'error';
    title: string;
    host: string;
    port: number | string;
    protocol?: string;
    countryFlag?: string;
    countryName?: string;
    latencyMs?: number;
    speedRating?: string;
    exitIp?: string;
    location?: string;
    error?: string;
  } | null) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    setProxyToast(toastData);
    if (toastData && toastData.type !== 'testing') {
      const delay = toastData.type === 'success' ? 4000 : 5000;
      toastTimeoutRef.current = setTimeout(() => {
        setProxyToast(null);
      }, delay);
    }
  };

  // Import JSON drawer
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState('');

  // Cookie Drawer Modal
  const [cookieModalProfile, setCookieModalProfile] = useState<Profile | null>(null);
  const [cookieModalContent, setCookieModalContent] = useState('');
  const [cookieModalFormat, setCookieModalFormat] = useState<'json' | 'netscape'>('json');
  const [cookieStatusMsg, setCookieStatusMsg] = useState('');
  const [cookieModalCount, setCookieModalCount] = useState(0);
  const [isSavingCookieModal, setIsSavingCookieModal] = useState(false);
  const [isCopyingCookieModal, setIsCopyingCookieModal] = useState(false);

  // Bulk Profile Creator state
  const [showBulkCreateModal, setShowBulkCreateModal] = useState(false);
  const [bulkCount, setBulkCount] = useState(5);
  const [bulkPrefix, setBulkPrefix] = useState('Account');
  const [bulkGroup, setBulkGroup] = useState('Default');
  const [bulkOs, setBulkOs] = useState<'mac' | 'windows'>('mac');
  const [bulkBrowser, setBulkBrowser] = useState<'chrome' | 'edge' | 'brave'>('chrome');
  const [bulkProxiesText, setBulkProxiesText] = useState('');
  const [isBulkCreating, setIsBulkCreating] = useState(false);

  // Auto Updater State
  const [updateStatus, setUpdateStatus] = useState<any>({ status: 'idle' });
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [activeActionMenuProfileId, setActiveActionMenuProfileId] = useState<string | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState<{ top: number; right: number; openUpwards: boolean } | null>(null);

  // Auto Updater listener
  useEffect(() => {
    if (window.browserAPI && (window.browserAPI as any).onUpdateStatusChanged) {
      const unsub = (window.browserAPI as any).onUpdateStatusChanged((status: any) => {
        setUpdateStatus(status);
        if (status.status !== 'checking') {
          setCheckingUpdate(false);
        }
      });
      return () => {
        if (unsub) unsub();
      };
    }
  }, []);

  // Close actions dropdown on click outside, scroll, or resize
  useEffect(() => {
    if (!activeActionMenuProfileId) return;
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.closest('.action-menu-dropdown-portal') || target.closest('.action-menu-trigger-btn'))) {
        return;
      }
      setActiveActionMenuProfileId(null);
      setActionMenuPosition(null);
    };

    const handleScrollOrResize = () => {
      setActiveActionMenuProfileId(null);
      setActionMenuPosition(null);
    };

    document.addEventListener('mousedown', handleDocumentClick);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [activeActionMenuProfileId]);

  // Fetch running profiles and actively sync when browser windows close
  useEffect(() => {
    let lastRunningStr = '';
    const updateRunning = (running: string[]) => {
      const runningList = running || [];
      const currentStr = runningList.slice().sort().join(',');
      setRunningProfileIds(runningList);
      if (lastRunningStr !== '' && lastRunningStr !== currentStr) {
        onRefreshProfiles?.();
      }
      lastRunningStr = currentStr;
    };

    if (window.browserAPI && (window.browserAPI as any).getRunningProfiles) {
      (window.browserAPI as any).getRunningProfiles().then((running: string[]) => {
        updateRunning(running);
      });

      const unsub = (window.browserAPI as any).onRunningProfilesUpdated?.((running: string[]) => {
        updateRunning(running);
      });

      // Periodic check every 1 second to ensure state is synchronized immediately
      // when browser window is closed by user (Cmd+Q, Alt+F4, or window close button)
      const interval = setInterval(() => {
        (window.browserAPI as any).getRunningProfiles().then((running: string[]) => {
          updateRunning(running);
        }).catch(() => {});
      }, 1000);

      return () => {
        if (unsub) unsub();
        clearInterval(interval);
      };
    }
  }, [onRefreshProfiles]);

  // Load saved proxies & free proxies on mount
  useEffect(() => {
    if (window.browserAPI && (window.browserAPI as any).listSavedProxies) {
      (window.browserAPI as any).listSavedProxies().then((list: SavedProxy[]) => {
        setSavedProxies(list || []);
      });
    }

    if (window.browserAPI && (window.browserAPI as any).getProxyCountries) {
      (window.browserAPI as any).getProxyCountries().then((countries: any[]) => {
        if (countries && countries.length > 0) {
          setProxyCountries(countries);
        }
      }).catch(() => {});
    }

    if (window.browserAPI && (window.browserAPI as any).listFreeProxies) {
      setLoadingFreeProxies(true);
      (window.browserAPI as any).listFreeProxies({ countryCode: 'ALL' })
        .then((freeList: any[]) => {
          setFreeProxies(freeList || []);
        })
        .catch(() => {})
        .finally(() => setLoadingFreeProxies(false));
    }
  }, []);

  const groups = Array.from(new Set(profiles.map((p) => (p as any).group || 'Default')));

  const filteredProfiles = profiles.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q ||
      (p.name || '').toLowerCase().includes(q) ||
      ((p as any).notes || '').toLowerCase().includes(q) ||
      (p.proxy?.host || '').toLowerCase().includes(q);
    const matchesOS = filterOS === 'all' || (p as any).os === filterOS;
    const pBrowser = (p as any).browserType || 'chrome';
    const matchesBrowser = filterBrowser === 'all' || pBrowser === filterBrowser;
    const pGroup = (p as any).group || 'Default';
    const matchesGroup = filterGroup === 'all' || pGroup === filterGroup;
    return matchesQuery && matchesOS && matchesBrowser && matchesGroup;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProfileIds(filteredProfiles.map((p) => p.id));
    } else {
      setSelectedProfileIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedProfileIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleBulkLaunch = async () => {
    for (const id of selectedProfileIds) {
      await handleLaunch(id);
    }
  };

  const handleBulkStop = async () => {
    for (const id of selectedProfileIds) {
      await handleStop(id);
    }
  };

  const handleBulkDelete = async () => {
    if (confirm(`Delete ${selectedProfileIds.length} selected profiles permanently?`)) {
      for (const id of selectedProfileIds) {
        await window.browserAPI.deleteProfile(id);
      }
      setSelectedProfileIds([]);
      onRefreshProfiles();
    }
  };

  const handleLaunch = async (profileId: string) => {
    if (window.browserAPI && (window.browserAPI as any).launchProfile) {
      try {
        if (isFirebaseConfigured) {
          try {
            const { auth } = getFirebaseServices();
            if (auth.currentUser) {
              await restoreProfileCookiesFromCloud(auth.currentUser, profileId);
            }
          } catch {}
        }
        const result = await (window.browserAPI as any).launchProfile(profileId);
        if (!result.success) {
          alert('This profile is already running in its own browser window.');
        }
        const running = await (window.browserAPI as any).getRunningProfiles();
        setRunningProfileIds(running);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        alert(`Could not launch profile: ${message}`);
      }
    }
  };

  const handleStop = async (profileId: string) => {
    if (window.browserAPI && (window.browserAPI as any).stopProfile) {
      await (window.browserAPI as any).stopProfile(profileId);
      const running = await (window.browserAPI as any).getRunningProfiles();
      setRunningProfileIds(running);
    }
  };

  const handleRotateProxy = async (profileId: string, url?: string) => {
    if (!url) {
      alert('No rotation / change IP URL configured for this proxy.');
      return;
    }
    setRotatingProfileId(profileId);
    try {
      const res = await (window.browserAPI as any).rotateProxyIp(url);
      if (res.success) {
        alert(`Proxy rotated successfully! Response: ${res.newIp || res.message}`);
      } else {
        alert(`Proxy rotation failed: ${res.message}`);
      }
    } catch (err: any) {
      alert(`Error rotating proxy: ${err.message}`);
    } finally {
      setRotatingProfileId(null);
    }
  };

  const handleWarmUpProfile = async (profileId: string) => {
    // Cookie Warm-up Bot: seeds trustworthy popular sites
    const warmupSites = [
      'https://www.wikipedia.org',
      'https://www.google.com',
      'https://www.bing.com',
      'https://www.reddit.com',
      'https://duckduckgo.com',
    ];

    if (window.browserAPI && (window.browserAPI as any).saveSavedSession) {
      try {
        await (window.browserAPI as any).saveSavedSession(profileId, {
          cookies: [],
          openUrls: warmupSites.slice(0, 3),
        });
        alert(`🔥 Cookie Warm-up initialized for this profile! Launching will visit high-reputation domains to seed authentic browsing cookies & history.`);
        await handleLaunch(profileId);
      } catch (err: any) {
        alert(`Could not start warm-up: ${err.message}`);
      }
    } else {
      await handleLaunch(profileId);
    }
  };

  const handleQuickLeakTest = async (profileId: string) => {
    // Quick IP Leak & Fingerprint Test
    if (window.browserAPI && (window.browserAPI as any).saveSavedSession) {
      try {
        await (window.browserAPI as any).saveSavedSession(profileId, {
          cookies: [],
          openUrls: ['https://whoer.net', 'https://iphey.com'],
        });
        await handleLaunch(profileId);
      } catch {
        await handleLaunch(profileId);
      }
    } else {
      await handleLaunch(profileId);
    }
  };

  const formatCookiesList = (cookies: any[], format: 'json' | 'netscape'): string => {
    if (format === 'json') {
      return JSON.stringify(cookies, null, 2);
    }
    const lines = [
      '# Netscape HTTP Cookie File',
      '# Generated by Multi Agent',
      '',
    ];
    for (const c of cookies) {
      const domain = c.domain?.startsWith('.') ? c.domain : `.${c.domain || 'localhost'}`;
      const flag = domain.startsWith('.') ? 'TRUE' : 'FALSE';
      const path = c.path || '/';
      const secure = c.secure ? 'TRUE' : 'FALSE';
      const expires = c.expirationDate ? Math.floor(c.expirationDate) : 0;
      lines.push(`${domain}\t${flag}\t${path}\t${secure}\t${expires}\t${c.name}\t${c.value}`);
    }
    return lines.join('\n');
  };

  const copyTextToClipboard = async (text: string): Promise<boolean> => {
    if (!text) return false;
    if (window.browserAPI && (window.browserAPI as any).copyToClipboard) {
      try {
        await (window.browserAPI as any).copyToClipboard(text);
        return true;
      } catch {}
    }
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.focus();
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      if (ok) return true;
    } catch {}
    return false;
  };

  const handleCopyUserAgent = async () => {
    const effectiveUA = customUserAgent.trim() || getBrowserUserAgent(browserType, browserVersion, os);
    const ok = await copyTextToClipboard(effectiveUA);
    if (ok) {
      setCopiedUA(true);
      setTimeout(() => setCopiedUA(false), 2000);
    }
  };

  const handleOpenCookieModal = async (profile: Profile, format: 'json' | 'netscape' = 'json') => {
    setCookieModalProfile(profile);
    setCookieStatusMsg('');
    setCookieModalFormat(format);
    if (!window.browserAPI) return;

    let cookiesList: any[] = [];
    if ((window.browserAPI as any).getSavedSession) {
      try {
        const session = await (window.browserAPI as any).getSavedSession(profile.id);
        if (session?.cookies && Array.isArray(session.cookies) && session.cookies.length > 0) {
          cookiesList = session.cookies;
        }
      } catch {}
    }

    if (cookiesList.length === 0 && window.browserAPI.getCookies) {
      try {
        const directCookies = await window.browserAPI.getCookies(profile.id);
        if (Array.isArray(directCookies) && directCookies.length > 0) {
          cookiesList = directCookies;
        }
      } catch {}
    }

    setCookieModalCount(cookiesList.length);

    if (cookiesList.length > 0) {
      setCookieModalContent(formatCookiesList(cookiesList, format));
      setCookieStatusMsg(`✓ Loaded ${cookiesList.length} stored cookies.`);
    } else if (window.browserAPI.exportCookies) {
      const data = await window.browserAPI.exportCookies(profile.id, format);
      const isEmpty = !data || data.trim() === '[]';
      setCookieModalContent(data || (format === 'json' ? '[]' : '# Netscape HTTP Cookie File\n'));
      if (isEmpty) {
        setCookieStatusMsg('ℹ️ No cookies found yet. You can paste cookies here and click Save & Apply, or browse websites in this profile.');
      } else {
        setCookieStatusMsg('✓ Loaded cookies from storage.');
      }
    } else {
      setCookieModalContent(format === 'json' ? '[]' : '# Netscape HTTP Cookie File\n');
      setCookieStatusMsg('ℹ️ No cookies found yet. You can paste cookies here and click Save & Apply.');
    }
  };

  const handleExportCookiesFormat = async (format: 'json' | 'netscape') => {
    setCookieModalFormat(format);
    if (!cookieModalProfile || !window.browserAPI) return;

    let cookiesList: any[] = [];
    if ((window.browserAPI as any).getSavedSession) {
      try {
        const session = await (window.browserAPI as any).getSavedSession(cookieModalProfile.id);
        if (session?.cookies && Array.isArray(session.cookies) && session.cookies.length > 0) {
          cookiesList = session.cookies;
        }
      } catch {}
    }

    if (cookiesList.length === 0 && window.browserAPI.getCookies) {
      try {
        const directCookies = await window.browserAPI.getCookies(cookieModalProfile.id);
        if (Array.isArray(directCookies) && directCookies.length > 0) {
          cookiesList = directCookies;
        }
      } catch {}
    }

    setCookieModalCount(cookiesList.length);

    if (cookiesList.length > 0) {
      setCookieModalContent(formatCookiesList(cookiesList, format));
    } else if (window.browserAPI.exportCookies) {
      const data = await window.browserAPI.exportCookies(cookieModalProfile.id, format);
      setCookieModalContent(data || (format === 'json' ? '[]' : '# Netscape HTTP Cookie File\n'));
    }
  };

  const handleDownloadCookieFile = () => {
    if (!cookieModalProfile) return;
    const ext = cookieModalFormat === 'json' ? 'json' : 'txt';
    const blob = new Blob([cookieModalContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cookies-${cookieModalProfile.name.replace(/\s+/g, '_')}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearCookieModal = async () => {
    if (!cookieModalProfile || !window.browserAPI) return;
    if (!confirm('Are you sure you want to clear all cookies for this profile? Active logins will be logged out.')) return;
    try {
      if (window.browserAPI.clearAllCookies) {
        await window.browserAPI.clearAllCookies(cookieModalProfile.id);
      }
      setCookieModalContent(cookieModalFormat === 'json' ? '[]' : '# Netscape HTTP Cookie File\n');
      setCookieModalCount(0);
      setCookieStatusMsg('✓ All cookies cleared from profile.');
    } catch (err: any) {
      setCookieStatusMsg(`✗ Failed to clear cookies: ${err.message}`);
    }
  };

  const handleReloadCookieModal = async () => {
    if (!cookieModalProfile) return;
    await handleOpenCookieModal(cookieModalProfile, cookieModalFormat);
  };

  const loadCookiesForEditor = async (profileId: string, format: 'json' | 'netscape' = profileCookiesFormat) => {
    setProfileCookiesStatus('');
    if (!window.browserAPI) return;
    try {
      let rawCookies: any[] = [];
      if ((window.browserAPI as any).getSavedSession) {
        try {
          const session = await (window.browserAPI as any).getSavedSession(profileId);
          if (session?.cookies && Array.isArray(session.cookies) && session.cookies.length > 0) {
            rawCookies = session.cookies;
          }
        } catch {}
      }
      if (rawCookies.length === 0 && window.browserAPI.getCookies) {
        try {
          const direct = await window.browserAPI.getCookies(profileId);
          if (Array.isArray(direct) && direct.length > 0) {
            rawCookies = direct;
          }
        } catch {}
      }
      setProfileCookiesCount(rawCookies.length);
      if (rawCookies.length > 0) {
        setProfileCookiesContent(formatCookiesList(rawCookies, format));
        setProfileCookiesStatus(`✓ Loaded ${rawCookies.length} stored cookies.`);
      } else if (window.browserAPI.exportCookies) {
        const exported = await window.browserAPI.exportCookies(profileId, format);
        const isEmpty = !exported || exported.trim() === '[]';
        setProfileCookiesContent(exported || (format === 'json' ? '[]' : '# Netscape HTTP Cookie File\n'));
        if (isEmpty) {
          setProfileCookiesStatus('ℹ️ No cookies found yet. Start the profile and browse websites to generate cookies, or paste cookies here.');
        } else {
          setProfileCookiesStatus('✓ Loaded cookies from storage.');
        }
      } else {
        setProfileCookiesContent(format === 'json' ? '[]' : '# Netscape HTTP Cookie File\n');
        setProfileCookiesStatus('ℹ️ No cookies found yet. Start the profile and browse websites to generate cookies.');
      }
    } catch (err: any) {
      setProfileCookiesStatus(`Error loading cookies: ${err.message}`);
    }
  };

  const handleCopyProfileCookies = async () => {
    if (!profileCookiesContent || profileCookiesContent.trim() === '[]') {
      setProfileCookiesStatus('⚠️ No cookies to copy (empty)');
      setTimeout(() => setProfileCookiesStatus(''), 2500);
      return;
    }
    const success = await copyTextToClipboard(profileCookiesContent);
    if (success) {
      setIsCopyingCookies(true);
      setTimeout(() => setIsCopyingCookies(false), 2000);
      setProfileCookiesStatus('✓ Cookies copied to clipboard!');
    } else {
      setProfileCookiesStatus('✗ Failed to copy to clipboard');
    }
  };

  const handleDownloadProfileCookiesFile = () => {
    const ext = profileCookiesFormat === 'json' ? 'json' : 'txt';
    const blob = new Blob([profileCookiesContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cookies-${(name || 'profile').replace(/\s+/g, '_')}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveProfileCookies = async () => {
    if (!editingProfileId || !window.browserAPI) return;
    setIsSavingCookies(true);
    setProfileCookiesStatus('');
    try {
      const trimmed = profileCookiesContent.trim();
      if (!trimmed || trimmed === '[]') {
        await window.browserAPI.clearAllCookies(editingProfileId);
        setProfileCookiesCount(0);
        setProfileCookiesStatus('✓ All cookies cleared from profile.');
        setIsSavingCookies(false);
        return;
      }

      const result = await window.browserAPI.importCookies(editingProfileId, trimmed);
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && (window.browserAPI as any).saveSavedSession) {
          await (window.browserAPI as any).saveSavedSession(editingProfileId, {
            cookies: parsed,
            openUrls: [],
          });
        }
      } catch {}

      setProfileCookiesStatus(`✓ Saved: ${result.imported} cookies applied to profile (${result.errors} errors)`);
      await loadCookiesForEditor(editingProfileId, profileCookiesFormat);
    } catch (err: any) {
      setProfileCookiesStatus(`✗ Save failed: ${err.message}`);
    } finally {
      setIsSavingCookies(false);
    }
  };

  const handleClearProfileCookies = async () => {
    if (!editingProfileId || !window.browserAPI) return;
    if (!confirm('Are you sure you want to clear all cookies for this profile? Active logins will be logged out.')) return;
    try {
      await window.browserAPI.clearAllCookies(editingProfileId);
      setProfileCookiesContent(profileCookiesFormat === 'json' ? '[]' : '# Netscape HTTP Cookie File\n');
      setProfileCookiesCount(0);
      setProfileCookiesStatus('✓ All cookies cleared from profile.');
    } catch (err: any) {
      setProfileCookiesStatus(`✗ Failed to clear cookies: ${err.message}`);
    }
  };

  const handleSwitchProfileCookiesFormat = async (fmt: 'json' | 'netscape') => {
    setProfileCookiesFormat(fmt);
    if (editingProfileId) {
      await loadCookiesForEditor(editingProfileId, fmt);
    }
  };

  const handleSaveCookieModalEdits = async () => {
    if (!cookieModalProfile || !window.browserAPI) return;
    setIsSavingCookieModal(true);
    setCookieStatusMsg('');
    try {
      const trimmed = cookieModalContent.trim();
      if (!trimmed || trimmed === '[]') {
        if (window.browserAPI.clearAllCookies) {
          await window.browserAPI.clearAllCookies(cookieModalProfile.id);
        }
        setCookieModalCount(0);
        setCookieStatusMsg('✓ All cookies cleared from profile.');
        setIsSavingCookieModal(false);
        return;
      }

      const result = await window.browserAPI.importCookies(cookieModalProfile.id, trimmed);
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && (window.browserAPI as any).saveSavedSession) {
          await (window.browserAPI as any).saveSavedSession(cookieModalProfile.id, {
            cookies: parsed,
            openUrls: [],
          });
        }
      } catch {}
      setCookieStatusMsg(`✓ Saved: ${result.imported} cookies applied to profile (${result.errors} errors)`);
      await handleExportCookiesFormat(cookieModalFormat);
    } catch (err: any) {
      setCookieStatusMsg(`✗ Save failed: ${err.message}`);
    } finally {
      setIsSavingCookieModal(false);
    }
  };

  const handleCopyCookieModalContent = async () => {
    if (!cookieModalContent || cookieModalContent.trim() === '[]') {
      setCookieStatusMsg('⚠️ No cookies to copy (empty)');
      setTimeout(() => setCookieStatusMsg(''), 2500);
      return;
    }
    const success = await copyTextToClipboard(cookieModalContent);
    if (success) {
      setIsCopyingCookieModal(true);
      setTimeout(() => setIsCopyingCookieModal(false), 2000);
      setCookieStatusMsg('✓ Cookies copied to clipboard!');
      setTimeout(() => setCookieStatusMsg(''), 2500);
    } else {
      setCookieStatusMsg('✗ Failed to copy to clipboard');
    }
  };

  const handleBulkCreateSubmit = async () => {
    if (!isAuthenticated || !window.browserAPI || isBulkCreating) return;
    setIsBulkCreating(true);

    try {
      // Parse optional proxy lines: host:port or host:port:user:pass or socks5://...
      const rawLines = bulkProxiesText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      const parsedProxies = rawLines.map((line) => {
        const parsed = parseProxyString(line);
        if (parsed) {
          return {
            enabled: true,
            mode: parsed.mode || 'http',
            host: parsed.host,
            port: parsed.port,
            username: parsed.username,
            password: parsed.password,
            changeIpUrl: parsed.changeIpUrl,
          };
        }
        return null;
      }).filter(Boolean);

      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

      for (let i = 1; i <= bulkCount; i++) {
        const assignedProxy = parsedProxies.length > 0
          ? parsedProxies[(i - 1) % parsedProxies.length]
          : { enabled: false, mode: 'direct' as const, host: '', port: 8080 };

        const profileName = `${bulkPrefix.trim() || 'Account'} ${i}`;
        const color = colors[(i - 1) % colors.length];

        await window.browserAPI.createProfile({
          name: profileName,
          isTemporary: false,
          privacyLevel: 'balanced',
          webrtcPolicy: 'default_public_interface_only',
          proxy: assignedProxy as any,
          os: bulkOs,
          browserType: bulkBrowser,
          browserVersion: '150.0.0.0',
          notes: `Batch created in folder: ${bulkGroup}`,
          group: bulkGroup.trim() || 'Default',
          color,
        } as any);
      }

      setShowBulkCreateModal(false);
      setBulkProxiesText('');
      onRefreshProfiles();
    } catch (err: any) {
      alert(`Bulk create encountered an issue: ${err.message}`);
    } finally {
      setIsBulkCreating(false);
    }
  };

  const handleOpenCreate = () => {
    if (!isAuthenticated) return;
    setEditingProfileId(null);
    setName(`Profile ${profiles.length + 1}`);
    setGroup('Default');
    setOs('mac');
    setBrowserType('chrome');
    setBrowserVersion('150.0.0.0');
    setCustomUserAgent('');
    setColor('#3b82f6');
    setNotes('');
    setPrivacyLevel('balanced');
    setWebrtcPolicy('default_public_interface_only');
    setLanguage('en-US');
    setTimezone('auto');
    setIsTemporary(false);
    setProxyEnabled(false);
    setProxyMode('http');
    setProxyHost('');
    setProxyPort(9050);
    setProxyUsername('');
    setProxyPassword('');
    setChangeIpUrl('');
    setSelectedSavedProxyId('');
    setProxyTestResult(null);
    setQuickProxyInput('');
    setProxySubTab('manual');
    setFreeProxyHost('');
    setFreeProxyPort(1080);
    setFreeProxyMode('socks5');
    setSelectedFreeProxyId('');
    setRemoteDebuggingPort('');
    setTags([]);
    setProfileCookiesContent('');
    setProfileCookiesFormat('json');
    setProfileCookiesCount(0);
    setProfileCookiesStatus('');
    setEditorTab('general');
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (
    p: Profile,
    tab: 'general' | 'proxy' | 'privacy' | 'cookies' = 'general',
    forcedProxySubTab?: 'manual' | 'free'
  ) => {
    if (!isAuthenticated) return;
    setEditingProfileId(p.id);
    setEditorTab(tab);
    setName(p.name);
    setGroup((p as any).group || 'Default');
    setTags((p as any).tags || []);
    setOs((p as any).os || 'mac');
    setBrowserType((p as any).browserType || 'chrome');
    setBrowserVersion((p as any).browserVersion || '150.0.0.0');
    setCustomUserAgent(p.customUserAgent || '');
    setLanguage((p as any).language || 'en-US');
    setTimezone((p as any).timezone || 'auto');
    setColor(p.color || '#3b82f6');
    setNotes((p as any).notes || '');
    setPrivacyLevel(p.privacyLevel);
    setWebrtcPolicy(p.webrtcPolicy || 'default_public_interface_only');
    setIsTemporary(p.isTemporary);
    setRemoteDebuggingPort((p as any).remoteDebuggingPort || '');
    setProxyEnabled(p.proxy.enabled);
    setSelectedSavedProxyId('');
    setProxyTestResult(null);

    const isFree = forcedProxySubTab
      ? forcedProxySubTab === 'free'
      : ((p.proxy as any)?.proxyType === 'free' || Boolean((p.proxy as any)?.freeProxyId));

    if (isFree) {
      setProxySubTab('free');
      setFreeProxyHost(p.proxy.host || '');
      setFreeProxyPort(p.proxy.port || 1080);
      setFreeProxyMode((p.proxy.mode === 'http' || p.proxy.mode === 'https') ? 'http' : 'socks5');
      setSelectedFreeProxyId((p.proxy as any)?.freeProxyId || '');
      // Clear manual proxy inputs so they never pollute each other
      setProxyHost('');
      setProxyPort(8080);
      setProxyMode('http');
      setProxyUsername('');
      setProxyPassword('');
      setChangeIpUrl('');
      setQuickProxyInput('');
    } else {
      setProxySubTab('manual');
      setProxyMode(p.proxy.mode || 'http');
      setProxyHost(p.proxy.host || '');
      setProxyPort(p.proxy.port || 8080);
      setProxyUsername(p.proxy.username || '');
      setProxyPassword(p.proxy.password || '');
      setChangeIpUrl((p.proxy as any).changeIpUrl || '');
      // Clear free proxy inputs
      setFreeProxyHost('');
      setFreeProxyPort(1080);
      setFreeProxyMode('socks5');
      setSelectedFreeProxyId('');

      if (p.proxy?.enabled && p.proxy?.host) {
        const parts = [`${p.proxy.host}:${p.proxy.port}`];
        if (p.proxy.username) {
          parts.push(p.proxy.username);
          if (p.proxy.password) parts.push(p.proxy.password);
        }
        setQuickProxyInput(parts.join(':'));
      } else {
        setQuickProxyInput('');
      }
    }

    setProfileCookiesStatus('');
    loadCookiesForEditor(p.id, profileCookiesFormat);
    setIsCreateOpen(true);
  };

  const handleSelectSavedProxy = (proxyId: string) => {
    setSelectedSavedProxyId(proxyId);
    if (!proxyId) return;
    const found = savedProxies.find((p) => p.id === proxyId);
    if (found) {
      setProxyEnabled(true);
      setProxyMode(found.mode);
      setProxyHost(found.host);
      setProxyPort(found.port);
      setProxyUsername(found.username || '');
      setProxyPassword(found.password || '');
      setChangeIpUrl(found.changeIpUrl || '');
    }
  };

  const handleCountryChange = async (newCountryCode: string) => {
    setSelectedCountryCode(newCountryCode);
    setSelectedFreeProxyId('');
    if (!window.browserAPI || !(window.browserAPI as any).listFreeProxies) return;
    setLoadingFreeProxies(true);
    try {
      const list = await (window.browserAPI as any).listFreeProxies({ countryCode: newCountryCode });
      setFreeProxies(list || []);
    } catch (err: any) {
      console.error('Could not load proxies for country:', err);
    } finally {
      setLoadingFreeProxies(false);
    }
  };

  const handleRefreshFreeProxies = async (countryCode?: string, forceRefresh = false) => {
    if (!window.browserAPI || !(window.browserAPI as any).listFreeProxies || loadingFreeProxies) return;
    setLoadingFreeProxies(true);
    const targetCode = countryCode !== undefined ? countryCode : selectedCountryCode;
    try {
      const list = await (window.browserAPI as any).listFreeProxies({ countryCode: targetCode, forceRefresh });
      setFreeProxies(list || []);
      setSelectedFreeProxyId('');
      if (forceRefresh) {
        showProxyToast({
          id: `scan-${Date.now()}`,
          type: 'success',
          title: 'Live Proxy Scan Complete',
          host: `${list?.length || 0} live proxies found`,
          port: targetCode === 'ALL' ? 'Global' : targetCode,
          location: `Verified real-time connectable proxies for ${targetCode === 'ALL' ? 'All Countries' : targetCode}`,
        });
      }
    } catch (err: any) {
      showProxyToast({
        id: `scan-err-${Date.now()}`,
        type: 'error',
        title: 'Proxy Scan Failed',
        host: 'Scan Error',
        port: '',
        error: err.message,
      });
    } finally {
      setLoadingFreeProxies(false);
    }
  };

  const handleCopyProxyIp = (e: React.MouseEvent, ipPort: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(ipPort);
    setCopiedProxyIp(ipPort);
    setTimeout(() => setCopiedProxyIp(null), 1500);
  };

  const handleSelectFreeProxy = async (freeId: string) => {
    setSelectedFreeProxyId(freeId);
    if (!freeId) return;
    const found = freeProxies.find((fp) => fp.id === freeId);
    if (found) {
      await handleTestAndApplyProxy(found);
    }
  };

  const handleTestAndApplyProxy = async (found: any) => {
    setSelectedFreeProxyId(found.id);
    setProxyEnabled(true);
    const mode = found.protocol === 'http' || found.protocol === 'https' ? 'http' : 'socks5';
    setFreeProxyMode(mode);
    setFreeProxyHost(found.ip);
    setFreeProxyPort(found.port);
    setSelectedSavedProxyId('');
    setProxyTestResult(null);
    setTestingProxyIp(found.ip);

    const countryMeta = proxyCountries.find((c) => c.code.toUpperCase() === (found.countryCode || '').toUpperCase());

    // Trigger immediate LIVE testing toast
    showProxyToast({
      id: String(Date.now()),
      type: 'testing',
      title: 'Testing Live Connection...',
      host: found.ip,
      port: found.port,
      protocol: found.protocol || mode,
      countryFlag: countryMeta?.flag || '🌐',
      countryName: found.city || found.country || countryMeta?.name || 'Global',
    });

    // Auto test connection, speed and ping live immediately
    if (window.browserAPI) {
      setTestingProxy(true);
      try {
        const res = await window.browserAPI.testProxy({
          enabled: true,
          mode,
          host: found.ip,
          port: found.port,
          username: found.username || undefined,
          password: found.password || undefined,
        });
        setProxyTestResult(res);
        const dynamicSpeed = res.latencyMs ? `${res.latencyMs}ms` : undefined;
        const dynamicUptime = res.success ? '100%' : '0%';
        const speedRating = res.latencyMs ? (res.latencyMs < 90 ? 'Fast' : res.latencyMs < 200 ? 'Good' : 'Moderate') : undefined;

        setTestedProxyResults((prev) => ({
          ...prev,
          [found.ip]: {
            success: res.success,
            latencyMs: res.latencyMs,
            speedRating,
            uptime: dynamicUptime,
            error: res.error,
          },
        }));
        setFreeProxies((prev) =>
          prev.map((item) => {
            if (item.ip === found.ip) {
              return {
                ...item,
                speed: dynamicSpeed,
                uptime: dynamicUptime,
              };
            }
            return item;
          })
        );

        if (res.success) {
          showProxyToast({
            id: String(Date.now()),
            type: 'success',
            title: 'Proxy Connected & Verified!',
            host: found.ip,
            port: found.port,
            protocol: found.protocol || mode,
            countryFlag: countryMeta?.flag || '🌐',
            countryName: found.city || found.country || countryMeta?.name || 'Global',
            latencyMs: res.latencyMs,
            speedRating,
            exitIp: res.ip || found.ip,
            location: [res.city, res.country].filter(Boolean).join(', ') || found.country,
          });
        } else {
          showProxyToast({
            id: String(Date.now()),
            type: 'error',
            title: 'Connection Failed',
            host: found.ip,
            port: found.port,
            protocol: found.protocol || mode,
            countryFlag: countryMeta?.flag || '🌐',
            countryName: found.city || found.country || countryMeta?.name || 'Global',
            error: res.error || 'Proxy unreachable or timed out',
          });
        }
      } catch (e: any) {
        const errObj = { success: false, uptime: '0%', error: e.message };
        setProxyTestResult(errObj);
        setTestedProxyResults((prev) => ({
          ...prev,
          [found.ip]: errObj,
        }));
        setFreeProxies((prev) =>
          prev.map((item) => {
            if (item.ip === found.ip) {
              return {
                ...item,
                uptime: '0%',
              };
            }
            return item;
          })
        );
        showProxyToast({
          id: String(Date.now()),
          type: 'error',
          title: 'Connection Failed',
          host: found.ip,
          port: found.port,
          protocol: found.protocol || mode,
          countryFlag: countryMeta?.flag || '🌐',
          countryName: found.city || found.country || countryMeta?.name || 'Global',
          error: e.message || 'Connection handshake failed',
        });
      } finally {
        setTestingProxy(false);
        setTestingProxyIp(null);
      }
    }
  };

  const handleSaveCurrentProxyToPool = async () => {
    if (!proxyHost.trim() || !window.browserAPI) return;
    const newProxy: SavedProxy = {
      id: `proxy-${Date.now()}`,
      name: `${proxyHost}:${proxyPort}`,
      mode: proxyMode === 'direct' ? 'socks5' : proxyMode,
      host: proxyHost.trim(),
      port: Number(proxyPort) || 8080,
      username: proxyUsername ? proxyUsername.trim() : undefined,
      password: proxyPassword ? proxyPassword.trim() : undefined,
      changeIpUrl: changeIpUrl ? changeIpUrl.trim() : undefined,
      group: group || 'Default',
      createdAt: Date.now(),
    };
    await (window.browserAPI as any).saveProxy(newProxy);
    const updated = await (window.browserAPI as any).listSavedProxies();
    setSavedProxies(updated);
    alert('Proxy saved to Proxy Pool!');
  };

  const handleSaveProfile = async (andLaunch: boolean = false) => {
    if (!isAuthenticated || !name.trim() || !window.browserAPI) return;

    const isFree = proxySubTab === 'free';
    const proxyData: ProxyConfig = isFree
      ? {
          enabled: proxyEnabled,
          mode: proxyEnabled ? freeProxyMode : 'direct',
          host: freeProxyHost.trim(),
          port: Number(freeProxyPort) || 1080,
          proxyType: 'free',
          freeProxyId: selectedFreeProxyId || undefined,
        }
      : {
          enabled: proxyEnabled,
          mode: proxyEnabled ? proxyMode : 'direct',
          host: proxyHost.trim(),
          port: Number(proxyPort) || 8080,
          username: proxyUsername ? proxyUsername.trim() : undefined,
          password: proxyPassword ? proxyPassword.trim() : undefined,
          changeIpUrl: changeIpUrl ? changeIpUrl.trim() : undefined,
          proxyType: 'manual',
        };

    if (editingProfileId) {
      await window.browserAPI.updateProfile(editingProfileId, {
        name: name.trim(),
        privacyLevel,
        webrtcPolicy,
        language,
        timezone,
        proxy: proxyData,
        os,
        browserType,
        browserVersion,
        customUserAgent,
        notes,
        group,
        tags,
        color,
        remoteDebuggingPort: remoteDebuggingPort ? Number(remoteDebuggingPort) : undefined,
      } as any);
      if (andLaunch) {
        await handleLaunch(editingProfileId);
      }
    } else {
      const created = await window.browserAPI.createProfile({
        name: name.trim(),
        isTemporary,
        privacyLevel,
        webrtcPolicy,
        language,
        timezone,
        proxy: proxyData,
        os,
        browserType,
        browserVersion,
        customUserAgent,
        notes,
        group,
        tags,
        color,
        remoteDebuggingPort: remoteDebuggingPort ? Number(remoteDebuggingPort) : undefined,
      } as any);

      if (created && profileCookiesContent.trim() && profileCookiesContent.trim() !== '[]') {
        try {
          await window.browserAPI.importCookies(created.id, profileCookiesContent.trim());
          const parsed = JSON.parse(profileCookiesContent.trim());
          if (Array.isArray(parsed) && (window.browserAPI as any).saveSavedSession) {
            await (window.browserAPI as any).saveSavedSession(created.id, {
              cookies: parsed,
              openUrls: [],
            });
          }
        } catch {}
      }

      if (andLaunch && created && (window.browserAPI as any).launchProfile) {
        await handleLaunch(created.id);
      }
    }

    setIsCreateOpen(false);
    onRefreshProfiles();
  };

  const handleOpenUpdateModal = () => {
    setShowUpdateModal(true);
    if (!checkingUpdate && updateStatus.status !== 'downloading' && updateStatus.status !== 'downloaded') {
      handleCheckUpdate();
    }
  };

  const handleCheckUpdate = async () => {
    if (!window.browserAPI || !(window.browserAPI as any).checkForUpdates) return;
    setCheckingUpdate(true);
    try {
      const res = await (window.browserAPI as any).checkForUpdates();
      if (!res.success && res.error) {
        setUpdateStatus({ status: 'error', message: res.error });
      }
    } catch (e: any) {
      setUpdateStatus({ status: 'error', message: e.message });
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleDownloadUpdate = async () => {
    if (!window.browserAPI || !(window.browserAPI as any).downloadUpdate) return;
    try {
      await (window.browserAPI as any).downloadUpdate();
    } catch (e: any) {
      setUpdateStatus({ status: 'error', message: e.message });
    }
  };

  const handleInstallUpdate = async () => {
    if (!window.browserAPI || !(window.browserAPI as any).installUpdate) return;
    try {
      await (window.browserAPI as any).installUpdate();
    } catch (e: any) {
      setUpdateStatus({ status: 'error', message: e.message });
    }
  };

  const handleApplyAndTestProxyString = async (rawString: string) => {
    setQuickProxyInput(rawString);
    const parsed = parseProxyString(rawString);
    if (!parsed) return;

    setProxyEnabled(true);
    setProxyHost(parsed.host);
    setProxyPort(parsed.port);
    setProxyUsername(parsed.username || '');
    setProxyPassword(parsed.password || '');
    if (parsed.changeIpUrl) {
      setChangeIpUrl(parsed.changeIpUrl);
    }
    const modeToUse = parsed.mode || 'http';
    setProxyMode(modeToUse);

    if (!window.browserAPI) return;
    setTestingProxy(true);
    setProxyTestResult(null);

    try {
      const result = await window.browserAPI.testProxy({
        enabled: true,
        mode: modeToUse,
        host: parsed.host,
        port: parsed.port,
        username: parsed.username || undefined,
        password: parsed.password || undefined,
      });
      setProxyTestResult(result);
      if (result?.detectedMode && result.detectedMode !== 'direct') {
        setProxyMode(result.detectedMode);
      }
    } catch (err: any) {
      setProxyTestResult({ success: false, error: err.message });
    } finally {
      setTestingProxy(false);
    }
  };

  const handleTestProxy = async () => {
    const isFree = proxySubTab === 'free';
    const targetHost = isFree ? freeProxyHost.trim() : proxyHost.trim();
    const targetPort = isFree ? (Number(freeProxyPort) || 1080) : (Number(proxyPort) || 8080);
    const targetMode = isFree ? freeProxyMode : proxyMode;
    const targetUser = isFree ? undefined : (proxyUsername.trim() || undefined);
    const targetPass = isFree ? undefined : (proxyPassword.trim() || undefined);

    if (!targetHost || !window.browserAPI) return;
    setTestingProxy(true);
    setProxyTestResult(null);

    showProxyToast({
      id: String(Date.now()),
      type: 'testing',
      title: 'Testing Proxy Connection...',
      host: targetHost,
      port: targetPort,
      protocol: targetMode,
    });

    try {
      const result = await window.browserAPI.testProxy({
        enabled: true,
        mode: targetMode,
        host: targetHost,
        port: targetPort,
        username: targetUser,
        password: targetPass,
      });
      setProxyTestResult(result);
      if (result) {
        const dynamicSpeed = result.latencyMs ? `${result.latencyMs}ms` : undefined;
        const dynamicUptime = result.success ? '100%' : '0%';
        const ipKey = targetHost;
        const speedRating = result.latencyMs ? (result.latencyMs < 90 ? 'Fast' : result.latencyMs < 200 ? 'Good' : 'Moderate') : undefined;

        setTestedProxyResults((prev) => ({
          ...prev,
          [ipKey]: {
            success: result.success,
            latencyMs: result.latencyMs,
            speedRating,
            uptime: dynamicUptime,
            error: result.error,
          },
        }));
        setFreeProxies((prev) =>
          prev.map((item) => {
            if (item.ip === ipKey) {
              return {
                ...item,
                speed: dynamicSpeed,
                uptime: dynamicUptime,
              };
            }
            return item;
          })
        );

        if (result.success) {
          showProxyToast({
            id: String(Date.now()),
            type: 'success',
            title: 'Proxy Connection Verified!',
            host: targetHost,
            port: targetPort,
            protocol: targetMode,
            latencyMs: result.latencyMs,
            speedRating,
            exitIp: result.ip || targetHost,
            location: [result.city, result.country].filter(Boolean).join(', '),
          });
        } else {
          showProxyToast({
            id: String(Date.now()),
            type: 'error',
            title: 'Connection Failed',
            host: targetHost,
            port: targetPort,
            protocol: targetMode,
            error: result.error || 'Proxy unreachable or timed out',
          });
        }
      }
      if (!isFree && result?.detectedMode && result.detectedMode !== 'direct') {
        setProxyMode(result.detectedMode);
      }
    } catch (err: any) {
      setProxyTestResult({ success: false, error: err.message });
      showProxyToast({
        id: String(Date.now()),
        type: 'error',
        title: 'Connection Failed',
        host: targetHost,
        port: targetPort,
        protocol: targetMode,
        error: err.message || 'Connection test failed',
      });
    } finally {
      setTestingProxy(false);
    }
  };

  const handleDelete = async (profileId: string) => {
    if (!isAuthenticated) return;
    if (confirm('Delete this profile permanently and wipe all stored cookies & partition data?')) {
      await window.browserAPI.deleteProfile(profileId);
      onRefreshProfiles();
    }
  };

  const handleDuplicate = async (profileId: string) => {
    if (!isAuthenticated) return;
    await window.browserAPI.duplicateProfile(profileId);
    onRefreshProfiles();
  };

  const handleExport = async (profileId: string) => {
    const json = await window.browserAPI.exportProfile(profileId);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profile-${profileId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !importJson.trim()) return;
    try {
      await window.browserAPI.importProfile(importJson.trim());
      setImportJson('');
      setShowImport(false);
      onRefreshProfiles();
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        height: '100%',
        minHeight: 0,
        backgroundColor: '#121316',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {!isCreateOpen && (
      <div className="dashboard-root">
        {/* Top Header Bar */}
        <div className="dashboard-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(147, 51, 234, 0.3) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  boxShadow: '0 4px 16px rgba(59, 130, 246, 0.2)',
                  flexShrink: 0,
                }}
              >
                <Zap size={22} color="#60a5fa" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
                    Profile Manager
                  </h2>
                  <span
                    style={{
                      fontSize: 10,
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      color: '#34d399',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      padding: '2px 7px',
                      borderRadius: 10,
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
                    Active Sandbox
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 11, color: '#82899d', marginTop: 2 }}>
                  Anti-detect fingerprinting, isolated proxies & cookie vault
                </p>
              </div>
            </div>

            {/* Quick Metrics Pills */}
            <div className="dashboard-metrics-container" style={{ borderLeft: '1px solid #282d40', paddingLeft: 16 }}>
              <div
                style={{
                  padding: '5px 12px',
                  borderRadius: 8,
                  backgroundColor: '#161825',
                  border: '1px solid #25293d',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                }}
              >
                <span style={{ fontSize: 9, textTransform: 'uppercase', color: '#8890a5', fontWeight: 600, letterSpacing: '0.04em' }}>Profiles</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#ffffff' }}>{profiles.length}</span>
              </div>

              <div
                style={{
                  padding: '5px 12px',
                  borderRadius: 8,
                  backgroundColor: runningProfileIds.length > 0 ? 'rgba(16, 185, 129, 0.08)' : '#161825',
                  border: `1px solid ${runningProfileIds.length > 0 ? 'rgba(16, 185, 129, 0.3)' : '#25293d'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                }}
              >
                <span style={{ fontSize: 9, textTransform: 'uppercase', color: runningProfileIds.length > 0 ? '#34d399' : '#8890a5', fontWeight: 600, letterSpacing: '0.04em' }}>Running</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: runningProfileIds.length > 0 ? '#34d399' : '#ffffff' }}>{runningProfileIds.length}</span>
              </div>

              <div
                style={{
                  padding: '5px 12px',
                  borderRadius: 8,
                  backgroundColor: '#161825',
                  border: '1px solid #25293d',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                }}
              >
                <span style={{ fontSize: 9, textTransform: 'uppercase', color: '#8890a5', fontWeight: 600, letterSpacing: '0.04em' }}>Proxies</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#38bdf8' }}>
                  {profiles.filter((p) => p.proxy && p.proxy.enabled && p.proxy.host).length}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              disabled={!isAuthenticated}
              onClick={() => setShowImport(!showImport)}
              title={!isAuthenticated ? 'Sign in to import profiles' : 'Import Profile'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '7px 12px',
                backgroundColor: '#1c1f2e',
                border: '1px solid #2e354a',
                borderRadius: 8,
                color: '#e2e4e9',
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Upload size={13} />
              Import
            </button>

            <button
              disabled={!isAuthenticated}
              onClick={() => setShowBulkCreateModal(true)}
              title={!isAuthenticated ? 'Sign in to bulk create profiles' : 'Bulk Create Profiles'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '7px 12px',
                backgroundColor: '#1c1f2e',
                border: '1px solid #2e354a',
                borderRadius: 8,
                color: '#38bdf8',
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Layers size={13} />
              Bulk Create
            </button>

            <button
              onClick={handleOpenUpdateModal}
              title="Check for software updates"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '7px 12px',
                backgroundColor: updateStatus.status === 'available' ? '#047857' : updateStatus.status === 'downloaded' ? '#2563eb' : '#1c1f2e',
                border: `1px solid ${updateStatus.status === 'available' ? '#10b981' : updateStatus.status === 'downloaded' ? '#3b82f6' : '#2e354a'}`,
                borderRadius: 8,
                color: updateStatus.status === 'available' ? '#34d399' : updateStatus.status === 'downloaded' ? '#60a5fa' : '#e2e4e9',
                fontSize: 12,
                fontWeight: updateStatus.status === 'available' || updateStatus.status === 'downloaded' ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {checkingUpdate ? (
                <Loader2 size={13} className="animate-spin" />
              ) : updateStatus.status === 'available' ? (
                <ArrowDownCircle size={13} />
              ) : updateStatus.status === 'downloaded' ? (
                <CheckCircle size={13} />
              ) : (
                <RefreshCw size={13} />
              )}
              {checkingUpdate
                ? 'Checking...'
                : updateStatus.status === 'available'
                ? `Update v${updateStatus.version}`
                : updateStatus.status === 'downloading'
                ? `Downloading (${updateStatus.percent}%)`
                : updateStatus.status === 'downloaded'
                ? 'Install & Restart'
                : 'Updates'}
            </button>

            <button
              disabled={!isAuthenticated}
              onClick={handleOpenCreate}
              title={!isAuthenticated ? 'Sign in to create profiles' : 'Create Profile'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '7px 16px',
                backgroundColor: '#3b82f6',
                border: 'none',
                borderRadius: 8,
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.28)',
                transition: 'all 0.15s ease',
              }}
            >
              <Plus size={15} />
              New Profile
            </button>

          </div>
        </div>

        {/* Filter and Search Bar */}
        <div
          style={{
            padding: '14px 28px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            backgroundColor: 'rgba(21, 23, 34, 0.75)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          {/* Search box with subtle glow */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#12141d',
              border: '1px solid #282d42',
              borderRadius: 10,
              padding: '0 14px',
              height: 38,
              width: 340,
              gap: 10,
              boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.3)',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
          >
            <Search size={15} color="#64748b" />
            <input
              type="text"
              placeholder="Search profiles, notes, or proxy..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#f8fafc',
                fontSize: 13,
                outline: 'none',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            {/* Folder Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Folder:</span>
              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid #282d42',
                  backgroundColor: '#171926',
                  color: '#e2e8f0',
                  fontSize: 12,
                  fontWeight: 500,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Folders</option>
                {groups.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Browser Segmented Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Browser:</span>
              <div
                style={{
                  display: 'flex',
                  backgroundColor: '#12141d',
                  padding: 3,
                  borderRadius: 8,
                  border: '1px solid #262a3d',
                  gap: 3,
                }}
              >
                {(['all', 'chrome', 'edge', 'brave'] as const).map((mode) => {
                  const isActive = filterBrowser === mode;
                  return (
                    <button
                      key={mode}
                      onClick={() => setFilterBrowser(mode)}
                      style={{
                        padding: '4px 11px',
                        borderRadius: 6,
                        border: 'none',
                        fontSize: 11,
                        fontWeight: isActive ? 600 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        backgroundColor: isActive
                          ? mode === 'edge' ? '#0284c7' : mode === 'brave' ? '#ea580c' : mode === 'chrome' ? '#2563eb' : '#334155'
                          : 'transparent',
                        color: isActive ? '#ffffff' : '#94a3b8',
                        boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.25)' : 'none',
                      }}
                    >
                      {mode === 'all' ? 'All' : mode === 'chrome' ? 'Chrome' : mode === 'edge' ? 'Edge' : 'Brave'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Platform Segmented Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>OS:</span>
              <div
                style={{
                  display: 'flex',
                  backgroundColor: '#12141d',
                  padding: 3,
                  borderRadius: 8,
                  border: '1px solid #262a3d',
                  gap: 3,
                }}
              >
                {(['all', 'mac', 'windows'] as const).map((mode) => {
                  const isActive = filterOS === mode;
                  return (
                    <button
                      key={mode}
                      onClick={() => setFilterOS(mode)}
                      style={{
                        padding: '4px 11px',
                        borderRadius: 6,
                        border: 'none',
                        fontSize: 11,
                        fontWeight: isActive ? 600 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        backgroundColor: isActive ? '#4f46e5' : 'transparent',
                        color: isActive ? '#ffffff' : '#94a3b8',
                        boxShadow: isActive ? '0 2px 8px rgba(79, 70, 229, 0.3)' : 'none',
                      }}
                    >
                      {mode === 'all' ? 'All' : mode === 'mac' ? 'macOS' : 'Windows'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Import JSON drawer */}
        {showImport && (
          <div style={{ padding: '12px 24px', backgroundColor: '#1d202d', borderBottom: '1px solid #2f3448' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <textarea
                placeholder="Paste exported profile JSON configuration..."
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                rows={2}
                style={{
                  flex: 1,
                  backgroundColor: '#13141c',
                  border: '1px solid #33384c',
                  borderRadius: 6,
                  color: '#ffffff',
                  padding: 8,
                  fontSize: 11,
                  fontFamily: 'monospace',
                }}
              />
              <button
                onClick={handleImportSubmit}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#10b981',
                  border: 'none',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Import Now
              </button>
            </div>
          </div>
        )}

        {/* Profiles Table View with Responsive Horizontal Scroll */}
        <div className="dashboard-table-container">
          <table className="dashboard-table">
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  backgroundColor: '#12141e',
                  color: '#94a3b8',
                  fontSize: 13,
                  fontWeight: 500,
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                }}
              >
                <th style={{ padding: '12px 16px', width: 44 }}>
                  <input
                    type="checkbox"
                    checked={filteredProfiles.length > 0 && selectedProfileIds.length === filteredProfiles.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    style={{ cursor: 'pointer', accentColor: '#3b82f6', width: 16, height: 16, borderRadius: 4 }}
                  />
                </th>
                <th style={{ padding: '12px 16px', fontWeight: 500 }}>Name</th>
                <th style={{ padding: '12px 16px', fontWeight: 500 }}>Proxy</th>
                <th style={{ padding: '12px 16px', fontWeight: 500 }}>Language</th>
                <th style={{ padding: '12px 16px', fontWeight: 500 }}>WebRTC Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 500 }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 500 }}>Browser v...</th>
                <th className="col-actions-header" style={{ padding: '12px 20px', textAlign: 'right' }}>
                  <Settings size={16} color="#64748b" style={{ cursor: 'pointer', display: 'inline-block' }} />
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.map((p) => {
                const isRunning = runningProfileIds.includes(p.id);
                const hasProxy = p.proxy.enabled && Boolean(p.proxy.host);
                const isSelected = selectedProfileIds.includes(p.id);

                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'background 0.15s ease',
                      backgroundColor: isRunning
                        ? 'rgba(16, 185, 129, 0.04)'
                        : isSelected
                        ? 'rgba(59, 130, 246, 0.06)'
                        : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isRunning
                        ? 'rgba(16, 185, 129, 0.08)'
                        : isSelected
                        ? 'rgba(59, 130, 246, 0.10)'
                        : 'rgba(255, 255, 255, 0.025)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isRunning
                        ? 'rgba(16, 185, 129, 0.04)'
                        : isSelected
                        ? 'rgba(59, 130, 246, 0.06)'
                        : 'transparent';
                    }}
                  >
                    {/* Checkbox */}
                    <td style={{ padding: '12px 16px', width: 44 }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(p.id)}
                        style={{ cursor: 'pointer', accentColor: '#3b82f6', width: 16, height: 16, borderRadius: 4 }}
                      />
                    </td>

                    {/* Name */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          onClick={() => handleOpenEdit(p)}
                          style={{
                            fontWeight: 500,
                            color: '#f1f5f9',
                            fontSize: 13.5,
                            cursor: 'pointer',
                            letterSpacing: '-0.01em',
                          }}
                        >
                          {p.name}
                        </span>
                        {p.isTemporary && (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              backgroundColor: 'rgba(239, 68, 68, 0.18)',
                              color: '#f87171',
                              border: '1px solid rgba(239, 68, 68, 0.35)',
                              padding: '1px 5px',
                              borderRadius: 4,
                            }}
                          >
                            TEMP
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Proxy */}
                    <td style={{ padding: '12px 16px' }}>
                      {hasProxy ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span
                            onClick={() => {
                              const isFree = (p.proxy as any)?.proxyType === 'free' || Boolean((p.proxy as any)?.freeProxyId);
                              handleOpenEdit(p, 'proxy', isFree ? 'free' : 'manual');
                            }}
                            style={{
                              color: '#cbd5e1',
                              fontSize: 13,
                              maxWidth: 160,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              cursor: 'pointer',
                              transition: 'color 0.15s ease',
                            }}
                            title={`Click to configure ${((p.proxy as any)?.proxyType === 'free' || (p.proxy as any)?.freeProxyId) ? 'Free' : 'Manual'} proxy`}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#60a5fa'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = '#cbd5e1'; }}
                          >
                            {p.proxy.host.length > 18 ? `${p.proxy.host.slice(0, 16)}...` : p.proxy.host}
                          </span>
                          <span
                            onClick={() => {
                              const isFree = (p.proxy as any)?.proxyType === 'free' || Boolean((p.proxy as any)?.freeProxyId);
                              handleOpenEdit(p, 'proxy', isFree ? 'free' : 'manual');
                            }}
                            style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}
                            title="Proxy Enabled - Click to configure"
                          >
                            <Check size={14} color="#10b981" strokeWidth={2.5} />
                          </span>
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              if (rotatingProfileId === p.id) return;
                              handleRotateProxy(p.id, (p.proxy as any).changeIpUrl);
                            }}
                            style={{
                              color: '#ef4444',
                              display: 'inline-flex',
                              alignItems: 'center',
                              cursor: rotatingProfileId === p.id ? 'wait' : 'pointer',
                              opacity: rotatingProfileId === p.id ? 0.6 : 1,
                            }}
                            title={rotatingProfileId === p.id ? 'Rotating IP...' : 'Rotate / Change IP'}
                          >
                            <Zap
                              size={14}
                              color="#ef4444"
                              fill="#ef4444"
                              style={{
                                transform: rotatingProfileId === p.id ? 'rotate(180deg)' : 'none',
                                transition: 'transform 0.4s ease',
                              }}
                            />
                          </span>
                        </div>
                      ) : (
                        <span
                          onClick={() => handleOpenEdit(p, 'proxy', 'manual')}
                          style={{ color: '#64748b', fontSize: 13, cursor: 'pointer', transition: 'color 0.15s ease' }}
                          title="Click to configure proxy"
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#3b82f6'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; }}
                        >
                          Add a proxy
                        </span>
                      )}
                    </td>

                    {/* Language */}
                    <td style={{ padding: '12px 16px' }}>
                      <div
                        onClick={() => handleOpenEdit(p, 'general')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                        title="Click to configure language and environment"
                      >
                        <Globe size={13} color="#94a3b8" />
                        <span
                          style={{
                            color: '#e2e8f0',
                            fontSize: 12,
                            fontWeight: 500,
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            padding: '2px 8px',
                            borderRadius: 6,
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.15)';
                            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.35)';
                            e.currentTarget.style.color = '#93c5fd';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                            e.currentTarget.style.color = '#e2e8f0';
                          }}
                        >
                          {(() => {
                            const code = p.language || 'en-US';
                            const found = ALL_LANGUAGES.find((l) => l.code === code) || POPULAR_LANGUAGES.find((l) => l.code === code);
                            return (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <span>{found?.flag || '🌐'}</span>
                                <span>{code}</span>
                              </span>
                            );
                          })()}
                        </span>
                      </div>
                    </td>

                    {/* WebRTC Status */}
                    <td style={{ padding: '12px 16px' }}>
                      {(() => {
                        const policy = p.webrtcPolicy || 'default_public_interface_only';
                        const isDisabled = policy === 'disabled';
                        const isProxyOnly = policy === 'disable_non_proxied_udp';
                        const isPublicOnly = policy === 'default_public_interface_only';

                        const label = isDisabled
                          ? 'Disabled'
                          : isProxyOnly
                          ? 'Proxy Only'
                          : isPublicOnly
                          ? 'Public IP Only'
                          : 'Real IP';

                        const color = isDisabled
                          ? '#f87171'
                          : isProxyOnly
                          ? '#fbbf24'
                          : isPublicOnly
                          ? '#34d399'
                          : '#60a5fa';

                        const bg = isDisabled
                          ? 'rgba(239, 68, 68, 0.12)'
                          : isProxyOnly
                          ? 'rgba(245, 158, 11, 0.12)'
                          : isPublicOnly
                          ? 'rgba(16, 185, 129, 0.12)'
                          : 'rgba(59, 130, 246, 0.12)';

                        const border = isDisabled
                          ? 'rgba(239, 68, 68, 0.28)'
                          : isProxyOnly
                          ? 'rgba(245, 158, 11, 0.28)'
                          : isPublicOnly
                          ? 'rgba(16, 185, 129, 0.28)'
                          : 'rgba(59, 130, 246, 0.28)';

                        const dotColor = isDisabled
                          ? '#ef4444'
                          : isProxyOnly
                          ? '#f59e0b'
                          : isPublicOnly
                          ? '#10b981'
                          : '#3b82f6';

                        return (
                          <div
                            onClick={() => handleOpenEdit(p, 'privacy')}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '2px 8px',
                              borderRadius: 6,
                              backgroundColor: bg,
                              border: `1px solid ${border}`,
                              color: color,
                              fontSize: 11,
                              fontWeight: 600,
                              letterSpacing: '0.02em',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            title={`WebRTC Policy: ${policy} - Click to configure WebRTC & Privacy`}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.filter = 'brightness(1.2)';
                              e.currentTarget.style.boxShadow = `0 0 8px ${bg}`;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.filter = 'none';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                backgroundColor: dotColor,
                              }}
                            />
                            <span>{label}</span>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 16px' }}>
                      <div
                        onClick={() => handleOpenEdit(p, 'general')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}
                        title="Click to view profile settings"
                      >
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            backgroundColor: '#10b981',
                            boxShadow: isRunning ? '0 0 8px #10b981' : 'none',
                            display: 'inline-block',
                          }}
                        />
                        <span style={{ color: isRunning ? '#34d399' : '#cbd5e1', fontSize: 13, fontWeight: isRunning ? 600 : 400 }}>
                          {isRunning ? 'Running' : 'Ready'}
                        </span>
                      </div>
                    </td>

                    {/* Browser v... */}
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        onClick={() => handleOpenEdit(p, 'general')}
                        style={{
                          color: '#94a3b8',
                          fontSize: 13,
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                          cursor: 'pointer',
                          transition: 'color 0.15s ease',
                        }}
                        title="Click to configure browser engine, version, or user-agent"
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#38bdf8'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
                      >
                        {((p as any).browserVersion || '152.0.0.0').split('.')[0]}
                      </span>
                    </td>

                    {/* Actions — Start/Stop + ⋮ Three-Dot Menu */}
                    <td className="col-actions-cell" style={{ padding: '8px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                        {/* Primary Launch / Stop Button */}
                        {isRunning ? (
                          <button
                            onClick={() => handleStop(p.id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '5px 14px',
                              backgroundColor: 'rgba(239, 68, 68, 0.08)',
                              border: '1.5px solid #ef4444',
                              borderRadius: 6,
                              color: '#ef4444',
                              fontSize: 12.5,
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              whiteSpace: 'nowrap',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.18)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)'; }}
                          >
                            <Square size={10} fill="#ef4444" />
                            Stop
                          </button>
                        ) : (
                          <button
                            onClick={() => handleLaunch(p.id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '5px 15px',
                              backgroundColor: 'transparent',
                              border: '1.5px solid #d946ef',
                              borderRadius: 6,
                              color: '#d946ef',
                              fontSize: 12.5,
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              whiteSpace: 'nowrap',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(217, 70, 239, 0.12)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <Play size={10} fill="#d946ef" />
                            Start
                          </button>
                        )}

                        {/* ⋮ Three-Dot Action Menu Button */}
                        <div style={{ position: 'relative', display: 'inline-flex' }}>
                          <button
                            className="action-menu-trigger-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeActionMenuProfileId === p.id) {
                                setActiveActionMenuProfileId(null);
                                setActionMenuPosition(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const menuHeight = 290;
                                const spaceBelow = window.innerHeight - rect.bottom;
                                const openUpwards = spaceBelow < menuHeight && rect.top > menuHeight;
                                setActionMenuPosition({
                                  top: openUpwards ? rect.top - 6 : rect.bottom + 6,
                                  right: window.innerWidth - rect.right,
                                  openUpwards,
                                });
                                setActiveActionMenuProfileId(p.id);
                              }
                            }}
                            style={{
                              background: activeActionMenuProfileId === p.id ? '#232738' : 'transparent',
                              border: 'none',
                              borderRadius: 6,
                              color: activeActionMenuProfileId === p.id ? '#ffffff' : '#94a3b8',
                              padding: '6px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#232738'; e.currentTarget.style.color = '#ffffff'; }}
                            onMouseLeave={(e) => {
                              if (activeActionMenuProfileId !== p.id) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = '#94a3b8';
                              }
                            }}
                            title="More Actions"
                          >
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProfiles.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '80px 24px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 16,
                          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                        }}
                      >
                        <User size={26} color="#60a5fa" />
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', marginBottom: 4, letterSpacing: '-0.01em' }}>
                          {searchQuery || filterBrowser !== 'all' || filterOS !== 'all' ? 'No matching profiles found' : 'No profiles created yet'}
                        </div>
                        <div style={{ fontSize: 13, color: '#64748b', maxWidth: 360 }}>
                          {searchQuery || filterBrowser !== 'all' || filterOS !== 'all' ? 'Try adjusting your search keywords, browser filter, or platform selection.' : 'Click "New Profile" to create your first isolated fingerprint profile.'}
                        </div>
                      </div>
                      {!searchQuery && filterBrowser === 'all' && filterOS === 'all' && (
                        <button
                          disabled={!isAuthenticated}
                          onClick={handleOpenCreate}
                          style={{
                            marginTop: 8,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '9px 20px',
                            backgroundColor: '#3b82f6',
                            border: 'none',
                            borderRadius: 8,
                            color: '#ffffff',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <Plus size={15} />
                          Create Profile
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Floating Bottom Bulk Actions Bar */}
        {selectedProfileIds.length > 0 && (
          <div
            style={{
              position: 'fixed',
              bottom: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              backgroundColor: '#161926',
              border: '1.5px solid rgba(59, 130, 246, 0.45)',
              borderRadius: 14,
              boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.85), 0 0 25px rgba(59, 130, 246, 0.25)',
              backdropFilter: 'blur(16px)',
              padding: '10px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              maxWidth: '92vw',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  padding: '4px 12px',
                  borderRadius: 20,
                  backgroundColor: 'rgba(59, 130, 246, 0.2)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  color: '#93c5fd',
                  fontSize: 12,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                {selectedProfileIds.length} {selectedProfileIds.length === 1 ? 'profile' : 'profiles'} selected
              </div>
              <button
                onClick={() => setSelectedProfileIds([])}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: 11.5,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  whiteSpace: 'nowrap',
                }}
              >
                Deselect all
              </button>
            </div>

            <div style={{ width: 1, height: 22, backgroundColor: '#2e354b' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={handleBulkLaunch}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 15px',
                  backgroundColor: '#10b981',
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)',
                  whiteSpace: 'nowrap',
                  transition: 'opacity 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                <Play size={12} fill="#fff" />
                Launch Selected
              </button>

              <button
                onClick={handleBulkStop}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 15px',
                  backgroundColor: '#f59e0b',
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(245, 158, 11, 0.25)',
                  whiteSpace: 'nowrap',
                  transition: 'opacity 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                <Square size={12} fill="#fff" />
                Stop Selected
              </button>

              <button
                onClick={handleBulkDelete}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 15px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: 8,
                  color: '#f87171',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.25)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)'; }}
              >
                <Trash2 size={12} />
                Delete Selected
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Action Menu Dropdown Portal */}
      {typeof document !== 'undefined' && activeActionMenuProfileId && actionMenuPosition && (() => {
        const activeProfile = profiles.find((pr) => pr.id === activeActionMenuProfileId);
        if (!activeProfile) return null;
        const activeHasProxy = activeProfile.proxy?.enabled && Boolean(activeProfile.proxy?.host);

        return createPortal(
          <div
            className="action-menu-dropdown-portal"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              ...(actionMenuPosition.openUpwards
                ? { bottom: `${Math.max(8, window.innerHeight - actionMenuPosition.top)}px` }
                : { top: `${Math.max(8, actionMenuPosition.top)}px` }),
              right: `${Math.max(12, actionMenuPosition.right)}px`,
              backgroundColor: '#171923',
              border: '1px solid #2a2f45',
              borderRadius: 8,
              padding: '4px',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              zIndex: 99999,
              minWidth: 175,
              maxHeight: 'calc(100vh - 24px)',
              overflowY: 'auto',
              boxShadow: '0 12px 32px rgba(0,0,0,0.75)',
            }}
          >
            {/* Edit Profile */}
            <button
              disabled={!isAuthenticated}
              onClick={() => {
                setActiveActionMenuProfileId(null);
                setActionMenuPosition(null);
                handleOpenEdit(activeProfile);
              }}
              style={{
                background: 'none', border: 'none', color: '#e2e8f0',
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '7px 10px', borderRadius: 6, fontSize: 12.5,
                cursor: 'pointer', textAlign: 'left', width: '100%',
                transition: 'background 0.12s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
            >
              <Edit2 size={13.5} style={{ color: '#94a3b8' }} /> Edit Profile
            </button>

            {/* Clone Profile */}
            <button
              disabled={!isAuthenticated}
              onClick={() => {
                setActiveActionMenuProfileId(null);
                setActionMenuPosition(null);
                handleDuplicate(activeProfile.id);
              }}
              style={{
                background: 'none', border: 'none', color: '#e2e8f0',
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '7px 10px', borderRadius: 6, fontSize: 12.5,
                cursor: 'pointer', textAlign: 'left', width: '100%',
                transition: 'background 0.12s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
            >
              <Copy size={13.5} style={{ color: '#94a3b8' }} /> Clone Profile
            </button>

            {/* Rotate IP (if proxy enabled) */}
            {activeHasProxy && (
              <button
                onClick={() => {
                  setActiveActionMenuProfileId(null);
                  setActionMenuPosition(null);
                  handleRotateProxy(activeProfile.id, (activeProfile.proxy as any).changeIpUrl);
                }}
                style={{
                  background: 'none', border: 'none', color: '#e2e8f0',
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '7px 10px', borderRadius: 6, fontSize: 12.5,
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                  transition: 'background 0.12s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
              >
                <Zap size={13.5} style={{ color: '#ef4444' }} /> Rotate IP
              </button>
            )}

            {/* Divider */}
            <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', margin: '3px 6px' }} />

            {/* Manage Cookies */}
            <button
              onClick={() => {
                setActiveActionMenuProfileId(null);
                setActionMenuPosition(null);
                handleOpenCookieModal(activeProfile);
              }}
              style={{
                background: 'none', border: 'none', color: '#e2e8f0',
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '7px 10px', borderRadius: 6, fontSize: 12.5,
                cursor: 'pointer', textAlign: 'left', width: '100%',
                transition: 'background 0.12s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
            >
              <Cookie size={13.5} style={{ color: '#f59e0b' }} /> Manage Cookies
            </button>

            {/* Warming Bot */}
            <button
              onClick={() => {
                setActiveActionMenuProfileId(null);
                setActionMenuPosition(null);
                handleWarmUpProfile(activeProfile.id);
              }}
              style={{
                background: 'none', border: 'none', color: '#e2e8f0',
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '7px 10px', borderRadius: 6, fontSize: 12.5,
                cursor: 'pointer', textAlign: 'left', width: '100%',
                transition: 'background 0.12s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
            >
              <Flame size={13.5} style={{ color: '#f97316' }} /> Warming Bot
            </button>

            {/* Leak Test */}
            <button
              onClick={() => {
                setActiveActionMenuProfileId(null);
                setActionMenuPosition(null);
                handleQuickLeakTest(activeProfile.id);
              }}
              style={{
                background: 'none', border: 'none', color: '#e2e8f0',
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '7px 10px', borderRadius: 6, fontSize: 12.5,
                cursor: 'pointer', textAlign: 'left', width: '100%',
                transition: 'background 0.12s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
            >
              <Compass size={13.5} style={{ color: '#06b6d4' }} /> Leak Test
            </button>

            {/* Divider */}
            <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', margin: '3px 6px' }} />

            {/* Export JSON */}
            <button
              onClick={() => {
                setActiveActionMenuProfileId(null);
                setActionMenuPosition(null);
                handleExport(activeProfile.id);
              }}
              style={{
                background: 'none', border: 'none', color: '#e2e8f0',
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '7px 10px', borderRadius: 6, fontSize: 12.5,
                cursor: 'pointer', textAlign: 'left', width: '100%',
                transition: 'background 0.12s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
            >
              <Download size={13.5} style={{ color: '#94a3b8' }} /> Export JSON
            </button>

            {/* Divider */}
            <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', margin: '3px 6px' }} />

            {/* Delete Profile */}
            <button
              disabled={!isAuthenticated}
              onClick={() => {
                setActiveActionMenuProfileId(null);
                setActionMenuPosition(null);
                handleDelete(activeProfile.id);
              }}
              style={{
                background: 'none', border: 'none', color: '#ef4444',
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '7px 10px', borderRadius: 6, fontSize: 12.5,
                cursor: 'pointer', textAlign: 'left', width: '100%',
                transition: 'background 0.12s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
            >
              <Trash2 size={13.5} /> Delete Profile
            </button>
          </div>,
          document.body
        );
      })()}

      {/* The profile editor occupies the app page instead of opening as a dialog. */}
      {isCreateOpen && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: '#0d0f17',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 50,
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              minHeight: 0,
              backgroundColor: '#12141e',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Editor Header */}
            <div
              style={{
                padding: '16px 28px',
                borderBottom: '1px solid #232738',
                backgroundColor: '#151824',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: editingProfileId ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    border: `1px solid ${editingProfileId ? '#3b82f640' : '#10b98140'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: editingProfileId ? '#60a5fa' : '#34d399',
                  }}
                >
                  {editingProfileId ? <Edit2 size={18} /> : <Plus size={18} />}
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', margin: 0 }}>
                    {editingProfileId ? 'Edit Browser Profile' : 'Create New Profile'}
                  </h3>
                  <p style={{ margin: 0, fontSize: 12, color: '#82899d', marginTop: 2 }}>
                    {editingProfileId ? `Customizing configuration for "${name || 'Unnamed'}"` : 'Configure isolated fingerprint, network proxy, and automation'}
                  </p>
                </div>
              </div>

              {/* Navigation Tabs Pill Bar */}
              <div
                style={{
                  display: 'flex',
                  backgroundColor: '#0d0e15',
                  padding: 4,
                  borderRadius: 10,
                  border: '1px solid #232738',
                  gap: 4,
                }}
              >
                <button
                  type="button"
                  onClick={() => setEditorTab('general')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 14px',
                    borderRadius: 7,
                    border: 'none',
                    fontSize: 12,
                    fontWeight: editorTab === 'general' ? 600 : 500,
                    cursor: 'pointer',
                    backgroundColor: editorTab === 'general' ? '#25293d' : 'transparent',
                    color: editorTab === 'general' ? '#ffffff' : '#8890a5',
                    boxShadow: editorTab === 'general' ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <User size={14} />
                  General
                </button>

                <button
                  type="button"
                  onClick={() => setEditorTab('proxy')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 14px',
                    borderRadius: 7,
                    border: 'none',
                    fontSize: 12,
                    fontWeight: editorTab === 'proxy' ? 600 : 500,
                    cursor: 'pointer',
                    backgroundColor: editorTab === 'proxy' ? '#25293d' : 'transparent',
                    color: editorTab === 'proxy' ? '#ffffff' : '#8890a5',
                    boxShadow: editorTab === 'proxy' ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Globe size={14} />
                  Proxy & Network
                  {proxyEnabled && (
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        backgroundColor: '#10b981',
                        display: 'inline-block',
                      }}
                    />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setEditorTab('privacy')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 14px',
                    borderRadius: 7,
                    border: 'none',
                    fontSize: 12,
                    fontWeight: editorTab === 'privacy' ? 600 : 500,
                    cursor: 'pointer',
                    backgroundColor: editorTab === 'privacy' ? '#25293d' : 'transparent',
                    color: editorTab === 'privacy' ? '#ffffff' : '#8890a5',
                    boxShadow: editorTab === 'privacy' ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Shield size={14} />
                  Privacy & Automation
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditorTab('cookies');
                    if (editingProfileId) {
                      loadCookiesForEditor(editingProfileId, profileCookiesFormat);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 14px',
                    borderRadius: 7,
                    border: 'none',
                    fontSize: 12,
                    fontWeight: editorTab === 'cookies' ? 600 : 500,
                    cursor: 'pointer',
                    backgroundColor: editorTab === 'cookies' ? '#25293d' : 'transparent',
                    color: editorTab === 'cookies' ? '#ffffff' : '#8890a5',
                    boxShadow: editorTab === 'cookies' ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Cookie size={14} color="#f59e0b" />
                  Cookies & Session
                  {editingProfileId && (
                    <span
                      style={{
                        fontSize: 10,
                        padding: '1px 6px',
                        borderRadius: 10,
                        backgroundColor: '#f59e0b25',
                        color: '#f59e0b',
                        fontWeight: 700,
                      }}
                    >
                      {profileCookiesCount}
                    </span>
                  )}
                </button>
              </div>

              <button
                disabled={!isAuthenticated}
                onClick={() => setIsCreateOpen(false)}
                style={{
                  background: 'none',
                  border: '1px solid #282c3f',
                  borderRadius: 8,
                  padding: 6,
                  color: '#9ba1b0',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Close Editor"
              >
                <X size={16} />
              </button>
            </div>

            {/* Editor Body Content Area */}
            <div style={{ flex: 1, minHeight: 0, padding: '24px 28px', overflowY: 'auto' }}>
              <div style={{ maxWidth: editorTab === 'proxy' ? 1120 : 880, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20, transition: 'max-width 0.2s ease' }}>

                {/* TAB 1: GENERAL SETTINGS */}
                {editorTab === 'general' && (
                  <>
                    {/* Basic Info Card */}
                    <div
                      style={{
                        padding: 18,
                        backgroundColor: '#171a26',
                        border: '1px solid #282d40',
                        borderRadius: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <User size={15} color="#3b82f6" />
                        Basic Information
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#9ba1b0', marginBottom: 6 }}>
                            Profile Name *
                          </label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Amazon Store 1, Client Alpha"
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              backgroundColor: '#0e1017',
                              border: '1px solid #2c3245',
                              borderRadius: 8,
                              color: '#ffffff',
                              fontSize: 13,
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#9ba1b0', marginBottom: 6 }}>
                            Folder / Group
                          </label>
                          <input
                            type="text"
                            value={group}
                            onChange={(e) => setGroup(e.target.value)}
                            placeholder="Default"
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              backgroundColor: '#0e1017',
                              border: '1px solid #2c3245',
                              borderRadius: 8,
                              color: '#ffffff',
                              fontSize: 13,
                              boxSizing: 'border-box',
                              outline: 'none',
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#9ba1b0', marginBottom: 6 }}>
                            Tags (e.g. Ads, Crypto)
                          </label>
                          <input
                            type="text"
                            value={tags.join(', ')}
                            onChange={(e) => setTags(e.target.value.split(',').map((t) => t.trim()).filter(Boolean))}
                            placeholder="e.g. Ads, Store"
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              backgroundColor: '#0e1017',
                              border: '1px solid #2c3245',
                              borderRadius: 8,
                              color: '#ffffff',
                              fontSize: 13,
                              boxSizing: 'border-box',
                              outline: 'none',
                            }}
                          />
                        </div>
                      </div>

                      {/* Color Tag Swatch Picker */}
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#9ba1b0', marginBottom: 8 }}>
                          Profile Color Tag
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {[
                            '#3b82f6', // blue
                            '#10b981', // emerald
                            '#8b5cf6', // purple
                            '#f59e0b', // amber
                            '#ec4899', // pink
                            '#06b6d4', // cyan
                            '#ef4444', // red
                            '#64748b', // slate
                          ].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setColor(c)}
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: '50%',
                                backgroundColor: c,
                                border: color === c ? '2px solid #ffffff' : '2px solid transparent',
                                outline: color === c ? `2px solid ${c}` : 'none',
                                cursor: 'pointer',
                                transition: 'transform 0.1s ease',
                                transform: color === c ? 'scale(1.15)' : 'scale(1)',
                              }}
                            />
                          ))}
                          <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>
                            Used for badge identifiers
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Environment & OS Platform Card */}
                    <div
                      style={{
                        padding: 18,
                        backgroundColor: '#171a26',
                        border: '1px solid #282d40',
                        borderRadius: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Monitor size={15} color="#10b981" />
                        Operating System Simulation
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div
                          onClick={() => setOs('mac')}
                          style={{
                            padding: '14px 16px',
                            borderRadius: 10,
                            backgroundColor: os === 'mac' ? '#1c2236' : '#0e1017',
                            border: `1.5px solid ${os === 'mac' ? '#3b82f6' : '#282d40'}`,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 8,
                              backgroundColor: os === 'mac' ? '#3b82f625' : '#1e2230',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: os === 'mac' ? '#60a5fa' : '#94a3b8',
                            }}
                          >
                            <Apple size={20} />
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>macOS</div>
                            <div style={{ fontSize: 11, color: '#82899d' }}>Intel & Apple Silicon Core</div>
                          </div>
                        </div>

                        <div
                          onClick={() => setOs('windows')}
                          style={{
                            padding: '14px 16px',
                            borderRadius: 10,
                            backgroundColor: os === 'windows' ? '#1c2236' : '#0e1017',
                            border: `1.5px solid ${os === 'windows' ? '#3b82f6' : '#282d40'}`,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 8,
                              backgroundColor: os === 'windows' ? '#3b82f625' : '#1e2230',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: os === 'windows' ? '#60a5fa' : '#94a3b8',
                            }}
                          >
                            <Monitor size={20} />
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>Windows</div>
                            <div style={{ fontSize: 11, color: '#82899d' }}>Windows 10 / 11 Native Architecture</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Browser Engine & Version Card */}
                    <div
                      style={{
                        padding: 18,
                        backgroundColor: '#171a26',
                        border: '1px solid #282d40',
                        borderRadius: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Globe size={15} color="#f59e0b" />
                        Browser Engine & Architecture
                      </div>

                      {/* Engine Selector Cards */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                        {[
                          { id: 'chrome', label: 'Google Chrome', tag: 'Standard' },
                          { id: 'brave', label: 'Brave Browser', tag: 'Shields' },
                          { id: 'edge', label: 'Microsoft Edge', tag: 'Enterprise' },
                        ].map((b) => (
                          <div
                            key={b.id}
                            onClick={() => setBrowserType(b.id as any)}
                            style={{
                              padding: '12px 14px',
                              borderRadius: 8,
                              backgroundColor: browserType === b.id ? '#1e2338' : '#0e1017',
                              border: `1.5px solid ${browserType === b.id ? '#f59e0b' : '#282d40'}`,
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 4,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>{b.label}</span>
                              <span
                                style={{
                                  fontSize: 10,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  backgroundColor: browserType === b.id ? 'rgba(245, 158, 11, 0.2)' : '#232738',
                                  color: browserType === b.id ? '#fcd34d' : '#8890a5',
                                }}
                              >
                                {b.tag}
                              </span>
                            </div>
                            <span style={{ fontSize: 11, color: '#82899d' }}>Chromium runtime base</span>
                          </div>
                        ))}
                      </div>

                      {/* Browser Version Dropdown (165 to 145) */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <label style={{ fontSize: 12, fontWeight: 500, color: '#cbd5e1' }}>
                            Browser Version (v165 – v145)
                          </label>
                          <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>
                            Chromium v{browserVersion.split('.')[0] || '150'}
                          </span>
                        </div>
                        <select
                          value={
                            BROWSER_VERSION_OPTIONS.find((v) => v === browserVersion || v.startsWith(browserVersion.split('.')[0] + '.')) ||
                            browserVersion ||
                            '150.0.0.0'
                          }
                          onChange={(e) => setBrowserVersion(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            backgroundColor: '#0e1017',
                            border: '1px solid #2c3245',
                            borderRadius: 8,
                            color: '#ffffff',
                            fontSize: 13,
                            outline: 'none',
                            cursor: 'pointer',
                            boxSizing: 'border-box',
                          }}
                        >
                          {!BROWSER_VERSION_OPTIONS.some((v) => v === browserVersion || v.startsWith(browserVersion.split('.')[0] + '.')) && browserVersion && (
                            <option value={browserVersion}>{browserVersion} (Custom)</option>
                          )}
                          {BROWSER_VERSION_OPTIONS.map((ver) => (
                            <option key={ver} value={ver}>
                              Version {ver.split('.')[0]} ({ver})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Effective User-Agent String (Copyable and Directly Editable) */}
                      <div
                        style={{
                          backgroundColor: '#0e1017',
                          padding: '14px 16px',
                          borderRadius: 10,
                          border: '1px solid #24293c',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: '#60a5fa', fontWeight: 700, fontSize: 12.5 }}>
                              ⚡ Effective User-Agent String:
                            </span>
                            <span
                              style={{
                                fontSize: 10.5,
                                padding: '2px 7px',
                                borderRadius: 4,
                                backgroundColor: customUserAgent.trim() ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                color: customUserAgent.trim() ? '#fcd34d' : '#60a5fa',
                                fontWeight: 600,
                              }}
                            >
                              {customUserAgent.trim() ? 'Custom Modified' : 'Auto Generated'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {customUserAgent.trim() && (
                              <button
                                type="button"
                                onClick={() => setCustomUserAgent('')}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '4px 10px',
                                  borderRadius: 6,
                                  backgroundColor: '#1c2130',
                                  border: '1px solid #2e374f',
                                  color: '#94a3b8',
                                  fontSize: 11,
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                }}
                                title="Reset User-Agent to default auto-generated format"
                              >
                                <RotateCw size={11} />
                                <span>Reset Auto</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={handleCopyUserAgent}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '5px 12px',
                                borderRadius: 6,
                                backgroundColor: copiedUA ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.12)',
                                border: `1px solid ${copiedUA ? '#059669' : 'rgba(56, 189, 248, 0.35)'}`,
                                color: copiedUA ? '#34d399' : '#38bdf8',
                                fontSize: 11.5,
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              title="Copy User-Agent string to clipboard"
                            >
                              {copiedUA ? <Check size={12} color="#34d399" /> : <Copy size={12} color="#38bdf8" />}
                              <span>{copiedUA ? 'Copied!' : 'Copy UA'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Directly editable User-Agent Textarea */}
                        <textarea
                          rows={2}
                          value={customUserAgent !== '' ? customUserAgent : getBrowserUserAgent(browserType, browserVersion, os)}
                          onChange={(e) => setCustomUserAgent(e.target.value)}
                          placeholder="Edit or paste custom User-Agent string here..."
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            backgroundColor: '#070910',
                            border: '1px solid #283048',
                            borderRadius: 6,
                            color: '#cbd5e1',
                            fontSize: 11.5,
                            fontFamily: 'monospace',
                            lineHeight: '1.5',
                            outline: 'none',
                            resize: 'vertical',
                            boxSizing: 'border-box',
                          }}
                        />

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10.5, color: '#64748b' }}>
                          <span>✍️ You can directly edit or paste any custom User-Agent above.</span>
                          <span>Click "Copy UA" to copy to clipboard.</span>
                        </div>
                      </div>

                      {/* Localization & Regional Settings (Language & Time Zone) */}
                      <div
                        style={{
                          padding: '16px 18px',
                          backgroundColor: '#131520',
                          border: '1px solid #282d42',
                          borderRadius: 10,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 14,
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Globe size={15} color="#38bdf8" />
                          Localization & Regional Settings
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                          {/* Language Selection */}
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                              <label style={{ fontSize: 12, fontWeight: 500, color: '#cbd5e1' }}>
                                Language (A – Z, {ALL_LANGUAGES.length} Countries)
                              </label>
                              <span style={{ fontSize: 10.5, color: '#38bdf8', fontWeight: 600 }}>
                                {(() => {
                                  const cur = ALL_LANGUAGES.find((l) => l.code === language) || POPULAR_LANGUAGES.find((l) => l.code === language);
                                  return cur ? `${cur.flag} ${language}` : language;
                                })()}
                              </span>
                            </div>
                            <select
                              value={language}
                              onChange={(e) => setLanguage(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '10px 12px',
                                backgroundColor: '#0e1017',
                                border: '1px solid #2c3245',
                                borderRadius: 8,
                                color: '#ffffff',
                                fontSize: 12.5,
                                outline: 'none',
                                boxSizing: 'border-box',
                              }}
                            >
                              {ALL_LANGUAGES.map((lang) => (
                                <option key={`lang-${lang.code}-${lang.country}`} value={lang.code}>
                                  {lang.flag} {lang.country}: {lang.name} ({lang.code})
                                </option>
                              ))}
                              {language && !ALL_LANGUAGES.some((l) => l.code === language) && (
                                <option value={language}>{language}</option>
                              )}
                            </select>
                            <span style={{ display: 'block', fontSize: 11, color: '#64748b', marginTop: 4 }}>
                              Sets browser UI language, navigator.language & Accept-Language
                            </span>
                          </div>

                          {/* Time Zone Selection */}
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                              <label style={{ fontSize: 12, fontWeight: 500, color: '#cbd5e1' }}>
                                Time Zone (A – Z, {ALL_TIMEZONES.length} Regions)
                              </label>
                              <span style={{ fontSize: 10.5, color: '#f59e0b', fontWeight: 600 }}>
                                {(() => {
                                  if (timezone === 'auto') return '🌐 Auto-match';
                                  const cur = ALL_TIMEZONES.find((t) => t.id === timezone) || POPULAR_TIMEZONES.find((t) => t.id === timezone);
                                  return cur ? `${cur.flag} ${cur.offset}` : (timezone.split('/').pop()?.replace(/_/g, ' ') || timezone);
                                })()}
                              </span>
                            </div>
                            <select
                              value={timezone}
                              onChange={(e) => setTimezone(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '10px 12px',
                                backgroundColor: '#0e1017',
                                border: '1px solid #2c3245',
                                borderRadius: 8,
                                color: '#ffffff',
                                fontSize: 12.5,
                                outline: 'none',
                                boxSizing: 'border-box',
                              }}
                            >
                              <option value="auto">🌐 Auto-detect (Match Proxy IP / System)</option>
                              {ALL_TIMEZONES.map((tz) => (
                                <option key={`tz-${tz.id}-${tz.country}`} value={tz.id}>
                                  {tz.flag} {tz.country}: {tz.label} ({tz.id})
                                </option>
                              ))}
                              {timezone && timezone !== 'auto' && !ALL_TIMEZONES.some((t) => t.id === timezone) && (
                                <option value={timezone}>{timezone}</option>
                              )}
                            </select>
                            <span style={{ display: 'block', fontSize: 11, color: '#64748b', marginTop: 4 }}>
                              Emulates system clock, TZ env & Intl.DateTimeFormat
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Notes / Tags */}
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#9ba1b0', marginBottom: 6 }}>
                          Notes / Description
                        </label>
                        <textarea
                          rows={2}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Optional notes, account recovery emails, credentials, or target marketplace..."
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            backgroundColor: '#0e1017',
                            border: '1px solid #2c3245',
                            borderRadius: 8,
                            color: '#ffffff',
                            fontSize: 12,
                            outline: 'none',
                            boxSizing: 'border-box',
                            resize: 'none',
                          }}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* TAB 2: PROXY & NETWORK */}
                {editorTab === 'proxy' && (
                  <div
                    style={{
                      padding: 20,
                      backgroundColor: '#171a26',
                      border: '1px solid #282d40',
                      borderRadius: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 18,
                    }}
                  >
                    {/* Top Header: Network Connection Mode */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingBottom: 14,
                        borderBottom: '1px solid #252a3d',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#ffffff' }}>Network & Proxy Setup</span>
                          {proxyEnabled && testingProxy && (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '2px 9px',
                                borderRadius: 12,
                                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                                color: '#38bdf8',
                                border: '1px solid rgba(56, 189, 248, 0.35)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <Loader2 size={11} className="animate-spin" />
                              Checking...
                            </span>
                          )}
                          {proxyEnabled && !testingProxy && proxyTestResult && (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '2px 9px',
                                borderRadius: 12,
                                backgroundColor: proxyTestResult.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                color: proxyTestResult.success ? '#34d399' : '#f87171',
                                border: `1px solid ${proxyTestResult.success ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              {proxyTestResult.success ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                              {proxyTestResult.success ? 'Proxy Active' : 'Proxy Error'}
                            </span>
                          )}
                          {!proxyEnabled && (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '2px 9px',
                                borderRadius: 12,
                                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                                color: '#60a5fa',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <CheckCircle2 size={12} />
                              Direct Active
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: '#82899d', marginTop: 2 }}>
                          Choose direct native internet connection or tunnel traffic via proxy
                        </div>
                      </div>

                      {proxyEnabled && (
                        <button
                          type="button"
                          onClick={handleTestProxy}
                          disabled={testingProxy || !proxyHost.trim()}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 12px',
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: 7,
                            color: '#38bdf8',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {testingProxy ? <Loader2 size={13} className="animate-spin" /> : <Wifi size={13} />}
                          {testingProxy ? 'Checking...' : 'Test Connection'}
                        </button>
                      )}
                    </div>

                    {/* TWO PRIMARY BUTTONS: Direct Connect & Proxy */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <button
                        type="button"
                        onClick={() => setProxyEnabled(false)}
                        style={{
                          padding: '13px 16px',
                          borderRadius: 10,
                          border: !proxyEnabled ? '2px solid #3b82f6' : '1px solid #283149',
                          backgroundColor: !proxyEnabled ? 'rgba(59, 130, 246, 0.16)' : '#0e111a',
                          color: !proxyEnabled ? '#ffffff' : '#94a3b8',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          transition: 'all 0.15s ease',
                          boxShadow: !proxyEnabled ? '0 0 16px rgba(59, 130, 246, 0.22)' : 'none',
                        }}
                      >
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 8,
                            backgroundColor: !proxyEnabled ? '#2563eb' : '#1e2433',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            flexShrink: 0,
                          }}
                        >
                          <Globe size={20} />
                        </div>
                        <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: !proxyEnabled ? '#ffffff' : '#cbd5e1' }}>
                            Direct Connect
                          </div>
                          <div style={{ fontSize: 11, color: !proxyEnabled ? '#93c5fd' : '#64748b', marginTop: 1 }}>
                            No proxy · Native internet
                          </div>
                        </div>
                        {!proxyEnabled && (
                          <CheckCircle2 size={18} color="#60a5fa" style={{ flexShrink: 0 }} />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setProxyEnabled(true);
                        }}
                        style={{
                          padding: '13px 16px',
                          borderRadius: 10,
                          border: proxyEnabled ? '2px solid #3b82f6' : '1px solid #283149',
                          backgroundColor: proxyEnabled ? 'rgba(59, 130, 246, 0.16)' : '#0e111a',
                          color: proxyEnabled ? '#ffffff' : '#94a3b8',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          transition: 'all 0.15s ease',
                          boxShadow: proxyEnabled ? '0 0 16px rgba(59, 130, 246, 0.22)' : 'none',
                        }}
                      >
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 8,
                            backgroundColor: proxyEnabled ? '#2563eb' : '#1e2433',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            flexShrink: 0,
                          }}
                        >
                          <Wifi size={20} />
                        </div>
                        <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: proxyEnabled ? '#ffffff' : '#cbd5e1' }}>
                            Proxy
                          </div>
                          <div style={{ fontSize: 11, color: proxyEnabled ? '#93c5fd' : '#64748b', marginTop: 1 }}>
                            Tunnel via Manual or Free proxy
                          </div>
                        </div>
                        {proxyEnabled && (
                          <CheckCircle2 size={18} color="#60a5fa" style={{ flexShrink: 0 }} />
                        )}
                      </button>
                    </div>

                    {/* DIRECT CONNECT VIEW */}
                    {!proxyEnabled && (
                      <div
                        style={{
                          padding: '28px 20px',
                          borderRadius: 12,
                          backgroundColor: '#111422',
                          border: '1px solid #283149',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center',
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: 14,
                            backgroundColor: 'rgba(59, 130, 246, 0.12)',
                            border: '1px solid rgba(59, 130, 246, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#60a5fa',
                          }}
                        >
                          <Globe size={28} />
                        </div>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>
                            Direct Internet Connection Active
                          </div>
                          <div style={{ fontSize: 12, color: '#94a3b8', maxWidth: 460, lineHeight: 1.6 }}>
                            This profile connects directly using your local device network without proxy routing.
                            Fingerprint protection, WebRTC privacy, and spoofed system characteristics remain fully active.
                          </div>
                        </div>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 14px',
                            borderRadius: 20,
                            backgroundColor: 'rgba(16, 185, 129, 0.12)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            fontSize: 11.5,
                            color: '#34d399',
                            fontWeight: 600,
                          }}
                        >
                          <CheckCircle2 size={13} />
                          Direct Connection Ready · Maximum Speed
                        </div>
                      </div>
                    )}

                    {proxyEnabled && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* SECONDARY BUTTONS / SUB-TABS: MANUAL & FREE */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: 4,
                            backgroundColor: '#0c0f17',
                            borderRadius: 8,
                            border: '1px solid #23293d',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setProxySubTab('manual')}
                            style={{
                              flex: 1,
                              padding: '9px 16px',
                              borderRadius: 6,
                              border: 'none',
                              backgroundColor: proxySubTab === 'manual' ? '#2563eb' : 'transparent',
                              color: proxySubTab === 'manual' ? '#ffffff' : '#94a3b8',
                              fontSize: 12.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 7,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <Zap size={14} color={proxySubTab === 'manual' ? '#ffffff' : '#94a3b8'} />
                            <span>Manual Proxy</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setProxySubTab('free');
                              if (freeProxies.length === 0) {
                                handleRefreshFreeProxies();
                              }
                            }}
                            style={{
                              flex: 1,
                              padding: '9px 16px',
                              borderRadius: 6,
                              border: 'none',
                              backgroundColor: proxySubTab === 'free' ? '#059669' : 'transparent',
                              color: proxySubTab === 'free' ? '#ffffff' : '#94a3b8',
                              fontSize: 12.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 7,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <Globe size={14} color={proxySubTab === 'free' ? '#ffffff' : '#94a3b8'} />
                            <span>Free Proxies</span>
                            {freeProxies.length > 0 && (
                              <span
                                style={{
                                  fontSize: 10,
                                  padding: '1px 6px',
                                  borderRadius: 10,
                                  backgroundColor: proxySubTab === 'free' ? 'rgba(255,255,255,0.25)' : 'rgba(5, 150, 105, 0.25)',
                                  color: proxySubTab === 'free' ? '#ffffff' : '#34d399',
                                  fontWeight: 700,
                                }}
                              >
                                {freeProxies.length}
                              </span>
                            )}
                          </button>
                        </div>
                        {/* 1. Free Proxy Hub Panel with Country Selector */}
                        {proxySubTab === 'free' && (
                          <div
                            style={{
                              padding: 14,
                              borderRadius: 10,
                            backgroundColor: 'rgba(16, 185, 129, 0.05)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12,
                          }}
                        >
                          {/* Header */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#34d399' }}>
                                🌐 Free Connectable Proxy Hub
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                                  color: '#6ee7b7',
                                  fontWeight: 600,
                                }}
                              >
                                {freeProxies.length} Live Connectable
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {/* Grid / Table View Mode Toggle */}
                              <div
                                style={{
                                  display: 'flex',
                                  backgroundColor: '#0c1412',
                                  border: '1px solid #134e3f',
                                  borderRadius: 6,
                                  padding: 2,
                                  gap: 2,
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => setFreeProxyViewMode('grid')}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '4px 8px',
                                    borderRadius: 4,
                                    border: 'none',
                                    backgroundColor: freeProxyViewMode === 'grid' ? '#059669' : 'transparent',
                                    color: freeProxyViewMode === 'grid' ? '#ffffff' : '#94a3b8',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                  }}
                                  title="Cards Grid View"
                                >
                                  <LayoutGrid size={12} />
                                  <span>Grid</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFreeProxyViewMode('table')}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '4px 8px',
                                    borderRadius: 4,
                                    border: 'none',
                                    backgroundColor: freeProxyViewMode === 'table' ? '#059669' : 'transparent',
                                    color: freeProxyViewMode === 'table' ? '#ffffff' : '#94a3b8',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                  }}
                                  title="Data Table View"
                                >
                                  <List size={12} />
                                  <span>Table</span>
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRefreshFreeProxies(selectedCountryCode, true)}
                                disabled={loadingFreeProxies}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  padding: '5px 14px',
                                  backgroundColor: '#064e3b',
                                  border: '1.5px solid #059669',
                                  borderRadius: 6,
                                  color: '#34d399',
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  cursor: loadingFreeProxies ? 'not-allowed' : 'pointer',
                                  boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)',
                                }}
                                title="Dynamically scan and verify fresh connectable proxies for this country"
                              >
                                {loadingFreeProxies ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                                {loadingFreeProxies ? 'Scanning & Verifying...' : '⚡ Scan Live Proxies'}
                              </button>
                            </div>
                          </div>

                          {/* Side-by-Side: Country Dropdown & Free IP/Proxy Dropdown ("tar pase") */}
                          {(() => {
                            const filtered = freeProxies.filter((fp) => {
                              if (selectedCountryCode !== 'ALL') {
                                const code = (fp.countryCode || '').toUpperCase();
                                if (code !== selectedCountryCode.toUpperCase()) return false;
                              }
                              if (proxyFilterProtocol !== 'all') {
                                const p = (fp.protocol || '').toLowerCase();
                                if (proxyFilterProtocol === 'socks5' && !p.includes('socks')) return false;
                                if (proxyFilterProtocol === 'http' && !p.includes('http')) return false;
                              }
                              if (proxySearchText.trim()) {
                                const q = proxySearchText.toLowerCase().trim();
                                const match =
                                  (fp.city || '').toLowerCase().includes(q) ||
                                  (fp.country || '').toLowerCase().includes(q) ||
                                  (fp.ip || '').includes(q) ||
                                  String(fp.port).includes(q);
                                if (!match) return false;
                              }
                              return true;
                            });

                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                  {/* Left: Country Dropdown */}
                                  <div style={{ flex: 1, minWidth: 200 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                                      <label style={{ fontSize: 11.5, fontWeight: 700, color: '#34d399' }}>
                                        🌍 Select Country:
                                      </label>
                                      <span style={{ fontSize: 11, color: '#6ee7b7' }}>
                                        {proxyCountries.find((c) => c.code.toUpperCase() === selectedCountryCode.toUpperCase())?.flag || '🌐'}
                                      </span>
                                    </div>
                                    <select
                                      value={selectedCountryCode}
                                      onChange={(e) => handleCountryChange(e.target.value)}
                                      disabled={loadingFreeProxies}
                                      style={{
                                        width: '100%',
                                        padding: '9px 12px',
                                        backgroundColor: '#0c1412',
                                        border: '1.5px solid #059669',
                                        borderRadius: 7,
                                        color: '#34d399',
                                        fontSize: 12.5,
                                        fontWeight: 600,
                                        outline: 'none',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      {proxyCountries.map((c) => (
                                        <option key={c.code} value={c.code}>
                                          {c.flag} {c.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Right ("tar pase"): Free IP / Proxy Dropdown */}
                                  <div style={{ flex: 1.3, minWidth: 240 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                                      <label style={{ fontSize: 11.5, fontWeight: 700, color: '#34d399' }}>
                                        ⚡ Select Free IP / Proxy:
                                      </label>
                                      <span style={{ fontSize: 11, color: '#6ee7b7' }}>
                                        {filtered.length} connectable IPs
                                      </span>
                                    </div>
                                    <select
                                      value={selectedFreeProxyId}
                                      onChange={(e) => handleSelectFreeProxy(e.target.value)}
                                      disabled={loadingFreeProxies || filtered.length === 0}
                                      style={{
                                        width: '100%',
                                        padding: '9px 12px',
                                        backgroundColor: '#0c1412',
                                        border: '1.5px solid #059669',
                                        borderRadius: 7,
                                        color: selectedFreeProxyId ? '#34d399' : '#94a3b8',
                                        fontSize: 12.5,
                                        fontWeight: 600,
                                        outline: 'none',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      <option value="">
                                        {loadingFreeProxies
                                          ? 'Testing & scanning live IPs...'
                                          : filtered.length === 0
                                          ? '-- No connectable IPs for this country --'
                                          : `-- Choose IP / Proxy (${filtered.length} Available) --`}
                                      </option>
                                      {filtered.map((fp) => {
                                        const test = testedProxyResults[fp.ip];
                                        const locationLabel = fp.city ? `${fp.city}` : fp.country;
                                        const statusSnippet = test
                                          ? test.success
                                            ? ` · ✓ ${test.latencyMs}ms (${test.speedRating}) · 100% Up`
                                            : ' · ✗ Failed (0% Up)'
                                          : fp.speed
                                          ? ` · ⚡ ${fp.speed}${fp.uptime ? ` · ${fp.uptime}` : ''}`
                                          : ' · ⚡ Untested';
                                        return (
                                          <option key={fp.id} value={fp.id}>
                                            [{fp.countryCode || '??'}] {fp.ip}:{fp.port} ({locationLabel}) - {fp.protocol.toUpperCase()}{statusSnippet}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  </div>
                                </div>

                                {/* Popular Country Quick Pills */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 2 }}>
                                  {(popularProxyCountries && popularProxyCountries.length > 0 ? popularProxyCountries : proxyCountries.slice(0, 15)).map((c) => {
                                    const isSelected = selectedCountryCode.toUpperCase() === c.code.toUpperCase();
                                    return (
                                      <button
                                        key={c.code}
                                        type="button"
                                        onClick={() => handleCountryChange(c.code)}
                                        disabled={loadingFreeProxies}
                                        style={{
                                          padding: '3px 8px',
                                          borderRadius: 5,
                                          fontSize: 11,
                                          fontWeight: isSelected ? 700 : 500,
                                          backgroundColor: isSelected ? '#059669' : '#0c1613',
                                          color: isSelected ? '#ffffff' : '#a7f3d0',
                                          border: isSelected ? '1px solid #34d399' : '1px solid #134e3f',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 4,
                                        }}
                                      >
                                        <span>{c.flag}</span>
                                        <span>{c.code === 'ALL' ? 'All' : c.name.split(' ')[0]}</span>
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* Search and Protocol Filter */}
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                                  <div style={{ flex: 1, position: 'relative' }}>
                                    <Search size={13} style={{ position: 'absolute', left: 9, top: 9, color: '#059669' }} />
                                    <input
                                      type="text"
                                      placeholder="Filter city (e.g. Frankfurt, New York) or IP..."
                                      value={proxySearchText}
                                      onChange={(e) => setProxySearchText(e.target.value)}
                                      style={{
                                        width: '100%',
                                        padding: '6px 10px 6px 28px',
                                        backgroundColor: '#0c1412',
                                        border: '1px solid #134e3f',
                                        borderRadius: 6,
                                        color: '#e2e8f0',
                                        fontSize: 11,
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                      }}
                                    />
                                  </div>

                                  <div style={{ display: 'flex', gap: 4 }}>
                                    {(['all', 'socks5', 'http'] as const).map((proto) => {
                                      const active = proxyFilterProtocol === proto;
                                      return (
                                        <button
                                          key={proto}
                                          type="button"
                                          onClick={() => setProxyFilterProtocol(proto)}
                                          style={{
                                            padding: '4px 8px',
                                            borderRadius: 5,
                                            fontSize: 10,
                                            fontWeight: 600,
                                            backgroundColor: active ? '#059669' : '#0c1613',
                                            color: active ? '#ffffff' : '#94a3b8',
                                            border: active ? '1px solid #34d399' : '1px solid #1e293b',
                                            cursor: 'pointer',
                                            textTransform: 'uppercase',
                                          }}
                                        >
                                          {proto}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Clickable IP Display: Grid Cards vs Data Table */}
                                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                                    <div style={{ fontSize: 11.5, color: '#94a3b8' }}>
                                      👆 Click any IP below to test <strong style={{ color: '#34d399' }}>Live Speed, Ping & Connection</strong>:
                                    </div>
                                    <div style={{ fontSize: 11, color: '#6ee7b7', fontWeight: 600 }}>
                                      {filtered.length} Connectable IPs Found
                                    </div>
                                  </div>

                                  {filtered.length > 0 ? (
                                    freeProxyViewMode === 'grid' ? (
                                      /* GRID CARDS VIEW — Spacious, Roomy, 520px max height */
                                      <div
                                        style={{
                                          display: 'grid',
                                          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                                          gap: 10,
                                          minHeight: 340,
                                          maxHeight: 520,
                                          overflowY: 'auto',
                                          paddingRight: 6,
                                          paddingBottom: 4,
                                        }}
                                      >
                                        {filtered.map((fp) => {
                                          const isCurrent = (selectedFreeProxyId === fp.id) || (freeProxyHost === fp.ip && Number(freeProxyPort) === Number(fp.port));
                                          const isTestingThis = testingProxy && testingProxyIp === fp.ip;
                                          const test = testedProxyResults[fp.ip];
                                          const isCopied = copiedProxyIp === `${fp.ip}:${fp.port}`;
                                          const countryMeta = proxyCountries.find((c) => c.code.toUpperCase() === (fp.countryCode || '').toUpperCase());

                                          return (
                                            <div
                                              key={fp.id}
                                              onClick={() => handleTestAndApplyProxy(fp)}
                                              style={{
                                                padding: '11px 13px',
                                                borderRadius: 9,
                                                backgroundColor: isTestingThis
                                                  ? 'rgba(56, 189, 248, 0.12)'
                                                  : isCurrent
                                                  ? 'rgba(5, 150, 105, 0.22)'
                                                  : '#0d1316',
                                                border: isTestingThis
                                                  ? '1.5px solid #38bdf8'
                                                  : isCurrent
                                                  ? '1.5px solid #34d399'
                                                  : '1px solid #1a2a24',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 8,
                                                transition: 'all 0.15s ease',
                                                boxShadow: isCurrent ? '0 0 12px rgba(52, 211, 153, 0.2)' : 'none',
                                              }}
                                              title="Click to select, connect, and test this IP live"
                                            >
                                              {/* Top Line: Flag, Location & Protocol */}
                                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                                  <span style={{ fontSize: 13 }}>{countryMeta?.flag || '🌐'}</span>
                                                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {fp.city || fp.country}
                                                  </span>
                                                  <span
                                                    style={{
                                                      fontSize: 9.5,
                                                      padding: '1px 5px',
                                                      borderRadius: 3,
                                                      backgroundColor: '#064e3b',
                                                      color: '#6ee7b7',
                                                      fontWeight: 700,
                                                      textTransform: 'uppercase',
                                                    }}
                                                  >
                                                    {fp.countryCode || '??'}
                                                  </span>
                                                </div>

                                                <span
                                                  style={{
                                                    fontSize: 9.5,
                                                    padding: '2px 6px',
                                                    borderRadius: 4,
                                                    backgroundColor: fp.protocol.toLowerCase().includes('socks') ? 'rgba(59, 130, 246, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                                                    color: fp.protocol.toLowerCase().includes('socks') ? '#60a5fa' : '#c084fc',
                                                    fontWeight: 700,
                                                    textTransform: 'uppercase',
                                                  }}
                                                >
                                                  {fp.protocol}
                                                </span>
                                              </div>

                                              {/* Middle Line: IP:Port with Quick Copy */}
                                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span style={{ fontSize: 12, color: isCurrent ? '#f1f5f9' : '#e2e8f0', fontFamily: 'monospace', fontWeight: 700 }}>
                                                  {fp.ip}:{fp.port}
                                                </span>

                                                <button
                                                  type="button"
                                                  onClick={(e) => handleCopyProxyIp(e, `${fp.ip}:${fp.port}`)}
                                                  style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    padding: '2px 5px',
                                                    borderRadius: 4,
                                                    color: isCopied ? '#34d399' : '#64748b',
                                                    cursor: 'pointer',
                                                    fontSize: 10,
                                                    fontWeight: 600,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 3,
                                                  }}
                                                  title="Copy IP:Port"
                                                >
                                                  {isCopied ? <Check size={11} color="#34d399" /> : <Copy size={11} />}
                                                  <span>{isCopied ? 'Copied' : 'Copy'}</span>
                                                </button>
                                              </div>

                                              {/* Bottom Line: Speed, Uptime & Connection Badge */}
                                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                {isTestingThis ? (
                                                  <span style={{ fontSize: 10.5, fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <Loader2 size={11} className="animate-spin" /> Testing...
                                                  </span>
                                                ) : test ? (
                                                  test.success ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: 2 }}>
                                                        ⚡ {test.latencyMs}ms {test.speedRating ? `(${test.speedRating})` : ''}
                                                      </span>
                                                      <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, backgroundColor: 'rgba(5, 150, 105, 0.25)', color: '#6ee7b7', fontWeight: 600 }}>
                                                        100% Up
                                                      </span>
                                                    </div>
                                                  ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#ef4444' }}>
                                                        ✗ Failed
                                                      </span>
                                                      <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontWeight: 600 }}>
                                                        0% Up
                                                      </span>
                                                    </div>
                                                  )
                                                ) : fp.speed ? (
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                    <span style={{ fontSize: 10.5, fontWeight: 700, color: isCurrent ? '#34d399' : '#6ee7b7' }}>
                                                      ⚡ {fp.speed}
                                                    </span>
                                                    {fp.uptime && (
                                                      <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, backgroundColor: 'rgba(5, 150, 105, 0.25)', color: '#6ee7b7', fontWeight: 600 }}>
                                                        {fp.uptime}
                                                      </span>
                                                    )}
                                                  </div>
                                                ) : (
                                                  <span style={{ fontSize: 10, fontWeight: 500, color: '#64748b' }}>
                                                    ⚡ Untested
                                                  </span>
                                                )}

                                                <span
                                                  style={{
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    padding: '2px 8px',
                                                    borderRadius: 4,
                                                    backgroundColor: isCurrent ? '#059669' : 'rgba(255,255,255,0.06)',
                                                    color: isCurrent ? '#ffffff' : '#94a3b8',
                                                  }}
                                                >
                                                  {isCurrent ? '✓ Connected' : 'Connect'}
                                                </span>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      /* DATA TABLE VIEW — Clean, High-Density Scanning */
                                      <div
                                        style={{
                                          minHeight: 340,
                                          maxHeight: 520,
                                          overflowY: 'auto',
                                          border: '1px solid #134e3f',
                                          borderRadius: 8,
                                          backgroundColor: '#0a100d',
                                        }}
                                      >
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 11.5 }}>
                                          <thead>
                                            <tr style={{ backgroundColor: '#0f1a16', position: 'sticky', top: 0, zIndex: 2, borderBottom: '1px solid #134e3f' }}>
                                              <th style={{ padding: '8px 12px', color: '#6ee7b7', fontWeight: 700 }}>Country / City</th>
                                              <th style={{ padding: '8px 12px', color: '#6ee7b7', fontWeight: 700 }}>IP & Port</th>
                                              <th style={{ padding: '8px 12px', color: '#6ee7b7', fontWeight: 700 }}>Protocol</th>
                                              <th style={{ padding: '8px 12px', color: '#6ee7b7', fontWeight: 700 }}>Live Speed</th>
                                              <th style={{ padding: '8px 12px', color: '#6ee7b7', fontWeight: 700 }}>Uptime</th>
                                              <th style={{ padding: '8px 12px', color: '#6ee7b7', fontWeight: 700, textAlign: 'right' }}>Action</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {filtered.map((fp) => {
                                              const isCurrent = (selectedFreeProxyId === fp.id) || (freeProxyHost === fp.ip && Number(freeProxyPort) === Number(fp.port));
                                              const isTestingThis = testingProxy && testingProxyIp === fp.ip;
                                              const test = testedProxyResults[fp.ip];
                                              const isCopied = copiedProxyIp === `${fp.ip}:${fp.port}`;
                                              const countryMeta = proxyCountries.find((c) => c.code.toUpperCase() === (fp.countryCode || '').toUpperCase());

                                              return (
                                                <tr
                                                  key={fp.id}
                                                  onClick={() => handleTestAndApplyProxy(fp)}
                                                  style={{
                                                    borderBottom: '1px solid rgba(19, 78, 63, 0.4)',
                                                    backgroundColor: isTestingThis
                                                      ? 'rgba(56, 189, 248, 0.12)'
                                                      : isCurrent
                                                      ? 'rgba(5, 150, 105, 0.2)'
                                                      : 'transparent',
                                                    cursor: 'pointer',
                                                    transition: 'background-color 0.15s ease',
                                                  }}
                                                  onMouseEnter={(e) => {
                                                    if (!isCurrent && !isTestingThis) {
                                                      e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.08)';
                                                    }
                                                  }}
                                                  onMouseLeave={(e) => {
                                                    if (!isCurrent && !isTestingThis) {
                                                      e.currentTarget.style.backgroundColor = 'transparent';
                                                    }
                                                  }}
                                                >
                                                  <td style={{ padding: '8px 12px', color: '#f1f5f9', fontWeight: 600 }}>
                                                    <span style={{ marginRight: 6 }}>{countryMeta?.flag || '🌐'}</span>
                                                    <span>{fp.city || fp.country}</span>
                                                    <span style={{ marginLeft: 5, fontSize: 9.5, color: '#6ee7b7', fontWeight: 700 }}>
                                                      ({fp.countryCode})
                                                    </span>
                                                  </td>

                                                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700, color: isCurrent ? '#34d399' : '#e2e8f0' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                      <span>{fp.ip}:{fp.port}</span>
                                                      <button
                                                        type="button"
                                                        onClick={(e) => handleCopyProxyIp(e, `${fp.ip}:${fp.port}`)}
                                                        style={{
                                                          background: 'none',
                                                          border: 'none',
                                                          color: isCopied ? '#34d399' : '#64748b',
                                                          cursor: 'pointer',
                                                          padding: 0,
                                                        }}
                                                        title="Copy IP:Port"
                                                      >
                                                        {isCopied ? <Check size={11} color="#34d399" /> : <Copy size={11} />}
                                                      </button>
                                                    </div>
                                                  </td>

                                                  <td style={{ padding: '8px 12px' }}>
                                                    <span
                                                      style={{
                                                        fontSize: 9.5,
                                                        padding: '2px 6px',
                                                        borderRadius: 4,
                                                        backgroundColor: fp.protocol.toLowerCase().includes('socks') ? 'rgba(59, 130, 246, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                                                        color: fp.protocol.toLowerCase().includes('socks') ? '#60a5fa' : '#c084fc',
                                                        fontWeight: 700,
                                                        textTransform: 'uppercase',
                                                      }}
                                                    >
                                                      {fp.protocol}
                                                    </span>
                                                  </td>

                                                  <td style={{ padding: '8px 12px' }}>
                                                    {isTestingThis ? (
                                                      <span style={{ color: '#38bdf8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <Loader2 size={11} className="animate-spin" /> Testing...
                                                      </span>
                                                    ) : test ? (
                                                      test.success ? (
                                                        <span style={{ color: '#34d399', fontWeight: 700 }}>
                                                          ⚡ {test.latencyMs}ms ({test.speedRating})
                                                        </span>
                                                      ) : (
                                                        <span style={{ color: '#ef4444', fontWeight: 700 }}>
                                                          ✗ Failed
                                                        </span>
                                                      )
                                                    ) : fp.speed ? (
                                                      <span style={{ color: '#6ee7b7', fontWeight: 700 }}>
                                                        ⚡ {fp.speed}
                                                      </span>
                                                    ) : (
                                                      <span style={{ color: '#64748b' }}>
                                                        ⚡ Untested
                                                      </span>
                                                    )}
                                                  </td>

                                                  <td style={{ padding: '8px 12px' }}>
                                                    {test ? (
                                                      test.success ? (
                                                        <span style={{ padding: '1px 5px', borderRadius: 3, backgroundColor: 'rgba(5, 150, 105, 0.25)', color: '#6ee7b7', fontSize: 10, fontWeight: 700 }}>
                                                          100% Up
                                                        </span>
                                                      ) : (
                                                        <span style={{ padding: '1px 5px', borderRadius: 3, backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontSize: 10, fontWeight: 700 }}>
                                                          0% Up
                                                        </span>
                                                      )
                                                    ) : fp.uptime ? (
                                                      <span style={{ padding: '1px 5px', borderRadius: 3, backgroundColor: 'rgba(5, 150, 105, 0.25)', color: '#6ee7b7', fontSize: 10, fontWeight: 700 }}>
                                                        {fp.uptime}
                                                      </span>
                                                    ) : (
                                                      <span style={{ color: '#64748b', fontSize: 10 }}>—</span>
                                                    )}
                                                  </td>

                                                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleTestAndApplyProxy(fp);
                                                      }}
                                                      disabled={isTestingThis}
                                                      style={{
                                                        padding: '4px 10px',
                                                        borderRadius: 5,
                                                        fontSize: 10.5,
                                                        fontWeight: 700,
                                                        backgroundColor: isCurrent ? '#059669' : '#1e293b',
                                                        border: isCurrent ? '1px solid #34d399' : '1px solid #334155',
                                                        color: isCurrent ? '#ffffff' : '#38bdf8',
                                                        cursor: 'pointer',
                                                      }}
                                                    >
                                                      {isTestingThis ? 'Testing...' : isCurrent ? '✓ Active' : 'Connect'}
                                                    </button>
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    )
                                  ) : (
                                    <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b', fontSize: 12.5, backgroundColor: '#0c1412', borderRadius: 8, border: '1px dashed #134e3f' }}>
                                      No connectable proxies found for this filter. Try selecting 'All Countries' or click 'Scan Live Proxies'.
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                        )}

                        {/* 2. MANUAL PROXY SUB-TAB */}
                        {proxySubTab === 'manual' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {savedProxies.length > 0 && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              padding: '10px 14px',
                              backgroundColor: '#121420',
                              borderRadius: 8,
                              border: '1px solid #282d40',
                            }}
                          >
                            <Bookmark size={15} color="#38bdf8" />
                            <span style={{ fontSize: 12, color: '#9ba1b0', fontWeight: 500 }}>Saved Proxy Pool:</span>
                            <select
                              value={selectedSavedProxyId}
                              onChange={(e) => handleSelectSavedProxy(e.target.value)}
                              style={{
                                flex: 1,
                                padding: '6px 10px',
                                backgroundColor: '#0e1017',
                                border: '1px solid #2f3448',
                                borderRadius: 6,
                                color: '#38bdf8',
                                fontSize: 12,
                              }}
                            >
                              <option value="">-- Choose saved proxy --</option>
                              {savedProxies.map((sp) => (
                                <option key={sp.id} value={sp.id}>
                                  {sp.name} ({sp.mode.toUpperCase()} - {sp.host}:{sp.port})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Quick Proxy Paste & Auto-Test Box */}
                        <div
                          style={{
                            padding: '14px 16px',
                            backgroundColor: '#111422',
                            borderRadius: 10,
                            border: `1.5px solid ${
                              testingProxy
                                ? 'rgba(56, 189, 248, 0.45)'
                                : proxyTestResult?.success
                                ? 'rgba(16, 185, 129, 0.45)'
                                : proxyTestResult?.success === false
                                ? 'rgba(239, 68, 68, 0.45)'
                                : '#283149'
                            }`,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <Zap size={16} color="#38bdf8" />
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
                                Quick Proxy Paste & Auto-Test
                              </span>
                            </div>
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>
                              Format: <code style={{ color: '#38bdf8', backgroundColor: '#090d18', padding: '2px 6px', borderRadius: 4 }}>host:port:user:pass</code>
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                              <input
                                type="text"
                                placeholder="Paste proxy (e.g. gw.dataimpulse.com:10000:username:password)"
                                value={quickProxyInput}
                                onChange={(e) => handleApplyAndTestProxyString(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '10px 14px',
                                  paddingRight: testingProxy || proxyTestResult ? 140 : 14,
                                  backgroundColor: '#090c16',
                                  border: '1px solid #2f3854',
                                  borderRadius: 8,
                                  color: '#ffffff',
                                  fontSize: 12,
                                  fontFamily: 'monospace',
                                  outline: 'none',
                                  boxSizing: 'border-box',
                                }}
                              />

                              {testingProxy && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    right: 12,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    fontSize: 11,
                                    color: '#38bdf8',
                                    fontWeight: 600,
                                  }}
                                >
                                  <Loader2 size={14} className="animate-spin" />
                                  <span>Testing...</span>
                                </div>
                              )}

                              {!testingProxy && proxyTestResult?.success && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    right: 12,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    fontSize: 11,
                                    color: '#34d399',
                                    fontWeight: 700,
                                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                    padding: '3px 8px',
                                    borderRadius: 6,
                                  }}
                                >
                                  <CheckCircle2 size={13} color="#34d399" />
                                  <span>Connected</span>
                                </div>
                              )}

                              {!testingProxy && proxyTestResult?.success === false && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    right: 12,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    fontSize: 11,
                                    color: '#f87171',
                                    fontWeight: 700,
                                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                    padding: '3px 8px',
                                    borderRadius: 6,
                                  }}
                                >
                                  <AlertCircle size={13} color="#f87171" />
                                  <span>Error</span>
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (quickProxyInput.trim()) {
                                  handleApplyAndTestProxyString(quickProxyInput);
                                } else if (proxyHost.trim()) {
                                  handleTestProxy();
                                }
                              }}
                              disabled={testingProxy || (!quickProxyInput.trim() && !proxyHost.trim())}
                              style={{
                                padding: '10px 16px',
                                backgroundColor: '#2563eb',
                                border: 'none',
                                borderRadius: 8,
                                color: '#ffffff',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                whiteSpace: 'nowrap',
                                opacity: testingProxy || (!quickProxyInput.trim() && !proxyHost.trim()) ? 0.6 : 1,
                              }}
                            >
                              {testingProxy ? (
                                <>
                                  <Loader2 size={14} className="animate-spin" />
                                  Testing...
                                </>
                              ) : (
                                <>
                                  <Play size={14} />
                                  Test Now
                                </>
                              )}
                            </button>
                          </div>

                          {proxyTestResult && !testingProxy && (
                            <div
                              style={{
                                fontSize: 11,
                                color: proxyTestResult.success ? '#34d399' : '#f87171',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '2px 4px',
                              }}
                            >
                              {proxyTestResult.success ? (
                                <span>
                                  ✓ Connected successfully · Ping: {proxyTestResult.latencyMs}ms
                                  {proxyTestResult.ip && ` · Exit IP: ${proxyTestResult.ip}`}
                                  {(proxyTestResult.city || proxyTestResult.country) && ` · 📍 ${[proxyTestResult.city, proxyTestResult.country].filter(Boolean).join(', ')}`}
                                  {proxyTestResult.timezone && ` · 🕒 ${proxyTestResult.timezone}`}
                                </span>
                              ) : (
                                <span>
                                  ✗ {proxyTestResult.error || 'Failed to connect. Please verify host, port, username and password.'}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 3. Manual Proxy Configuration Inputs */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div style={{ display: 'flex', gap: 10 }}>
                            <div style={{ width: 120 }}>
                              <label style={{ display: 'block', fontSize: 11, color: '#8890a5', marginBottom: 4 }}>
                                Protocol
                              </label>
                              <select
                                value={proxyMode}
                                onChange={(e: any) => setProxyMode(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '9px 10px',
                                  backgroundColor: '#0e1017',
                                  border: '1px solid #2c3245',
                                  borderRadius: 8,
                                  color: '#ffffff',
                                  fontSize: 12,
                                }}
                              >
                                <option value="socks5">SOCKS5</option>
                                <option value="http">HTTP</option>
                                <option value="https">HTTPS</option>
                              </select>
                            </div>

                            <div style={{ flex: 1 }}>
                              <label style={{ display: 'block', fontSize: 11, color: '#8890a5', marginBottom: 4 }}>
                                Proxy Host (IP or Domain)
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. 192.168.1.1 or proxy.example.com"
                                value={proxyHost}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val.includes(':') && (val.split(':').length >= 3 || val.includes('@'))) {
                                    handleApplyAndTestProxyString(val);
                                  } else {
                                    setProxyHost(val);
                                  }
                                }}
                                style={{
                                  width: '100%',
                                  padding: '9px 12px',
                                  backgroundColor: '#0e1017',
                                  border: '1px solid #2c3245',
                                  borderRadius: 8,
                                  color: '#ffffff',
                                  fontSize: 12,
                                  outline: 'none',
                                  boxSizing: 'border-box',
                                }}
                              />
                            </div>

                            <div style={{ width: 100 }}>
                              <label style={{ display: 'block', fontSize: 11, color: '#8890a5', marginBottom: 4 }}>
                                Port
                              </label>
                              <input
                                type="number"
                                placeholder="Port"
                                value={proxyPort}
                                onChange={(e) => setProxyPort(Number(e.target.value))}
                                style={{
                                  width: '100%',
                                  padding: '9px 10px',
                                  backgroundColor: '#0e1017',
                                  border: '1px solid #2c3245',
                                  borderRadius: 8,
                                  color: '#ffffff',
                                  fontSize: 12,
                                  outline: 'none',
                                  boxSizing: 'border-box',
                                }}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div>
                              <label style={{ display: 'block', fontSize: 11, color: '#8890a5', marginBottom: 4 }}>
                                Proxy Username (optional)
                              </label>
                              <input
                                type="text"
                                placeholder="Username"
                                value={proxyUsername}
                                onChange={(e) => setProxyUsername(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '9px 12px',
                                  backgroundColor: '#0e1017',
                                  border: '1px solid #2c3245',
                                  borderRadius: 8,
                                  color: '#ffffff',
                                  fontSize: 12,
                                  outline: 'none',
                                  boxSizing: 'border-box',
                                }}
                              />
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: 11, color: '#8890a5', marginBottom: 4 }}>
                                Proxy Password (optional)
                              </label>
                              <input
                                type="password"
                                placeholder="Password"
                                value={proxyPassword}
                                onChange={(e) => setProxyPassword(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '9px 12px',
                                  backgroundColor: '#0e1017',
                                  border: '1px solid #2c3245',
                                  borderRadius: 8,
                                  color: '#ffffff',
                                  fontSize: 12,
                                  outline: 'none',
                                  boxSizing: 'border-box',
                                }}
                              />
                            </div>
                          </div>

                          {/* Dynamic IP Rotation URL & Save to Pool */}
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                              <input
                                type="text"
                                placeholder="Rotation / Change IP URL (e.g. http://proxy-provider.com/rotate?key=xxx)"
                                value={changeIpUrl}
                                onChange={(e) => setChangeIpUrl(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  backgroundColor: '#0e1017',
                                  border: '1px solid #2c3245',
                                  borderRadius: 8,
                                  color: '#ffffff',
                                  fontSize: 12,
                                  outline: 'none',
                                  boxSizing: 'border-box',
                                }}
                              />
                            </div>

                            <button
                              type="button"
                              onClick={handleSaveCurrentProxyToPool}
                              disabled={!proxyHost.trim()}
                              style={{
                                padding: '8px 14px',
                                backgroundColor: '#1e2433',
                                border: '1px solid #334155',
                                borderRadius: 8,
                                color: '#38bdf8',
                                fontSize: 12,
                                fontWeight: 500,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                              title="Save current proxy to reusable pool"
                            >
                              <Bookmark size={13} />
                              Save to Pool
                            </button>

                            <button
                              type="button"
                              onClick={handleTestProxy}
                              disabled={testingProxy || !proxyHost.trim()}
                              style={{
                                padding: '8px 14px',
                                backgroundColor: '#0284c7',
                                border: 'none',
                                borderRadius: 8,
                                color: '#ffffff',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                opacity: testingProxy || !proxyHost.trim() ? 0.6 : 1,
                              }}
                              title="Test connection of current proxy settings"
                            >
                              {testingProxy ? (
                                <>
                                  <Loader2 size={13} className="animate-spin" />
                                  Testing...
                                </>
                              ) : (
                                <>
                                  <Wifi size={13} />
                                  Test Proxy
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: PRIVACY & FINGERPRINT & AUTOMATION */}
                {editorTab === 'privacy' && (
                  <>
                    {/* Privacy Level Presets */}
                    <div
                      style={{
                        padding: 18,
                        backgroundColor: '#171a26',
                        border: '1px solid #282d40',
                        borderRadius: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Shield size={15} color="#10b981" />
                        Anti-Detect & Fingerprint Shields
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                        {[
                          {
                            id: 'standard',
                            title: 'Standard',
                            desc: 'Minimal spoofing, optimal for standard browsing & high compatibility.',
                            color: '#94a3b8',
                          },
                          {
                            id: 'balanced',
                            title: 'Balanced',
                            desc: 'Recommended. Spoofs Canvas, AudioContext, WebGL noise & font metrics.',
                            color: '#3b82f6',
                          },
                          {
                            id: 'strict',
                            title: 'Strict Defense',
                            desc: 'Maximum stealth. Randomizes hardware concurrency, memory & strict WebGL buffers.',
                            color: '#10b981',
                          },
                        ].map((p) => (
                          <div
                            key={p.id}
                            onClick={() => setPrivacyLevel(p.id as any)}
                            style={{
                              padding: '14px 14px',
                              borderRadius: 10,
                              backgroundColor: privacyLevel === p.id ? '#1e2436' : '#0e1017',
                              border: `1.5px solid ${privacyLevel === p.id ? p.color : '#282d40'}`,
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>{p.title}</span>
                              {privacyLevel === p.id && (
                                <CheckCircle2 size={15} color={p.color} />
                              )}
                            </div>
                            <span style={{ fontSize: 11, color: '#82899d', lineHeight: '1.4' }}>
                              {p.desc}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* WebRTC Policy & Manual ON/OFF Controls */}
                      <div
                        style={{
                          marginTop: 8,
                          padding: 14,
                          backgroundColor: '#0f111a',
                          border: '1px solid #282d42',
                          borderRadius: 10,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Radio size={14} color={webrtcPolicy === 'disabled' ? '#f87171' : '#34d399'} />
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>
                                WebRTC Manual Control & IP Leak Shield
                              </span>
                            </div>
                            <span style={{ fontSize: 11, color: '#8891a5', marginTop: 2, display: 'block' }}>
                              Manually turn WebRTC protocol on or off to prevent real IP exposure.
                            </span>
                          </div>

                          {/* Manual ON / OFF Toggle Button */}
                          <button
                            type="button"
                            onClick={() => setWebrtcPolicy(webrtcPolicy === 'disabled' ? 'default_public_interface_only' : 'disabled')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '6px 14px',
                              borderRadius: 20,
                              border: `1px solid ${webrtcPolicy === 'disabled' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: 700,
                              backgroundColor: webrtcPolicy === 'disabled' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                              color: webrtcPolicy === 'disabled' ? '#f87171' : '#34d399',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: webrtcPolicy === 'disabled' ? '#ef4444' : '#10b981',
                              }}
                            />
                            {webrtcPolicy === 'disabled' ? 'WebRTC: OFF' : 'WebRTC: ON'}
                          </button>
                        </div>

                        {webrtcPolicy !== 'disabled' ? (
                          <div>
                            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: '#9ba1b0', marginBottom: 5 }}>
                              Active WebRTC Routing Policy:
                            </label>
                            <select
                              value={webrtcPolicy}
                              onChange={(e: any) => setWebrtcPolicy(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '9px 12px',
                                backgroundColor: '#0e1017',
                                border: '1px solid #2c3245',
                                borderRadius: 8,
                                color: '#ffffff',
                                fontSize: 12,
                                outline: 'none',
                              }}
                            >
                              <option value="default_public_interface_only">Prevent LAN & Private IP Leaks (Default Public Interface Only)</option>
                              <option value="disable_non_proxied_udp">Disable Non-Proxied UDP (Maximum Leak Protection)</option>
                              <option value="default">Default Chromium Policy</option>
                            </select>
                          </div>
                        ) : (
                          <div
                            style={{
                              fontSize: 11.5,
                              color: '#94a3b8',
                              backgroundColor: '#0a0c14',
                              padding: '8px 12px',
                              borderRadius: 6,
                              border: '1px solid #222638',
                              lineHeight: '1.4',
                            }}
                          >
                            🛡️ <b>WebRTC is completely disabled.</b> Chromium will launch with <code>--disable-webrtc</code> and all RTCPeerConnection APIs are neutralized to eliminate any possibility of real IP leakage.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Automation Port & Ephemeral Profile */}
                    <div
                      style={{
                        padding: 18,
                        backgroundColor: '#171a26',
                        border: '1px solid #282d40',
                        borderRadius: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Settings size={15} color="#a855f7" />
                        Automation & Storage Behavior
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#9ba1b0', marginBottom: 6 }}>
                          Automation Remote Debugging Port (Puppeteer / Playwright CDP)
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <input
                            type="number"
                            placeholder="e.g. 9222 (Optional)"
                            value={remoteDebuggingPort}
                            onChange={(e) => setRemoteDebuggingPort(e.target.value ? Number(e.target.value) : '')}
                            min={1024}
                            max={65535}
                            style={{
                              width: 220,
                              padding: '9px 12px',
                              backgroundColor: '#0e1017',
                              border: '1px solid #2c3245',
                              borderRadius: 8,
                              color: '#ffffff',
                              fontSize: 12,
                              boxSizing: 'border-box',
                            }}
                          />
                          <span style={{ fontSize: 12, color: '#82899d' }}>
                            Leave blank unless connecting via automated Puppeteer or Playwright scripts.
                          </span>
                        </div>
                      </div>

                      {/* Ephemeral Profile Toggle */}
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '12px 14px',
                          backgroundColor: '#0e1017',
                          borderRadius: 8,
                          border: '1px solid #282d40',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isTemporary}
                          onChange={(e) => setIsTemporary(e.target.checked)}
                          style={{ width: 16, height: 16, accentColor: '#ef4444', cursor: 'pointer' }}
                        />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>
                            Ephemeral / Temporary Session
                          </div>
                          <div style={{ fontSize: 11, color: '#82899d' }}>
                            All cookies, localStorage, session files, and cache are completely purged when the browser window closes.
                          </div>
                        </div>
                      </label>
                    </div>
                  </>
                )}

                {editorTab === 'cookies' && (
                  <>
                    {/* Header info box */}
                    <div
                      style={{
                        padding: '14px 16px',
                        backgroundColor: '#12141f',
                        border: '1px solid #23273a',
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 8,
                            backgroundColor: '#f59e0b18',
                            border: '1px solid #f59e0b35',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#f59e0b',
                            flexShrink: 0,
                          }}
                        >
                          <Cookie size={20} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#ffffff' }}>
                              Profile Cookies & Session Data
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 12,
                                backgroundColor: profileCookiesCount > 0 ? '#10b98120' : '#33384c',
                                color: profileCookiesCount > 0 ? '#34d399' : '#94a3b8',
                                border: `1px solid ${profileCookiesCount > 0 ? '#10b98140' : '#47556940'}`,
                              }}
                            >
                              {profileCookiesCount} Cookies
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: '#8891a5', marginTop: 2 }}>
                            View, copy, or edit session cookies. Copying these cookies lets you import them into other profiles or browsers (e.g. Cookie-Editor extension) to load active logins.
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={handleCopyProfileCookies}
                          disabled={!profileCookiesContent.trim()}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '7px 14px',
                            borderRadius: 7,
                            backgroundColor: isCopyingCookies ? '#10b981' : '#1e2436',
                            border: `1px solid ${isCopyingCookies ? '#10b981' : '#333f5c'}`,
                            color: isCopyingCookies ? '#ffffff' : '#38bdf8',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: profileCookiesContent.trim() ? 'pointer' : 'not-allowed',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {isCopyingCookies ? <Check size={13} /> : <Copy size={13} />}
                          {isCopyingCookies ? 'Copied!' : 'Copy Cookies'}
                        </button>

                        <button
                          type="button"
                          onClick={handleDownloadProfileCookiesFile}
                          disabled={!profileCookiesContent.trim()}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '7px 12px',
                            backgroundColor: '#1b1e2c',
                            border: '1px solid #2d3348',
                            borderRadius: 7,
                            color: '#9ba1b0',
                            fontSize: 12,
                            cursor: profileCookiesContent.trim() ? 'pointer' : 'not-allowed',
                          }}
                        >
                          <Download size={13} />
                          Download
                        </button>
                      </div>
                    </div>

                    {/* Format Selector & Actions Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, color: '#8891a5', fontWeight: 500 }}>Format:</span>
                        {(['json', 'netscape'] as const).map((fmt) => (
                          <button
                            key={fmt}
                            type="button"
                            onClick={() => handleSwitchProfileCookiesFormat(fmt)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 6,
                              border: 'none',
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: 'pointer',
                              backgroundColor: profileCookiesFormat === fmt ? '#f59e0b' : '#1e2130',
                              color: profileCookiesFormat === fmt ? '#000000' : '#8891a5',
                              transition: 'all 0.12s ease',
                            }}
                          >
                            {fmt.toUpperCase()}
                          </button>
                        ))}
                        <span style={{ fontSize: 11, color: '#64748b', marginLeft: 6 }}>
                          {profileCookiesFormat === 'json' ? '(Standard JSON array)' : '(Netscape / curl cookie.txt format)'}
                        </span>
                      </div>

                      {editingProfileId && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => loadCookiesForEditor(editingProfileId, profileCookiesFormat)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '4px 10px',
                              backgroundColor: '#1a1d2b',
                              border: '1px solid #282d40',
                              borderRadius: 6,
                              color: '#8ba2c4',
                              fontSize: 11,
                              cursor: 'pointer',
                            }}
                          >
                            <RefreshCw size={11} />
                            Reload
                          </button>

                          <button
                            type="button"
                            onClick={handleClearProfileCookies}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '4px 10px',
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              borderRadius: 6,
                              color: '#f87171',
                              fontSize: 11,
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={11} />
                            Clear Cookies
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Editable Cookies Textarea */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1' }}>
                          Cookies Content ({profileCookiesFormat.toUpperCase()}) — Directly Editable
                        </label>
                        <span style={{ fontSize: 11, color: '#64748b' }}>
                          Edit values, or paste cookies copied from another profile/browser
                        </span>
                      </div>

                      <textarea
                        value={profileCookiesContent}
                        onChange={(e) => setProfileCookiesContent(e.target.value)}
                        placeholder={
                          profileCookiesFormat === 'json'
                            ? `[\n  {\n    "name": "session_id",\n    "value": "xyz...",\n    "domain": ".example.com",\n    "path": "/",\n    "secure": true,\n    "httpOnly": true\n  }\n]`
                            : `# Netscape HTTP Cookie File\n.example.com\tTRUE\t/\tTRUE\t1799999999\tsession_id\txyz...`
                        }
                        rows={10}
                        style={{
                          width: '100%',
                          backgroundColor: '#0a0b12',
                          border: '1px solid #282d42',
                          borderRadius: 8,
                          color: '#a3e635',
                          padding: '12px 14px',
                          fontSize: 11.5,
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                          lineHeight: '1.5',
                          boxSizing: 'border-box',
                          outline: 'none',
                          resize: 'vertical',
                          minHeight: 180,
                        }}
                      />
                    </div>

                    {/* Feedback & Save Bar */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        backgroundColor: '#121420',
                        borderRadius: 8,
                        border: '1px solid #23273a',
                      }}
                    >
                      <div style={{ fontSize: 12, flex: 1 }}>
                        {profileCookiesStatus ? (
                          <span
                            style={{
                              color: profileCookiesStatus.startsWith('✓') ? '#34d399' : '#f87171',
                              fontWeight: 600,
                            }}
                          >
                            {profileCookiesStatus}
                          </span>
                        ) : (
                          <span style={{ color: '#64748b' }}>
                            {editingProfileId
                              ? 'Click "Save & Apply Cookies" to commit edits directly to this profile.'
                              : 'Cookies will be imported automatically when this profile is created.'}
                          </span>
                        )}
                      </div>

                      {editingProfileId && (
                        <button
                          type="button"
                          onClick={handleSaveProfileCookies}
                          disabled={isSavingCookies}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '7px 16px',
                            backgroundColor: '#10b981',
                            border: 'none',
                            borderRadius: 6,
                            color: '#ffffff',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: isSavingCookies ? 'not-allowed' : 'pointer',
                            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                          }}
                        >
                          <Check size={14} />
                          {isSavingCookies ? 'Saving...' : 'Save & Apply Cookies'}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Editor Actions Footer Bar */}
            <div
              style={{
                padding: '16px 28px',
                borderTop: '1px solid #232738',
                backgroundColor: '#151824',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontSize: 12, color: '#82899d' }}>
                {editingProfileId ? 'Changes will take effect upon next launch.' : 'New profile will be initialized with a unique partition.'}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  style={{
                    padding: '9px 18px',
                    backgroundColor: '#202434',
                    border: '1px solid #2f354b',
                    borderRadius: 8,
                    color: '#9ba1b0',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  disabled={!isAuthenticated}
                  type="button"
                  onClick={() => handleSaveProfile(false)}
                  style={{
                    padding: '9px 20px',
                    backgroundColor: '#3b82f6',
                    border: 'none',
                    borderRadius: 8,
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                  }}
                >
                  {editingProfileId ? 'Save Changes' : 'Create Profile'}
                </button>

                <button
                  disabled={!isAuthenticated}
                  type="button"
                  onClick={() => handleSaveProfile(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '9px 20px',
                    backgroundColor: '#10b981',
                    border: 'none',
                    borderRadius: 8,
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                  }}
                >
                  <Play size={13} fill="#fff" />
                  Save & Launch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unified Manage Cookies Modal */}
      {cookieModalProfile && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              width: 680,
              maxHeight: '92%',
              backgroundColor: '#141622',
              border: '1px solid #282d42',
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 24px 48px rgba(0,0,0,0.7)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #23283c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#181b2a',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ padding: 6, borderRadius: 8, backgroundColor: 'rgba(245, 158, 11, 0.12)' }}>
                  <Cookie size={18} color="#f59e0b" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#ffffff', margin: 0 }}>
                      Manage Cookies — {cookieModalProfile.name}
                    </h3>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 12,
                        backgroundColor: cookieModalCount > 0 ? '#10b98120' : '#33384c',
                        color: cookieModalCount > 0 ? '#34d399' : '#94a3b8',
                        border: `1px solid ${cookieModalCount > 0 ? '#10b98140' : '#47556940'}`,
                      }}
                    >
                      {cookieModalCount} Cookies
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: '#8891a5', marginTop: 2 }}>
                    View, copy, and edit session cookies. Any edits saved here will apply directly to the profile session.
                  </div>
                </div>
              </div>
              <button
                onClick={() => setCookieModalProfile(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9ba1b0',
                  cursor: 'pointer',
                  padding: 4,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '16px 20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Actions & Format Toolbar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                {/* Format Switcher */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: '#8891a5', fontWeight: 500 }}>Format:</span>
                  {(['json', 'netscape'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => handleExportCookiesFormat(fmt)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: 'none',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        backgroundColor: cookieModalFormat === fmt ? '#f59e0b' : '#1e2130',
                        color: cookieModalFormat === fmt ? '#000000' : '#8891a5',
                        transition: 'all 0.12s ease',
                      }}
                    >
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                  <span style={{ fontSize: 11, color: '#64748b', marginLeft: 4 }}>
                    {cookieModalFormat === 'json' ? '(JSON array)' : '(Netscape format)'}
                  </span>
                </div>

                {/* Quick Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    onClick={handleCopyCookieModalContent}
                    disabled={!cookieModalContent.trim()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '5px 12px',
                      backgroundColor: isCopyingCookieModal ? '#10b981' : '#1e2436',
                      border: `1px solid ${isCopyingCookieModal ? '#10b981' : '#333f5c'}`,
                      borderRadius: 6,
                      color: isCopyingCookieModal ? '#ffffff' : '#38bdf8',
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: cookieModalContent.trim() ? 'pointer' : 'not-allowed',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isCopyingCookieModal ? <Check size={12} /> : <Copy size={12} />}
                    {isCopyingCookieModal ? 'Copied!' : 'Copy Cookies'}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadCookieFile}
                    disabled={!cookieModalContent.trim()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '5px 12px',
                      backgroundColor: '#1b1e2c',
                      border: '1px solid #2d3348',
                      borderRadius: 6,
                      color: '#9ba1b0',
                      fontSize: 11.5,
                      cursor: cookieModalContent.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    <Download size={12} />
                    Download
                  </button>

                  <button
                    type="button"
                    onClick={handleReloadCookieModal}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '5px 10px',
                      backgroundColor: '#1a1d2b',
                      border: '1px solid #282d40',
                      borderRadius: 6,
                      color: '#8ba2c4',
                      fontSize: 11.5,
                      cursor: 'pointer',
                    }}
                  >
                    <RefreshCw size={11} />
                    Reload
                  </button>

                  <button
                    type="button"
                    onClick={handleClearCookieModal}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '5px 10px',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      borderRadius: 6,
                      color: '#f87171',
                      fontSize: 11.5,
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={11} />
                    Clear
                  </button>
                </div>
              </div>

              {/* Editable Cookies Textarea */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1' }}>
                    Cookies Content ({cookieModalFormat.toUpperCase()}) — Directly Editable
                  </label>
                  <span style={{ fontSize: 11, color: '#64748b' }}>
                    Edit values, or paste cookies copied from another profile/browser
                  </span>
                </div>

                <textarea
                  value={cookieModalContent}
                  onChange={(e) => setCookieModalContent(e.target.value)}
                  placeholder={
                    cookieModalFormat === 'json'
                      ? `[\n  {\n    "name": "session_id",\n    "value": "xyz...",\n    "domain": ".example.com",\n    "path": "/",\n    "secure": true,\n    "httpOnly": true\n  }\n]`
                      : `# Netscape HTTP Cookie File\n.example.com\tTRUE\t/\tTRUE\t1799999999\tsession_id\txyz...`
                  }
                  rows={13}
                  style={{
                    width: '100%',
                    backgroundColor: '#0a0b12',
                    border: '1px solid #282d42',
                    borderRadius: 8,
                    color: '#a3e635',
                    padding: '12px 14px',
                    fontSize: 11.5,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    lineHeight: '1.5',
                    boxSizing: 'border-box',
                    outline: 'none',
                    resize: 'vertical',
                    minHeight: 220,
                  }}
                />
              </div>

              {/* Live Status Feedback */}
              {cookieStatusMsg && (
                <div
                  style={{
                    fontSize: 12,
                    padding: '8px 12px',
                    borderRadius: 6,
                    backgroundColor: cookieStatusMsg.startsWith('✓') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: cookieStatusMsg.startsWith('✓') ? '#34d399' : '#f87171',
                    border: `1px solid ${cookieStatusMsg.startsWith('✓') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  }}
                >
                  {cookieStatusMsg}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid #23283c',
                backgroundColor: '#181b2a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontSize: 11.5, color: '#64748b' }}>
                Tip: Copy cookies to load this session in external browser extensions (e.g. Cookie-Editor).
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setCookieModalProfile(null)}
                  style={{
                    padding: '7px 16px',
                    backgroundColor: '#232635',
                    border: '1px solid #33384c',
                    borderRadius: 6,
                    color: '#9ba1b0',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={handleSaveCookieModalEdits}
                  disabled={isSavingCookieModal}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 18px',
                    backgroundColor: '#10b981',
                    border: 'none',
                    borderRadius: 6,
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: isSavingCookieModal ? 'wait' : 'pointer',
                    boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Check size={13} />
                  {isSavingCookieModal ? 'Saving...' : 'Save & Apply Cookies'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Profile Creator Modal */}
      {showBulkCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              backgroundColor: '#181a24',
              borderRadius: 12,
              width: 540,
              maxWidth: '90vw',
              border: '1px solid #2d3348',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #262a3c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Layers size={18} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#ffffff' }}>
                  Bulk Profile Creator
                </h3>
              </div>
              <button
                onClick={() => setShowBulkCreateModal(false)}
                style={{ background: 'none', border: 'none', color: '#8b92a2', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#9ba1b0', marginBottom: 6 }}>
                    Number of Profiles
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={bulkCount}
                    onChange={(e) => setBulkCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: '#10121a',
                      border: '1px solid #282d40',
                      borderRadius: 6,
                      color: '#ffffff',
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#9ba1b0', marginBottom: 6 }}>
                    Profile Name Prefix
                  </label>
                  <input
                    type="text"
                    value={bulkPrefix}
                    onChange={(e) => setBulkPrefix(e.target.value)}
                    placeholder="Account"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: '#10121a',
                      border: '1px solid #282d40',
                      borderRadius: 6,
                      color: '#ffffff',
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#9ba1b0', marginBottom: 6 }}>
                    Folder / Group
                  </label>
                  <input
                    type="text"
                    value={bulkGroup}
                    onChange={(e) => setBulkGroup(e.target.value)}
                    placeholder="Default"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: '#10121a',
                      border: '1px solid #282d40',
                      borderRadius: 6,
                      color: '#ffffff',
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#9ba1b0', marginBottom: 6 }}>
                    OS Platform
                  </label>
                  <select
                    value={bulkOs}
                    onChange={(e: any) => setBulkOs(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: '#10121a',
                      border: '1px solid #282d40',
                      borderRadius: 6,
                      color: '#ffffff',
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="mac">macOS</option>
                    <option value="windows">Windows</option>
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#9ba1b0', marginBottom: 6 }}>
                    Browser Engine
                  </label>
                  <select
                    value={bulkBrowser}
                    onChange={(e: any) => setBulkBrowser(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: '#10121a',
                      border: '1px solid #282d40',
                      borderRadius: 6,
                      color: '#ffffff',
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="chrome">Chrome</option>
                    <option value="brave">Brave</option>
                    <option value="edge">Edge</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#9ba1b0', marginBottom: 4 }}>
                  Proxy List (Optional, one per line):
                </label>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>
                  Formats: <code>host:port</code> or <code>host:port:user:pass</code> or <code>socks5://user:pass@host:port</code>
                </div>
                <textarea
                  rows={4}
                  value={bulkProxiesText}
                  onChange={(e) => setBulkProxiesText(e.target.value)}
                  placeholder="192.168.1.100:8080&#10;192.168.1.101:8080:username:password"
                  style={{
                    width: '100%',
                    backgroundColor: '#10121a',
                    border: '1px solid #282d40',
                    borderRadius: 6,
                    color: '#ffffff',
                    padding: 8,
                    fontSize: 12,
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid #282c3e',
                backgroundColor: '#13141c',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
              }}
            >
              <button
                onClick={() => setShowBulkCreateModal(false)}
                style={{
                  padding: '6px 14px',
                  backgroundColor: '#232635',
                  border: '1px solid #33384c',
                  borderRadius: 6,
                  color: '#9ba1b0',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkCreateSubmit}
                disabled={isBulkCreating}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 18px',
                  backgroundColor: '#3b82f6',
                  border: 'none',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {isBulkCreating ? <Loader2 size={13} className="animate-spin" /> : <Layers size={13} />}
                Generate {bulkCount} Profiles
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Software Updates Modal Popup */}
      {showUpdateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000000,
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
          onClick={() => setShowUpdateModal(false)}
        >
          <div
            style={{
              backgroundColor: '#161822',
              borderRadius: 14,
              width: 500,
              maxWidth: '92vw',
              border: '1px solid #2d3246',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #25293a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(180deg, #1b1e2c 0%, #161822 100%)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    backgroundColor: 'rgba(59, 130, 246, 0.12)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#60a5fa',
                  }}
                >
                  <RefreshCw size={17} className={checkingUpdate ? 'animate-spin' : ''} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: '#ffffff' }}>
                    Software Updates
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#8b92a2' }}>
                    Multi Agent Browser • Current v2.1.0
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUpdateModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8b92a2',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: 6,
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {checkingUpdate ? (
                <div
                  style={{
                    padding: '24px 16px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <Loader2 size={32} color="#3b82f6" className="animate-spin" />
                  <div>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#ffffff' }}>
                      Checking for updates…
                    </h4>
                    <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#8b92a2' }}>
                      Connecting to server to check for the latest release…
                    </p>
                  </div>
                </div>
              ) : updateStatus.status === 'available' ? (
                <div
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ padding: 8, borderRadius: 8, backgroundColor: 'rgba(16, 185, 129, 0.16)', color: '#34d399' }}>
                      <ArrowDownCircle size={22} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#34d399' }}>
                        New Version Available (v{updateStatus.version})
                      </h4>
                      <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.45 }}>
                        An update is available with enhanced anti-detect fingerprints and improved proxy stability.
                      </p>
                    </div>
                  </div>

                  {updateStatus.releaseNotes && (
                    <div
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        backgroundColor: '#0f1118',
                        fontSize: 11.5,
                        color: '#94a3b8',
                        maxHeight: 90,
                        overflowY: 'auto',
                      }}
                    >
                      {updateStatus.releaseNotes}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleDownloadUpdate}
                    style={{
                      padding: '9px 18px',
                      backgroundColor: '#10b981',
                      border: 'none',
                      borderRadius: 8,
                      color: '#ffffff',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    <ArrowDownCircle size={16} />
                    Download Update Now
                  </button>
                </div>
              ) : updateStatus.status === 'downloading' ? (
                <div
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Loader2 size={18} color="#60a5fa" className="animate-spin" />
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#ffffff' }}>
                        Downloading update…
                      </span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa' }}>
                      {updateStatus.percent || 0}%
                    </span>
                  </div>
                  <div style={{ height: 8, borderRadius: 9999, backgroundColor: '#0f1118', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(0, updateStatus.percent || 0))}%`,
                        height: '100%',
                        borderRadius: 9999,
                        backgroundColor: '#3b82f6',
                        boxShadow: '0 0 10px rgba(59, 130, 246, 0.6)',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
                    Please keep Multi Agent open while downloading.
                  </p>
                </div>
              ) : updateStatus.status === 'downloaded' ? (
                <div
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ padding: 8, borderRadius: 8, backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>
                      <CheckCircle size={22} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#60a5fa' }}>
                        Update Ready to Install!
                      </h4>
                      <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.45 }}>
                        Update v{updateStatus.version} is completely downloaded. Restart Multi Agent now to apply the upgrade.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleInstallUpdate}
                    style={{
                      padding: '9px 18px',
                      backgroundColor: '#3b82f6',
                      border: 'none',
                      borderRadius: 8,
                      color: '#ffffff',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)',
                    }}
                  >
                    <CheckCircle size={16} />
                    Restart & Install Update
                  </button>
                </div>
              ) : updateStatus.status === 'not-available' ? (
                <div
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  <div style={{ padding: 10, borderRadius: 10, backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#34d399', flexShrink: 0 }}>
                    <CheckCircle size={22} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: '#ffffff' }}>
                      You are up to date!
                    </h4>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: '#8b92a2', lineHeight: 1.4 }}>
                      Multi Agent v2.1.0 is the latest available version.
                    </p>
                  </div>
                </div>
              ) : updateStatus.status === 'error' ? (
                <div
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ padding: 8, borderRadius: 8, backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                      <AlertCircle size={20} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: '#f87171' }}>
                        Update Check Notice
                      </h4>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#fca5a5', lineHeight: 1.45 }}>
                        {updateStatus.message || 'Could not connect to update servers.'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  <div style={{ padding: 10, borderRadius: 10, backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', flexShrink: 0 }}>
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: '#ffffff' }}>
                      Check for Software Updates
                    </h4>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: '#8b92a2' }}>
                      Ensure you have the latest security patches and anti-fingerprint profiles.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid #232738',
                backgroundColor: '#12141c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <button
                type="button"
                onClick={handleCheckUpdate}
                disabled={checkingUpdate || updateStatus.status === 'downloading'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  backgroundColor: '#1c1f2c',
                  border: '1px solid #2c3246',
                  borderRadius: 6,
                  color: checkingUpdate ? '#6b7280' : '#cbd5e1',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: checkingUpdate ? 'not-allowed' : 'pointer',
                }}
              >
                <RefreshCw size={13} className={checkingUpdate ? 'animate-spin' : ''} />
                {checkingUpdate ? 'Checking…' : 'Check Again'}
              </button>

              <button
                type="button"
                onClick={() => setShowUpdateModal(false)}
                style={{
                  padding: '6px 16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: 6,
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Proxy Connection Test Toast Notification */}
      {typeof document !== 'undefined' && proxyToast && createPortal(
        <div
          style={{
            position: 'fixed',
            bottom: 82,
            right: 28,
            zIndex: 99999999,
            minWidth: 330,
            maxWidth: 420,
            backgroundColor: proxyToast.type === 'testing'
              ? 'rgba(11, 19, 32, 0.95)'
              : proxyToast.type === 'success'
              ? 'rgba(4, 29, 21, 0.96)'
              : 'rgba(32, 12, 15, 0.96)',
            border: `1.5px solid ${
              proxyToast.type === 'testing'
                ? '#38bdf8'
                : proxyToast.type === 'success'
                ? '#10b981'
                : '#ef4444'
            }`,
            borderRadius: 12,
            boxShadow: `0 20px 40px -6px ${
              proxyToast.type === 'testing'
                ? 'rgba(56, 189, 248, 0.35)'
                : proxyToast.type === 'success'
                ? 'rgba(16, 185, 129, 0.4)'
                : 'rgba(239, 68, 68, 0.4)'
            }`,
            padding: '13px 16px',
            color: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            gap: 9,
            backdropFilter: 'blur(16px)',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Header row: Status Icon + Title + Close Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              {proxyToast.type === 'testing' ? (
                <Loader2 size={18} className="animate-spin" color="#38bdf8" />
              ) : proxyToast.type === 'success' ? (
                <CheckCircle2 size={18} color="#34d399" />
              ) : (
                <AlertCircle size={18} color="#f87171" />
              )}
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: proxyToast.type === 'testing'
                    ? '#38bdf8'
                    : proxyToast.type === 'success'
                    ? '#34d399'
                    : '#f87171',
                }}
              >
                {proxyToast.title}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setProxyToast(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: 3,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>

          {/* Proxy IP & Details Box */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
              backgroundColor: 'rgba(0, 0, 0, 0.35)',
              borderRadius: 8,
              padding: '8px 10px',
              border: '1px solid rgba(255, 255, 255, 0.07)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <span style={{ fontSize: 13 }}>{proxyToast.countryFlag || '🌐'}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#f1f5f9', fontFamily: 'monospace' }}>
                  {proxyToast.host}:{proxyToast.port}
                </span>
              </div>
              {proxyToast.protocol && (
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '2px 6px',
                    borderRadius: 4,
                    backgroundColor: proxyToast.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                    color: proxyToast.type === 'success' ? '#6ee7b7' : '#94a3b8',
                  }}
                >
                  {proxyToast.protocol}
                </span>
              )}
            </div>

            {proxyToast.type === 'testing' && (
              <div style={{ fontSize: 11, color: '#93c5fd', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span>Testing socket handshake, ping & live exit IP...</span>
              </div>
            )}

            {proxyToast.type === 'success' && (
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 3, fontSize: 11.5 }}>
                {proxyToast.latencyMs !== undefined && (
                  <span style={{ color: '#34d399', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    ⚡ {proxyToast.latencyMs}ms {proxyToast.speedRating ? `(${proxyToast.speedRating})` : ''}
                  </span>
                )}
                {proxyToast.exitIp && (
                  <span style={{ color: '#cbd5e1' }}>
                    Exit IP: <strong style={{ color: '#f1f5f9' }}>{proxyToast.exitIp}</strong>
                  </span>
                )}
                {proxyToast.location && (
                  <span style={{ color: '#a7f3d0' }}>
                    📍 {proxyToast.location}
                  </span>
                )}
              </div>
            )}

            {proxyToast.type === 'error' && (
              <div style={{ fontSize: 11, color: '#fca5a5', marginTop: 2 }}>
                {proxyToast.error || 'Connection timed out or host unreachable'}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
