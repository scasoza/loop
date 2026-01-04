import { nanoid } from 'nanoid';

const STORAGE_KEY = 'your-rhythm-session-id';

type SimpleStorage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getStorage(): SimpleStorage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export function getSessionId(): string | null {
  const storage = getStorage();
  if (!storage) return null;
  const existing = storage.getItem(STORAGE_KEY);
  if (existing) return existing;
  const id = nanoid();
  storage.setItem(STORAGE_KEY, id);
  return id;
}

export function clearSession() {
  const storage = getStorage();
  storage?.removeItem(STORAGE_KEY);
}
