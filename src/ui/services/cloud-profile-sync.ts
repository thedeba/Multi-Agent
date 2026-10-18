import { User } from 'firebase/auth';
import {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { execute } from 'firebase/firestore/pipelines';
import { Profile } from '../../security/ipc-contracts';
import { ProfileRecordSchema } from '../../profiles/profile-model';
import { getFirebaseServices } from './firebase';
import {
  decryptProfileSecrets,
  type EncryptedSecrets,
  encryptProfileSecrets,
} from './profile-secret-crypto';

interface EncryptedProfileSecrets extends EncryptedSecrets {
  profileId: string;
  updatedAt: number;
}

async function saveProfileSecretsToCloud(
  user: User,
  profile: Profile,
  passphrase: string,
): Promise<void> {
  const { username, password, changeIpUrl, proxyType, freeProxyId } = profile.proxy;
  const secrets = { username, password, changeIpUrl, proxyType, freeProxyId };
  const reference = doc(getFirebaseServices().db, 'users', user.uid, 'profile_secrets', profile.id);
  if (!Object.values(secrets).some((value) => value !== undefined && value !== '')) {
    await deleteDoc(reference);
    return;
  }

  const encrypted = await encryptProfileSecrets(secrets, passphrase);
  await setDoc(reference, {
    profileId: profile.id,
    ...encrypted,
    updatedAt: Date.now(),
  } satisfies EncryptedProfileSecrets);
}

async function restoreProfileSecretsFromCloud(
  user: User,
  profileId: string,
  passphrase: string,
): Promise<Profile['proxy'] | null> {
  const { db } = getFirebaseServices();
  const snapshot = await getDoc(doc(db, 'users', user.uid, 'profile_secrets', profileId));
  if (!snapshot.exists()) return null;

  const data = snapshot.data() as Partial<EncryptedProfileSecrets>;
  if (
    data.profileId !== profileId ||
    data.version !== 1 ||
    typeof data.salt !== 'string' ||
    typeof data.iv !== 'string' ||
    typeof data.ciphertext !== 'string'
  ) {
    throw new Error(`Encrypted proxy credentials are invalid for profile ${profileId}.`);
  }

  const secrets = await decryptProfileSecrets({
    version: data.version,
    salt: data.salt,
    iv: data.iv,
    ciphertext: data.ciphertext,
  }, passphrase);
  if (typeof secrets !== 'object' || secrets === null || Array.isArray(secrets)) {
    throw new Error('Encrypted proxy credentials have an invalid payload.');
  }
  const values = secrets as Record<string, unknown>;
  if (
    (values.username !== undefined && typeof values.username !== 'string') ||
    (values.password !== undefined && typeof values.password !== 'string') ||
    (values.changeIpUrl !== undefined && typeof values.changeIpUrl !== 'string') ||
    (values.proxyType !== undefined && !['manual', 'free', 'direct'].includes(String(values.proxyType))) ||
    (values.freeProxyId !== undefined && typeof values.freeProxyId !== 'string')
  ) {
    throw new Error('Encrypted proxy credentials have an invalid payload.');
  }

  const restored: Record<string, unknown> = {};
  if (typeof values.username === 'string') restored.username = values.username;
  if (typeof values.password === 'string') restored.password = values.password;
  if (typeof values.changeIpUrl === 'string') restored.changeIpUrl = values.changeIpUrl;
  if (['manual', 'free', 'direct'].includes(String(values.proxyType))) {
    restored.proxyType = values.proxyType;
  }
  if (typeof values.freeProxyId === 'string') restored.freeProxyId = values.freeProxyId;
  return restored as Profile['proxy'];
}

async function restoreLegacyCookiesIfLocalSessionIsEmpty(user: User, profileId: string): Promise<void> {
  const localSession = await window.browserAPI.getSavedSession(profileId);
  if (Array.isArray(localSession?.cookies) && localSession.cookies.length > 0) return;

  const snapshot = await getDoc(doc(getFirebaseServices().db, 'users', user.uid, 'profile_cookies', profileId));
  if (!snapshot.exists()) return;
  const data = snapshot.data();
  if (typeof data.cookiesJson !== 'string' || data.cookiesJson.length > 1_048_576) {
    throw new Error(`Legacy session backup is invalid for profile ${profileId}.`);
  }
  let cookies: unknown;
  try {
    cookies = JSON.parse(data.cookiesJson);
  } catch {
    throw new Error(`Legacy session backup is invalid for profile ${profileId}.`);
  }
  if (!Array.isArray(cookies)) {
    throw new Error(`Legacy session backup is invalid for profile ${profileId}.`);
  }
  const openUrls = Array.isArray(data.openUrls)
    ? data.openUrls.filter((url): url is string => typeof url === 'string').slice(0, 50)
    : [];
  await window.browserAPI.saveSavedSession(profileId, { cookies, openUrls });
}

export function serializeCloudProfile(profile: Profile) {
  const { proxy } = profile;
  const settings = Object.fromEntries(
    Object.entries(profile).filter(([key, value]) =>
      value !== undefined &&
      !['proxy', 'storagePath', 'status', 'lastUsedAt'].includes(key)
    )
  );
  return {
    ...settings,
    isTemporary: false,
    proxy: {
      enabled: proxy.enabled,
      mode: proxy.mode,
      host: proxy.host,
      port: proxy.port,
    },
  };
}

const demoProfileIds = ['default', 'profile-work', 'profile-testing'];

function parseCloudProfile(id: string, data: Record<string, unknown>): Profile {
  if (data.id !== id) {
    throw new Error(`Cloud profile ID does not match its document: ${id}`);
  }

  const parsed = ProfileRecordSchema.parse({
    ...data,
    id,
    storagePath: '',
    status: 'stopped',
    lastUsedAt: null,
    proxy: data.proxy,
  });
  return parsed;
}

export async function syncProfilesFromCloud(user: User, passphrase?: string): Promise<Profile[]> {
  const { db } = getFirebaseServices();

  const snapshot = await execute(db.pipeline().collection(`users/${user.uid}/profiles`));
  const rawProfiles = snapshot.results.map((profileDoc) => {
    if (!profileDoc.id) {
      throw new Error('Cloud profile query returned a non-document result.');
    }
    return parseCloudProfile(profileDoc.id, profileDoc.data());
  });

  const remoteProfiles: Profile[] = [];
  const cleanupBatch = writeBatch(db);
  let hasCleanup = false;

  for (const p of rawProfiles) {
    const lowerName = (p.name || '').trim().toLowerCase();
    if (
      demoProfileIds.includes(p.id) ||
      lowerName === 'keep me' ||
      lowerName === 'temporary session' ||
      lowerName === 'running temporary' ||
      lowerName.startsWith('demo')
    ) {
      cleanupBatch.delete(doc(db, 'users', user.uid, 'profiles', p.id));
      hasCleanup = true;
    } else {
      remoteProfiles.push(p);
    }
  }

  if (hasCleanup) {
    cleanupBatch.commit().catch((err) => console.warn('Cleanup batch failed:', err));
  }

  const localProfiles = await window.browserAPI.listProfiles();
  const persistentLocalProfiles = (localProfiles || []).filter((p) => {
    if (p.isTemporary) return false;
    if (demoProfileIds.includes(p.id)) return false;
    const lowerName = (p.name || '').trim().toLowerCase();
    return (
      lowerName !== 'keep me' &&
      lowerName !== 'temporary session' &&
      lowerName !== 'running temporary' &&
      !lowerName.startsWith('demo')
    );
  });

  // If cloud has no profiles, but we have persistent local profiles on this device:
  // Upload local profiles to cloud rather than wiping local profiles!
  let accountProfiles: Profile[] = [];
  if (remoteProfiles.length === 0) {
    if (persistentLocalProfiles.length > 0) {
      for (const p of persistentLocalProfiles) {
        await saveProfileToCloud(user, p, passphrase);
      }
      accountProfiles = persistentLocalProfiles;
    } else {
      accountProfiles = await window.browserAPI.replaceCloudProfiles([]);
    }
  } else {
    // Merge remote profiles with any local profiles not yet in cloud
    const remoteIdSet = new Set(remoteProfiles.map((p) => p.id));
    const unSyncedLocalProfiles = persistentLocalProfiles.filter((p) => !remoteIdSet.has(p.id));
    const mergedProfiles = [...remoteProfiles, ...unSyncedLocalProfiles];
    accountProfiles = await window.browserAPI.replaceCloudProfiles(mergedProfiles);
  }

  if (passphrase) {
    const idToken = await user.getIdToken();
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const bucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;

    for (const profile of accountProfiles) {
      const currentProfiles = await window.browserAPI.listProfiles();
      const current = currentProfiles.find((item) => item.id === profile.id);
      const hasLocalSecrets = Boolean(
        current && [
          current.proxy.username,
          current.proxy.password,
          current.proxy.changeIpUrl,
          current.proxy.freeProxyId,
        ].some(Boolean)
      );
      if (current && hasLocalSecrets) {
        await saveProfileSecretsToCloud(user, current, passphrase);
      } else {
        const secrets = await restoreProfileSecretsFromCloud(user, profile.id, passphrase);
        if (secrets && current) {
          await window.browserAPI.updateProfile(profile.id, {
            proxy: { ...current.proxy, ...secrets },
          });
        } else {
          await saveProfileSecretsToCloud(user, current || profile, passphrase);
        }
      }

      await restoreLegacyCookiesIfLocalSessionIsEmpty(user, profile.id);
      await window.browserAPI.syncCloudProfileArchive(profile.id, {
        idToken,
        apiKey,
        passphrase,
        bucket,
      });
      await deleteDoc(doc(db, 'users', user.uid, 'profile_cookies', profile.id));
    }

    const refreshedProfiles = await window.browserAPI.listProfiles();
    accountProfiles = accountProfiles.map((profile) => {
      const refreshed = refreshedProfiles.find((item) => item.id === profile.id);
      return refreshed || profile;
    });
  }

  return accountProfiles;
}

export async function saveProfileToCloud(
  user: User,
  profile: Profile,
  passphrase?: string
): Promise<void> {
  if (profile.isTemporary) return;
  const { db } = getFirebaseServices();
  await setDoc(
    doc(db, 'users', user.uid, 'profiles', profile.id),
    serializeCloudProfile(profile)
  );
  if (passphrase) await saveProfileSecretsToCloud(user, profile, passphrase);
}

export async function deleteProfileFromCloud(user: User, profileId: string): Promise<void> {
  const { db } = getFirebaseServices();
  const batch = writeBatch(db);
  batch.delete(doc(db, 'users', user.uid, 'profiles', profileId));
  batch.delete(doc(db, 'users', user.uid, 'profile_cookies', profileId));
  batch.delete(doc(db, 'users', user.uid, 'profile_secrets', profileId));
  await batch.commit();
}

export async function deleteLegacyCloudCookies(user: User, profileId: string): Promise<void> {
  await deleteDoc(doc(getFirebaseServices().db, 'users', user.uid, 'profile_cookies', profileId));
}
