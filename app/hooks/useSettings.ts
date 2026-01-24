import { useCallback, useEffect, useRef, useState } from 'react';

import { Storage, type StorageCallbackMap } from '@plasmohq/storage';

import { CSS_CLASSES, SETTINGS_DEFAULTS, SETTINGS_KEYS } from '~app/constants';
import type { SortVariant } from '~app/types';
import { clearNewPostMarkers, getPostIds, isFirstPage, markNewPosts } from '~app/utils/newPosts';
import { getTableBody } from '~app/utils/selectors';

const storage = new Storage();

const getPostIdsKey = (): string => `${SETTINGS_KEYS.POST_IDS_PREFIX}${window.location.pathname}`;

type UseSettingsReturn = {
  activeSort: SortVariant;
  setActiveSort: (sort: SortVariant) => void;
};

export const useSettings = (): UseSettingsReturn => {
  const [activeSort, setActiveSortState] = useState<SortVariant>(SETTINGS_DEFAULTS[SETTINGS_KEYS.LAST_ACTIVE_SORT]);
  const initializedRef = useRef(false);

  const setActiveSort = useCallback((sort: SortVariant) => {
    setActiveSortState(sort);
    storage.set(SETTINGS_KEYS.LAST_ACTIVE_SORT, sort);
  }, []);

  useEffect(() => {
    const tableBody = getTableBody();

    // --- Show New ---
    const applyShowNew = (enabled: boolean) => {
      if (!tableBody) return;
      if (enabled) {
        tableBody.classList.add(CSS_CLASSES.SHOW_NEW);
      } else {
        tableBody.classList.remove(CSS_CLASSES.SHOW_NEW);
      }
    };

    // --- Post IDs ---
    const applyPostIds = (storedIds: string[]) => {
      if (!tableBody || !isFirstPage()) return;
      clearNewPostMarkers();
      const currentIds = getPostIds();
      const previousIds = new Set(storedIds);
      markNewPosts(currentIds, previousIds);
    };

    // --- Init ---
    const init = async () => {
      const showNew = await storage.get<boolean>(SETTINGS_KEYS.SHOW_NEW);
      applyShowNew(showNew ?? SETTINGS_DEFAULTS[SETTINGS_KEYS.SHOW_NEW]);

      const sort = await storage.get<SortVariant>(SETTINGS_KEYS.LAST_ACTIVE_SORT);
      setActiveSortState(sort ?? SETTINGS_DEFAULTS[SETTINGS_KEYS.LAST_ACTIVE_SORT]);

      if (isFirstPage()) {
        const postIdsKey = getPostIdsKey();
        const storedIds = await storage.get<string[]>(postIdsKey);
        const currentIds = getPostIds();

        if (currentIds.length > 0) {
          const previousIds = new Set(storedIds ?? []);
          markNewPosts(currentIds, previousIds);
          await storage.set(postIdsKey, currentIds);
        }
      }

      initializedRef.current = true;
    };

    init();

    // --- Watchers ---
    const watcherMap: StorageCallbackMap = {
      [SETTINGS_KEYS.SHOW_NEW]: (change) => {
        applyShowNew(change.newValue ?? SETTINGS_DEFAULTS[SETTINGS_KEYS.SHOW_NEW]);
      },
      [SETTINGS_KEYS.LAST_ACTIVE_SORT]: (change) => {
        if (!initializedRef.current) return;
        setActiveSortState(change.newValue ?? SETTINGS_DEFAULTS[SETTINGS_KEYS.LAST_ACTIVE_SORT]);
      },
      [getPostIdsKey()]: (change) => {
        if (!initializedRef.current) return;
        applyPostIds(change.newValue ?? []);
      },
    };

    storage.watch(watcherMap);

    return () => {
      storage.unwatch(watcherMap);
    };
  }, []);

  return { activeSort, setActiveSort };
};
