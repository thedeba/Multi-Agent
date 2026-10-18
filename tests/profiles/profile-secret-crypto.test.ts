import { describe, expect, it } from 'vitest';
import { decryptProfileSecrets, encryptProfileSecrets } from '../../src/ui/services/profile-secret-crypto';

describe('encrypted proxy credentials', () => {
  it('encrypts secrets so they can only be recovered with the same passphrase', async () => {
    const payload = {
      username: 'proxy-user',
      password: 'proxy-password',
      changeIpUrl: 'https://proxy.example/change-ip',
    };

    const envelope = await encryptProfileSecrets(payload, 'a long sync passphrase');

    expect(envelope.ciphertext).not.toContain('proxy-password');
    await expect(decryptProfileSecrets(envelope, 'a long sync passphrase')).resolves.toEqual(payload);
    await expect(decryptProfileSecrets(envelope, 'a different passphrase'))
      .rejects.toThrow('Could not decrypt proxy credentials.');
  });

  it('rejects a modified encrypted payload', async () => {
    const envelope = await encryptProfileSecrets({ password: 'secret' }, 'a long sync passphrase');
    const modified = {
      ...envelope,
      ciphertext: `${envelope.ciphertext.slice(0, -4)}AAAA`,
    };

    await expect(decryptProfileSecrets(modified, 'a long sync passphrase'))
      .rejects.toThrow('Could not decrypt proxy credentials.');
  });

  it('requires a long passphrase', async () => {
    await expect(encryptProfileSecrets({ password: 'secret' }, 'short'))
      .rejects.toThrow('between 12 and 1024 characters');
  });
});
