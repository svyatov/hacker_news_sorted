import type { Page } from 'playwright';

/**
 * Injects a minimal chrome.storage polyfill for running content scripts
 * outside of an extension context (e.g., in Playwright for screenshots/demos).
 */
export async function injectChromeStoragePolyfill(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const store: Record<string, unknown> = {};
    const listeners: Array<(changes: Record<string, unknown>) => void> = [];

    if (typeof globalThis.chrome === 'undefined') {
      (globalThis as Record<string, unknown>).chrome = {};
    }

    const chrome = globalThis.chrome as Record<string, unknown>;
    if (!chrome.storage) {
      chrome.storage = {
        sync: {
          get: (keys: string | string[], cb?: (result: Record<string, unknown>) => void) => {
            const keyArr = typeof keys === 'string' ? [keys] : keys;
            const result: Record<string, unknown> = {};
            for (const k of keyArr) {
              if (k in store) result[k] = store[k];
            }
            cb?.(result);
          },
          set: (items: Record<string, unknown>, cb?: () => void) => {
            const changes: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(items)) {
              changes[k] = { oldValue: store[k], newValue: v };
              store[k] = v;
            }
            for (const listener of listeners) listener(changes);
            cb?.();
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
