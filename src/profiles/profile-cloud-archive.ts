import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { createReadStream, createWriteStream } from 'fs';
import { IncomingMessage } from 'http';
import fs from 'fs/promises';
import https from 'https';
import os from 'os';
import path from 'path';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import * as tar from 'tar';
import { AppPaths } from '../platform/paths';
import { ProfileLock } from './profile-lock';

const MAGIC = Buffer.from('MAGENT01');
const SALT_BYTES = 16;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const HEADER_BYTES = MAGIC.length + SALT_BYTES + IV_BYTES;
const MAX_ARCHIVE_BYTES = 2 * 1024 * 1024 * 1024;

export interface CloudArchiveCredentials {
  idToken: string;
  passphrase: string;
  bucket: string;
}

function deriveKey(passphrase: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      passphrase,
      salt,
      32,
      { N: 1 << 15, r: 8, p: 1, maxmem: 128 * 1024 * 1024 },
      (error, key) => error ? reject(error) : resolve(key as Buffer)
    );
  });
}

function isExcludedArchiveEntry(entryPath: string): boolean {
  const segments = entryPath.split(/[\\/]+/).filter(Boolean);
  const baseName = segments.at(-1)?.toLowerCase() || '';
  return (
    baseName === 'local state' ||
    baseName === 'login data' ||
    baseName.startsWith('login data-') ||
    baseName === 'web data' ||
    baseName === 'cookies' ||
    baseName.startsWith('cookies-') ||
    baseName.startsWith('singleton') ||
    baseName === 'devtoolsactiveport' ||
    baseName === '.profile.lock' ||
    ['fingerprintprotectionextension', 'sessionsyncextension', 'proxyauthExtension'.toLowerCase()]
      .some((excluded) => segments.some((segment) => segment.toLowerCase() === excluded))
  );
}

function isSafeArchivePath(entryPath: string): boolean {
  const normalized = entryPath.replace(/\\/g, '/');
  return !normalized.startsWith('/') &&
    !normalized.split('/').some((part) => part === '..' || part === '');
}

function requestStorage(
  url: URL,
  token: string,
  method: 'GET' | 'POST',
  filePath?: string,
): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string | number> = {
      Authorization: `Bearer ${token}`,
    };
    if (filePath) {
      headers['Content-Type'] = 'application/octet-stream';
      fs.stat(filePath).then(({ size }) => {
        headers['Content-Length'] = size;
        sendRequest();
      }, reject);
    } else {
      sendRequest();
    }

    function sendRequest() {
      const request = https.request(url, { method, headers, timeout: 10 * 60 * 1000 }, (response) => {
        if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response);
          return;
        }

        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => {
          const message = Buffer.concat(chunks).toString('utf8').slice(0, 1000);
          if (response.statusCode === 404) {
            reject(Object.assign(new Error('Cloud profile archive not found.'), { code: 'NOT_FOUND' }));
          } else {
            reject(new Error(`Cloud Storage request failed (${response.statusCode}): ${message}`));
          }
        });
      });
      request.on('timeout', () => request.destroy(new Error('Cloud Storage request timed out.')));
      request.on('error', reject);
      if (filePath) {
        createReadStream(filePath).on('error', (error) => request.destroy(error)).pipe(request);
      } else {
        request.end();
      }
    }
  });
}

function archiveUrl(bucket: string, objectPath: string): URL {
  if (!/^[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]$/.test(bucket)) {
    throw new Error('Firebase Storage bucket is not configured correctly.');
  }
  const url = new URL(`https://firebasestorage.googleapis.com/v0/b/${bucket}/o`);
  url.searchParams.set('name', objectPath);
  url.searchParams.set('uploadType', 'media');
  return url;
}

function downloadUrl(bucket: string, objectPath: string): URL {
  if (!/^[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]$/.test(bucket)) {
    throw new Error('Firebase Storage bucket is not configured correctly.');
  }
  return new URL(
    `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(objectPath)}?alt=media`
  );
}

