import { describe, expect, it } from 'vitest';
import { serializeCloudProfile } from '../../src/ui/services/cloud-profile-sync';
import { Profile } from '../../src/security/ipc-contracts';

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
