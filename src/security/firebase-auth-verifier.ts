interface FirebaseAccountLookupResponse {
  users?: Array<{ localId?: unknown }>;
}

export async function verifyFirebaseIdToken(
  credentials: unknown,
  fetcher: typeof fetch = fetch
): Promise<string> {
  if (
    typeof credentials !== 'object' ||
    credentials === null ||
    !('idToken' in credentials) ||
    !('apiKey' in credentials) ||
    typeof credentials.idToken !== 'string' ||
    credentials.idToken.length === 0 ||
    credentials.idToken.length > 8192 ||
    typeof credentials.apiKey !== 'string' ||
    credentials.apiKey.length === 0 ||
    credentials.apiKey.length > 256
  ) {
    throw new Error('Invalid Firebase authentication token.');
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 4000) : null;

  try {
    const response = await fetcher(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(credentials.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: credentials.idToken }),
        ...(controller ? { signal: controller.signal } : {}),
      }
    );
    if (!response.ok) {
      throw new Error('Firebase authentication validation failed.');
    }

    const result = (await response.json()) as FirebaseAccountLookupResponse;
    const uid = result.users?.[0]?.localId;
    if (typeof uid !== 'string' || uid.length === 0 || uid.length > 128) {
      throw new Error('Firebase authentication response did not contain a valid user.');
    }
    return uid;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
