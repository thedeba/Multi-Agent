import {
  ProfileRecord,
  CreateProfileDTO,
  UpdateProfileDTO,
  ProfileExport,
  ProfileExportSchema,
  ProfileRecordSchema,
} from './profile-model';
import { ProfileStorage } from './profile-storage';

export class ProfileManager {
  private profiles: Map<string, ProfileRecord> = new Map();
  private activeProfileId: string | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    const loaded = ProfileStorage.loadProfilesManifest();
    const withoutDemoProfiles = ProfileStorage.removeDemoProfiles(loaded);
    const cleaned = ProfileStorage.cleanupTemporaryProfiles(withoutDemoProfiles);
    for (const profile of cleaned) this.profiles.set(profile.id, profile);
    this.activeProfileId = cleaned[0]?.id ?? null;
  }

  private createProfileInternal(data: {
    id: string;
    name: string;
    isTemporary: boolean;
    privacyLevel: 'standard' | 'balanced' | 'strict';
    webrtcPolicy: 'default' | 'default_public_interface_only' | 'disable_non_proxied_udp' | 'disabled';
    proxy: any;
    os?: 'mac' | 'windows';
    browserType?: 'chrome' | 'edge' | 'brave';
    browserVersion?: string;
    customUserAgent?: string;
    language?: string;
    timezone?: string;
    notes?: string;
    group?: string;
    tags?: string[];
    color: string;
    remoteDebuggingPort?: number;
  }): ProfileRecord {
    const now = Date.now();
    const storagePath = ProfileStorage.ensureProfileDirectory(data.id);
    const profile: ProfileRecord = {
      ...data,
      storagePath,
      status: 'stopped',
      lastUsedAt: null,
      os: data.os || 'mac',
      browserType: data.browserType || 'chrome',
      browserVersion: data.browserVersion || '150.0.0.0',
      language: data.language || 'en-US',
      timezone: data.timezone || 'auto',
      notes: data.notes || '',
      group: data.group || 'Default',
      tags: data.tags || [],
      remoteDebuggingPort: data.remoteDebuggingPort,
      createdAt: now,
      updatedAt: now,
    };

    this.profiles.set(profile.id, profile);
    if (!this.activeProfileId) this.activeProfileId = profile.id;
    return profile;
  }

  public createProfile(dto: CreateProfileDTO): ProfileRecord {
    this.refreshProfiles();
    const id = `profile-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const profile = this.createProfileInternal({
      id,
      name: dto.name.trim(),
      isTemporary: dto.isTemporary || false,
      privacyLevel: dto.privacyLevel || 'balanced',
      webrtcPolicy: dto.webrtcPolicy || 'default_public_interface_only',
      proxy: dto.proxy || { enabled: false, mode: 'direct', host: '', port: 8080 },
      os: dto.os || 'mac',
      browserType: dto.browserType || 'chrome',
      browserVersion: dto.browserVersion || '150.0.0.0',
      customUserAgent: dto.customUserAgent?.trim() || undefined,
      language: dto.language?.trim() || 'en-US',
      timezone: dto.timezone?.trim() || 'auto',
      notes: dto.notes || '',
      group: dto.group || 'Default',
      tags: dto.tags || [],
      color: dto.color || '#8b5cf6',
      remoteDebuggingPort: dto.remoteDebuggingPort,
    });

    this.persist([profile.id]);
    return profile;
  }

  public getProfile(profileId: string): ProfileRecord | undefined {
    this.refreshProfiles();
    return this.profiles.get(profileId);
  }

  public listProfiles(): ProfileRecord[] {
    this.refreshProfiles();
    return Array.from(this.profiles.values());
  }

  public replaceSyncedProfiles(records: unknown[]): ProfileRecord[] {
    this.refreshProfiles();
    const nextProfiles = new Map<string, ProfileRecord>();

    for (const record of records) {
      const parsed = ProfileRecordSchema.safeParse(record);
      if (!parsed.success) {
        throw new Error('Cloud profile data is invalid.');
      }
      const remote = parsed.data;
      if (!/^[a-zA-Z0-9_-]+$/.test(remote.id)) {
        throw new Error('Cloud profile data is invalid.');
      }
      if (remote.isTemporary) continue;

      const local = this.profiles.get(remote.id);
      const profile: ProfileRecord = {
        ...remote,
        storagePath: ProfileStorage.ensureProfileDirectory(remote.id),
        isTemporary: false,
        status: 'stopped',
        lastUsedAt: local?.lastUsedAt ?? null,
        proxy: {
          ...remote.proxy,
          username: local?.proxy.username ?? remote.proxy.username,
          password: local?.proxy.password ?? remote.proxy.password,
          changeIpUrl: local?.proxy.changeIpUrl ?? remote.proxy.changeIpUrl,
          proxyType: local?.proxy.proxyType ?? remote.proxy.proxyType,
          freeProxyId: local?.proxy.freeProxyId ?? remote.proxy.freeProxyId,
        },
      };
      nextProfiles.set(remote.id, profile);
    }

    this.profiles = nextProfiles;
    if (!this.activeProfileId || !nextProfiles.has(this.activeProfileId)) {
      this.activeProfileId = nextProfiles.keys().next().value ?? null;
    }
    ProfileStorage.replaceProfilesManifest(Array.from(nextProfiles.values()));
    return Array.from(this.profiles.values());
  }

  public getActiveProfile(): ProfileRecord {
    this.refreshProfiles();
    const active = this.activeProfileId ? this.profiles.get(this.activeProfileId) : undefined;
    if (active) return active;
    const fallback = Array.from(this.profiles.values())[0];
    if (!fallback) {
      throw new Error('No profiles are available. Sign in and create a profile first.');
    }
    this.activeProfileId = fallback.id;
    return fallback;
  }

  public setActiveProfile(profileId: string): boolean {
    this.refreshProfiles();
    if (this.profiles.has(profileId)) {
      this.activeProfileId = profileId;
      return true;
    }
    return false;
  }

  public updateProfile(profileId: string, dto: UpdateProfileDTO): ProfileRecord {
    this.refreshProfiles();
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`);
    }

    if (dto.name !== undefined) profile.name = dto.name.trim();
    if (dto.privacyLevel !== undefined) profile.privacyLevel = dto.privacyLevel;
    if (dto.webrtcPolicy !== undefined) profile.webrtcPolicy = dto.webrtcPolicy;
    if (dto.proxy !== undefined) profile.proxy = dto.proxy;
    if (dto.os !== undefined) profile.os = dto.os;
    if (dto.browserType !== undefined) profile.browserType = dto.browserType;
    if (dto.browserVersion !== undefined) profile.browserVersion = dto.browserVersion;
    if (dto.customUserAgent !== undefined) {
      profile.customUserAgent = dto.customUserAgent.trim() || undefined;
    }
    if (dto.language !== undefined) profile.language = dto.language.trim() || 'en-US';
    if (dto.timezone !== undefined) profile.timezone = dto.timezone.trim() || 'auto';
    if (dto.notes !== undefined) profile.notes = dto.notes;
    if (dto.group !== undefined) profile.group = dto.group;
    if (dto.tags !== undefined) profile.tags = dto.tags;
    if (dto.color !== undefined) profile.color = dto.color;
    if (dto.remoteDebuggingPort !== undefined) profile.remoteDebuggingPort = dto.remoteDebuggingPort;
    profile.updatedAt = Date.now();

    this.persist([profileId]);
    return profile;
  }

  public updateProfileStatus(profileId: string, status: 'stopped' | 'running' | 'crashed'): void {
    this.refreshProfiles();
    const profile = this.profiles.get(profileId);
    if (profile) {
      profile.status = status;
      if (status === 'running') {
        profile.lastUsedAt = Date.now();
      }
      this.persist([profileId]);
    }
  }

  public renameProfile(profileId: string, newName: string): ProfileRecord {
    return this.updateProfile(profileId, { name: newName });
  }

  public duplicateProfile(profileId: string, newName?: string): ProfileRecord {
    this.refreshProfiles();
    const source = this.profiles.get(profileId);
    if (!source) {
      throw new Error(`Profile not found: ${profileId}`);
    }

    const duplicatedName = newName || `${source.name} (Copy)`;
    return this.createProfile({
      name: duplicatedName,
      isTemporary: source.isTemporary,
      privacyLevel: source.privacyLevel,
      webrtcPolicy: source.webrtcPolicy,
      proxy: { ...source.proxy },
      os: source.os,
      browserType: source.browserType,
      browserVersion: source.browserVersion,
      customUserAgent: source.customUserAgent,
      language: source.language,
      timezone: source.timezone,
      notes: source.notes,
      group: source.group,
      tags: [...source.tags],
      color: source.color,
    });
  }

  public deleteProfile(profileId: string): boolean {
    this.refreshProfiles();
    const profile = this.profiles.get(profileId);
    if (!profile) return false;

    // Delete directory
    ProfileStorage.deleteProfileDirectory(profileId);
    this.profiles.delete(profileId);

    // If active profile was deleted, switch to another
    if (this.activeProfileId === profileId) {
      this.activeProfileId = Array.from(this.profiles.values())[0]?.id ?? null;
    }

    this.persist([profile.id]);
    return true;
  }

  public exportProfile(profileId: string): string {
    this.refreshProfiles();
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`);
    }

    const exportData: ProfileExport = {
      version: 1,
      exportedAt: Date.now(),
      profile: { ...profile },
    };

    return JSON.stringify(exportData, null, 2);
  }

  public importProfile(jsonContent: string): ProfileRecord {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonContent);
    } catch {
      throw new Error('Invalid JSON format for profile import');
    }

    const validated = ProfileExportSchema.parse(parsed);
    const importedProfile = validated.profile;

    // Generate fresh profile ID to avoid conflict
    const newId = `profile-imported-${Date.now()}`;
    return this.createProfile({
      name: `${importedProfile.name} (Imported)`,
      isTemporary: importedProfile.isTemporary,
      privacyLevel: importedProfile.privacyLevel,
      webrtcPolicy: importedProfile.webrtcPolicy,
      proxy: importedProfile.proxy,
      os: importedProfile.os,
      browserType: importedProfile.browserType,
      browserVersion: importedProfile.browserVersion,
      customUserAgent: importedProfile.customUserAgent,
      notes: importedProfile.notes,
      tags: importedProfile.tags,
      color: importedProfile.color,
    });
  }

  private persist(profileIds?: string[]): void {
    ProfileStorage.saveProfilesManifest(Array.from(this.profiles.values()), profileIds);
  }

  private refreshProfiles(): void {
    const loaded = ProfileStorage.loadProfilesManifest();
    const cleaned = ProfileStorage.removeDemoProfiles(loaded);
    this.profiles = new Map(cleaned.map((profile) => [profile.id, profile]));
    if (!this.activeProfileId || !this.profiles.has(this.activeProfileId)) {
      this.activeProfileId = cleaned[0]?.id ?? null;
    }
  }
}
