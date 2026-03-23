import { useCallback, useEffect, useRef, useState } from 'react';

import { Storage } from '@plasmohq/storage';

import { REVIEW_PROMPT_DAYS, REVIEW_PROMPT_SORTS, SETTINGS_DEFAULTS, SETTINGS_KEYS } from '~app/constants';

const storage = new Storage();
const MS_PER_DAY = 86_400_000;

export const shouldPrompt = (dismissed: boolean, installTimestamp: number, sortCount: number): boolean => {
  if (dismissed) return false;
  if (installTimestamp === 0) return false;

  const daysSinceInstall = (Date.now() - installTimestamp) / MS_PER_DAY;
  return daysSinceInstall >= REVIEW_PROMPT_DAYS || sortCount >= REVIEW_PROMPT_SORTS;
};

type UseReviewPromptReturn = {
  showPrompt: boolean;
  dismissPrompt: () => void;
  incrementSortCount: () => void;
};

export const useReviewPrompt = (): UseReviewPromptReturn => {
  const [showPrompt, setShowPrompt] = useState(false);
  const sortCountRef = useRef(0);

  const dismissPrompt = useCallback(() => {
    setShowPrompt(false);
    storage.set(SETTINGS_KEYS.REVIEW_DISMISSED, true);
  }, []);

  const incrementSortCount = useCallback(() => {
    const newCount = sortCountRef.current + 1;
    sortCountRef.current = newCount;
    storage.set(SETTINGS_KEYS.SORT_COUNT, newCount);
  }, []);

  useEffect(() => {
    const init = async () => {
      let installTs = await storage.get<number>(SETTINGS_KEYS.INSTALL_TIMESTAMP);
      if (!installTs) {
        installTs = Date.now();
        await storage.set(SETTINGS_KEYS.INSTALL_TIMESTAMP, installTs);
      }

      const dismissed =
        (await storage.get<boolean>(SETTINGS_KEYS.REVIEW_DISMISSED)) ??
        SETTINGS_DEFAULTS[SETTINGS_KEYS.REVIEW_DISMISSED];

      const sortCount =
        (await storage.get<number>(SETTINGS_KEYS.SORT_COUNT)) ?? SETTINGS_DEFAULTS[SETTINGS_KEYS.SORT_COUNT];
      sortCountRef.current = sortCount;

      if (shouldPrompt(dismissed, installTs, sortCount)) {
        setShowPrompt(true);
      }
    };
    init();
  }, []);

  return { showPrompt, dismissPrompt, incrementSortCount };
};
