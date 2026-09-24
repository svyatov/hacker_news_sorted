import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Storage, type StorageCallbackMap } from '@plasmohq/storage';

import { SETTINGS_DEFAULTS, SETTINGS_KEYS, SORT_OPTIONS } from '~app/constants';
import type { SortOption, SortVariant } from '~app/types';

const storage = new Storage();

// The set of currently-selectable sorts: every SORT_OPTIONS variant minus any whose disable
// toggle is off. Single source of truth that BOTH revert-on-disable (resolveActiveSort) and the
// rendered option list (enabledSortOptions) read from, so the two can't drift. To add a toggle,
// extend the filter here plus SETTINGS_KEYS/DEFAULTS and the init read + watcher below.
const enabledSortSet = (velocityEnabled: boolean, heatEnabled: boolean): Set<SortVariant> =>
  new Set(
    SORT_OPTIONS.map((option) => option.sortBy).filter(
      (sort) => (sort !== 'velocity' || velocityEnabled) && (sort !== 'heat' || heatEnabled),
    ),
  );

// A stored/synced sort value that is unknown (newer version) or currently disabled resolves to
// HN's default order (R6). Convergence point for every entry: init read + all watchers.
const resolveActiveSort = (stored: SortVariant, velocityEnabled: boolean, heatEnabled: boolean): SortVariant =>
  enabledSortSet(velocityEnabled, heatEnabled).has(stored) ? stored : 'default';

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
  const [velocityEnabled, setVelocityEnabledState] = useState(SETTINGS_DEFAULTS[SETTINGS_KEYS.VELOCITY_ENABLED]);
  const [heatEnabled, setHeatEnabledState] = useState(SETTINGS_DEFAULTS[SETTINGS_KEYS.HEAT_ENABLED]);
  const [settled, setSettled] = useState(false);
  const velocityEnabledRef = useRef(SETTINGS_DEFAULTS[SETTINGS_KEYS.VELOCITY_ENABLED]);
  const heatEnabledRef = useRef(SETTINGS_DEFAULTS[SETTINGS_KEYS.HEAT_ENABLED]);
  // Sort/toggle watchers go live only once init has read their values, so an early change can't be
  // overwritten by (or race) the init read.
  const sortsReadyRef = useRef(false);
  const mountedRef = useRef(true);

  const setActiveSort = useCallback((sort: SortVariant) => {
    setActiveSortState(sort);
    storage.set(SETTINGS_KEYS.LAST_ACTIVE_SORT, sort);
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      const velocity = await storage.get<boolean>(SETTINGS_KEYS.VELOCITY_ENABLED);
      const velocityValue = velocity ?? SETTINGS_DEFAULTS[SETTINGS_KEYS.VELOCITY_ENABLED];
      velocityEnabledRef.current = velocityValue;
      setVelocityEnabledState(velocityValue);

      const heat = await storage.get<boolean>(SETTINGS_KEYS.HEAT_ENABLED);
      const heatValue = heat ?? SETTINGS_DEFAULTS[SETTINGS_KEYS.HEAT_ENABLED];
      heatEnabledRef.current = heatValue;
      setHeatEnabledState(heatValue);

      const sort = await storage.get<SortVariant>(SETTINGS_KEYS.LAST_ACTIVE_SORT);
      setActiveSortState(
        resolveActiveSort(sort ?? SETTINGS_DEFAULTS[SETTINGS_KEYS.LAST_ACTIVE_SORT], velocityValue, heatValue),
      );
      setSettled(true);
      sortsReadyRef.current = true;

      const trueTimeAgo = await storage.get<boolean>(SETTINGS_KEYS.TRUE_TIME_AGO);
      setShowTrueTimeAgoState(trueTimeAgo ?? SETTINGS_DEFAULTS[SETTINGS_KEYS.TRUE_TIME_AGO]);
    };

    // Never let a rejected storage read block first paint forever (e.g. "extension context
    // invalidated" during a mid-session update): degrade to defaults instead of a vanished panel.
    init().catch(() => {
      if (mountedRef.current) setSettled(true);
    });

    const watcherMap: StorageCallbackMap = {
      [SETTINGS_KEYS.LAST_ACTIVE_SORT]: (change) => {
        if (!sortsReadyRef.current) return;
        const incoming =
          (change.newValue as SortVariant | undefined) ?? SETTINGS_DEFAULTS[SETTINGS_KEYS.LAST_ACTIVE_SORT];
        // Resolve locally (revert-on-disable); never write the resolved value back (no ping-pong).
        setActiveSortState(resolveActiveSort(incoming, velocityEnabledRef.current, heatEnabledRef.current));
      },
      [SETTINGS_KEYS.VELOCITY_ENABLED]: (change) => {
        if (!sortsReadyRef.current) return;
        const enabled = (change.newValue as boolean | undefined) ?? SETTINGS_DEFAULTS[SETTINGS_KEYS.VELOCITY_ENABLED];
        velocityEnabledRef.current = enabled;
        setVelocityEnabledState(enabled);
        setActiveSortState((prev) => resolveActiveSort(prev, enabled, heatEnabledRef.current));
      },
      [SETTINGS_KEYS.HEAT_ENABLED]: (change) => {
        if (!sortsReadyRef.current) return;
        const enabled = (change.newValue as boolean | undefined) ?? SETTINGS_DEFAULTS[SETTINGS_KEYS.HEAT_ENABLED];
        heatEnabledRef.current = enabled;
        setHeatEnabledState(enabled);
        setActiveSortState((prev) => resolveActiveSort(prev, velocityEnabledRef.current, enabled));
      },
      [SETTINGS_KEYS.TRUE_TIME_AGO]: (change) => {
        setShowTrueTimeAgoState(
          (change.newValue as boolean | undefined) ?? SETTINGS_DEFAULTS[SETTINGS_KEYS.TRUE_TIME_AGO],
        );
      },
    };

    storage.watch(watcherMap);

    return () => {
      mountedRef.current = false;
      storage.unwatch(watcherMap);
    };
  }, []);

  const enabledSortOptions = useMemo(() => {
    const enabled = enabledSortSet(velocityEnabled, heatEnabled);
    return SORT_OPTIONS.filter((option) => enabled.has(option.sortBy));
  }, [velocityEnabled, heatEnabled]);

  return { activeSort, setActiveSort, showTrueTimeAgo, enabledSortOptions, settled };
};
