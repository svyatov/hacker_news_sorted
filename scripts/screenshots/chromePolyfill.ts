import type { Page } from 'playwright';

/**
 * Injects a minimal chrome.storage polyfill for running content scripts
 * outside of an extension context (e.g., in Playwright for screenshots/demos).
 * WXT storage needs `chrome.runtime` defined, Promise-returning `get`/`set`/`remove`,
 * and `chrome.storage.sync.onChanged`.
 */
export async function injectChromeStoragePolyfill(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const store: Record<string, unknown> = {};
    const listeners: Array<(changes: Record<string, unknown>) => void> = [];

    if (typeof globalThis.chrome === 'undefined') {
      (globalThis as Record<string, unknown>).chrome = {};
    }

    const chrome = globalThis.chrome as Record<string, unknown>;
    chrome.runtime ??= {};
    if (!chrome.storage) {
      const emit = (changes: Record<string, unknown>) => {
        if (Object.keys(changes).length > 0) for (const listener of listeners) listener(changes);
      };
      chrome.storage = {
        sync: {
          get: async (keys: string | string[]) => {
            const keyArr = typeof keys === 'string' ? [keys] : keys;
            const result: Record<string, unknown> = {};
            for (const k of keyArr) {
              if (k in store) result[k] = store[k];
            }
            return result;
          },
          set: async (items: Record<string, unknown>) => {
            const changes: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(items)) {
              changes[k] = { oldValue: store[k], newValue: v };
              store[k] = v;
            }
            emit(changes);
          },
          remove: async (keys: string | string[]) => {
            const changes: Record<string, unknown> = {};
            for (const k of typeof keys === 'string' ? [keys] : keys) {
              if (!(k in store)) continue;
              changes[k] = { oldValue: store[k] };
              delete store[k];
            }
            emit(changes);
          },
          onChanged: {
            addListener: (fn: (changes: Record<string, unknown>) => void) => listeners.push(fn),
            removeListener: (fn: (changes: Record<string, unknown>) => void) => {
              const idx = listeners.indexOf(fn);
              if (idx !== -1) listeners.splice(idx, 1);
            },
          },
        },
        onChanged: {
          addListener: () => {},
          removeListener: () => {},
        },
      };
    }
  });
}
