import { storage } from '#imports';

// Plasmo saved every value as a JSON string and old versions still do on synced devices, so we keep
// that encoding on disk (docs/adr/0001-keep-plasmo-json-encoding-on-wxt-storage.md). A missing or
// unparsable value decodes to undefined, so callers fall back to their default.
const decode = <T>(stored: unknown): T | undefined => {
  if (stored == null) return undefined;
  try {
    return JSON.parse(stored as string) as T;
  } catch {
    return undefined;
  }
};

const syncKey = (key: string) => `sync:${key}` as const;

export const settingsStorage = {
  get: async <T>(key: string): Promise<T | undefined> => decode<T>(await storage.getItem(syncKey(key))),
  set: (key: string, value: unknown): Promise<void> => storage.setItem(syncKey(key), JSON.stringify(value)),
  watch: <T>(key: string, callback: (newValue: T | undefined) => void): (() => void) =>
    storage.watch(syncKey(key), (newValue) => callback(decode<T>(newValue))),
};
