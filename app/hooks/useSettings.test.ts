import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

import { flush, store, stored } from '~app/__fixtures__/testHelpers';
import { SETTINGS_DEFAULTS, SETTINGS_KEYS, SORT_OPTIONS } from '~app/constants';

import { useSettings } from './useSettings';

// A change made elsewhere (popup, another tab or device) while the hook is mounted.
const change = async (key: string, value: unknown) => {
  await store(key, value);
  await flush();
};
const mount = async () => {
  const hook = renderHook(() => useSettings());
  await flush();
  return hook;
};

describe('useSettings', () => {
  describe('setActiveSort', () => {
    it('should update state and persist the sort as a JSON string', async () => {
      const { result } = await mount();

      act(() => result.current.setActiveSort('time'));
      await flush();

      expect(result.current.activeSort).toBe('time');
      expect(await stored(SETTINGS_KEYS.LAST_ACTIVE_SORT)).toBe('"time"');
    });
  });

  describe('LAST_ACTIVE_SORT', () => {
    it('restores the Points sort from a stored "\\"points\\""', async () => {
      await fakeBrowser.storage.sync.set({ [SETTINGS_KEYS.LAST_ACTIVE_SORT]: '"points"' });
      const { result } = await mount();

      expect(result.current.activeSort).toBe('points');
    });

    it('should update activeSort from a change after init', async () => {
      const { result } = await mount();

      await change(SETTINGS_KEYS.LAST_ACTIVE_SORT, 'comments');

      expect(result.current.activeSort).toBe('comments');
    });

    it('keeps a change that arrives before init completes over the older init read', async () => {
      await store(SETTINGS_KEYS.LAST_ACTIVE_SORT, 'time');
      const { result } = renderHook(() => useSettings());

      await store(SETTINGS_KEYS.LAST_ACTIVE_SORT, 'comments');
      await flush();

      expect(result.current.activeSort).toBe('comments');
    });

    it('falls back to the default sort when the key is removed', async () => {
      await store(SETTINGS_KEYS.LAST_ACTIVE_SORT, 'time');
      const { result } = await mount();

      await fakeBrowser.storage.sync.remove(SETTINGS_KEYS.LAST_ACTIVE_SORT);
      await flush();

      expect(result.current.activeSort).toBe(SETTINGS_DEFAULTS[SETTINGS_KEYS.LAST_ACTIVE_SORT]);
    });
  });

  describe('TRUE_TIME_AGO', () => {
    it('should update showTrueTimeAgo from a change', async () => {
      const { result } = await mount();
      expect(result.current.showTrueTimeAgo).toBe(true);

      await change(SETTINGS_KEYS.TRUE_TIME_AGO, false);

      expect(result.current.showTrueTimeAgo).toBe(false);
    });

    it('reads a stored "false" as false', async () => {
      await fakeBrowser.storage.sync.set({ [SETTINGS_KEYS.TRUE_TIME_AGO]: 'false' });
      const { result } = await mount();

      expect(result.current.showTrueTimeAgo).toBe(false);
    });

    it('falls back to the default when the key is removed', async () => {
      await store(SETTINGS_KEYS.TRUE_TIME_AGO, false);
      const { result } = await mount();

      await fakeBrowser.storage.sync.remove(SETTINGS_KEYS.TRUE_TIME_AGO);
      await flush();

      expect(result.current.showTrueTimeAgo).toBe(true);
    });
  });

  describe('derived sort toggles & validation', () => {
    it('defaults both derived sorts to enabled', async () => {
      const { result } = await mount();

      const enabled = result.current.enabledSortOptions.map((o) => o.sortBy);
      expect(enabled).toContain('velocity');
      expect(enabled).toContain('heat');
      expect(result.current.enabledSortOptions).toHaveLength(6);
    });

    it('resolves a synced derived sort value to default when that sort is disabled', async () => {
      await store(SETTINGS_KEYS.HEAT_ENABLED, false);
      const { result } = await mount();

      // Another device syncs its active sort as 'heat', but heat is disabled here.
      await change(SETTINGS_KEYS.LAST_ACTIVE_SORT, 'heat');

      expect(result.current.activeSort).toBe('default');
    });

    it('resolves an unknown stored variant to default at page load', async () => {
      await store(SETTINGS_KEYS.LAST_ACTIVE_SORT, 'bogus');
      const { result } = await mount();

      expect(result.current.activeSort).toBe('default');
    });

    it('leaves the active sort untouched when disabling a non-active derived sort', async () => {
      await store(SETTINGS_KEYS.LAST_ACTIVE_SORT, 'points');
      const { result } = await mount();

      await change(SETTINGS_KEYS.VELOCITY_ENABLED, false);

      expect(result.current.activeSort).toBe('points');
    });

    it('never writes the resolved value back to storage (no ping-pong)', async () => {
      await store(SETTINGS_KEYS.VELOCITY_ENABLED, false);
      await store(SETTINGS_KEYS.LAST_ACTIVE_SORT, 'velocity');
      const { result } = await mount();
      expect(result.current.activeSort).toBe('default');

      await change(SETTINGS_KEYS.HEAT_ENABLED, false);

      expect(await stored(SETTINGS_KEYS.LAST_ACTIVE_SORT)).toBe('"velocity"');
    });

    it('flips the settled flag only after the init read resolves', async () => {
      const { result } = renderHook(() => useSettings());
      expect(result.current.settled).toBe(false);

      await flush();
      expect(result.current.settled).toBe(true);
    });

    it('still settles (with defaults) if a storage read rejects, so the panel never vanishes', async () => {
      vi.spyOn(fakeBrowser.storage.sync, 'get').mockRejectedValueOnce(new Error('extension context invalidated'));
      const { result } = renderHook(() => useSettings());

      await flush();

      expect(result.current.settled).toBe(true);
    });

    it('applies toggle changes that arrive before init completes, then settles once', async () => {
      await store(SETTINGS_KEYS.LAST_ACTIVE_SORT, 'velocity');
      const { result } = renderHook(() => useSettings());

      await store(SETTINGS_KEYS.VELOCITY_ENABLED, false);
      await store(SETTINGS_KEYS.HEAT_ENABLED, false);
      await flush();

      // The pre-init changes win over init's older read, so the stored velocity sort is now disabled.
      expect(result.current.settled).toBe(true);
      expect(result.current.activeSort).toBe('default');
      expect(result.current.enabledSortOptions.map((o) => o.sortBy)).not.toContain('velocity');
    });

    it('falls back to the default when a toggle key is removed', async () => {
      await store(SETTINGS_KEYS.VELOCITY_ENABLED, false);
      await store(SETTINGS_KEYS.HEAT_ENABLED, false);
      const { result } = await mount();
      expect(result.current.enabledSortOptions).toHaveLength(4);

      await fakeBrowser.storage.sync.remove([SETTINGS_KEYS.VELOCITY_ENABLED, SETTINGS_KEYS.HEAT_ENABLED]);
      await flush();

      const enabled = result.current.enabledSortOptions.map((o) => o.sortBy);
      expect(enabled).toContain('velocity');
      expect(enabled).toContain('heat');
    });
  });

  describe.each(SORT_OPTIONS.filter((option) => option.enableKey))(
    'toggleable sort $sortBy',
    ({ sortBy, enableKey }) => {
      it('reverts to default and leaves the enabled set when disabled while active (AE3)', async () => {
        await store(SETTINGS_KEYS.LAST_ACTIVE_SORT, sortBy);
        const { result } = await mount();
        expect(result.current.activeSort).toBe(sortBy);

        await change(enableKey!, false);

        expect(result.current.activeSort).toBe('default');
        expect(result.current.enabledSortOptions.map((o) => o.sortBy)).not.toContain(sortBy);
      });

      it('resolves to default at page load when disabled', async () => {
        await store(enableKey!, false);
        await store(SETTINGS_KEYS.LAST_ACTIVE_SORT, sortBy);
        const { result } = await mount();

        expect(result.current.activeSort).toBe('default');
      });

      it('is kept at page load when enabled', async () => {
        await store(SETTINGS_KEYS.LAST_ACTIVE_SORT, sortBy);
        const { result } = await mount();

        expect(result.current.activeSort).toBe(sortBy);
      });

      it('is not restored on re-enable mid-session, but a reload restores it', async () => {
        await store(SETTINGS_KEYS.LAST_ACTIVE_SORT, sortBy);
        const { result, unmount } = await mount();

        await change(enableKey!, false);
        expect(result.current.activeSort).toBe('default');

        // Re-enable mid-session: stays default (stored value not restored)
        await change(enableKey!, true);
        expect(result.current.activeSort).toBe('default');

        // Stored value was never overwritten, so a fresh mount (reload) restores it
        unmount();
        const { result: reloaded } = await mount();
        expect(reloaded.current.activeSort).toBe(sortBy);
      });
    },
  );

  describe('memory leak prevention', () => {
    it('stops watching storage on unmount', async () => {
      const { unmount } = await mount();
      expect(fakeBrowser.storage.sync.onChanged.hasListeners()).toBe(true);

      unmount();

      expect(fakeBrowser.storage.sync.onChanged.hasListeners()).toBe(false);
    });
  });
});
