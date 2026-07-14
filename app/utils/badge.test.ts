import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SETTINGS_KEYS } from '~app/constants';
import { initBadge } from '~app/utils/badge';

const setBadgeText = vi.fn();
const setBadgeBackgroundColor = vi.fn();
const storageGet = vi.fn();
let storageChangeListener: (changes: Record<string, { newValue?: unknown }>) => void;

vi.stubGlobal('chrome', {
  action: { setBadgeText, setBadgeBackgroundColor, setBadgeTextColor: vi.fn() },
  storage: {
    sync: {
      get: storageGet,
      onChanged: {
        addListener: (cb: typeof storageChangeListener) => {
          storageChangeListener = cb;
        },
      },
    },
  },
});

describe('background service worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set warning badge on startup when layout is broken', async () => {
    storageGet.mockImplementation((_key: string, cb: (result: Record<string, unknown>) => void) => {
      cb({ [SETTINGS_KEYS.LAYOUT_OK]: false });
    });

    initBadge();

    expect(setBadgeText).toHaveBeenCalledWith({ text: ':(' });
    expect(setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#E05050' });
  });

  it('should not set badge on startup when layout is ok', async () => {
    storageGet.mockImplementation((_key: string, cb: (result: Record<string, unknown>) => void) => {
      cb({ [SETTINGS_KEYS.LAYOUT_OK]: true });
    });

    initBadge();

    expect(setBadgeText).not.toHaveBeenCalled();
  });

  it('should update badge when layout status changes to broken', async () => {
    storageGet.mockImplementation((_key: string, cb: (result: Record<string, unknown>) => void) => {
      cb({ [SETTINGS_KEYS.LAYOUT_OK]: true });
    });

    initBadge();

    storageChangeListener({ [SETTINGS_KEYS.LAYOUT_OK]: { newValue: false } });

    expect(setBadgeText).toHaveBeenCalledWith({ text: ':(' });
  });

  it('should clear badge when layout status changes to ok', async () => {
    storageGet.mockImplementation((_key: string, cb: (result: Record<string, unknown>) => void) => {
      cb({ [SETTINGS_KEYS.LAYOUT_OK]: false });
    });

    initBadge();
    vi.clearAllMocks();

    storageChangeListener({ [SETTINGS_KEYS.LAYOUT_OK]: { newValue: true } });

    expect(setBadgeText).toHaveBeenCalledWith({ text: '' });
  });
});
