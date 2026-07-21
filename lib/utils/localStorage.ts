/**
 * Safe localStorage wrapper
 * Prevents "Access is denied for this document" errors on mobile WebViews, 
 * incognito modes, or strict privacy settings where localStorage is blocked.
 */

const inMemoryStorage = new Map<string, string>();

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      console.warn(`[safeLocalStorage] getItem blocked for key "${key}", using memory fallback.`);
      return inMemoryStorage.get(key) || null;
    }
  },
  
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`[safeLocalStorage] setItem blocked for key "${key}", using memory fallback.`);
      inMemoryStorage.set(key, value);
    }
  },
  
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[safeLocalStorage] removeItem blocked for key "${key}", using memory fallback.`);
      inMemoryStorage.delete(key);
    }
  },

  clear: (): void => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.clear();
    } catch (e) {
      console.warn(`[safeLocalStorage] clear blocked, using memory fallback.`);
      inMemoryStorage.clear();
    }
  }
};
