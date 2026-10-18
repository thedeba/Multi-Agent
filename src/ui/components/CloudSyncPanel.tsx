import React, { FormEvent, useEffect, useState, useRef } from 'react';
import { User, onIdTokenChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Cloud,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  RefreshCw,
  Settings,
  ShieldCheck,
  UserRound,
  X,
  Sliders,
  Globe,
  Shield,
  HardDrive,
  Download,
  Upload,
  Zap,
} from 'lucide-react';
import { getFirebaseServices, isFirebaseConfigured } from '../services/firebase';
import { getSignInErrorMessage } from '../services/auth-error-message';
import {
  deleteLegacyCloudCookies,
  deleteProfileFromCloud,
  saveProfileToCloud,
  syncProfilesFromCloud,
} from '../services/cloud-profile-sync';
import appLogo from '../icon.svg';

export interface AppSettings {
  // General & Launch
  launchMode: 'multi-window' | 'single-window';
  confirmCloseProfile: boolean;
  confirmDeleteProfile: boolean;
  autoCheckUpdates: boolean;
  defaultBrowserEngine: 'chrome' | 'edge' | 'brave';
  defaultOs: 'mac' | 'windows';

  // Network & Proxy
  defaultProxyMode: 'socks5' | 'http' | 'direct';
  autoTestProxyOnLaunch: boolean;
  proxyTimeoutSeconds: number;
  globalWebrtcPolicy: 'default_public_interface_only' | 'disable_non_proxied_udp' | 'disable_webrtc';
  forceSecureDns: boolean;

  // Privacy & Anti-Detect
  defaultPrivacyLevel: 'balanced' | 'strict' | 'standard';
  canvasNoise: boolean;
  webglNoise: boolean;
  audioNoise: boolean;
  spoofHardware: boolean;
  sendDntHeader: boolean;
  autoClearTempProfiles: boolean;

  // Cloud & Sync
  autoSyncEdits: boolean;
  syncProfileDataToCloud: boolean;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  launchMode: 'multi-window',
  confirmCloseProfile: true,
  confirmDeleteProfile: true,
  autoCheckUpdates: true,
  defaultBrowserEngine: 'chrome',
  defaultOs: 'mac',

  defaultProxyMode: 'socks5',
  autoTestProxyOnLaunch: true,
  proxyTimeoutSeconds: 10,
  globalWebrtcPolicy: 'default_public_interface_only',
  forceSecureDns: true,

  defaultPrivacyLevel: 'balanced',
  canvasNoise: true,
  webglNoise: true,
  audioNoise: true,
  spoofHardware: true,
  sendDntHeader: true,
  autoClearTempProfiles: true,

  autoSyncEdits: true,
  syncProfileDataToCloud: true,
};

export function getStoredAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem('multiagent_app_settings');
    if (raw) {
      return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_APP_SETTINGS;
}

interface CloudSyncPanelProps {
  onProfilesUpdated: () => void | Promise<void>;
  onAuthStateChanged: (state: 'checking' | 'syncing' | 'signedOut' | 'ready' | 'error') => void;
  required?: boolean;
  profiles?: any[];
}

