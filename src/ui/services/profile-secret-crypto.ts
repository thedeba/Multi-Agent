const VERSION = 1;
const KDF_ITERATIONS = 310_000;
const encoder = new TextEncoder();

export interface EncryptedSecrets {
  version: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  if (passphrase.length < 12 || passphrase.length > 1024) {
    throw new Error('The sync passphrase must be between 12 and 1024 characters.');
  }
  const material = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: KDF_ITERATIONS,
      hash: 'SHA-256',
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptProfileSecrets(
  value: unknown,
  passphrase: string,
): Promise<EncryptedSecrets> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(JSON.stringify(value))
  );
  return {
    version: VERSION,
    salt: encodeBase64(salt),
    iv: encodeBase64(iv),
    ciphertext: encodeBase64(new Uint8Array(ciphertext)),
  };
}

export async function decryptProfileSecrets(
  envelope: EncryptedSecrets,
  passphrase: string,
): Promise<unknown> {
  if (
    envelope.version !== VERSION ||
    !/^[A-Za-z0-9+/]{22}==$/.test(envelope.salt) ||
    !/^[A-Za-z0-9+/]{16}$/.test(envelope.iv) ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(envelope.ciphertext)
  ) {
    throw new Error('Encrypted proxy credentials have an invalid envelope.');
  }
  try {
    const salt = decodeBase64(envelope.salt);
    const iv = decodeBase64(envelope.iv);
    const key = await deriveKey(passphrase, salt);
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      decodeBase64(envelope.ciphertext)
    );
    return JSON.parse(new TextDecoder().decode(plaintext));
  } catch {
    throw new Error('Could not decrypt proxy credentials. Check the sync passphrase.');
  }
}
