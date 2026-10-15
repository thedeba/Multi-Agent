import React, { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Profile } from '../security/ipc-contracts';
import { CloudSyncPanel } from './components/CloudSyncPanel';
import { ProfileSwitcher } from './components/ProfileSwitcher';
import { ProfileCheckingAnimation } from './components/ProfileCheckingAnimation';
import appLogo from './icon.svg';
import './styles/index.css';

const App: React.FC = () => {
  const [authState, setAuthState] = useState<'checking' | 'syncing' | 'signedOut' | 'ready' | 'error'>('checking');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profilesLoaded, setProfilesLoaded] = useState(false);

  const refreshProfiles = useCallback(async () => {
    try {
      const list = await window.browserAPI.listProfiles();
      setProfiles(list || []);
    } catch (err) {
      console.error('Failed to list profiles:', err);
    } finally {
      setProfilesLoaded(true);
    }
  }, []);

  const handleAuthStateChanged = useCallback((state: typeof authState) => {
    setAuthState(state);
    if (state === 'signedOut') {
      setProfiles([]);
      setProfilesLoaded(false);
    }
  }, []);

  return (
    <div className="app-container">
      {authState === 'ready' ? (
        <>
          <header className="window-titlebar" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#e2e4e9', fontWeight: 650 }}>
              <img src={appLogo} alt="" width={22} height={22} />
              <span>Multi Agent</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 110 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#8de3bd', backgroundColor: 'rgba(52, 211, 153, 0.08)', padding: '3px 9px', borderRadius: 12, border: '1px solid rgba(52, 211, 153, 0.16)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#34d399' }} />
                <span>Cloud Connected</span>
              </div>
            </div>
          </header>

          <main style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            {profilesLoaded ? (
              <ProfileSwitcher
                profiles={profiles}
                isAuthenticated
                onRefreshProfiles={refreshProfiles}
              />
            ) : (
              <ProfileCheckingAnimation
                title="Loading your profiles…"
                subtitle="Initializing local partitions & saved session storage…"
              />
            )}
          </main>
        </>
      ) : authState === 'checking' || authState === 'syncing' ? (
        <ProfileCheckingAnimation
          title={authState === 'syncing' ? 'Syncing your profiles…' : 'Checking your profile…'}
          subtitle={
            authState === 'syncing'
              ? 'Synchronizing cloud browser profiles & cookies…'
              : 'Verifying cloud credentials, anti-detect fingerprints & network security'
          }
        />
      ) : null}

      <CloudSyncPanel
        required={authState !== 'ready'}
        onProfilesUpdated={refreshProfiles}
        onAuthStateChanged={handleAuthStateChanged}
      />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
