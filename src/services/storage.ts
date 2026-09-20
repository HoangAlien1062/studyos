const STORAGE_PREFIX = 'studyos_data_';
const memoryStore = new Map<string, string>();

function getStorageBackend() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
    return (globalThis as any).localStorage;
  }
  return null;
}

export const storage = {
  get<T>(key: string, defaultValue: T): T {
    try {
      const backend = getStorageBackend();
      const raw = backend ? backend.getItem(STORAGE_PREFIX + key) : memoryStore.get(STORAGE_PREFIX + key);
      if (!raw) return defaultValue;
      return JSON.parse(raw) as T;
    } catch (err) {
      console.warn(`[StudyOS Storage] Failed to load key: ${key}`, err);
      return defaultValue;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      const backend = getStorageBackend();
      const serialized = JSON.stringify(value);
      if (backend) {
        backend.setItem(STORAGE_PREFIX + key, serialized);
      } else {
        memoryStore.set(STORAGE_PREFIX + key, serialized);
      }
    } catch (err) {
      console.error(`[StudyOS Storage] Failed to persist key: ${key}`, err);
    }
  },

  remove(key: string): void {
    try {
      const backend = getStorageBackend();
      if (backend) {
        backend.removeItem(STORAGE_PREFIX + key);
      } else {
        memoryStore.delete(STORAGE_PREFIX + key);
      }
    } catch (err) {
      console.error(`[StudyOS Storage] Failed to remove key: ${key}`, err);
    }
  },

  clearAll(): void {
    try {
      const backend = getStorageBackend();
      if (backend) {
        Object.keys(backend).forEach((k) => {
          if (k.startsWith(STORAGE_PREFIX)) {
            backend.removeItem(k);
          }
        });
      } else {
        for (const k of Array.from(memoryStore.keys())) {
          if (k.startsWith(STORAGE_PREFIX)) {
            memoryStore.delete(k);
          }
        }
      }
    } catch (err) {
      console.error(`[StudyOS Storage] Failed to clear all`, err);
    }
  },

  exportAllData(): string {
    const backup: Record<string, any> = {};
    const backend = getStorageBackend();
    const keys = backend ? Object.keys(backend) : Array.from(memoryStore.keys());
    keys.forEach((k) => {
      if (k.startsWith(STORAGE_PREFIX)) {
        const raw = backend ? backend.getItem(k) : memoryStore.get(k);
        try {
          backup[k.replace(STORAGE_PREFIX, '')] = JSON.parse(raw || '');
        } catch {
          backup[k.replace(STORAGE_PREFIX, '')] = raw;
        }
      }
    });
    return JSON.stringify(backup, null, 2);
  },

  importAllData(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (typeof parsed !== 'object' || parsed === null) return false;
      const backend = getStorageBackend();
      Object.entries(parsed).forEach(([key, val]) => {
        const serialized = JSON.stringify(val);
        if (backend) {
          backend.setItem(STORAGE_PREFIX + key, serialized);
        } else {
          memoryStore.set(STORAGE_PREFIX + key, serialized);
        }
      });
      return true;
    } catch (err) {
      console.error('[StudyOS Storage] Import failed:', err);
      return false;
    }
  }
};
