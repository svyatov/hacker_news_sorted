// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

import { SETTINGS_KEYS } from '~app/constants';
import { initBadge } from '~app/utils/badge';

const setBadgeText = vi.fn();
const setBadgeBackgroundColor = vi.fn();

// fakeBrowser has no badge methods, so only chrome.action is stubbed; storage is the fake.
vi.stubGlobal('chrome', {
  action: { setBadgeText, setBadgeBackgroundColor, setBadgeTextColor: vi.fn() },
});

// Drain the chained storage reads/writes.
const flush = async () => {
  for (let i = 0; i < 50; i++) await Promise.resolve();
};

// The layout flag is a raw boolean, as the content script writes it.
const setLayoutOk = async (value: boolean) => {
  await fakeBrowser.storage.sync.set({ [SETTINGS_KEYS.LAYOUT_OK]: value });
  await flush();
};

describe('background service worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set warning badge on startup when layout is broken', async () => {
    await setLayoutOk(false);

    initBadge();
    await flush();

    expect(setBadgeText).toHaveBeenCalledWith({ text: ':(' });
    expect(setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#E05050' });
  });

  it('should not set badge on startup when layout is ok', async () => {
    await setLayoutOk(true);

    initBadge();
    await flush();

    expect(setBadgeText).not.toHaveBeenCalled();
  });

  it('should update badge when layout status changes to broken', async () => {
    await setLayoutOk(true);
    initBadge();
    await flush();

    await setLayoutOk(false);

    expect(setBadgeText).toHaveBeenCalledWith({ text: ':(' });
  });

  it('should clear badge when layout status changes to ok', async () => {
    await setLayoutOk(false);
    initBadge();
    await flush();
    vi.clearAllMocks();

    await setLayoutOk(true);

    expect(setBadgeText).toHaveBeenCalledWith({ text: '' });
  });

  it('should clear badge when the layout flag is removed', async () => {
    await setLayoutOk(false);
    initBadge();
    await flush();
    vi.clearAllMocks();

    await fakeBrowser.storage.sync.remove(SETTINGS_KEYS.LAYOUT_OK);
    await flush();

    expect(setBadgeText).toHaveBeenCalledWith({ text: '' });
  });

  it('should ignore changes to other storage keys', async () => {
    initBadge();
    await flush();

    await fakeBrowser.storage.sync.set({ [SETTINGS_KEYS.SHOW_NEW]: false });
    await flush();

    expect(setBadgeText).not.toHaveBeenCalled();
  });
});
