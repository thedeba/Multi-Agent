import React, { FormEvent, useEffect, useState } from 'react';
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
} from 'lucide-react';
import { getFirebaseServices, isFirebaseConfigured } from '../services/firebase';
import { getSignInErrorMessage } from '../services/auth-error-message';
import { deleteProfileFromCloud, saveProfileCookiesToCloud, saveProfileToCloud, syncProfilesFromCloud } from '../services/cloud-profile-sync';
import appLogo from '../icon.svg';

interface CloudSyncPanelProps {
  onProfilesUpdated: () => void | Promise<void>;
  onAuthStateChanged: (state: 'checking' | 'syncing' | 'signedOut' | 'ready' | 'error') => void;
  required?: boolean;
}

export const CloudSyncPanel: React.FC<CloudSyncPanelProps> = ({
  onProfilesUpdated,
  onAuthStateChanged,
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [authResolved, setAuthResolved] = useState(false);

  useEffect(() => {
    onAuthStateChanged('checking');
    if (!isFirebaseConfigured) {
      setAuthResolved(true);
      setError('Cloud sync is not configured. Add the Firebase web app settings to .env.local and rebuild.');
      onAuthStateChanged('error');
      return;
    }

    try {
      const { auth } = getFirebaseServices();
      return onIdTokenChanged(auth, async (account) => {
        setAuthResolved(true);
        setUser(account);
        if (account) {
          setBusy(true);
          setError('');
          onAuthStateChanged('syncing');
          account.getIdToken()
            .then((idToken) => window.browserAPI.setAuthenticatedUser({
              idToken,
              apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
            }))
            .then(() => syncProfilesFromCloud(account))
            .then(async () => {
              setStatus('Profiles synced');
              await onProfilesUpdated();
              onAuthStateChanged('ready');
            })
            .catch(async (syncError: unknown) => {
              const authErrorMessage = syncError instanceof Error ? syncError.message : String(syncError);
              console.warn('Profile cloud sync failed, continuing locally:', authErrorMessage);
              // Do NOT de-authenticate or clear authenticated user on sync failure!
              // The user is authenticated; load local profiles and let them work.
              try {
                await onProfilesUpdated();
              } catch (profileErr) {
                console.error('Failed to load local profiles:', profileErr);
              }
              setStatus('Offline mode (cloud sync pending)');
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
        setError(authError.message);
        setAuthResolved(true);
        onAuthStateChanged('error');
      });
    } catch (configError) {
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
      const operation = change.type === 'delete'
        ? deleteProfileFromCloud(user, change.profileId)
        : window.browserAPI.listProfiles().then((profiles) => {
            const profile = profiles.find((item) => item.id === change.profileId);
            return profile ? saveProfileToCloud(user, profile) : undefined;
          });

      operation
        .then(() => setStatus('Profiles synced'))
        .catch((syncError: unknown) => setError(syncError instanceof Error ? syncError.message : String(syncError)))
        .finally(() => setBusy(false));
    });

    const pendingUpdates = new Map<string, NodeJS.Timeout>();

    const saveSession = (sessionData: { profileId: string; cookies: any[]; openUrls: string[] }, immediate = false) => {
      const existing = pendingUpdates.get(sessionData.profileId);
      if (existing) clearTimeout(existing);

      const doSave = () => {
        pendingUpdates.delete(sessionData.profileId);
        saveProfileCookiesToCloud(
          user,
          sessionData.profileId,
          sessionData.cookies || [],
          sessionData.openUrls || []
        )
          .then(() => setStatus(`Cloud saved: ${sessionData.cookies?.length || 0} cookies & session state`))
          .catch((err) => console.warn('Failed to sync cookies to cloud:', err));
      };

      if (immediate) {
        doSave();
      } else {
        const timer = setTimeout(doSave, 1500);
        pendingUpdates.set(sessionData.profileId, timer);
      }
    };

    const unsubSessionExited = window.browserAPI.onProfileSessionExited?.((sessionExit) => {
      saveSession(sessionExit, true);
    });

    const unsubSessionUpdated = (window.browserAPI as any).onProfileSessionUpdated?.((sessionUpdate: any) => {
      saveSession(sessionUpdate, false);
    });

    return () => {
      unsubProfile?.();
      unsubSessionExited?.();
      unsubSessionUpdated?.();
      for (const t of pendingUpdates.values()) clearTimeout(t);
      pendingUpdates.clear();
    };
  }, [user]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isFirebaseConfigured) return;
    setBusy(true);
    setError('');
    try {
      const { auth } = getFirebaseServices();
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setPassword('');
    } catch (authError) {
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
      const idToken = await user.getIdToken();
      await window.browserAPI.setAuthenticatedUser({
        idToken,
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      });
      await syncProfilesFromCloud(user);
      await onProfilesUpdated();
      onAuthStateChanged('ready');
      setStatus('Profiles synced');
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
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : String(authError));
      onAuthStateChanged('error');
    } finally {
      setBusy(false);
    }
  };

  const blockingSignIn = required && !user;
  const blockingSync = required && Boolean(user) && Boolean(error);
  const showBlockingDialog = required && authResolved && (blockingSignIn || blockingSync);
  const showSettingsDialog = !required && Boolean(user) && isOpen;
  const showDialog = showBlockingDialog || showSettingsDialog;

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
          onClick={() => setIsOpen(true)}
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
                        id="settings-email"
                        autoComplete="email"
                        type="email"
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
                      <p className="settings-eyebrow">MULTI AGENT</p>
                      <h2 id="cloud-sync-title">{required ? 'Profile cloud sync' : 'Settings'}</h2>
                      <p className="settings-subtitle">Manage your account and profile sync</p>
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
                    <div className="settings-nav-item" aria-current="page">
                      <UserRound size={16} />
                      <span>Account &amp; sync</span>
                    </div>
                  </nav>
                  <div className="settings-content">
                    <div className="settings-section-heading">
                      <div>
                        <h3>Account &amp; sync</h3>
                        <p>Sign-in and cloud profile synchronization</p>
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
                      <p><strong>Privacy protections are best-effort.</strong> Known tracking domains and third-party cookies are restricted, but not every fingerprinting technique can be prevented. Profiles sync to your account; proxy passwords and Chrome browsing data are never uploaded.</p>
                    </div>
                    {error && <div className="settings-notice settings-notice--error" role="alert"><AlertTriangle size={17} /><p>{error}</p></div>}
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