function getObjectPath(userId: string, profileId: string): string {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(profileId)) {
    throw new Error('Invalid profile ID.');
  }
  return `users/${userId}/profiles/${profileId}/profile.archive`;
}

async function createEncryptedArchive(
  profileDir: string,
  passphrase: string,
  outputPath: string,
  workDir: string,
): Promise<void> {
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const key = await deriveKey(passphrase, salt);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const header = Buffer.concat([MAGIC, salt, iv]);
  await fs.writeFile(outputPath, header, { mode: 0o600 });
  let archiveBytes = 0;
  const sizeLimiter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      archiveBytes += chunk.length;
      if (archiveBytes > MAX_ARCHIVE_BYTES) {
        callback(new Error('Profile snapshot exceeds the 2 GB cloud sync limit.'));
      } else {
        callback(null, chunk);
      }
    },
  });
  try {
    await pipeline(
      tar.c(
        {
          cwd: profileDir,
          gzip: true,
          filter: (entryPath, entry) =>
            isSafeArchivePath(entryPath) &&
            !isExcludedArchiveEntry(entryPath) &&
            !('type' in entry && (entry.type === 'SymbolicLink' || entry.type === 'Link')),
        },
        ['.']
      ),
      sizeLimiter,
      cipher,
      createWriteStream(outputPath, { flags: 'a', mode: 0o600 })
    );
    await fs.appendFile(outputPath, cipher.getAuthTag());
  } finally {
    key.fill(0);
  }

  const encryptedStats = await fs.stat(outputPath);
  if (encryptedStats.size > MAX_ARCHIVE_BYTES) {
    throw new Error('Encrypted profile snapshot exceeds the 2 GB cloud sync limit.');
  }
}

async function decryptAndExtractArchive(
  encryptedPath: string,
  passphrase: string,
  profileDir: string,
  workDir: string,
): Promise<void> {
  const stats = await fs.stat(encryptedPath);
  if (stats.size < HEADER_BYTES + TAG_BYTES || stats.size > MAX_ARCHIVE_BYTES) {
    throw new Error('Cloud profile archive has an invalid size.');
  }

  const file = await fs.open(encryptedPath, 'r');
  const header = Buffer.alloc(HEADER_BYTES);
  const tag = Buffer.alloc(TAG_BYTES);
  try {
    await file.read(header, 0, HEADER_BYTES, 0);
    await file.read(tag, 0, TAG_BYTES, stats.size - TAG_BYTES);
  } finally {
    await file.close();
  }

  if (!header.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error('Cloud profile archive has an unsupported format.');
  }

  const salt = header.subarray(MAGIC.length, MAGIC.length + SALT_BYTES);
  const iv = header.subarray(MAGIC.length + SALT_BYTES);
  const key = await deriveKey(passphrase, salt);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const tarPath = path.join(workDir, 'restored-profile.tar.gz');
  try {
    await pipeline(
      createReadStream(encryptedPath, {
        start: HEADER_BYTES,
        end: stats.size - TAG_BYTES - 1,
      }),
      decipher,
      createWriteStream(tarPath, { mode: 0o600 })
    );
  } catch {
    throw new Error('Could not decrypt the cloud profile archive. Check the sync passphrase.');
  } finally {
    key.fill(0);
  }

  await tar.x({
    cwd: profileDir,
    file: tarPath,
    strict: true,
    filter: (entryPath, entry) =>
      isSafeArchivePath(entryPath) &&
      !isExcludedArchiveEntry(entryPath) &&
      !('type' in entry && (entry.type === 'SymbolicLink' || entry.type === 'Link')),
  });
}

export async function encryptProfileDirectoryForCloud(
  profileDir: string,
  passphrase: string,
  outputPath: string,
): Promise<void> {
  validatePassphrase(passphrase);
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'multi-agent-profile-archive-'));
  try {
    await createEncryptedArchive(profileDir, passphrase, outputPath, workDir);
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}

