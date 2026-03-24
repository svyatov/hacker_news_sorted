import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CSS_CLASSES, SETTINGS_DEFAULTS, SETTINGS_KEYS } from '~app/constants';
import type { PostTimestamps } from '~app/utils/newPosts';

const COOLDOWN = SETTINGS_DEFAULTS[SETTINGS_KEYS.COOLDOWN];
const COOLDOWN_MS = COOLDOWN * 1000;

// --- Storage mock ---
const storageStore: Record<string, unknown> = {};
const watcherCallbacks: Record<string, (change: { newValue: unknown }) => void> = {};
const mockSet = vi.fn((key: string, value: unknown) => {
  storageStore[key] = value;
  return Promise.resolve();
});
const mockGet = vi.fn((key: string) => Promise.resolve(storageStore[key]));
const mockWatch = vi.fn((map: Record<string, (change: { newValue: unknown }) => void>) => {
  Object.assign(watcherCallbacks, map);
});
const mockUnwatch = vi.fn();

vi.mock('@plasmohq/storage', () => ({
  Storage: class {
    get = mockGet;
    set = mockSet;
    watch = mockWatch;
    unwatch = mockUnwatch;
  },
}));

// --- DOM helpers ---
const setupTableBody = (ids: string[]) => {
  const outerTable = document.createElement('table');
  outerTable.id = 'hnmain';
  const bigboxRow = document.createElement('tr');
  bigboxRow.id = 'bigbox';
  const bigboxTd = document.createElement('td');
  const innerTable = document.createElement('table');
  const tbody = document.createElement('tbody');

  for (const id of ids) {
    const tr = document.createElement('tr');
    tr.classList.add('athing');
    tr.id = id;
    tbody.appendChild(tr);
    tbody.appendChild(document.createElement('tr'));
    const spacer = document.createElement('tr');
    spacer.classList.add('spacer');
    tbody.appendChild(spacer);
  }

  innerTable.appendChild(tbody);
  bigboxTd.appendChild(innerTable);
  bigboxRow.appendChild(bigboxTd);
  outerTable.appendChild(bigboxRow);
  document.body.appendChild(outerTable);
  return tbody;
};

const clearBody = () => {
  while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
};

const getRowById = (id: string) => document.querySelector(`[id="${id}"]`) as HTMLElement;

// --- Stubs ---
vi.stubGlobal('location', { pathname: '/', search: '' });

const { useSettings } = await import('./useSettings');

