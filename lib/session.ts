import { nanoid } from 'nanoid';

const STORAGE_KEY = 'your-rhythm-session-id';

type StorageInterface = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getStorage(): StorageInterface | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

// Check URL for session parameter
function getSessionFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('session');
}

export function getSessionId(): string | null {
  const storage = getStorage();
  if (!storage) return null;

  // Check URL first - allows importing session from another deployment
  const urlSession = getSessionFromUrl();
  if (urlSession) {
    storage.setItem(STORAGE_KEY, urlSession);
    // Clean URL without reloading
    if (typeof window !== 'undefined' && window.history) {
      const url = new URL(window.location.href);
      url.searchParams.delete('session');
      window.history.replaceState({}, '', url.toString());
    }
    return urlSession;
  }

  const existing = storage.getItem(STORAGE_KEY);
  if (existing) return existing;
  const id = nanoid();
  storage.setItem(STORAGE_KEY, id);
  return id;
}

export function setSessionId(sessionId: string): void {
  const storage = getStorage();
  if (storage) {
    storage.setItem(STORAGE_KEY, sessionId);
  }
}

export function clearSession() {
  const storage = getStorage();
  storage?.removeItem(STORAGE_KEY);
}
