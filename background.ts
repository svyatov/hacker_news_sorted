import { SETTINGS_KEYS } from '~app/constants';

function updateBadge(ok: boolean) {
  chrome.action.setBadgeText({ text: ok ? '' : ':(' });
  chrome.action.setBadgeBackgroundColor({ color: '#E05050' });
  chrome.action.setBadgeTextColor({ color: '#FFFFFF' });
}

// Restore badge state on service worker restart
chrome.storage.sync.get(SETTINGS_KEYS.LAYOUT_OK, (result) => {
  if (result[SETTINGS_KEYS.LAYOUT_OK] === false) updateBadge(false);
});

// React to layout status changes
chrome.storage.sync.onChanged.addListener((changes) => {
  if (SETTINGS_KEYS.LAYOUT_OK in changes) {
    updateBadge(changes[SETTINGS_KEYS.LAYOUT_OK].newValue !== false);
  }
});