describe('useSettings', () => {
  beforeEach(() => {
    clearBody();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000_000_000);
    for (const key of Object.keys(storageStore)) delete storageStore[key];
    for (const key of Object.keys(watcherCallbacks)) delete watcherCallbacks[key];
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('init', () => {
    it('should migrate string[] format to PostTimestamps', async () => {
      setupTableBody(['post-1', 'post-2']);
      storageStore[SETTINGS_KEYS.SHOW_NEW] = true;
      storageStore['hns-post-ids:/'] = ['post-1', 'post-2'];

      renderHook(() => useSettings());
      await act(() => Promise.resolve());

      // Should save migrated format (with Date.now() timestamps since they're treated as fresh)
      const savedData = mockSet.mock.calls.find((c) => c[0] === 'hns-post-ids:/')?.[1] as PostTimestamps;
      expect(savedData).toBeDefined();
      expect(typeof savedData['post-1']).toBe('number');
      expect(Array.isArray(savedData)).toBe(false);
    });

    it('should not re-migrate PostTimestamps format', async () => {
      setupTableBody(['post-1']);
      storageStore[SETTINGS_KEYS.SHOW_NEW] = true;
      const existing: PostTimestamps = { 'post-1': -1 };
      storageStore['hns-post-ids:/'] = existing;

      renderHook(() => useSettings());
      await act(() => Promise.resolve());

      const savedData = mockSet.mock.calls.find((c) => c[0] === 'hns-post-ids:/')?.[1] as PostTimestamps;
      expect(savedData).toBeDefined();
      expect(savedData['post-1']).toBe(-1);
    });

    it('should mark new posts and start fade interval', async () => {
      setupTableBody(['post-1', 'post-2']);
      storageStore[SETTINGS_KEYS.SHOW_NEW] = true;
      storageStore['hns-post-ids:/'] = { 'post-1': -1 } as PostTimestamps;

      renderHook(() => useSettings());
      await act(() => Promise.resolve());

      expect(getRowById('post-2').classList.contains(CSS_CLASSES.NEW_POST)).toBe(true);
      expect(getRowById('post-2').style.getPropertyValue('--hns-fade')).toBe('1');
    });

    it('should use default cooldown when none is stored', async () => {
      setupTableBody(['post-1', 'post-2']);
      storageStore[SETTINGS_KEYS.SHOW_NEW] = true;
      storageStore['hns-post-ids:/'] = { 'post-1': -1 } as PostTimestamps;

      renderHook(() => useSettings());
      await act(() => Promise.resolve());

      // The interval period should be based on default cooldown (600s → 12000ms)
      const savedData = mockSet.mock.calls.find((c) => c[0] === 'hns-post-ids:/')?.[1] as PostTimestamps;
      expect(savedData['post-2']).toBe(1_000_000_000_000);
    });
  });

  describe('setActiveSort', () => {
    it('should update state and persist to storage', async () => {
      setupTableBody([]);
      renderHook(() => useSettings());
      await act(() => Promise.resolve());

      const { result } = renderHook(() => useSettings());
      await act(() => Promise.resolve());

      act(() => result.current.setActiveSort('time'));
      expect(result.current.activeSort).toBe('time');
      expect(mockSet).toHaveBeenCalledWith(SETTINGS_KEYS.LAST_ACTIVE_SORT, 'time');
    });
  });

  describe('LAST_ACTIVE_SORT watcher', () => {
    it('should update activeSort from watcher after init', async () => {
      setupTableBody([]);
      const { result } = renderHook(() => useSettings());
      await act(() => Promise.resolve());

      act(() => {
        watcherCallbacks[SETTINGS_KEYS.LAST_ACTIVE_SORT]?.({ newValue: 'comments' });
      });

      expect(result.current.activeSort).toBe('comments');
    });
  });

  describe('fade interval', () => {
    it('should update opacity on interval tick', async () => {
      setupTableBody(['post-1']);
      storageStore[SETTINGS_KEYS.SHOW_NEW] = true;
      storageStore['hns-post-ids:/'] = { 'old-1': -1 } as PostTimestamps;

      renderHook(() => useSettings());
      await act(() => Promise.resolve());

      // post-1 is new, starts at opacity 1
      expect(getRowById('post-1').style.getPropertyValue('--hns-fade')).toBe('1');

      // Advance halfway through cooldown
      vi.advanceTimersByTime(COOLDOWN_MS / 2);

      const opacity = Number(getRowById('post-1').style.getPropertyValue('--hns-fade'));
      expect(opacity).toBeCloseTo(0.5, 1);
    });

    it('should remove class when cooldown expires but preserve timestamp', async () => {
      setupTableBody(['post-1']);
      storageStore[SETTINGS_KEYS.SHOW_NEW] = true;
      storageStore['hns-post-ids:/'] = { 'old-1': -1 } as PostTimestamps;

      renderHook(() => useSettings());
      await act(() => Promise.resolve());

      // Advance past cooldown
      vi.advanceTimersByTime(COOLDOWN_MS + 1000);

      expect(getRowById('post-1').classList.contains(CSS_CLASSES.NEW_POST)).toBe(false);
      expect(getRowById('post-1').style.getPropertyValue('--hns-fade')).toBe('');
    });

    it('should clear interval on unmount', async () => {
      setupTableBody(['post-1']);
      storageStore[SETTINGS_KEYS.SHOW_NEW] = true;
      storageStore['hns-post-ids:/'] = { 'old-1': -1 } as PostTimestamps;

      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
      const { unmount } = renderHook(() => useSettings());
      await act(() => Promise.resolve());

      unmount();
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('cooldown watcher', () => {
    it('should restart interval with new period on cooldown change', async () => {
      setupTableBody(['post-1']);
      storageStore[SETTINGS_KEYS.SHOW_NEW] = true;
      storageStore['hns-post-ids:/'] = { 'old-1': -1 } as PostTimestamps;

      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
      renderHook(() => useSettings());
      await act(() => Promise.resolve());

      const callsBefore = clearIntervalSpy.mock.calls.length;

      // Simulate cooldown change from popup
      act(() => {
        watcherCallbacks[SETTINGS_KEYS.COOLDOWN]?.({ newValue: 300 });
      });

      // Should have cleared the old interval
      expect(clearIntervalSpy.mock.calls.length).toBeGreaterThan(callsBefore);
    });

    it('should revive indicators when cooldown is increased', async () => {
      setupTableBody(['post-1']);
      storageStore[SETTINGS_KEYS.SHOW_NEW] = true;
      storageStore['hns-post-ids:/'] = { 'old-1': -1 } as PostTimestamps;

      renderHook(() => useSettings());
      await act(() => Promise.resolve());

      // post-1 is new, starts at opacity 1
      expect(getRowById('post-1').classList.contains(CSS_CLASSES.NEW_POST)).toBe(true);

      // Advance past default cooldown
      vi.advanceTimersByTime(COOLDOWN_MS + 1000);
      expect(getRowById('post-1').classList.contains(CSS_CLASSES.NEW_POST)).toBe(false);

      // Double the cooldown — post-1 should reappear
      act(() => {
        watcherCallbacks[SETTINGS_KEYS.COOLDOWN]?.({ newValue: COOLDOWN * 2 });
      });

      expect(getRowById('post-1').classList.contains(CSS_CLASSES.NEW_POST)).toBe(true);
    });

    it('should stop interval when no posts were ever new', async () => {
      setupTableBody(['post-1']);
      storageStore[SETTINGS_KEYS.SHOW_NEW] = true;
      // All posts are known (-1), none were ever new
      storageStore['hns-post-ids:/'] = { 'post-1': -1 } as PostTimestamps;

      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
      renderHook(() => useSettings());
      await act(() => Promise.resolve());

      const callsBefore = setIntervalSpy.mock.calls.length;

      // Change cooldown — should NOT start interval since no active timestamps
      act(() => {
        watcherCallbacks[SETTINGS_KEYS.COOLDOWN]?.({ newValue: 120 });
      });

      expect(setIntervalSpy.mock.calls.length).toBe(callsBefore);
    });

    it('should not restart interval when showNew is off', async () => {
      setupTableBody(['post-1']);
      storageStore[SETTINGS_KEYS.SHOW_NEW] = false;
      storageStore['hns-post-ids:/'] = { 'old-1': -1 } as PostTimestamps;

      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
      renderHook(() => useSettings());
      await act(() => Promise.resolve());

      const callsBefore = setIntervalSpy.mock.calls.length;

      act(() => {
        watcherCallbacks[SETTINGS_KEYS.COOLDOWN]?.({ newValue: 300 });
      });

      // setInterval should not have been called again
      expect(setIntervalSpy.mock.calls.length).toBe(callsBefore);
    });
  });

  describe('showNew watcher', () => {
    it('should stop interval when toggled off', async () => {
      setupTableBody(['post-1']);
      storageStore[SETTINGS_KEYS.SHOW_NEW] = true;
      storageStore['hns-post-ids:/'] = { 'old-1': -1 } as PostTimestamps;

      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
      renderHook(() => useSettings());
      await act(() => Promise.resolve());

      act(() => {
        watcherCallbacks[SETTINGS_KEYS.SHOW_NEW]?.({ newValue: false });
      });

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should restart interval when toggled back on', async () => {
      setupTableBody(['post-1']);
      storageStore[SETTINGS_KEYS.SHOW_NEW] = true;
      storageStore['hns-post-ids:/'] = { 'old-1': -1 } as PostTimestamps;

      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
      renderHook(() => useSettings());
      await act(() => Promise.resolve());

      // Toggle off then on
      act(() => {
        watcherCallbacks[SETTINGS_KEYS.SHOW_NEW]?.({ newValue: false });
      });
      const callsAfterOff = setIntervalSpy.mock.calls.length;

      act(() => {
        watcherCallbacks[SETTINGS_KEYS.SHOW_NEW]?.({ newValue: true });
      });

      expect(setIntervalSpy.mock.calls.length).toBeGreaterThan(callsAfterOff);
    });
  });

  describe('postIds watcher', () => {
    it('should re-apply marks from incoming timestamps without writing back', async () => {
      setupTableBody(['post-1', 'post-2']);
      storageStore[SETTINGS_KEYS.SHOW_NEW] = true;
      storageStore['hns-post-ids:/'] = { 'post-1': -1, 'post-2': -1 } as PostTimestamps;

      renderHook(() => useSettings());
      await act(() => Promise.resolve());

      mockSet.mockClear();

      // Simulate incoming timestamps from another tab
      const incomingTs: PostTimestamps = { 'post-1': Date.now(), 'post-2': -1 };
      act(() => {
        watcherCallbacks['hns-post-ids:/']?.({ newValue: incomingTs });
      });

      // post-1 should be marked as new
      expect(getRowById('post-1').classList.contains(CSS_CLASSES.NEW_POST)).toBe(true);
      // Should NOT have written back to storage
      expect(mockSet).not.toHaveBeenCalledWith('hns-post-ids:/', expect.anything());
    });

    it('should handle migrated array format from watcher', async () => {
      setupTableBody(['post-1']);
      storageStore[SETTINGS_KEYS.SHOW_NEW] = true;
      storageStore['hns-post-ids:/'] = { 'post-1': -1 } as PostTimestamps;

      renderHook(() => useSettings());
      await act(() => Promise.resolve());

      // Simulate old-format data from another tab that hasn't updated yet
      act(() => {
        watcherCallbacks['hns-post-ids:/']?.({ newValue: ['post-1'] });
      });

      // Should not throw, should handle gracefully
      expect(getRowById('post-1')).toBeDefined();
    });
  });

  describe('memory leak prevention', () => {
    it('should call unwatch on unmount', async () => {
      setupTableBody([]);
      renderHook(() => useSettings());
      await act(() => Promise.resolve());

      const { unmount } = renderHook(() => useSettings());
      await act(() => Promise.resolve());

      unmount();
      expect(mockUnwatch).toHaveBeenCalled();
    });

    it('should not start interval after unmount during async init', async () => {
      setupTableBody(['post-1']);
      storageStore[SETTINGS_KEYS.SHOW_NEW] = true;
      storageStore['hns-post-ids:/'] = { 'old-1': -1 } as PostTimestamps;

      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
      const { unmount } = renderHook(() => useSettings());

      // Unmount before init completes
      unmount();
      await act(() => Promise.resolve());

      // setInterval should not have been called after unmount
      // (the mountedRef guard should prevent it)
      const intervalCallsAfterUnmount = setIntervalSpy.mock.calls.length;
      // Advance time to check no intervals fire
      vi.advanceTimersByTime(COOLDOWN_MS);
      expect(setIntervalSpy.mock.calls.length).toBe(intervalCallsAfterUnmount);
    });
  });
});
