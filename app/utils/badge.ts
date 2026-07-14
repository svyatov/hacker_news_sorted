import { SETTINGS_KEYS } from '~app/constants';

// Badge logic lives here (framework-agnostic, unit-tested) while entrypoints/background.ts is a thin
// defineBackground shell that calls initBadge() — mirroring the app/utils + entrypoint split used
// for the comment script (KTD-2). Behavior is identical to the pre-WXT root background.ts.

export function updateBadge(ok: boolean): void {
  chrome.action.setBadgeText({ text: ok ? '' : ':(' });
  chrome.action.setBadgeBackgroundColor({ color: '#E05050' });
  chrome.action.setBadgeTextColor({ color: '#FFFFFF' });
}

export function initBadge(): void {
  // Restore badge state on service worker restart.
  chrome.storage.sync.get(SETTINGS_KEYS.LAYOUT_OK, (result) => {
    if (result[SETTINGS_KEYS.LAYOUT_OK] === false) updateBadge(false);
  });

  // React to layout status changes.
  chrome.storage.sync.onChanged.addListener((changes) => {
    if (SETTINGS_KEYS.LAYOUT_OK in changes) {
      updateBadge(changes[SETTINGS_KEYS.LAYOUT_OK].newValue !== false);
    }
  });
}
