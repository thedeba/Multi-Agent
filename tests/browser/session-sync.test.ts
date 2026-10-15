import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { SessionSyncServer } from '../../src/browser/session-sync-server';
import { createSessionSyncExtension } from '../../src/browser/session-sync-extension';
import { AppPaths } from '../../src/platform/paths';

describe('Session and Cookie Sync & Resume', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-session-sync-'));
    AppPaths.setCustomAppDataDir(tempDir);
  });

  afterEach(() => {
    AppPaths.setCustomAppDataDir(null);
    SessionSyncServer.getInstance().stop();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('starts SessionSyncServer on loopback 127.0.0.1 and manages session data', async () => {
    const server = SessionSyncServer.getInstance();
    const port = await server.start();
    expect(port).toBeGreaterThan(0);
    expect(server.getPort()).toBe(port);

    const testCookies = [
      {
        name: 'session_id',
        value: 'xyz789',
        domain: '.example.com',
        path: '/',
        secure: true,
        httpOnly: true,
      },
    ];
    const testUrls = ['https://example.com/dashboard', 'https://github.com'];

    server.setSession('test-profile-1', testCookies, testUrls);

    const session = server.getSession('test-profile-1');
    expect(session.cookies).toEqual(testCookies);
    expect(session.openUrls).toEqual(testUrls);

    // Verify persisted on disk
    const onDisk = server.loadSessionFromDisk('test-profile-1');
    expect(onDisk.cookies).toEqual(testCookies);
    expect(onDisk.openUrls).toEqual(testUrls);
  });

  it('generates a valid Chromium SessionSyncExtension with correct permissions and port', () => {
    const extDir = path.join(tempDir, 'TestExtension');
    createSessionSyncExtension(extDir, 'test-profile-2', 49500);

    const manifestPath = path.join(extDir, 'manifest.json');
    const bgPath = path.join(extDir, 'background.js');

    expect(fs.existsSync(manifestPath)).toBe(true);
    expect(fs.existsSync(bgPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.permissions).toContain('cookies');
    expect(manifest.permissions).toContain('tabs');
    expect(manifest.host_permissions).toContain('<all_urls>');

    const bgContent = fs.readFileSync(bgPath, 'utf-8');
    expect(bgContent).toContain('const PROFILE_ID = "test-profile-2";');
    expect(bgContent).toContain('http://127.0.0.1:49500');
    expect(bgContent).toContain('chrome.cookies.getAll');
    expect(bgContent).toContain('chrome.cookies.set');
    expect(bgContent).toContain('details.domain = c.domain.replace(/^\\./, \'\');');
  });

  it('handles /api/window-closed and emits window-closed event', async () => {
    const server = SessionSyncServer.getInstance();
    const port = await server.start();

    let emittedProfileId: string | null = null;
    server.once('window-closed', (profileId: string) => {
      emittedProfileId = profileId;
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/window-closed?profileId=test-profile-close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId: 'test-profile-close' }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(emittedProfileId).toBe('test-profile-close');
  });
});

