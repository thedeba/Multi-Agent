import { spawn, ChildProcess } from 'child_process';
import { BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import { ProfileLock } from '../profiles/profile-lock';
import { ProfileManager } from '../profiles/profile-manager';
import { IPC_CHANNELS } from '../security/ipc-contracts';
import { getBrowserExecutable, getChromeExecutable } from './chrome-launcher';
import { createProxyAuthExtension } from './proxy-extension';
import { AppPaths } from '../platform/paths';
import { ProxyManager } from '../network/proxy/proxy-manager';
import { ProxyBridge } from '../network/proxy/proxy-bridge';
import { getEffectiveUserAgent } from '../profiles/browser-definitions';
import { ProfileStorage } from '../profiles/profile-storage';
import { createFingerprintProtectionExtension } from '../privacy/fingerprint/fingerprint-extension';
import { SessionSyncServer } from './session-sync-server';
import { createSessionSyncExtension } from './session-sync-extension';

export class BrowserInstanceManager {
  private static mainWindow: BrowserWindow | null = null;
  private static profileManager: ProfileManager | null = null;
  private static activeInstances = new Map<string, number>(); // profileId -> pid
  private static launchTimes = new Map<string, number>(); // profileId -> timestamp
  private static watchdogTimer: NodeJS.Timeout | null = null;
  private static isSyncServerListening = false;

  public static setMainWindow(win: BrowserWindow): void {
    this.mainWindow = win;
  }

  public static setProfileManager(pm: ProfileManager): void {
    this.profileManager = pm;
  }

  /**
   * Starts a background watchdog that continuously verifies browser process liveness.
   * If a user closes Chrome (via close window, Cmd+Q, Alt+F4, or task kill),
   * the profile automatically transitions to 'stopped' immediately.
   */
  public static startWatchdog(): void {
    if (!this.isSyncServerListening) {
      this.isSyncServerListening = true;
      const syncServer = SessionSyncServer.getInstance();
      syncServer.on('window-closed', async (profileId: string) => {
        try {
          await this.stopProfile(profileId);
        } catch (err) {
          console.error(`Failed to auto-stop profile ${profileId} on window close:`, err);
        }
      });

      const sessionDebounce = new Map<string, NodeJS.Timeout>();
      syncServer.on('session-updated', ({ profileId, cookies, openUrls }: { profileId: string; cookies: any[]; openUrls: string[] }) => {
        const existing = sessionDebounce.get(profileId);
        if (existing) clearTimeout(existing);
        const timer = setTimeout(() => {
          sessionDebounce.delete(profileId);
          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send(IPC_CHANNELS.PROFILE_SESSION_UPDATED, {
              profileId,
              cookies,
              openUrls,
            });
          }
        }, 1500);
        sessionDebounce.set(profileId, timer);
      });
    }

    if (this.watchdogTimer) return;
    this.watchdogTimer = setInterval(() => {
      this.checkActiveInstances();
    }, 800);
  }

  public static stopWatchdog(): void {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  /**
   * Checks whether a specific PID is actively running.
   */
  public static isPidAlive(pid: number): boolean {
    if (!pid || pid <= 0) return false;
    try {
      process.kill(pid, 0);
      return true;
    } catch (err: any) {
      return err.code === 'EPERM'; // Process exists but owned by other user
    }
  }

  /**
   * Scans all profiles and detects when a browser window was closed.
   */
  public static checkActiveInstances(): void {
    let changed = false;
    const allProfiles = this.profileManager?.listProfiles() || [];
    const now = Date.now();

    for (const profile of allProfiles) {
      const isLocked = ProfileLock.isLocked(profile.id);
      const ownerPid = ProfileLock.getOwnerPid(profile.id);
      const trackedPid = this.activeInstances.get(profile.id);
      const pid = trackedPid || ownerPid;
      const launchedAt = this.launchTimes.get(profile.id) || 0;

      if (pid) {
        if (!this.isPidAlive(pid)) {
          // Process exited! Auto-stop profile
          this.activeInstances.delete(profile.id);
          this.launchTimes.delete(profile.id);
          SessionSyncServer.getInstance().clearHeartbeat(profile.id);
          ProfileLock.release(profile.id, pid);
          if (ProfileLock.isLocked(profile.id)) {
            ProfileLock.release(profile.id);
          }
          this.profileManager?.updateProfileStatus(profile.id, 'stopped');

          // Save final session
          try {
            const syncServer = SessionSyncServer.getInstance();
            const finalSession = syncServer.getSession(profile.id);
            syncServer.saveSessionToDisk(profile.id, finalSession.cookies, finalSession.openUrls);
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
              this.mainWindow.webContents.send(IPC_CHANNELS.PROFILE_SESSION_EXITED, {
                profileId: profile.id,
                cookies: finalSession.cookies,
                openUrls: finalSession.openUrls,
              });
            }
          } catch {
            // Non-blocking session capture
          }
          changed = true;
        } else {
          // If process PID is still technically alive (e.g. macOS dock background or lingering helper)
          // but heartbeat from browser has ceased for > 7s after startup grace period,
          // the browser window is closed. Auto-stop it!
          const lastHeartbeat = SessionSyncServer.getInstance().getLastHeartbeat(profile.id);
          if (launchedAt > 0 && now - launchedAt > 8000 && lastHeartbeat && now - lastHeartbeat > 7000) {
            this.activeInstances.delete(profile.id);
            this.launchTimes.delete(profile.id);
            SessionSyncServer.getInstance().clearHeartbeat(profile.id);
            ProfileLock.release(profile.id, pid);
            if (ProfileLock.isLocked(profile.id)) {
              ProfileLock.release(profile.id);
            }
            this.profileManager?.updateProfileStatus(profile.id, 'stopped');

            // Save final session
            try {
              const syncServer = SessionSyncServer.getInstance();
              const finalSession = syncServer.getSession(profile.id);
              syncServer.saveSessionToDisk(profile.id, finalSession.cookies, finalSession.openUrls);
              if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.webContents.send(IPC_CHANNELS.PROFILE_SESSION_EXITED, {
                  profileId: profile.id,
                  cookies: finalSession.cookies,
                  openUrls: finalSession.openUrls,
                });
              }
            } catch {
              // Non-blocking session capture
            }

            try {
              process.kill(pid, 'SIGTERM');
            } catch {}
            changed = true;
          }
        }
      } else if (profile.status === 'running' && !isLocked) {
        this.profileManager?.updateProfileStatus(profile.id, 'stopped');
        this.activeInstances.delete(profile.id);
        this.launchTimes.delete(profile.id);
        SessionSyncServer.getInstance().clearHeartbeat(profile.id);
        changed = true;
      }
    }

    if (changed) {
      this.broadcastRunningProfiles();
    }
  }

  public static getRunningProfileIds(): string[] {
    return (this.profileManager?.listProfiles() || [])
      .filter((profile) => {
        const isLocked = ProfileLock.isLocked(profile.id);
        const trackedPid = this.activeInstances.get(profile.id);
        if (trackedPid && !this.isPidAlive(trackedPid)) return false;
        return isLocked;
      })
      .map((profile) => profile.id);
  }

  public static broadcastRunningProfiles(): void {
    const running = this.getRunningProfileIds();
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.PROFILE_RUNNING_UPDATED, running);
    }
  }

  public static async launchProfile(
    profileId: string
  ): Promise<{ success: boolean; profileId: string; focused?: boolean }> {
    this.startWatchdog();

    if (!this.profileManager?.getProfile(profileId)) {
      throw new Error(`Profile not found: ${profileId}`);
    }
    const profile = this.profileManager.getProfile(profileId)!;

    if (ProfileLock.isLocked(profileId) || !ProfileLock.acquire(profileId)) {
      return { success: false, profileId };
    }

    try {
      const { executablePath } = getBrowserExecutable(profile.browserType);
      const userDataPath = path.join(AppPaths.getProfileStorageDir(profileId), 'ChromiumProfileData');
      const syncServer = SessionSyncServer.getInstance();
      const syncPort = await syncServer.start();

      let proxyRules = ProxyManager.buildProxyRules(profile.proxy);

      // If proxy authentication credentials are provided, start local transparent ProxyBridge
      // to completely eliminate native Chromium authentication login dialogs
      if (profile.proxy.enabled && profile.proxy.host && profile.proxy.username && profile.proxy.password) {
        try {
          const bridgePort = await ProxyBridge.startBridge(profileId, profile.proxy);
          proxyRules = `http://127.0.0.1:${bridgePort}`;
        } catch (err) {
          console.error(`Failed to start ProxyBridge for profile ${profileId}, falling back to direct:`, err);
        }
      }

      // Resolve Proxy IP Geo & Timezone for auto-matching (if enabled)
      let proxyGeo: { timezone?: string; latitude?: number; longitude?: number } | undefined;
      if (profile.proxy.enabled && profile.proxy.host && /^(?:\d{1,3}\.){3}\d{1,3}$/.test(profile.proxy.host.trim())) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 1500);
          const geoRes = await fetch(`https://ipwho.is/${profile.proxy.host.trim()}`, { signal: controller.signal });
          clearTimeout(timer);
          if (geoRes.ok) {
            const data = await geoRes.json();
            if (data && data.success) {
              proxyGeo = {
                timezone: data.timezone?.id,
                latitude: data.latitude,
                longitude: data.longitude,
              };
            }
          }
        } catch {
          // Graceful fallback to default timezone
        }
      }

      // Resolve effective Timezone (Manual selection vs Proxy IP auto-detection)
      const effectiveTimezone = (profile.timezone && profile.timezone !== 'auto')
        ? profile.timezone
        : proxyGeo?.timezone;

      const effectiveLanguage = profile.language || 'en-US';
      const isWebrtcDisabled = profile.webrtcPolicy === 'disabled';

      // Ensure Chromium Default Preferences are configured to restore last session and set intl / webrtc
      const defaultDir = path.join(userDataPath, 'Default');
      fs.mkdirSync(defaultDir, { recursive: true });
      const prefsPath = path.join(defaultDir, 'Preferences');
      try {
        let prefs: any = {};
        if (fs.existsSync(prefsPath)) {
          prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf-8'));
        }
        prefs.session = prefs.session || {};
        prefs.session.restore_on_startup = 1; // 1 = Restore last session

        // Configure intl language & accept-languages in Chromium profile
        const baseLang = effectiveLanguage.split('-')[0];
        const langChain = effectiveLanguage === 'en-US'
          ? 'en-US,en'
          : (effectiveLanguage.includes('-') ? `${effectiveLanguage},${baseLang}` : effectiveLanguage);

        prefs.intl = prefs.intl || {};
        prefs.intl.accept_languages = langChain;
        prefs.intl.selected_languages = langChain;

        // Configure WebRTC IP handling policy in Chromium preferences
        prefs.webrtc = prefs.webrtc || {};
        prefs.webrtc.ip_handling_policy = isWebrtcDisabled
          ? 'disable_non_proxied_udp'
          : (profile.webrtcPolicy || 'default_public_interface_only');

        fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2), 'utf-8');
      } catch {
        // Non-blocking preference setup
      }

      const extensionPaths = [
        createFingerprintProtectionExtension(
          path.join(userDataPath, 'FingerprintProtectionExtension'),
          profile.id,
          profile.os,
          profile.privacyLevel,
          {
            timezone: effectiveTimezone,
            latitude: proxyGeo?.latitude,
            longitude: proxyGeo?.longitude,
            language: effectiveLanguage,
            disableWebrtc: isWebrtcDisabled,
          }
        ),
        createSessionSyncExtension(
          path.join(userDataPath, 'SessionSyncExtension'),
          profile.id,
          syncPort
        ),
      ];

      const args = [
        `--user-data-dir=${userDataPath}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--restore-last-session',
        `--user-agent=${getEffectiveUserAgent(profile.browserType, profile.browserVersion, profile.os, profile.customUserAgent)}`,
        `--lang=${effectiveLanguage}`,
        `--proxy-server=${proxyRules}`,
        '--proxy-bypass-list=<local>',
      ];

      // WebRTC: Manual ON & OFF Controls
      if (isWebrtcDisabled) {
        args.push('--disable-webrtc');
        args.push('--force-webrtc-ip-handling-policy=disable_non_proxied_udp');
      } else {
        args.push(`--force-webrtc-ip-handling-policy=${profile.webrtcPolicy || 'default_public_interface_only'}`);
      }

      // Timezone: Manual selection
      if (effectiveTimezone) {
        args.push(`--timezone=${effectiveTimezone}`);
      }

      // Puppeteer / Playwright Remote Debugging automation port support
      if (profile.remoteDebuggingPort && profile.remoteDebuggingPort > 0) {
        args.push(`--remote-debugging-port=${profile.remoteDebuggingPort}`);
        args.push(`--remote-debugging-address=127.0.0.1`);
      }

      // If proxy authentication credentials are provided, load the ephemeral proxy auth extension
      if (profile.proxy.enabled && profile.proxy.username && profile.proxy.password) {
        extensionPaths.push(createProxyAuthExtension(
          path.join(userDataPath, 'ProxyAuthExtension'),
          profile.proxy.username,
          profile.proxy.password
        ));
      }

      args.push(`--load-extension=${extensionPaths.join(',')}`);
      args.push(`--disable-extensions-except=${extensionPaths.join(',')}`);

      // If there is no previous session, open default URL
      const sessionData = syncServer.getSession(profileId);
      const hasResumeSession = (sessionData?.openUrls && sessionData.openUrls.length > 0) ||
        fs.existsSync(path.join(defaultDir, 'Sessions'));

      if (!hasResumeSession) {
        args.push('https://www.google.com');
      }

      const childEnv: Record<string, string | undefined> = { ...process.env };
      if (effectiveTimezone) {
        childEnv.TZ = effectiveTimezone;
      }
      if (effectiveLanguage) {
        childEnv.LANG = `${effectiveLanguage.replace('-', '_')}.UTF-8`;
      }

      const child = spawn(executablePath, args, { detached: true, stdio: 'ignore', env: childEnv });
      return await new Promise((resolve, reject) => {
        child.once('error', (error) => {
          this.activeInstances.delete(profileId);
          ProxyBridge.stopBridge(profileId);
          ProfileLock.release(profileId, child.pid || process.pid);
          this.profileManager?.updateProfileStatus(profileId, 'crashed');
          this.broadcastRunningProfiles();
          console.error(`Could not launch browser for profile ${profileId}:`, error);
          reject(error);
        });

        child.once('spawn', () => {
          if (!child.pid || !ProfileLock.transfer(profileId, process.pid, child.pid)) {
            child.kill();
            ProfileLock.release(profileId);
            this.profileManager?.updateProfileStatus(profileId, 'crashed');
            reject(new Error(`Could not acquire Chromium process lock for profile ${profileId}`));
            return;
          }

          this.activeInstances.set(profileId, child.pid);
          this.launchTimes.set(profileId, Date.now());
          child.unref();
          this.profileManager?.updateProfileStatus(profileId, 'running');
          this.broadcastRunningProfiles();
          resolve({ success: true, profileId });
        });

        child.once('exit', (code, signal) => {
          this.activeInstances.delete(profileId);
          this.launchTimes.delete(profileId);
          ProxyBridge.stopBridge(profileId);
          SessionSyncServer.getInstance().clearHeartbeat(profileId);
          if (child.pid) {
            ProfileLock.release(profileId, child.pid);
          }
          if (ProfileLock.isLocked(profileId)) {
            ProfileLock.release(profileId);
          }

          this.profileManager?.updateProfileStatus(profileId, code === 0 || signal !== null ? 'stopped' : 'crashed');
          if (profile.isTemporary) {
            ProfileStorage.deleteProfileDirectory(profileId);
          } else {
            // Capture and broadcast latest cookies and open tabs for cloud sync
            try {
              const finalSession = syncServer.getSession(profileId);
              syncServer.saveSessionToDisk(profileId, finalSession.cookies, finalSession.openUrls);
              if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.webContents.send(IPC_CHANNELS.PROFILE_SESSION_EXITED, {
                  profileId,
                  cookies: finalSession.cookies,
                  openUrls: finalSession.openUrls,
                });
              }
            } catch {
              // Non-blocking session capture
            }
          }
          this.broadcastRunningProfiles();

          if (code !== 0 && signal === null) {
            console.error(`Google Chrome exited for profile ${profileId} with code ${code}`);
          }
        });
      });
    } catch (error) {
      this.activeInstances.delete(profileId);
      ProxyBridge.stopBridge(profileId);
      ProfileLock.release(profileId);
      throw error;
    }
  }

  public static async stopProfile(profileId: string): Promise<boolean> {
    const trackedPid = this.activeInstances.get(profileId);
    const ownerPid = trackedPid || ProfileLock.getOwnerPid(profileId);
    this.activeInstances.delete(profileId);
    this.launchTimes.delete(profileId);
    ProxyBridge.stopBridge(profileId);
    SessionSyncServer.getInstance().clearHeartbeat(profileId);

    if (ownerPid) {
      try {
        process.kill(ownerPid, 'SIGTERM');
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
      }
    }

    // Capture and broadcast latest cookies and open tabs for cloud sync
    try {
      const syncServer = SessionSyncServer.getInstance();
      const finalSession = syncServer.getSession(profileId);
      syncServer.saveSessionToDisk(profileId, finalSession.cookies, finalSession.openUrls);
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send(IPC_CHANNELS.PROFILE_SESSION_EXITED, {
          profileId,
          cookies: finalSession.cookies,
          openUrls: finalSession.openUrls,
        });
      }
    } catch {
      // Non-blocking session capture
    }

    const timeout = Date.now() + 1500;
    while (ProfileLock.isLocked(profileId) && Date.now() < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Force release lock if still stuck
    if (ProfileLock.isLocked(profileId)) {
      ProfileLock.release(profileId, ownerPid || process.pid);
      if (ProfileLock.isLocked(profileId)) {
        ProfileLock.release(profileId);
      }
    }

    this.profileManager?.updateProfileStatus(profileId, 'stopped');
    this.broadcastRunningProfiles();
    return true;
  }

  public static async stopAllProfiles(): Promise<void> {
    ProxyBridge.stopAll();
    const runningIds = this.getRunningProfileIds();
    for (const id of runningIds) {
      try {
        await this.stopProfile(id);
      } catch {
        // Continue stopping remaining
      }
    }
  }
}