export async function decryptProfileDirectoryFromCloud(
  encryptedPath: string,
  passphrase: string,
  profileDir: string,
): Promise<void> {
  validatePassphrase(passphrase);
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'multi-agent-profile-archive-'));
  try {
    await decryptAndExtractArchive(encryptedPath, passphrase, profileDir, workDir);
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}

export async function uploadProfileArchive(
  userId: string,
  profileId: string,
  credentials: CloudArchiveCredentials,
): Promise<void> {
  validateCredentials(credentials);
  if (!ProfileLock.acquire(profileId)) {
    throw new Error('Close this profile before uploading its cloud snapshot.');
  }

  const profileDir = AppPaths.getProfileStorageDir(profileId);
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'multi-agent-profile-'));
  const encryptedPath = path.join(workDir, 'profile.archive.enc');
  try {
    await createEncryptedArchive(profileDir, credentials.passphrase, encryptedPath, workDir);
    const url = archiveUrl(credentials.bucket, getObjectPath(userId, profileId));
    const response = await requestStorage(url, credentials.idToken, 'POST', encryptedPath);
    response.resume();
    await new Promise<void>((resolve, reject) => {
      response.on('end', resolve);
      response.on('error', reject);
    });
  } finally {
    ProfileLock.release(profileId);
    await fs.rm(workDir, { recursive: true, force: true });
  }
}

export async function restoreProfileArchive(
  userId: string,
  profileId: string,
  credentials: CloudArchiveCredentials,
): Promise<'restored' | 'already-local' | 'not-found'> {
  validateCredentials(credentials);
  if (!ProfileLock.acquire(profileId)) {
    throw new Error('Close this profile before restoring its cloud snapshot.');
  }

  const profileDir = AppPaths.getProfileStorageDir(profileId);
  const chromiumDir = path.join(profileDir, 'ChromiumProfileData');
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'multi-agent-profile-'));
  const encryptedPath = path.join(workDir, 'profile.archive.enc');
  try {
    try {
      await fs.access(path.join(chromiumDir, 'Default'));
      return 'already-local';
    } catch {
      // This device has not yet created Chromium data for this profile.
    }

    const url = downloadUrl(credentials.bucket, getObjectPath(userId, profileId));
    let response: IncomingMessage;
    try {
      response = await requestStorage(url, credentials.idToken, 'GET');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'NOT_FOUND') return 'not-found';
      throw error;
    }

    const contentLength = Number(response.headers['content-length']);
    if (Number.isFinite(contentLength) && contentLength > MAX_ARCHIVE_BYTES) {
      response.destroy();
      throw new Error('Cloud profile snapshot exceeds the 2 GB restore limit.');
    }
    await pipeline(response, createWriteStream(encryptedPath, { mode: 0o600 }));
    const downloadedStats = await fs.stat(encryptedPath);
    if (downloadedStats.size > MAX_ARCHIVE_BYTES) {
      throw new Error('Cloud profile snapshot exceeds the 2 GB restore limit.');
    }
    await decryptAndExtractArchive(encryptedPath, credentials.passphrase, profileDir, workDir);
    return 'restored';
  } finally {
    ProfileLock.release(profileId);
    await fs.rm(workDir, { recursive: true, force: true });
  }
}

function validateCredentials(credentials: CloudArchiveCredentials): void {
  if (!credentials.idToken || credentials.idToken.length > 8192) {
    throw new Error('Sign in again before syncing profile data.');
  }
  validatePassphrase(credentials.passphrase);
  if (!credentials.bucket) {
    throw new Error('Cloud Storage is not configured. Set VITE_FIREBASE_STORAGE_BUCKET and rebuild.');
  }
}

function validatePassphrase(passphrase: string): void {
  if (passphrase.length < 12 || passphrase.length > 1024) {
    throw new Error('The sync passphrase must be between 12 and 1024 characters.');
  }
}
