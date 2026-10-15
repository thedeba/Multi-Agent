import fs from 'fs';
import path from 'path';

export function createSessionSyncExtension(
  targetDir: string,
  profileId: string,
  serverPort: number
): string {
  fs.mkdirSync(targetDir, { recursive: true });

  const manifest = {
    manifest_version: 3,
    name: 'Multi Agent Session & Cookie Sync',
    version: '1.0.0',
    description: 'Synchronizes cookies and session resume state with Multi Agent.',
    permissions: ['cookies', 'tabs', 'storage'],
    host_permissions: ['<all_urls>'],
    background: {
      service_worker: 'background.js',
    },
  };

  const backgroundJs = `
const PROFILE_ID = ${JSON.stringify(profileId)};
const SERVER_URL = "http://127.0.0.1:${serverPort}";

let isRestoring = false;
let syncTimeout = null;

async function restoreSession() {
  isRestoring = true;
  try {
    const res = await fetch(\`\${SERVER_URL}/api/session?profileId=\${encodeURIComponent(PROFILE_ID)}\`);
    if (!res.ok) {
      return;
    }
    const data = await res.json();
    const cookies = data.cookies || [];
    const openUrls = data.openUrls || [];

    // Inject cookies into Chromium
    for (const c of cookies) {
      try {
        const domain = (c.domain || 'localhost').replace(/^\\./, '');
        const protocol = c.secure ? 'https:' : 'http:';
        const url = \`\${protocol}//\${domain}\${c.path || '/'}\`;

        const details = {
          url,
          name: c.name,
          value: c.value,
          path: c.path || '/',
          secure: !!c.secure,
          httpOnly: !!c.httpOnly,
        };

        if (c.domain) {
          details.domain = c.domain.replace(/^\\./, '');
        }

        if (c.expirationDate && c.expirationDate > Date.now() / 1000) {
          details.expirationDate = c.expirationDate;
        }

        if (c.sameSite && ['lax', 'strict'].includes(c.sameSite)) {
          details.sameSite = c.sameSite;
        } else if (c.sameSite === 'no_restriction' && details.secure) {
          details.sameSite = 'no_restriction';
        }

        await chrome.cookies.set(details);
      } catch (e) {
        // Ignore single cookie format errors
      }
    }

    // If there were saved open URLs from where the browser exited, restore them if currently on empty newtab
    if (openUrls.length > 0) {
      chrome.tabs.query({}, (tabs) => {
        const currentTabs = tabs || [];
        const isOnlyNewTab = currentTabs.length <= 1 &&
          (!currentTabs[0]?.url || currentTabs[0].url.startsWith('chrome://') || currentTabs[0].url.includes('google.com') || currentTabs[0].url.includes('duckduckgo.com'));

        if (isOnlyNewTab) {
          const firstUrl = openUrls[0];
          if (currentTabs[0]?.id && firstUrl) {
            chrome.tabs.update(currentTabs[0].id, { url: firstUrl });
          }
          for (let i = 1; i < openUrls.length; i++) {
            chrome.tabs.create({ url: openUrls[i], active: false });
          }
        }
      });
    }
  } catch (err) {
    console.warn('[SessionSync] Error restoring session:', err);
  } finally {
    isRestoring = false;
  }
}

async function collectAndSync() {
  if (isRestoring) return;

  try {
    const cookies = await chrome.cookies.getAll({});
    const tabs = await chrome.tabs.query({});
    const openUrls = (tabs || [])
      .map((t) => t.url || '')
      .filter((u) => u.startsWith('http://') || u.startsWith('https://'));

    const payload = {
      profileId: PROFILE_ID,
      cookies: (cookies || []).map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        secure: c.secure,
        httpOnly: c.httpOnly,
        sameSite: c.sameSite,
        expirationDate: c.expirationDate,
      })),
      openUrls,
    };

    await fetch(\`\${SERVER_URL}/api/session\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Server might be busy or shutting down
  }
}

function notifyWindowClosed() {
  try {
    fetch(\`\${SERVER_URL}/api/window-closed?profileId=\${encodeURIComponent(PROFILE_ID)}\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId: PROFILE_ID }),
      keepalive: true,
    }).catch(() => {});
  } catch (e) {}
}

function scheduleSync() {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(collectAndSync, 800);
}

// Top-level listener registrations (MANDATORY for Chrome Manifest V3 service workers)
try {
  chrome.cookies.onChanged.addListener(() => {
    scheduleSync();
  });
} catch (e) {}

try {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url) scheduleSync();
  });
} catch (e) {}

try {
  chrome.tabs.onRemoved.addListener(async () => {
    scheduleSync();
    try {
      const tabs = await chrome.tabs.query({});
      if (!tabs || tabs.length === 0) {
        notifyWindowClosed();
      }
    } catch (e) {}
  });
} catch (e) {}

try {
  chrome.tabs.onCreated.addListener(() => {
    scheduleSync();
  });
} catch (e) {}

try {
  if (chrome.windows && chrome.windows.onRemoved) {
    chrome.windows.onRemoved.addListener(async () => {
      try {
        const wins = await chrome.windows.getAll({});
        if (!wins || wins.length === 0) {
          notifyWindowClosed();
        }
      } catch (e) {}
    });
  }
} catch (e) {}

try {
  if (chrome.runtime && chrome.runtime.onSuspend) {
    chrome.runtime.onSuspend.addListener(() => {
      notifyWindowClosed();
    });
  }
} catch (e) {}

// Initial restore and first collection
restoreSession().then(() => {
  setTimeout(collectAndSync, 1000);
});

// Periodic heartbeat & sync
setInterval(collectAndSync, 2000);
`;

  fs.writeFileSync(path.join(targetDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');
  fs.writeFileSync(path.join(targetDir, 'background.js'), backgroundJs, 'utf-8');

  return targetDir;
}
