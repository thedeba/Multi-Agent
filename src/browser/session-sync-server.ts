import http from 'http';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { AppPaths } from '../platform/paths';

export interface ProfileSessionData {
  cookies: any[];
  openUrls: string[];
  lastUpdated: number;
}

export class SessionSyncServer extends EventEmitter {
  private static instance: SessionSyncServer | null = null;
  private server: http.Server | null = null;
  private port: number = 0;
  private sessions: Map<string, ProfileSessionData> = new Map();
  private activeHeartbeats: Map<string, number> = new Map();

  public static getInstance(): SessionSyncServer {
    if (!this.instance) {
      this.instance = new SessionSyncServer();
    }
    return this.instance;
  }

  public async start(): Promise<number> {
    if (this.server && this.port > 0) {
      return this.port;
    }

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        // Enable CORS & Private Network Access (PNA) for Chromium extension requests
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Request-Private-Network');
        res.setHeader('Access-Control-Allow-Private-Network', 'true');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);

        // Immediate window closed notification from browser extension
        if (url.pathname === '/api/window-closed') {
          let profileId = url.searchParams.get('profileId');
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              if (body) {
                const parsed = JSON.parse(body);
                if (parsed.profileId) profileId = parsed.profileId;
              }
            } catch {}
            if (profileId) {
              this.activeHeartbeats.delete(profileId);
              this.emit('window-closed', profileId);
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          });
          return;
        }

        // Heartbeat endpoint
        if (url.pathname === '/api/heartbeat') {
          const profileId = url.searchParams.get('profileId');
          if (profileId) {
            this.activeHeartbeats.set(profileId, Date.now());
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
          return;
        }

        if (req.method === 'GET' && url.pathname === '/api/session') {
          const profileId = url.searchParams.get('profileId');
          if (!profileId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing profileId parameter' }));
            return;
          }

          this.activeHeartbeats.set(profileId, Date.now());
          const session = this.getSession(profileId);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(session));
          return;
        }

        if (req.method === 'POST' && url.pathname === '/api/session') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
            if (body.length > 25 * 1024 * 1024) {
              // 25MB limit
              req.destroy();
            }
          });

          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              const { profileId, cookies, openUrls } = data;
              if (!profileId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing profileId' }));
                return;
              }

              this.activeHeartbeats.set(profileId, Date.now());
              const validCookies = Array.isArray(cookies) ? cookies : [];
              const validUrls = Array.isArray(openUrls) ? openUrls : [];

              this.setSession(profileId, validCookies, validUrls);

              // Also sync to Electron in-process session partition so CookieManager & export have them immediately
              try {
                const { CookieManager } = require('../privacy/cookies/cookie-manager');
                if (validCookies.length > 0) {
                  CookieManager.importCookies(profileId, JSON.stringify(validCookies)).catch(() => {});
                }
              } catch {}

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, count: validCookies.length }));
            } catch (err: any) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        if (req.method === 'POST' && url.pathname === '/api/window-closed') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              let profileId = url.searchParams.get('profileId');
              if (!profileId && body) {
                try {
                  const parsed = JSON.parse(body);
                  profileId = parsed.profileId;
                } catch {}
              }
              if (profileId) {
                this.clearHeartbeat(profileId);
                const session = this.getSession(profileId);
                this.saveSessionToDisk(profileId, session.cookies, session.openUrls);
                this.emit('window-closed', profileId);
                this.emit('session-exited', { profileId, cookies: session.cookies, openUrls: session.openUrls });
              }
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            } catch (err: any) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      });

      this.server.on('error', (err) => {
        reject(err);
      });

      // Bind to 127.0.0.1 on random available port
      this.server.listen(0, '127.0.0.1', () => {
        const addr = this.server?.address();
        if (addr && typeof addr === 'object') {
          this.port = addr.port;
          resolve(this.port);
        } else {
          reject(new Error('Failed to obtain server address'));
        }
      });
    });
  }

  public getPort(): number {
    return this.port;
  }

  public getLastHeartbeat(profileId: string): number | undefined {
    return this.activeHeartbeats.get(profileId);
  }

  public clearHeartbeat(profileId: string): void {
    this.activeHeartbeats.delete(profileId);
  }

  public setSession(profileId: string, cookies: any[], openUrls: string[]): void {
    const sessionData: ProfileSessionData = {
      cookies,
      openUrls,
      lastUpdated: Date.now(),
    };
    this.sessions.set(profileId, sessionData);
    this.saveSessionToDisk(profileId, cookies, openUrls);
    this.emit('session-updated', { profileId, cookies, openUrls });
  }

  public getSession(profileId: string): ProfileSessionData {
    let session = this.sessions.get(profileId);
    if (!session || (!session.cookies || session.cookies.length === 0)) {
      const fromDisk = this.loadSessionFromDisk(profileId);
      if (fromDisk.cookies.length > 0 || !session) {
        session = {
          cookies: fromDisk.cookies,
          openUrls: fromDisk.openUrls,
          lastUpdated: Date.now(),
        };
        this.sessions.set(profileId, session);
      }
    }
    return session || { cookies: [], openUrls: [], lastUpdated: Date.now() };
  }

  public saveSessionToDisk(profileId: string, cookies: any[], openUrls: string[]): void {
    try {
      const dir = AppPaths.getProfileStorageDir(profileId);
      fs.mkdirSync(dir, { recursive: true });

      const cookiesPath = path.join(dir, 'cookies.json');
      const cookiesSubdir = path.join(dir, 'cookies');
      const cookiesSubdirPath = path.join(cookiesSubdir, 'cookies.json');

      // Safeguard: If incoming cookies array is empty, but we already have cookies on disk, do not wipe them
      if (cookies.length === 0) {
        const existingPath = fs.existsSync(cookiesPath) ? cookiesPath : (fs.existsSync(cookiesSubdirPath) ? cookiesSubdirPath : null);
        if (existingPath) {
          try {
            const raw = fs.readFileSync(existingPath, 'utf-8');
            const existing = JSON.parse(raw);
            if (Array.isArray(existing) && existing.length > 0) {
              cookies = existing;
            }
          } catch {}
        }
      }

      fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2), 'utf-8');
      fs.mkdirSync(cookiesSubdir, { recursive: true });
      fs.writeFileSync(cookiesSubdirPath, JSON.stringify(cookies, null, 2), 'utf-8');

      const sessionPath = path.join(dir, 'session.json');
      fs.writeFileSync(
        sessionPath,
        JSON.stringify({ openUrls, lastExitedAt: Date.now() }, null, 2),
        'utf-8'
      );
    } catch (err) {
      console.error(`Failed to save session to disk for profile ${profileId}:`, err);
    }
  }

  public loadSessionFromDisk(profileId: string): { cookies: any[]; openUrls: string[] } {
    try {
      const dir = AppPaths.getProfileStorageDir(profileId);
      const cookiesPath = path.join(dir, 'cookies.json');
      const cookiesSubdirPath = path.join(dir, 'cookies', 'cookies.json');
      const sessionPath = path.join(dir, 'session.json');

      let cookies: any[] = [];
      let openUrls: string[] = [];

      const targetCookiesFile = fs.existsSync(cookiesPath)
        ? cookiesPath
        : (fs.existsSync(cookiesSubdirPath) ? cookiesSubdirPath : null);

      if (targetCookiesFile) {
        const raw = fs.readFileSync(targetCookiesFile, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          cookies = parsed;
        }
      }

      // Fallback: If cookies.json is empty or missing, read directly from Chromium SQLite database
      if (cookies.length === 0) {
        try {
          const { ChromiumCookieReader } = require('./chromium-cookie-reader');
          const directCookies = ChromiumCookieReader.readProfileCookies(profileId);
          if (Array.isArray(directCookies) && directCookies.length > 0) {
            cookies = directCookies;
            // Write to disk cache
            fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2), 'utf-8');
            if (fs.existsSync(cookiesSubdirPath)) {
              fs.writeFileSync(cookiesSubdirPath, JSON.stringify(cookies, null, 2), 'utf-8');
            }
          }
        } catch {}
      }

      if (fs.existsSync(sessionPath)) {
        const raw = fs.readFileSync(sessionPath, 'utf-8');
        const parsed = JSON.parse(raw);
        openUrls = Array.isArray(parsed.openUrls) ? parsed.openUrls : [];
      }

      return { cookies, openUrls };
    } catch {
      return { cookies: [], openUrls: [] };
    }
  }

  public stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
      this.port = 0;
    }
  }
}
