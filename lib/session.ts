import { nanoid } from 'nanoid';

const STORAGE_KEY = 'your-rhythm-session-id';
const LEGACY_STORAGE_KEYS = ['loop-session-id', 'your-rhythm-session'];

type StorageInterface = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getStorage(): StorageInterface | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

function getSessionIdOverride(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('session') || params.get('sessionId') || params.get('sid');
}

function getDefaultSessionId(): string | null {
  return process.env.NEXT_PUBLIC_DEFAULT_SESSION_ID ?? null;
}

function getLegacySessionId(storage: StorageInterface): string | null {
  for (const key of LEGACY_STORAGE_KEYS) {
    const legacyId = storage.getItem(key);
    if (legacyId) return legacyId;
  }
  return null;
}

export function getSessionId(): string | null {
  const storage = getStorage();
  if (!storage) return null;
  const override = getSessionIdOverride();
  if (override) {
    storage.setItem(STORAGE_KEY, override);
    return override;
  }
  const defaultSession = getDefaultSessionId();
  if (defaultSession) {
    storage.setItem(STORAGE_KEY, defaultSession);
    return defaultSession;
  }
  const existing = storage.getItem(STORAGE_KEY);
  if (existing) return existing;
  const legacy = getLegacySessionId(storage);
  if (legacy) {
    storage.setItem(STORAGE_KEY, legacy);
    return legacy;
  }
  const id = nanoid();
  storage.setItem(STORAGE_KEY, id);
  return id;
}

export function clearSession() {
  const storage = getStorage();
  storage?.removeItem(STORAGE_KEY);
}

export function setSessionId(sessionId: string): void {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(STORAGE_KEY, sessionId);
}
