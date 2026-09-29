import { storage } from '#imports';

import { SETTINGS_KEYS } from '~app/constants';
import { getControlPanelParentElement } from '~app/utils/selectors';

export const LAYOUT_TIMEOUT_MS = 3000;

// The layout-health flag stays a raw boolean, bypassing the JSON wrapper in settingsStorage: an
// old version on another synced device reads it with `=== false` (docs/adr/0001-...).
export const setLayoutStatus = (ok: boolean): Promise<void> => storage.setItem(`sync:${SETTINGS_KEYS.LAYOUT_OK}`, ok);

// Resolve HN's header cell (the panel parent), waiting via MutationObserver if it isn't in the DOM
// yet; resolves null if it never appears within the timeout. Extracted from the entrypoint shell so
// the observer-vs-timeout race is unit-testable (the entrypoints/ dir is outside vitest's include
// glob), mirroring the badge.ts split. The clearTimeout on early resolve stops a stale timeout from
// flipping layout status to broken after a slow-but-successful mount (regression-tested in
// layout.test.ts).
export const waitForPanelParent = (timeoutMs = LAYOUT_TIMEOUT_MS): Promise<HTMLElement | null> =>
  new Promise((resolve) => {
    const existing = getControlPanelParentElement();
    if (existing) {
      resolve(existing);
      return;
    }

    const timeout = setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeoutMs);

    const observer = new MutationObserver(() => {
      const parent = getControlPanelParentElement();
      if (!parent) return;
      clearTimeout(timeout);
      observer.disconnect();
      resolve(parent);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
