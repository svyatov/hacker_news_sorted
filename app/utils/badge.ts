import { storage } from '#imports';

import { SETTINGS_KEYS } from '~app/constants';

// Badge logic lives here (framework-agnostic, unit-tested) while entrypoints/background.ts is a thin
// defineBackground shell that calls initBadge(), mirroring the app/utils + entrypoint split used
// for the comment script (KTD-2).

function updateBadge(ok: boolean): void {
  chrome.action.setBadgeText({ text: ok ? '' : ':(' });
  chrome.action.setBadgeBackgroundColor({ color: '#E05050' });
  chrome.action.setBadgeTextColor({ color: '#FFFFFF' });
}

// The flag is a raw boolean (see setLayoutStatus), so it is read straight from WXT storage, not
// through the JSON wrapper in settingsStorage.
const LAYOUT_OK_KEY = `sync:${SETTINGS_KEYS.LAYOUT_OK}` as const;

export function initBadge(): void {
  // Restore badge state on service worker restart.
  storage.getItem(LAYOUT_OK_KEY).then((ok) => {
    if (ok === false) updateBadge(false);
  });

  // React to layout status changes.
  storage.watch(LAYOUT_OK_KEY, (ok) => updateBadge(ok !== false));
}
