import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Storage, type StorageCallbackMap } from '@plasmohq/storage';

import { CSS_CLASSES, SETTINGS_DEFAULTS, SETTINGS_KEYS, SORT_OPTIONS } from '~app/constants';
import type { SortOption, SortVariant } from '~app/types';
import type { PostTimestamps } from '~app/utils/newPosts';
import {
  clearNewPostMarkers,
  getPostIds,
  isFirstPage,
  markNewPosts,
  migratePostIds,
  updateFadeOpacities,
} from '~app/utils/newPosts';
import { getTableBody } from '~app/utils/selectors';

const storage = new Storage();

const getPostIdsKey = (): string => `${SETTINGS_KEYS.POST_IDS_PREFIX}${window.location.pathname}`;

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
  const initializedRef = useRef(false);
  // Sort/toggle watchers only need their own values read + the panel painted (setSettled) to go
  // live — earlier than initializedRef, which stays gated until init's own postIds write lands so
  // the postIds watcher doesn't react to it (KTD-6, no ping-pong).
  const sortsReadyRef = useRef(false);
  const timestampsRef = useRef<PostTimestamps>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownRef = useRef<number>(SETTINGS_DEFAULTS[SETTINGS_KEYS.COOLDOWN]);
  const showNewRef = useRef(true);
  const mountedRef = useRef(true);

  const setActiveSort = useCallback((sort: SortVariant) => {
    setActiveSortState(sort);
    storage.set(SETTINGS_KEYS.LAST_ACTIVE_SORT, sort);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const tableBody = getTableBody();
    const postIdsKey = getPostIdsKey();

    const stopFadeInterval = () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const startFadeInterval = () => {
      stopFadeInterval();
      const cooldownMs = cooldownRef.current * 1000;
      const period = Math.max(1000, Math.floor(cooldownMs / 50));
      intervalRef.current = setInterval(() => {
        updateFadeOpacities(timestampsRef.current, cooldownMs);
      }, period);
    };

    const hasActiveTimestamps = (ts: PostTimestamps): boolean => Object.values(ts).some((v) => v > 0);

    // --- Show New ---
    const applyShowNew = (enabled: boolean) => {
      if (!tableBody) return;
      if (enabled) {
        tableBody.classList.add(CSS_CLASSES.SHOW_NEW);
      } else {
        tableBody.classList.remove(CSS_CLASSES.SHOW_NEW);
      }
    };

    // --- Init ---
    const init = async () => {
      const showNew = await storage.get<boolean>(SETTINGS_KEYS.SHOW_NEW);
      const showNewValue = showNew ?? SETTINGS_DEFAULTS[SETTINGS_KEYS.SHOW_NEW];
      showNewRef.current = showNewValue;
      applyShowNew(showNewValue);

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

      const cooldown = await storage.get<number>(SETTINGS_KEYS.COOLDOWN);
      cooldownRef.current = cooldown ?? SETTINGS_DEFAULTS[SETTINGS_KEYS.COOLDOWN];

      const trueTimeAgo = await storage.get<boolean>(SETTINGS_KEYS.TRUE_TIME_AGO);
      setShowTrueTimeAgoState(trueTimeAgo ?? SETTINGS_DEFAULTS[SETTINGS_KEYS.TRUE_TIME_AGO]);

      if (isFirstPage()) {
        const stored = await storage.get<string[] | PostTimestamps>(postIdsKey);
        const currentIds = getPostIds();

        if (currentIds.length > 0) {
          const previousTimestamps = stored ? migratePostIds(stored) : {};
          const cooldownMs = cooldownRef.current * 1000;
          const newTimestamps = markNewPosts(currentIds, previousTimestamps, cooldownMs);
          timestampsRef.current = newTimestamps;
          await storage.set(postIdsKey, newTimestamps);

          if (!mountedRef.current) return;
          if (showNewRef.current && hasActiveTimestamps(newTimestamps)) {
            startFadeInterval();
          }
        }
      }

      initializedRef.current = true;
    };

    // Never let a rejected storage read block first paint forever (e.g. "extension context
    // invalidated" during a mid-session update): degrade to defaults instead of a vanished panel.
    init().catch(() => {
      if (mountedRef.current) setSettled(true);
    });

    // --- Watchers ---
    const watcherMap: StorageCallbackMap = {
      [SETTINGS_KEYS.SHOW_NEW]: (change) => {
        const enabled = (change.newValue as boolean | undefined) ?? SETTINGS_DEFAULTS[SETTINGS_KEYS.SHOW_NEW];
        showNewRef.current = enabled;
        applyShowNew(enabled);
        if (enabled) {
          // Re-apply marks and restart interval
          if (isFirstPage()) {
            clearNewPostMarkers();
            const currentIds = getPostIds();
            const cooldownMs = cooldownRef.current * 1000;
            const newTs = markNewPosts(currentIds, timestampsRef.current, cooldownMs);
            timestampsRef.current = newTs;
            if (hasActiveTimestamps(newTs)) {
              startFadeInterval();
            }
          }
        } else {
          stopFadeInterval();
          clearNewPostMarkers();
        }
      },
      [SETTINGS_KEYS.LAST_ACTIVE_SORT]: (change) => {
        if (!sortsReadyRef.current) return;
        const incoming =
          (change.newValue as SortVariant | undefined) ?? SETTINGS_DEFAULTS[SETTINGS_KEYS.LAST_ACTIVE_SORT];
        // Resolve locally (revert-on-disable); never write the resolved value back (no ping-pong).
        setActiveSortState(resolveActiveSort(incoming, velocityEnabledRef.current, heatEnabledRef.current));
      },
      [SETTINGS_KEYS.VELOCITY_ENABLED]: (change) => {
        if (!sortsReadyRef.current) return; // live once sort/toggle reads + first paint are done
        const enabled = (change.newValue as boolean | undefined) ?? SETTINGS_DEFAULTS[SETTINGS_KEYS.VELOCITY_ENABLED];
        velocityEnabledRef.current = enabled;
        setVelocityEnabledState(enabled);
        setActiveSortState((prev) => resolveActiveSort(prev, enabled, heatEnabledRef.current));
      },
      [SETTINGS_KEYS.HEAT_ENABLED]: (change) => {
        if (!sortsReadyRef.current) return; // live once sort/toggle reads + first paint are done
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
      [SETTINGS_KEYS.COOLDOWN]: (change) => {
        cooldownRef.current = (change.newValue as number | undefined) ?? SETTINGS_DEFAULTS[SETTINGS_KEYS.COOLDOWN];
        if (showNewRef.current && isFirstPage()) {
          // Re-apply marks so indicators can reappear if cooldown was increased
          clearNewPostMarkers();
          const currentIds = getPostIds();
          const cooldownMs = cooldownRef.current * 1000;
          const newTs = markNewPosts(currentIds, timestampsRef.current, cooldownMs);
          timestampsRef.current = newTs;
          if (hasActiveTimestamps(newTs)) {
            startFadeInterval();
          } else {
            stopFadeInterval();
          }
        }
      },
      [postIdsKey]: (change) => {
        if (!initializedRef.current) return;
        const incoming = (change.newValue ?? {}) as string[] | PostTimestamps;
        const migrated = Array.isArray(incoming) ? migratePostIds(incoming) : (incoming as PostTimestamps);
        clearNewPostMarkers();
        const currentIds = getPostIds();
        const cooldownMs = cooldownRef.current * 1000;
        const newTs = markNewPosts(currentIds, migrated, cooldownMs);
        timestampsRef.current = newTs;
        // Do NOT write back to storage (prevents ping-pong)
      },
    };

    storage.watch(watcherMap);

    return () => {
      mountedRef.current = false;
      stopFadeInterval();
      storage.unwatch(watcherMap);
    };
  }, []);

  const enabledSortOptions = useMemo(() => {
    const enabled = enabledSortSet(velocityEnabled, heatEnabled);
    return SORT_OPTIONS.filter((option) => enabled.has(option.sortBy));
  }, [velocityEnabled, heatEnabled]);

  return { activeSort, setActiveSort, showTrueTimeAgo, enabledSortOptions, settled };
};
