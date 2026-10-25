import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  serializeCloudProfile,
  saveProfileSessionToCloud,
  restoreProfileSessionFromCloud,
} from '../../src/ui/services/cloud-profile-sync';
import { Profile } from '../../src/security/ipc-contracts';
import * as firebaseServices from '../../src/ui/services/firebase';
import { User } from 'firebase/auth';

const mockSetDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockDoc = vi.fn();

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    setDoc: (...args: any[]) => mockSetDoc(...args),
    getDoc: (...args: any[]) => mockGetDoc(...args),
    doc: (...args: any[]) => mockDoc(...args),
  };
});

describe('Cloud profile serialization', () => {
  it('removes local paths, runtime state, and proxy credentials before upload', () => {
    const profile: Profile = {
      id: 'work',
      name: 'Work',
      isTemporary: false,
      privacyLevel: 'balanced',
      webrtcPolicy: 'default_public_interface_only',
      proxy: {
        enabled: true,
        mode: 'http',
        host: 'proxy.example.com',
        port: 8080,
        username: 'secret-user',
        password: 'secret-password',
      },
      os: 'mac',
      browserType: 'chrome',
      browserVersion: '154.0.8037.98',
      language: 'en-GB',
      timezone: 'Europe/London',
      remoteDebuggingPort: 9222,
      customUserAgent: 'CustomBrowser/1.0',
      group: 'Work',
      storagePath: '/private/profile/path',
      status: 'running',
      lastUsedAt: 123,
      notes: '',
      tags: [],
      color: '#3b82f6',
      createdAt: 100,
      updatedAt: 200,
    };

    const cloudData = serializeCloudProfile(profile);

    expect(cloudData).not.toHaveProperty('storagePath');
    expect(cloudData).not.toHaveProperty('status');
    expect(cloudData).not.toHaveProperty('lastUsedAt');
    expect(cloudData).toMatchObject({
      isTemporary: false,
      group: 'Work',
      language: 'en-GB',
      timezone: 'Europe/London',
      remoteDebuggingPort: 9222,
      customUserAgent: 'CustomBrowser/1.0',
      proxy: { enabled: true, host: 'proxy.example.com', port: 8080 },
    });
    expect(cloudData.proxy).not.toHaveProperty('username');
    expect(cloudData.proxy).not.toHaveProperty('password');
  });

  it('omits an unset optional User-Agent instead of uploading undefined', () => {
    const profile = {
      id: 'work',
      name: 'Work',
      isTemporary: false,
      privacyLevel: 'balanced',
      webrtcPolicy: 'default_public_interface_only',
      proxy: { enabled: false, mode: 'direct', host: '', port: 8080 },
      os: 'mac',
      browserType: 'chrome',
      browserVersion: '131.0.6778.86',
      customUserAgent: undefined,
      storagePath: '',
      status: 'stopped',
      lastUsedAt: null,
      notes: '',
      group: 'Default',
      tags: [],
      color: '#3b82f6',
      createdAt: 100,
      updatedAt: 100,
    } satisfies Profile;

    expect(serializeCloudProfile(profile)).not.toHaveProperty('customUserAgent');
  });
});

describe('Cloud profile session sync', () => {
  const fakeDb = { type: 'fake-firestore' } as any;
  const fakeUser = { uid: 'test-user-123' } as unknown as User;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockSetDoc.mockReset().mockResolvedValue(undefined);
    mockGetDoc.mockReset().mockResolvedValue({ exists: () => false, data: () => null });
    mockDoc.mockReset().mockReturnValue({ path: 'mocked-doc-ref' });

    vi.spyOn(firebaseServices, 'getFirebaseServices').mockReturnValue({
      db: fakeDb,
      auth: {} as any,
    });
    (globalThis as any).window = (globalThis as any).window || {};
    (globalThis as any).window.browserAPI = {
      getSavedSession: vi.fn().mockResolvedValue({ cookies: [], openUrls: [] }),
      saveSavedSession: vi.fn().mockResolvedValue(true),
    };
  });

  it('saves session cookies and openUrls to users/{uid}/profile_cookies/{profileId}', async () => {
    const cookies = [
      {
        name: 'session',
        value: 'abc123secret',
        domain: '.example.com',
        path: '/',
        secure: true,
        httpOnly: true,
      },
    ];
    const openUrls = ['https://example.com/app', 'https://github.com'];

    await saveProfileSessionToCloud(fakeUser, 'profile-1', cookies, openUrls);

    expect(mockDoc).toHaveBeenCalledWith(fakeDb, 'users', 'test-user-123', 'profile_cookies', 'profile-1');
    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        profileId: 'profile-1',
        count: 1,
        cookiesJson: expect.stringContaining('abc123secret'),
        openUrls: ['https://example.com/app', 'https://github.com'],
        updatedAt: expect.any(Number),
      })
    );
  });

  it('restores cloud session into local machine when cloud has saved cookies', async () => {
    const cloudCookies = [
      { name: 'login_token', value: 'token_xyz', domain: 'mail.google.com', path: '/', secure: true, httpOnly: true },
    ];
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        profileId: 'profile-1',
        count: 1,
        cookiesJson: JSON.stringify(cloudCookies),
        openUrls: ['https://mail.google.com'],
        updatedAt: 1234567,
      }),
    });

    await restoreProfileSessionFromCloud(fakeUser, 'profile-1');

    expect((globalThis as any).window.browserAPI.saveSavedSession).toHaveBeenCalledWith('profile-1', {
      cookies: cloudCookies,
      openUrls: ['https://mail.google.com'],
    });
  });

  it('uploads local session to cloud if cloud has no record yet for the profile', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => false,
      data: () => null,
    });

    const localCookies = [{ name: 'local_auth', value: 'val123', domain: 'test.com', path: '/' }];
    ((globalThis as any).window.browserAPI.getSavedSession as any).mockResolvedValueOnce({
      cookies: localCookies,
      openUrls: ['https://test.com'],
    });

    await restoreProfileSessionFromCloud(fakeUser, 'profile-2');

    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        profileId: 'profile-2',
        count: 1,
        cookiesJson: expect.stringContaining('local_auth'),
      })
    );
  });
});