export const CloudSyncPanel: React.FC<CloudSyncPanelProps> = ({
  onProfilesUpdated,
  onAuthStateChanged,
  required = false,
  profiles = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'general' | 'network' | 'privacy' | 'storage' | 'account'>('general');
  const [appSettings, setAppSettings] = useState<AppSettings>(() => getStoredAppSettings());
  const [saveNotice, setSaveNotice] = useState('');
  const [cacheCleaning, setCacheCleaning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [syncPassphrase, setSyncPassphrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [authResolved, setAuthResolved] = useState(false);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setAppSettings((prev) => {
      const updated = { ...prev, [key]: value };
      try {
        localStorage.setItem('multiagent_app_settings', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setSaveNotice('Settings saved');
    setTimeout(() => setSaveNotice(''), 2000);
  };

  const handleExportProfiles = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(profiles, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `multiagent-profiles-backup-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setSaveNotice('Backup exported');
      setTimeout(() => setSaveNotice(''), 2500);
    } catch (e: any) {
      alert(`Export error: ${e.message}`);
    }
  };

  const handleImportProfilesFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const imported = JSON.parse(text);
        if (Array.isArray(imported)) {
          for (const item of imported) {
            await (window.browserAPI as any).createProfile(item);
          }
          await onProfilesUpdated();
          setSaveNotice(`${imported.length} profiles imported!`);
          setTimeout(() => setSaveNotice(''), 2500);
        } else {
          alert('Invalid backup file. JSON must contain an array of profiles.');
        }
      } catch (err: any) {
        alert(`Failed to import profiles: ${err.message}`);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleClearCache = async () => {
    setCacheCleaning(true);
    try {
      if (window.browserAPI && (window.browserAPI as any).clearAllCookies) {
        await (window.browserAPI as any).clearAllCookies();
      }
      setSaveNotice('Cache & cookies purged!');
      setTimeout(() => setSaveNotice(''), 2500);
    } catch (err: any) {
      alert(`Failed to clear cache: ${err.message}`);
    } finally {
      setCacheCleaning(false);
    }
  };

  const handleResetSettings = () => {
    if (confirm('Reset all app preferences to default settings?')) {
      setAppSettings(DEFAULT_APP_SETTINGS);
      localStorage.setItem('multiagent_app_settings', JSON.stringify(DEFAULT_APP_SETTINGS));
      setSaveNotice('Settings reset to defaults');
      setTimeout(() => setSaveNotice(''), 2500);
    }
  };

  useEffect(() => {
    onAuthStateChanged('checking');
    if (!isFirebaseConfigured) {
      setAuthResolved(true);
      setError('Cloud sync is not configured. Add the Firebase web app settings to .env.local and rebuild.');
      onAuthStateChanged('error');
      return;
    }

    let isResolved = false;

    // Fast-fallback timer: If Firebase auth takes longer than 1.8s (e.g. cold start / network lag),
    // immediately show the login screen so user is never stuck waiting 20+ seconds!
    const fallbackTimer = setTimeout(() => {
      if (!isResolved) {
        console.warn('Firebase auth resolution deferred, displaying login screen');
        setAuthResolved(true);
        onAuthStateChanged('signedOut');
      }
    }, 1800);

    try {
      const { auth } = getFirebaseServices();
      const unsubscribe = onIdTokenChanged(auth, async (account) => {
        isResolved = true;
        clearTimeout(fallbackTimer);
        setAuthResolved(true);
        setUser(account);
        setIsSubmittingAuth(false);

        if (account) {
          setBusy(true);
          setError('');
          onAuthStateChanged('syncing');

          // Cloud sync wrapped in a 3.5s timeout: if Google Firestore takes too long,
          // load local profiles immediately and continue in background
          const performSync = async () => {
            const idToken = await account.getIdToken();
            await window.browserAPI.setAuthenticatedUser({
              idToken,
              apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
            });

            const cloudSyncPromise = syncProfilesFromCloud(account);
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Cloud sync timeout; loading local profiles')), 3500)
            );
            await Promise.race([cloudSyncPromise, timeoutPromise]);
          };

          performSync()
            .then(async () => {
              setStatus('Profile list synced. Set a sync passphrase to sync browser data.');
              await onProfilesUpdated();
              onAuthStateChanged('ready');
            })
            .catch(async (syncError: unknown) => {
              const authErrorMessage = syncError instanceof Error ? syncError.message : String(syncError);
              console.warn('Profile cloud sync bypassed or delayed:', authErrorMessage);
              // Do NOT de-authenticate or clear authenticated user on sync failure!
              // The user is authenticated; load local profiles and let them work immediately.
              try {
                await onProfilesUpdated();
              } catch (profileErr) {
                console.error('Failed to load local profiles:', profileErr);
              }
              setStatus('Ready (cloud sync pending)');
              onAuthStateChanged('ready');
            })
            .finally(() => setBusy(false));
        } else {
          try {
            await window.browserAPI.setAuthenticatedUser(null);
            onAuthStateChanged('signedOut');
          } catch (authError) {
            setError(authError instanceof Error ? authError.message : String(authError));
            onAuthStateChanged('error');
          }
          setStatus('');
        }
      }, (authError) => {
        isResolved = true;
        clearTimeout(fallbackTimer);
        setError(authError.message);
        setAuthResolved(true);
        onAuthStateChanged('error');
      });

      return () => {
        clearTimeout(fallbackTimer);
        unsubscribe();
      };
    } catch (configError) {
      clearTimeout(fallbackTimer);
      setError(configError instanceof Error ? configError.message : String(configError));
      setAuthResolved(true);
      onAuthStateChanged('error');
    }
  }, [onAuthStateChanged, onProfilesUpdated]);

  useEffect(() => {
    if (!user) return;
    const unsubProfile = window.browserAPI.onProfileSyncChanged((change) => {
      setBusy(true);
      setError('');
      const operation = (async () => {
        if (change.type === 'delete') {
          await deleteProfileFromCloud(user, change.profileId);
          return;
        }

        const currentProfiles = await window.browserAPI.listProfiles();
        const profile = currentProfiles.find((item) => item.id === change.profileId);
        if (!profile) return;
        await saveProfileToCloud(user, profile, syncPassphrase || undefined);

        if (syncPassphrase && appSettings.syncProfileDataToCloud) {
          const runningProfiles = await window.browserAPI.getRunningProfiles();
          if (!runningProfiles.includes(profile.id)) {
            const idToken = await user.getIdToken();
            await window.browserAPI.syncCloudProfileArchive(profile.id, {
              idToken,
              apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
              passphrase: syncPassphrase,
              bucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
            });
            await deleteLegacyCloudCookies(user, profile.id);
          }
        }
      })();

      operation
        .then(() => setStatus('Profiles synced'))
        .catch((syncError: unknown) => setError(syncError instanceof Error ? syncError.message : String(syncError)))
        .finally(() => setBusy(false));
    });

    const unsubSessionExited = window.browserAPI.onProfileSessionExited?.((sessionExit) => {
      if (!appSettings.syncProfileDataToCloud) return;
      if (!syncPassphrase) {
        setStatus('Profile closed locally. Enter the sync passphrase to encrypt and back it up.');
        return;
      }
      setBusy(true);
      setError('');
      user.getIdToken()
        .then((idToken) => window.browserAPI.uploadCloudProfileArchive(sessionExit.profileId, {
          idToken,
          apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
          passphrase: syncPassphrase,
          bucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        }))
        .then(() => deleteLegacyCloudCookies(user, sessionExit.profileId))
        .then(() => setStatus('Encrypted browser profile snapshot saved'))
        .catch((syncError: unknown) => {
          setError(syncError instanceof Error ? syncError.message : String(syncError));
        })
        .finally(() => setBusy(false));
    });

    return () => {
      unsubProfile?.();
      unsubSessionExited?.();
    };
  }, [user, syncPassphrase, appSettings.syncProfileDataToCloud]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isFirebaseConfigured) return;
    setBusy(true);
    setIsSubmittingAuth(true);
    setError('');
    onAuthStateChanged('checking');
    try {
      const { auth } = getFirebaseServices();
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setPassword('');
    } catch (authError) {
      setIsSubmittingAuth(false);
      onAuthStateChanged('signedOut');
      setError(getSignInErrorMessage(authError));
    } finally {
      setBusy(false);
    }
  };

  const handleSync = async () => {
    if (!user) return;
    setBusy(true);
    setError('');
    try {
      if (
        appSettings.syncProfileDataToCloud &&
        syncPassphrase.length > 0 &&
        (syncPassphrase.length < 12 || syncPassphrase.length > 1024)
      ) {
        throw new Error('The sync passphrase must be between 12 and 1024 characters.');
      }
      const idToken = await user.getIdToken();
      await window.browserAPI.setAuthenticatedUser({
        idToken,
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      });
      await syncProfilesFromCloud(user, syncPassphrase || undefined);
      await onProfilesUpdated();
      onAuthStateChanged('ready');
      setStatus(syncPassphrase
        ? 'Profiles and encrypted browser data synced'
        : 'Profile list synced. Enter a sync passphrase to sync browser data.');
    } catch (syncError) {
      const syncErrorMessage = syncError instanceof Error ? syncError.message : String(syncError);
      setError(syncErrorMessage);
      try {
        await onProfilesUpdated();
      } catch {}
      onAuthStateChanged('ready');
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    if (!user) return;
    setIsOpen(false);
    setBusy(true);
    setError('');
    onAuthStateChanged('checking');
    try {
      const { auth } = getFirebaseServices();
      await window.browserAPI.setAuthenticatedUser(null);
      await signOut(auth);
      setSyncPassphrase('');
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : String(authError));
      onAuthStateChanged('error');
    } finally {
      setBusy(false);
    }
  };

  const blockingSignIn = required && !user && !isSubmittingAuth;
  const blockingSync = required && Boolean(user) && Boolean(error);
  const showBlockingDialog = required && authResolved && (blockingSignIn || blockingSync);
  const showSettingsDialog = !required && Boolean(user) && isOpen;
  const showDialog = showBlockingDialog || showSettingsDialog;
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showBlockingDialog && blockingSignIn) {
      const timer = setTimeout(() => {
        if (emailInputRef.current) {
          emailInputRef.current.focus();
          emailInputRef.current.select();
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [showBlockingDialog, blockingSignIn]);

  useEffect(() => {
    if (required) {
      setIsOpen(false);
      return;
    }
    if (!showSettingsDialog) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [required, showSettingsDialog]);

  return (
    <>
      {!required && (
        <button
          type="button"
          className="settings-trigger"
          aria-label="Open settings"
          title="Settings"
          onClick={() => {
            setSettingsTab('general');
            setIsOpen(true);
          }}
        >
          <Settings size={14} />
          Settings
        </button>
      )}
      {showDialog && (
        <div
          className={`settings-overlay${showBlockingDialog ? ' settings-overlay--blocking' : ''}`}
          onClick={() => {
            if (showSettingsDialog) setIsOpen(false);
          }}
        >
          <section
            className={`settings-dialog${blockingSignIn ? ' login-dialog' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cloud-sync-title"
            onClick={(event) => event.stopPropagation()}
          >
            {blockingSignIn ? (
              <div className="login-screen">
                <aside className="login-brand-panel" aria-label="Multi Agent">
                  <div className="login-brand">
                    <span className="login-brand-mark"><img src={appLogo} alt="" /></span>
                    <span>Multi Agent</span>
                  </div>
                  <div className="login-brand-message">
                    <span className="login-kicker">YOUR PRIVATE WORKSPACE</span>
                    <h1>A fresh start for every profile.</h1>
                    <p>Sign in to keep your browser profiles organized and in sync with your account.</p>
                  </div>
                  <div className="login-brand-footnote">
                    <ShieldCheck size={17} />
                    <span>Your profiles are kept separate by account.</span>
                  </div>
                  <div className="login-orbit login-orbit--outer" aria-hidden="true" />
                  <div className="login-orbit login-orbit--inner" aria-hidden="true" />
                </aside>

                <div className="login-form-panel">
                  <div className="login-mobile-brand">
                    <img src={appLogo} alt="" />
                    <span>Multi Agent</span>
                  </div>
                  <div className="login-heading">
                    <span className="login-kicker">ACCOUNT ACCESS</span>
                    <h2 id="cloud-sync-title">Welcome back</h2>
                    <p>Sign in with the account provided by your administrator.</p>
                  </div>
                  {!isFirebaseConfigured && (
                    <div className="settings-notice settings-notice--error" role="alert">
                      <AlertTriangle size={17} />
                      <p>Cloud sync is not configured. Add the Firebase web app settings to <code>.env.local</code> and rebuild.</p>
                    </div>
                  )}
                  <form onSubmit={handleSubmit} className="settings-auth-form login-auth-form">
                    <label htmlFor="settings-email">Email address</label>
                    <div className="login-input-wrap">
                      <Mail size={17} aria-hidden="true" />
                      <input
                        ref={emailInputRef}
                        id="settings-email"
                        autoComplete="email"
                        type="email"
                        autoFocus
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="name@example.com"
                      />
                    </div>
                    <label htmlFor="settings-password">Password</label>
                    <div className="login-input-wrap">
                      <LockKeyhole size={17} aria-hidden="true" />
                      <input
                        id="settings-password"
                        autoComplete="current-password"
                        type="password"
                        minLength={6}
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Enter your password"
                      />
                    </div>
                    <button type="submit" disabled={busy || !isFirebaseConfigured} className="settings-button settings-button--primary settings-submit login-submit">
                      {busy ? <LoaderCircle size={17} className="spin" /> : <>Sign in <ArrowRight size={17} /></>}
                    </button>
                  </form>
                  {error && <div className="settings-notice settings-notice--error" role="alert"><AlertTriangle size={17} /><p>{error}</p></div>}
                  <p className="login-security-note"><ShieldCheck size={15} /> Secure sign-in. Your password is never stored in your profiles.</p>
                </div>
              </div>
            ) : blockingSync ? (
              <div className="login-screen">
                <aside className="login-brand-panel" aria-label="Multi Agent">
                  <div className="login-brand">
                    <span className="login-brand-mark"><img src={appLogo} alt="" /></span>
                    <span>Multi Agent</span>
                  </div>
                  <div className="login-brand-message">
                    <span className="login-kicker">ACCOUNT CONNECTED</span>
                    <h1>One moment. We’re getting your workspace ready.</h1>
                    <p>Your account is signed in, but its cloud profiles could not be loaded yet.</p>
                  </div>
                  <div className="login-brand-footnote">
                    <ShieldCheck size={17} />
                    <span>Your profiles remain separated by account.</span>
                  </div>
                  <div className="login-orbit login-orbit--outer" aria-hidden="true" />
                  <div className="login-orbit login-orbit--inner" aria-hidden="true" />
                </aside>
                <div className="login-form-panel login-recovery-panel">
                  <div className="login-mobile-brand">
                    <img src={appLogo} alt="" />
                    <span>Multi Agent</span>
                  </div>
                  <div className="login-heading">
                    <span className="login-kicker">PROFILE SYNC</span>
                    <h2 id="cloud-sync-title">Couldn’t load dashboard</h2>
                    <p>Signed in as <strong>{user?.email || 'your account'}</strong>. We need to sync your cloud profiles before opening the dashboard.</p>
                  </div>
                  {error && <div className="settings-notice settings-notice--error" role="alert"><AlertTriangle size={17} /><p>{error}</p></div>}
                  <div className="login-recovery-actions">
                    <button type="button" className="settings-button settings-button--primary" disabled={busy} onClick={handleSync}>
                      {busy ? <LoaderCircle size={16} className="spin" /> : <RefreshCw size={16} />}
                      Retry profile sync
                    </button>
                    <button type="button" className="settings-button settings-button--danger" disabled={busy} onClick={handleSignOut}>
                      <LogOut size={16} /> Log out
                    </button>
                  </div>
                  <p className="login-security-note"><ShieldCheck size={15} /> The dashboard opens only after account profiles finish loading.</p>
                </div>
              </div>
            ) : (
              <>
                <header className="settings-header">
                  <div className="settings-heading">
                    <span className="settings-heading-icon"><Settings size={18} /></span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <p className="settings-eyebrow" style={{ margin: 0 }}>MULTI AGENT</p>
                        {saveNotice && (
                          <span className="settings-saved-pill">
                            <Check size={11} /> {saveNotice}
                          </span>
                        )}
                      </div>
                      <h2 id="cloud-sync-title">
                        {required
                          ? 'Profile cloud sync'
                          : settingsTab === 'account'
                          ? 'Account & Sync'
                          : settingsTab === 'general'
                          ? 'General Preferences'
                          : settingsTab === 'network'
                          ? 'Network & Proxy'
                          : settingsTab === 'privacy'
                          ? 'Stealth & Privacy'
                          : 'Data & Maintenance'}
                      </h2>
                      <p className="settings-subtitle">
                        {required
                          ? 'Manage your account and profile sync'
                          : settingsTab === 'account'
                          ? 'Manage cloud account authorization and synchronization'
                          : settingsTab === 'general'
                          ? 'Configure window behavior, browser engines and defaults'
                          : settingsTab === 'network'
                          ? 'Global proxy protocols, WebRTC leak defense and timeouts'
                          : settingsTab === 'privacy'
                          ? 'Hardware spoofing, Canvas noise and stealth shields'
                          : 'Profile backup, restore and local storage cleanup'}
                      </p>
                    </div>
                  </div>
                  {!required && (
                    <button type="button" className="settings-close" aria-label="Close settings" onClick={() => setIsOpen(false)}>
                      <X size={18} />
                    </button>
                  )}
                </header>

                <div className="settings-layout">
                  <nav className="settings-nav" aria-label="Settings sections">
                    <p className="settings-nav-label">PREFERENCES</p>
                    {!required && (
                      <>
                        <button
                          type="button"
                          className={`settings-nav-item${settingsTab === 'general' ? ' active' : ''}`}
                          onClick={() => setSettingsTab('general')}
                        >
                          <Sliders size={16} />
                          <span>General &amp; launch</span>
                        </button>
                        <button
                          type="button"
                          className={`settings-nav-item${settingsTab === 'network' ? ' active' : ''}`}
                          onClick={() => setSettingsTab('network')}
                        >
                          <Globe size={16} />
                          <span>Network &amp; proxy</span>
                        </button>
                        <button
                          type="button"
                          className={`settings-nav-item${settingsTab === 'privacy' ? ' active' : ''}`}
                          onClick={() => setSettingsTab('privacy')}
                        >
                          <Shield size={16} />
                          <span>Stealth &amp; privacy</span>
                        </button>
                        <button
                          type="button"
                          className={`settings-nav-item${settingsTab === 'storage' ? ' active' : ''}`}
                          onClick={() => setSettingsTab('storage')}
                        >
                          <HardDrive size={16} />
                          <span>Data &amp; storage</span>
                        </button>
                        <p className="settings-nav-label" style={{ marginTop: 14 }}>ACCOUNT</p>
                      </>
                    )}
                    <button
                      type="button"
                      className={`settings-nav-item${settingsTab === 'account' ? ' active' : ''}`}
                      onClick={() => setSettingsTab('account')}
                    >
                      <UserRound size={16} />
                      <span>Account &amp; sync</span>
                    </button>
                  </nav>

                  <div className="settings-content">
                    {/* TAB 1: GENERAL & LAUNCH */}
                    {settingsTab === 'general' && (
                      <div>
                        <div className="settings-section-heading">
                          <div>
                            <h3>General &amp; Launch</h3>
                            <p>Customize startup behaviors, browser engine and confirmation prompts</p>
                          </div>
                          <Sliders size={19} />
                        </div>

                        <div className="settings-card">
                          <div className="settings-card-title">
                            <Zap size={14} /> Launch Behavior
                          </div>
                          <div className="settings-row">
                            <div className="settings-row-info">
                              <span className="settings-row-label">Window Launch Mode</span>
                              <span className="settings-row-desc">Choose how isolated profile instances are displayed on your desktop</span>
                            </div>
                            <select
                              className="settings-select"
                              value={appSettings.launchMode}
                              onChange={(e) => updateSetting('launchMode', e.target.value as any)}
                            >
                              <option value="multi-window">Multi-Window (Separate Instances)</option>
                              <option value="single-window">Single Focused Window</option>
                            </select>
                          </div>
                          <div className="settings-row">
                            <div className="settings-row-info">
                              <span className="settings-row-label">Confirm Profile Close</span>
                              <span className="settings-row-desc">Show confirmation dialog before stopping an active browser profile</span>
                            </div>
                            <label className="settings-switch">
                              <input
                                type="checkbox"
                                checked={appSettings.confirmCloseProfile}
                                onChange={(e) => updateSetting('confirmCloseProfile', e.target.checked)}
                              />
                              <span className="settings-slider" />
                            </label>
                          </div>
                          <div className="settings-row">
                            <div className="settings-row-info">
                              <span className="settings-row-label">Confirm Profile Deletion</span>
                              <span className="settings-row-desc">Require confirmation before permanently deleting a profile and its cookies</span>
                            </div>
                            <label className="settings-switch">
                              <input
                                type="checkbox"
                                checked={appSettings.confirmDeleteProfile}
                                onChange={(e) => updateSetting('confirmDeleteProfile', e.target.checked)}
                              />
                              <span className="settings-slider" />
                            </label>
                          </div>
                        </div>

                        <div className="settings-card">
                          <div className="settings-card-title">
                            <Sliders size={14} /> Default Template For New Profiles
                          </div>
                          <div className="settings-row">
                            <div className="settings-row-info">
                              <span className="settings-row-label">Default Chromium Engine</span>
                              <span className="settings-row-desc">Browser flavor assigned to newly initialized profiles</span>
                            </div>
                            <select
                              className="settings-select"
                              value={appSettings.defaultBrowserEngine}
                              onChange={(e) => updateSetting('defaultBrowserEngine', e.target.value as any)}
                            >
                              <option value="chrome">Chrome 150 (Recommended)</option>
                              <option value="edge">Edge 131</option>
                              <option value="brave">Brave 1.73</option>
                            </select>
                          </div>
                          <div className="settings-row">
                            <div className="settings-row-info">
                              <span className="settings-row-label">Default Operating System Fingerprint</span>
                              <span className="settings-row-desc">OS platform simulated for new browser partitions</span>
                            </div>
                            <select
                              className="settings-select"
                              value={appSettings.defaultOs}
                              onChange={(e) => updateSetting('defaultOs', e.target.value as any)}
                            >
                              <option value="mac">macOS (Apple Silicon / Intel)</option>
                              <option value="windows">Windows 11 (NT 10.0)</option>
                            </select>
                          </div>
                          <div className="settings-row">
                            <div className="settings-row-info">
                              <span className="settings-row-label">Auto-Check for Software Updates</span>
                              <span className="settings-row-desc">Automatically check for new browser releases and security patches</span>
                            </div>
                            <label className="settings-switch">
                              <input
                                type="checkbox"
                                checked={appSettings.autoCheckUpdates}
                                onChange={(e) => updateSetting('autoCheckUpdates', e.target.checked)}
                              />
                              <span className="settings-slider" />
                            </label>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 3: NETWORK & PROXY */}
                    {settingsTab === 'network' && (
                      <div>
                        <div className="settings-section-heading">
                          <div>
                            <h3>Network &amp; Proxy</h3>
                            <p>Configure global proxy protocols, timeout thresholds and WebRTC leak defense</p>
                          </div>
                          <Globe size={19} />
                        </div>

                        <div className="settings-card">
                          <div className="settings-card-title">
                            <Globe size={14} /> Proxy Configuration Defaults
                          </div>
                          <div className="settings-row">
                            <div className="settings-row-info">
                              <span className="settings-row-label">Default Proxy Protocol</span>
                              <span className="settings-row-desc">Preferred protocol preset when creating or pasting new proxy endpoints</span>
                            </div>
                            <select
                              className="settings-select"
                              value={appSettings.defaultProxyMode}
                              onChange={(e) => updateSetting('defaultProxyMode', e.target.value as any)}
                            >
                              <option value="socks5">SOCKS5 (Highest Anonymity)</option>
                              <option value="http">HTTP / HTTPS</option>
                              <option value="direct">Direct Connection</option>
                            </select>
                          </div>
                          <div className="settings-row">
                            <div className="settings-row-info">
                              <span className="settings-row-label">Auto-Test Proxy Before Launch</span>
                              <span className="settings-row-desc">Test proxy latency and socket handshake automatically when starting a profile</span>
                            </div>
                            <label className="settings-switch">
                              <input
                                type="checkbox"
                                checked={appSettings.autoTestProxyOnLaunch}
                                onChange={(e) => updateSetting('autoTestProxyOnLaunch', e.target.checked)}
                              />
                              <span className="settings-slider" />
                            </label>
                          </div>
                          <div className="settings-row">
                            <div className="settings-row-info">
                              <span className="settings-row-label">Connection Health Timeout</span>
                              <span className="settings-row-desc">Maximum wait time before a proxy connection is flagged as slow or unresponsive</span>
                            </div>
                            <select
                              className="settings-select"
                              value={appSettings.proxyTimeoutSeconds}
                              onChange={(e) => updateSetting('proxyTimeoutSeconds', Number(e.target.value))}
                            >
                              <option value={5}>5 Seconds (Strict / Fast)</option>
                              <option value={10}>10 Seconds (Standard / Recommended)</option>
                              <option value={15}>15 Seconds (Tolerant)</option>
                              <option value={30}>30 Seconds (High Latency Proxies)</option>
                            </select>
                          </div>
                        </div>

                        <div className="settings-card">
                          <div className="settings-card-title">
                            <Shield size={14} /> IP &amp; Leak Protection
                          </div>
                          <div className="settings-row">
                            <div className="settings-row-info">
                              <span className="settings-row-label">Global WebRTC Policy</span>
                              <span className="settings-row-desc">Prevent real external IP addresses from leaking through WebRTC STUN/TURN requests</span>
                            </div>
                            <select
                              className="settings-select"
                              value={appSettings.globalWebrtcPolicy}
                              onChange={(e) => updateSetting('globalWebrtcPolicy', e.target.value as any)}
                            >
                              <option value="default_public_interface_only">Default Public Interface Only (Recommended)</option>
                              <option value="disable_non_proxied_udp">Disable Non-Proxied UDP</option>
                              <option value="disable_webrtc">Disable WebRTC Completely (--disable-webrtc)</option>
                            </select>
                          </div>
                          <div className="settings-row">
                            <div className="settings-row-info">
                              <span className="settings-row-label">Force Encrypted DNS (DoH)</span>
                              <span className="settings-row-desc">Route all domain queries through encrypted DNS over HTTPS to prevent ISP snooping</span>
                            </div>
                            <label className="settings-switch">
                              <input
                                type="checkbox"
                                checked={appSettings.forceSecureDns}
                                onChange={(e) => updateSetting('forceSecureDns', e.target.checked)}
                              />
                              <span className="settings-slider" />
                            </label>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 4: STEALTH & PRIVACY */}
                    {settingsTab === 'privacy' && (
                      <div>
                        <div className="settings-section-heading">
                          <div>
                            <h3>Stealth &amp; Privacy</h3>
                            <p>Fine-tune hardware spoofing, Canvas/WebGL noise and fingerprint defense</p>
                          </div>
                          <Shield size={19} />
                        </div>

                        <div className="settings-card">
                          <div className="settings-card-title">
                            <Shield size={14} /> Fingerprint Randomization
                          </div>
                          <div className="settings-row">
                            <div className="settings-row-info">
                              <span className="settings-row-label">Default Privacy Level</span>
                              <span className="settings-row-desc">Preset security strength for new browser partitions</span>
                            </div>
                            <select
                              className="settings-select"
                              value={appSettings.defaultPrivacyLevel}
                              onChange={(e) => updateSetting('defaultPrivacyLevel', e.target.value as any)}
                            >
                              <option value="balanced">Balanced (Stealth &amp; High Compatibility)</option>
                              <option value="strict">Strict (Maximum Fingerprint Defense)</option>
                              <option value="standard">Standard (Standard Browser Headers)</option>
                            </select>
                          </div>
                          <div className="settings-row">
                            <div className="settings-row-info">
                              <span className="settings-row-label">Canvas Noise Injection</span>
                              <span className="settings-row-desc">Add imperceptible subpixel noise to HTML5 Canvas readbacks to foil canvas fingerprinting</span>
                            </div>
                            <label className="settings-switch">
                              <input
                                type="checkbox"
                                checked={appSettings.canvasNoise}
                                onChange={(e) => updateSetting('canvasNoise', e.target.checked)}
                              />
                              <span className="settings-slider" />
                            </label>
                          </div>
                          <div className="settings-row">
                            <div className="settings-row-info">
                              <span className="settings-row-label">WebGL Vendor &amp; Renderer Spoofing</span>
                              <span className="settings-row-desc">Mask real graphics card signature with authentic high-reputation GPUs (Apple M-Series / Nvidia RTX)</span>
                            </div>
                            <label className="settings-switch">
                              <input
                                type="checkbox"
                                checked={appSettings.webglNoise}
                                onChange={(e) => updateSetting('webglNoise', e.target.checked)}
                              />
                              <span className="settings-slider" />
                            </label>
                          </div>
                          <div className="settings-row">
                            <div className="settings-row-info">
                              <span className="settings-row-label">AudioContext Frequency Shield</span>
                              <span className="settings-row-desc">Neutralize audio buffer hash tracking by injecting micro-fluctuations into Web Audio API</span>
                            </div>
                            <label className="settings-switch">
                              <input
                                type="checkbox"
                                checked={appSettings.audioNoise}
                                onChange={(e) => updateSetting('audioNoise', e.target.checked)}
                              />
                              <span className="settings-slider" />
                            </label>
                          </div>
                        </div>

                        <div className="settings-card">
                          <div className="settings-card-title">
                            <Sliders size={14} /> Hardware &amp; Tracking Headers
                          </div>
                          <div className="settings-row">
                            <div className="settings-row-info">
                              <span className="settings-row-label">Spoof Hardware Concurrency &amp; Memory</span>
                              <span className="settings-row-desc">Simulate realistic CPU core counts (8/16 cores) and RAM (8GB/16GB)</span>
                            </div>
                            <label className="settings-switch">
                              <input
                                type="checkbox"
                                checked={appSettings.spoofHardware}
                                onChange={(e) => updateSetting('spoofHardware', e.target.checked)}
                              />
                              <span className="settings-slider" />
                            </label>
                          </div>
                          <div className="settings-row">
                            <div className="settings-row-info">
                              <span className="settings-row-label">Send DNT &amp; Global Privacy Control (GPC)</span>
                              <span className="settings-row-desc">Transmit `Sec-GPC: 1` and `DNT: 1` headers to instruct ad networks not to track</span>
                            </div>
                            <label className="settings-switch">
                              <input
                                type="checkbox"
                                checked={appSettings.sendDntHeader}
                                onChange={(e) => updateSetting('sendDntHeader', e.target.checked)}
                              />
                              <span className="settings-slider" />
                            </label>
                          </div>
                          <div className="settings-row">
                            <div className="settings-row-info">
                              <span className="settings-row-label">Auto-Purge Temporary Profiles on Exit</span>
                              <span className="settings-row-desc">Immediately delete disposable sandbox profile partitions when their browser window closes</span>
                            </div>
                            <label className="settings-switch">
                              <input
                                type="checkbox"
                                checked={appSettings.autoClearTempProfiles}
                                onChange={(e) => updateSetting('autoClearTempProfiles', e.target.checked)}
                              />
                              <span className="settings-slider" />
                            </label>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 5: DATA & STORAGE */}
                    {settingsTab === 'storage' && (
                      <div>
                        <div className="settings-section-heading">
                          <div>
                            <h3>Data &amp; Maintenance</h3>
                            <p>Export profile backups, import saved profiles and purge local caches</p>
                          </div>
                          <HardDrive size={19} />
                        </div>

                        <div className="settings-card">
                          <div className="settings-card-title">
                            <Download size={14} /> Backup &amp; Migration
                          </div>
                          <div className="settings-row">
                            <div className="settings-row-info">
                              <span className="settings-row-label">Export All Profiles</span>
                              <span className="settings-row-desc">Save a portable JSON backup of your profiles, proxies, tags, and settings</span>
                            </div>
                            <button
                              type="button"
                              onClick={handleExportProfiles}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '7px 14px',
                                backgroundColor: '#1e2433',
                                border: '1px solid #363d54',
                                borderRadius: 7,
                                color: '#60a5fa',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <Download size={14} /> Export Backup
                            </button>
                          </div>
                          <div className="settings-row">
                            <div className="settings-row-info">
                              <span className="settings-row-label">Import Profiles from File</span>
                              <span className="settings-row-desc">Restore or batch import profiles from a previously saved JSON backup</span>
                            </div>
                            <div>
                              <input
                                type="file"
                                ref={fileInputRef}
                                accept=".json"
                                style={{ display: 'none' }}
                                onChange={handleImportProfilesFile}
                              />
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '7px 14px',
                                  backgroundColor: '#1e2433',
                                  border: '1px solid #363d54',
                                  borderRadius: 7,
                                  color: '#34d399',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                <Upload size={14} /> Import File
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="settings-card">
                          <div className="settings-card-title">
                            <HardDrive size={14} /> Cache &amp; Reset
                          </div>
                          <div className="settings-row">
                            <div className="settings-row-info">
                              <span className="settings-row-label">Purge Local Browser Cache</span>
                              <span className="settings-row-desc">Clear shared temporary disk files, DNS cache and transient web session data</span>
                            </div>
                            <button
                              type="button"
                              disabled={cacheCleaning}
                              onClick={handleClearCache}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '7px 14px',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                borderRadius: 7,
                                color: '#f87171',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: cacheCleaning ? 'not-allowed' : 'pointer',
                              }}
                            >
                              {cacheCleaning ? <LoaderCircle size={14} className="spin" /> : <RefreshCw size={14} />}
                              Purge Cache
                            </button>
                          </div>
                          <div className="settings-row">
                            <div className="settings-row-info">
                              <span className="settings-row-label">Reset Preferences to Default</span>
                              <span className="settings-row-desc">Restore all Multi Agent general, network and privacy settings to factory presets</span>
                            </div>
                            <button
                              type="button"
                              onClick={handleResetSettings}
                              style={{
                                padding: '7px 14px',
                                backgroundColor: 'transparent',
                                border: '1px solid #3e445a',
                                borderRadius: 7,
                                color: '#9ba3b2',
                                fontSize: 12,
                                fontWeight: 500,
                                cursor: 'pointer',
                              }}
                            >
                              Reset Defaults
                            </button>
                          </div>
                        </div>

                        <div
                          style={{
                            padding: '12px 16px',
                            borderRadius: 10,
                            backgroundColor: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: 11.5,
                            color: '#8b92a2',
                          }}
                        >
                          <span>Multi Agent Desktop Browser • v2.1.0</span>
                          <span>Chromium Core 131.0.6778.86 • Protected</span>
                        </div>
                      </div>
                    )}

                    {/* TAB 5: ACCOUNT & CLOUD SYNC (AT THE VERY BOTTOM) */}
                    {settingsTab === 'account' && (
                      <div>
                        <div className="settings-section-heading">
                          <div>
                            <h3>Account &amp; Cloud Sync</h3>
                            <p>Authentication and real-time profile synchronization</p>
                          </div>
                          <Cloud size={19} />
                        </div>

                        {!isFirebaseConfigured ? (
                          <div className="settings-notice settings-notice--error" role="alert">
                            <AlertTriangle size={17} />
                            <p>Cloud sync is not configured. Add the Firebase web app settings to <code>.env.local</code> and rebuild.</p>
                          </div>
                        ) : blockingSync ? (
                          <div className="settings-account-card">
                            <div className="settings-account-identity">
                              <span className="settings-avatar"><UserRound size={20} /></span>
                              <div className="settings-account-details">
                                <span className="settings-field-label">SIGNED-IN ACCOUNT</span>
                                <strong>{user?.email || 'Your account'}</strong>
                              </div>
                            </div>
                            <div className="settings-sync-status" role="status">
                              {busy ? <LoaderCircle size={16} className="spin" /> : <AlertTriangle size={16} />}
                              <span>{busy ? 'Syncing your profiles…' : 'Cloud sync needs attention'}</span>
                            </div>
                            {!busy && (
                              <div className="settings-actions">
                                <button type="button" className="settings-button settings-button--primary" onClick={handleSync}>
                                  <RefreshCw size={15} /> Retry sync
                                </button>
                                <button type="button" className="settings-button settings-button--danger" onClick={handleSignOut}>
                                  <LogOut size={15} /> Log out
                                </button>
                              </div>
                            )}
                          </div>
                        ) : user ? (
                          <>
                            <div className="settings-account-card">
                              <div className="settings-account-identity">
                                <span className="settings-avatar"><UserRound size={20} /></span>
                                <div className="settings-account-details">
                                  <span className="settings-field-label">SIGNED-IN ACCOUNT</span>
                                  <strong>{user.email || 'Account email unavailable'}</strong>
                                </div>
                                <span className="settings-badge"><span /> Connected</span>
                              </div>
                              <div className="settings-sync-status" role="status">
                                {busy ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />}
                                <span>{busy ? 'Syncing profile changes…' : status || 'Cloud sync is ready'}</span>
                              </div>
                              <div className="settings-actions">
                                <button type="button" className="settings-button settings-button--primary" disabled={busy} onClick={handleSync}>
                                  {busy ? <LoaderCircle size={15} className="spin" /> : <RefreshCw size={15} />}
                                  Sync now
                                </button>
                                <button type="button" className="settings-button settings-button--danger" disabled={busy} onClick={handleSignOut}>
                                  <LogOut size={15} /> Log out
                                </button>
                              </div>
                            </div>

                            {appSettings.syncProfileDataToCloud && (
                              <div className="settings-card" style={{ marginTop: 14 }}>
                                <div className="settings-card-title">
                                  <LockKeyhole size={14} /> Encrypted profile sync passphrase
                                </div>
                                <div className="settings-row" style={{ display: 'block' }}>
                                  <label className="settings-row-label" htmlFor="profile-sync-passphrase">
                                    Use the same passphrase on every computer
                                  </label>
                                  <input
                                    id="profile-sync-passphrase"
                                    type="password"
                                    autoComplete="new-password"
                                    minLength={12}
                                    maxLength={1024}
                                    value={syncPassphrase}
                                    onChange={(event) => setSyncPassphrase(event.target.value)}
                                    placeholder="At least 12 characters"
                                    style={{ width: '100%', marginTop: 8 }}
                                  />
                                  <span className="settings-row-desc">
                                    Never saved by the app. It encrypts proxy credentials and browser snapshots before upload.
                                    If you forget it, encrypted cloud data cannot be recovered.
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Cloud Sync Preferences */}
                            <div className="settings-card" style={{ marginTop: 14 }}>
                              <div className="settings-card-title">
                                <Cloud size={14} /> Sync Preferences
                              </div>
                              <div className="settings-row">
                                <div className="settings-row-info">
                                  <span className="settings-row-label">Auto-Sync On Edits</span>
                                  <span className="settings-row-desc">Automatically upload profile updates when created or modified</span>
                                </div>
                                <label className="settings-switch">
                                  <input
                                    type="checkbox"
                                    checked={appSettings.autoSyncEdits}
                                    onChange={(e) => updateSetting('autoSyncEdits', e.target.checked)}
                                  />
                                  <span className="settings-slider" />
                                </label>
                              </div>
                              <div className="settings-row">
                                <div className="settings-row-info">
                                  <span className="settings-row-label">Encrypted browser profile snapshots</span>
                                  <span className="settings-row-desc">Back up a closed profile, including site storage and session state; OS-bound saved passwords are excluded</span>
                                </div>
                                <label className="settings-switch">
                                  <input
                                    type="checkbox"
                                    checked={appSettings.syncProfileDataToCloud}
                                    onChange={(e) => updateSetting('syncProfileDataToCloud', e.target.checked)}
                                  />
                                  <span className="settings-slider" />
                                </label>
                              </div>
                            </div>
                          </>
                        ) : (
                          <form onSubmit={handleSubmit} className="settings-auth-form">
                            <label htmlFor="settings-email">Email address</label>
                            <input
                              id="settings-email"
                              autoComplete="email"
                              type="email"
                              required
                              value={email}
                              onChange={(event) => setEmail(event.target.value)}
                              placeholder="name@example.com"
                            />
                            <label htmlFor="settings-password">Password</label>
                            <input
                              id="settings-password"
                              autoComplete="current-password"
                              type="password"
                              minLength={6}
                              required
                              value={password}
                              onChange={(event) => setPassword(event.target.value)}
                              placeholder="Enter your password"
                            />
                            <button type="submit" disabled={busy} className="settings-button settings-button--primary settings-submit">
                              {busy && <LoaderCircle size={15} className="spin" />}
                              Sign in
                            </button>
                          </form>
                        )}
                        <div className="settings-privacy-note">
                          <ShieldCheck size={17} />
                          <p><strong>Privacy protections are best-effort.</strong> Known tracking domains and third-party cookies are restricted. Profiles sync to your account; proxy passwords and local browsing cache are never uploaded.</p>
                        </div>
                        {error && <div className="settings-notice settings-notice--error" role="alert"><AlertTriangle size={17} /><p>{error}</p></div>}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
            {!required && <footer className="settings-footer">Changes to profiles sync automatically when cloud sync is connected.</footer>}
          </section>
        </div>
      )}
    </>
  );
};
