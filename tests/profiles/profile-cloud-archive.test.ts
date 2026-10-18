import { mkdtemp, mkdir, readFile, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  decryptProfileDirectoryFromCloud,
  encryptProfileDirectoryForCloud,
} from '../../src/profiles/profile-cloud-archive';

const passphrase = 'correct horse cloud backup';
const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'multi-agent-archive-test-'));
  tempDirs.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('encrypted profile archives', () => {
  it('round-trips browser state while excluding OS-bound credentials and lock files', async () => {
    const source = await createTempDir();
    const destination = await createTempDir();
    const encryptedArchive = path.join(await createTempDir(), 'profile.archive.enc');

    await mkdir(path.join(source, 'ChromiumProfileData', 'Default'), { recursive: true });
    await writeFile(path.join(source, 'ChromiumProfileData', 'Default', 'Preferences'), '{"session":true}');
    await writeFile(path.join(source, 'ChromiumProfileData', 'Default', 'Login Data'), 'OS encrypted passwords');
    await writeFile(path.join(source, 'ChromiumProfileData', 'Default', 'Cookies'), 'OS encrypted cookies');
    await writeFile(path.join(source, 'ChromiumProfileData', 'Local State'), 'OS encryption key');
    await writeFile(path.join(source, 'cookies.json'), '[{"name":"session"}]');
    await writeFile(path.join(source, 'session.json'), '{"openUrls":["https://example.com"]}');
    await writeFile(path.join(source, '.profile.lock'), '{"pid":123}');

    await encryptProfileDirectoryForCloud(source, passphrase, encryptedArchive);
    expect(await readFile(encryptedArchive, 'utf8')).not.toContain('OS encrypted passwords');

    await decryptProfileDirectoryFromCloud(encryptedArchive, passphrase, destination);

    expect(await readFile(path.join(destination, 'ChromiumProfileData', 'Default', 'Preferences'), 'utf8'))
      .toBe('{"session":true}');
    expect(await readFile(path.join(destination, 'cookies.json'), 'utf8'))
      .toBe('[{"name":"session"}]');
    await expect(readFile(path.join(destination, 'ChromiumProfileData', 'Default', 'Login Data')))
      .rejects.toMatchObject({ code: 'ENOENT' });
    await expect(readFile(path.join(destination, 'ChromiumProfileData', 'Default', 'Cookies')))
      .rejects.toMatchObject({ code: 'ENOENT' });
    await expect(readFile(path.join(destination, 'ChromiumProfileData', 'Local State')))
      .rejects.toMatchObject({ code: 'ENOENT' });
    await expect(readFile(path.join(destination, '.profile.lock')))
      .rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rejects incorrect passphrases without extracting an unauthenticated archive', async () => {
    const source = await createTempDir();
    const destination = await createTempDir();
    const encryptedArchive = path.join(await createTempDir(), 'profile.archive.enc');

    await writeFile(path.join(source, 'cookies.json'), 'private session state');
    await encryptProfileDirectoryForCloud(source, passphrase, encryptedArchive);

    await expect(decryptProfileDirectoryFromCloud(encryptedArchive, 'incorrect passphrase', destination))
      .rejects.toThrow('Could not decrypt the cloud profile archive.');
    await expect(readFile(path.join(destination, 'cookies.json')))
      .rejects.toMatchObject({ code: 'ENOENT' });
  });
});
