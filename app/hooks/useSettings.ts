import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Storage, type StorageCallbackMap } from '@plasmohq/storage';

import { SETTINGS_DEFAULTS, SETTINGS_KEYS, SORT_OPTIONS } from '~app/constants';
import type { SortOption, SortVariant } from '~app/types';

const storage = new Storage();

type ToggleKey = NonNullable<SortOption['enableKey']>;
type Toggles = Record<ToggleKey, boolean>;

const TOGGLE_KEYS = SORT_OPTIONS.flatMap((option) => option.enableKey ?? []);
const DEFAULT_TOGGLES = Object.fromEntries(TOGGLE_KEYS.map((key) => [key, SETTINGS_DEFAULTS[key]])) as Toggles;

// The currently-selectable sorts. Single source of truth that BOTH revert-on-disable
// (resolveActiveSort) and the rendered option list (enabledSortOptions) read from.
const enabledSorts = (toggles: Toggles): SortOption[] =>
  SORT_OPTIONS.filter((option) => !option.enableKey || toggles[option.enableKey]);

// A stored/synced sort value that is unknown (newer version) or currently disabled resolves to
// HN's default order (R6). Convergence point for every entry: init read + all watchers.
const resolveActiveSort = (stored: SortVariant, toggles: Toggles): SortVariant =>
  enabledSorts(toggles).some((option) => option.sortBy === stored) ? stored : 'default';

type UseSettingsReturn = {
  activeSort: SortVariant;
  setActiveSort: (sort: SortVariant) => void;
  showTrueTimeAgo: boolean;
  enabledSortOptions: SortOption[];
  settled: boolean;
};

export const useSettings = (): UseSettingsReturn => {
  const [activeSort, setActiveSortState] = useState<SortVariant>(SETTINGS_DEFAULTS[SETTINGS_KEYS.LAST_ACTIVE_SORT]);
  const [showTrueTimeAgo, setShowTrueTimeAgoState] = useState(SETTINGS_DEFAULTS[SETTINGS_KEYS.TRUE_TIME_AGO]);
  const [toggles, setTogglesState] = useState(DEFAULT_TOGGLES);
  const [settled, setSettled] = useState(false);
  // Mirror of `toggles` so watchers validate against the current value, not their closure's.
  const togglesRef = useRef(DEFAULT_TOGGLES);
  // Sort/toggle watchers go live only once init has read their values, so an early change can't be
  // overwritten by (or race) the init read.
  const sortsReadyRef = useRef(false);

  const setActiveSort = useCallback((sort: SortVariant) => {
    setActiveSortState(sort);
    storage.set(SETTINGS_KEYS.LAST_ACTIVE_SORT, sort);
  }, []);

  useEffect(() => {
    const setToggles = (next: Toggles) => {
      togglesRef.current = next;
      setTogglesState(next);
    };

    const init = async () => {
      const loaded = { ...DEFAULT_TOGGLES };
      for (const key of TOGGLE_KEYS) loaded[key] = (await storage.get<boolean>(key)) ?? DEFAULT_TOGGLES[key];
      setToggles(loaded);

      const sort = await storage.get<SortVariant>(SETTINGS_KEYS.LAST_ACTIVE_SORT);
      setActiveSortState(resolveActiveSort(sort ?? SETTINGS_DEFAULTS[SETTINGS_KEYS.LAST_ACTIVE_SORT], loaded));
      setSettled(true);
      sortsReadyRef.current = true;

      const trueTimeAgo = await storage.get<boolean>(SETTINGS_KEYS.TRUE_TIME_AGO);
      setShowTrueTimeAgoState(trueTimeAgo ?? SETTINGS_DEFAULTS[SETTINGS_KEYS.TRUE_TIME_AGO]);
    };

    // Never let a rejected storage read block first paint forever (e.g. "extension context
    // invalidated" during a mid-session update): degrade to defaults instead of a vanished panel.
    init().catch(() => setSettled(true));

    const watcherMap: StorageCallbackMap = {
      [SETTINGS_KEYS.LAST_ACTIVE_SORT]: (change) => {
        if (!sortsReadyRef.current) return;
        const incoming =
          (change.newValue as SortVariant | undefined) ?? SETTINGS_DEFAULTS[SETTINGS_KEYS.LAST_ACTIVE_SORT];
        // Resolve locally (revert-on-disable); never write the resolved value back (no ping-pong).
        setActiveSortState(resolveActiveSort(incoming, togglesRef.current));
      },
      [SETTINGS_KEYS.TRUE_TIME_AGO]: (change) => {
        setShowTrueTimeAgoState(
          (change.newValue as boolean | undefined) ?? SETTINGS_DEFAULTS[SETTINGS_KEYS.TRUE_TIME_AGO],
        );
      },
    };

    for (const key of TOGGLE_KEYS) {
      watcherMap[key] = (change) => {
        if (!sortsReadyRef.current) return;
        const next = { ...togglesRef.current, [key]: (change.newValue as boolean | undefined) ?? DEFAULT_TOGGLES[key] };
        setToggles(next);
        setActiveSortState((prev) => resolveActiveSort(prev, next));
      };
    }

    storage.watch(watcherMap);

    return () => {
      storage.unwatch(watcherMap);
    };
  }, []);

  const enabledSortOptions = useMemo(() => enabledSorts(toggles), [toggles]);

  return { activeSort, setActiveSort, showTrueTimeAgo, enabledSortOptions, settled };
};
