import { useCallback, useEffect, useMemo, useState } from 'react';

import { Storage } from '@plasmohq/storage';

import { SETTINGS_DEFAULTS, SETTINGS_KEYS, SORT_OPTIONS } from '~app/constants';
import type { SortOption, SortVariant } from '~app/types';
import { watchSettings } from '~app/utils/settings';

const storage = new Storage();

type ToggleKey = NonNullable<SortOption['enableKey']>;
type Toggles = Record<ToggleKey, boolean>;

const TOGGLE_KEYS = SORT_OPTIONS.flatMap((option) => option.enableKey ?? []);
const DEFAULT_TOGGLES = Object.fromEntries(TOGGLE_KEYS.map((key) => [key, SETTINGS_DEFAULTS[key]])) as Toggles;
const WATCHED_KEYS = [...TOGGLE_KEYS, SETTINGS_KEYS.LAST_ACTIVE_SORT, SETTINGS_KEYS.TRUE_TIME_AGO];

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
  const [toggles, setToggles] = useState(DEFAULT_TOGGLES);
  const [settled, setSettled] = useState(false);

  const setActiveSort = useCallback((sort: SortVariant) => {
    setActiveSortState(sort);
    storage.set(SETTINGS_KEYS.LAST_ACTIVE_SORT, sort);
  }, []);

  useEffect(
    () =>
      watchSettings(WATCHED_KEYS, (values, changed) => {
        const next = Object.fromEntries(TOGGLE_KEYS.map((key) => [key, values[key]])) as Toggles;
        setToggles(next);
        setShowTrueTimeAgoState(values[SETTINGS_KEYS.TRUE_TIME_AGO]);
        // Resolve locally (revert-on-disable); never write the resolved value back (no ping-pong). A toggle
        // change re-checks the sort on screen, so re-enabling a sort doesn't bring back the stored one.
        setActiveSortState((prev) =>
          resolveActiveSort(
            !changed || changed === SETTINGS_KEYS.LAST_ACTIVE_SORT ? values[SETTINGS_KEYS.LAST_ACTIVE_SORT] : prev,
            next,
          ),
        );
        setSettled(true);
      }),
    [],
  );

  const enabledSortOptions = useMemo(() => enabledSorts(toggles), [toggles]);

  return { activeSort, setActiveSort, showTrueTimeAgo, enabledSortOptions, settled };
};
