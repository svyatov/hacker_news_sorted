import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createStorageMock } from '~app/__fixtures__/testHelpers';
import { SETTINGS_KEYS } from '~app/constants';

// --- Storage mock ---
const { store, mockSet, mockGet, mockUnwatch, watcherCallbacks, reset, StorageClass } = createStorageMock();
vi.mock('@plasmohq/storage', () => ({ Storage: StorageClass }));

const { useSettings } = await import('./useSettings');

describe('useSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reset();
  });

  describe('setActiveSort', () => {
    it('should update state and persist to storage', async () => {
      const { result } = renderHook(() => useSettings());
      await act(() => Promise.resolve());

      act(() => result.current.setActiveSort('time'));
      expect(result.current.activeSort).toBe('time');
      expect(mockSet).toHaveBeenCalledWith(SETTINGS_KEYS.LAST_ACTIVE_SORT, 'time');
    });
  });

  describe('LAST_ACTIVE_SORT watcher', () => {
    it('should update activeSort from watcher after init', async () => {
      const { result } = renderHook(() => useSettings());
      await act(() => Promise.resolve());

      act(() => {
        watcherCallbacks[SETTINGS_KEYS.LAST_ACTIVE_SORT]?.({ newValue: 'comments' });
      });

      expect(result.current.activeSort).toBe('comments');
    });
  });

  describe('TRUE_TIME_AGO watcher', () => {
    it('should update showTrueTimeAgo from watcher', async () => {
      const { result } = renderHook(() => useSettings());
      await act(() => Promise.resolve());

      expect(result.current.showTrueTimeAgo).toBe(true);

      act(() => {
        watcherCallbacks[SETTINGS_KEYS.TRUE_TIME_AGO]?.({ newValue: false });
      });

      expect(result.current.showTrueTimeAgo).toBe(false);
    });
  });

  describe('derived sort toggles & validation', () => {
    it('defaults both derived sorts to enabled', async () => {
      const { result } = renderHook(() => useSettings());
      await act(() => Promise.resolve());

      const enabled = result.current.enabledSortOptions.map((o) => o.sortBy);
      expect(enabled).toContain('velocity');
      expect(enabled).toContain('heat');
      expect(result.current.enabledSortOptions).toHaveLength(6);
    });

    it('reverts active velocity to default and shrinks the set when disabled (AE3)', async () => {
      store[SETTINGS_KEYS.LAST_ACTIVE_SORT] = 'velocity';
      const { result } = renderHook(() => useSettings());
      await act(() => Promise.resolve());
      expect(result.current.activeSort).toBe('velocity');

      act(() => {
        watcherCallbacks[SETTINGS_KEYS.VELOCITY_ENABLED]?.({ newValue: false });
      });

      expect(result.current.activeSort).toBe('default');
      expect(result.current.enabledSortOptions.map((o) => o.sortBy)).not.toContain('velocity');
    });

    it('resolves a synced derived sort value to default when that sort is disabled', async () => {
      store[SETTINGS_KEYS.HEAT_ENABLED] = false;
      const { result } = renderHook(() => useSettings());
      await act(() => Promise.resolve());

      // Another device syncs its active sort as 'heat', but heat is disabled here.
      act(() => {
        watcherCallbacks[SETTINGS_KEYS.LAST_ACTIVE_SORT]?.({ newValue: 'heat' });
      });

      expect(result.current.activeSort).toBe('default');
    });

    it('resolves stored velocity to default at page load when velocity is disabled', async () => {
      store[SETTINGS_KEYS.VELOCITY_ENABLED] = false;
      store[SETTINGS_KEYS.LAST_ACTIVE_SORT] = 'velocity';
      const { result } = renderHook(() => useSettings());
      await act(() => Promise.resolve());

      expect(result.current.activeSort).toBe('default');
    });

    it('resolves an unknown stored variant to default at page load', async () => {
      store[SETTINGS_KEYS.LAST_ACTIVE_SORT] = 'bogus';
      const { result } = renderHook(() => useSettings());
      await act(() => Promise.resolve());

      expect(result.current.activeSort).toBe('default');
    });

    it('keeps stored velocity at page load when velocity is enabled', async () => {
      store[SETTINGS_KEYS.LAST_ACTIVE_SORT] = 'velocity';
      const { result } = renderHook(() => useSettings());
      await act(() => Promise.resolve());

      expect(result.current.activeSort).toBe('velocity');
    });

    it('leaves the active sort untouched when disabling a non-active derived sort', async () => {
      store[SETTINGS_KEYS.LAST_ACTIVE_SORT] = 'points';
      const { result } = renderHook(() => useSettings());
      await act(() => Promise.resolve());

      act(() => {
        watcherCallbacks[SETTINGS_KEYS.VELOCITY_ENABLED]?.({ newValue: false });
      });

      expect(result.current.activeSort).toBe('points');
    });

    it('never writes the resolved value back to storage (no ping-pong)', async () => {
      store[SETTINGS_KEYS.VELOCITY_ENABLED] = false;
      store[SETTINGS_KEYS.LAST_ACTIVE_SORT] = 'velocity';
      const { result } = renderHook(() => useSettings());
      await act(() => Promise.resolve());
      expect(result.current.activeSort).toBe('default');

      act(() => {
        watcherCallbacks[SETTINGS_KEYS.HEAT_ENABLED]?.({ newValue: false });
      });

      expect(mockSet).not.toHaveBeenCalledWith(SETTINGS_KEYS.LAST_ACTIVE_SORT, expect.anything());
    });

    it('does not restore a stored derived sort on re-enable mid-session, but a reload does', async () => {
      store[SETTINGS_KEYS.LAST_ACTIVE_SORT] = 'velocity';
      const { result, unmount } = renderHook(() => useSettings());
      await act(() => Promise.resolve());

      act(() => {
        watcherCallbacks[SETTINGS_KEYS.VELOCITY_ENABLED]?.({ newValue: false });
      });
      expect(result.current.activeSort).toBe('default');

      // Re-enable mid-session: stays default (stored value not restored)
      act(() => {
        watcherCallbacks[SETTINGS_KEYS.VELOCITY_ENABLED]?.({ newValue: true });
      });
      expect(result.current.activeSort).toBe('default');

      // Stored value was never overwritten, so a fresh mount (reload) restores velocity
      unmount();
      const { result: reloaded } = renderHook(() => useSettings());
      await act(() => Promise.resolve());
      expect(reloaded.current.activeSort).toBe('velocity');
    });

    it('flips the settled flag only after the init read resolves', async () => {
      const { result } = renderHook(() => useSettings());
      expect(result.current.settled).toBe(false);

      await act(() => Promise.resolve());
      expect(result.current.settled).toBe(true);
    });

    it('still settles (with defaults) if a storage read rejects, so the panel never vanishes', async () => {
      mockGet.mockRejectedValueOnce(new Error('extension context invalidated'));
      const { result } = renderHook(() => useSettings());

      await act(() => Promise.resolve());

      expect(result.current.settled).toBe(true);
    });

    it('ignores toggle changes that arrive before init completes, then settles from the init read', async () => {
      store[SETTINGS_KEYS.LAST_ACTIVE_SORT] = 'velocity';
      const { result } = renderHook(() => useSettings());

      // Watchers are live before init resolves; sortsReadyRef is still false → guarded out.
      act(() => {
        watcherCallbacks[SETTINGS_KEYS.VELOCITY_ENABLED]?.({ newValue: false });
        watcherCallbacks[SETTINGS_KEYS.HEAT_ENABLED]?.({ newValue: false });
      });

      await act(() => Promise.resolve());

      // init's own read wins over the ignored pre-init changes.
      expect(result.current.settled).toBe(true);
      expect(result.current.activeSort).toBe('velocity');
      expect(result.current.enabledSortOptions.map((o) => o.sortBy)).toContain('velocity');
    });

    it('falls back to the default when a toggle watcher receives an undefined value', async () => {
      store[SETTINGS_KEYS.VELOCITY_ENABLED] = false;
      store[SETTINGS_KEYS.HEAT_ENABLED] = false;
      const { result } = renderHook(() => useSettings());
      await act(() => Promise.resolve());
      expect(result.current.enabledSortOptions).toHaveLength(4);

      // A cleared key (undefined newValue) resets to the default (enabled).
      act(() => {
        watcherCallbacks[SETTINGS_KEYS.VELOCITY_ENABLED]?.({ newValue: undefined });
        watcherCallbacks[SETTINGS_KEYS.HEAT_ENABLED]?.({ newValue: undefined });
      });

      const enabled = result.current.enabledSortOptions.map((o) => o.sortBy);
      expect(enabled).toContain('velocity');
      expect(enabled).toContain('heat');
    });
  });

  describe('memory leak prevention', () => {
    it('should call unwatch on unmount', async () => {
      const { unmount } = renderHook(() => useSettings());
      await act(() => Promise.resolve());

      unmount();
      expect(mockUnwatch).toHaveBeenCalled();
    });
  });
});
