import { useEffect } from 'react';

import { Storage } from '@plasmohq/storage';

import { CSS_CLASSES, HN_SELECTORS } from '~app/constants';
import { SETTINGS_DEFAULTS, SETTINGS_KEYS } from '~app/utils/settings';

const storage = new Storage();

export const useSettings = () => {
  useEffect(() => {
    const tableBody = document.querySelector(HN_SELECTORS.TABLE_BODY);
    if (!tableBody) return;

    const applyShowNew = (enabled: boolean) => {
      if (enabled) {
        tableBody.classList.add(CSS_CLASSES.SHOW_NEW);
      } else {
        tableBody.classList.remove(CSS_CLASSES.SHOW_NEW);
      }
    };

    const initSettings = async () => {
      const showNew = await storage.get<boolean>(SETTINGS_KEYS.SHOW_NEW);
      applyShowNew(showNew ?? SETTINGS_DEFAULTS[SETTINGS_KEYS.SHOW_NEW]);
    };

    initSettings();

    storage.watch({
      [SETTINGS_KEYS.SHOW_NEW]: (change) => {
        applyShowNew(change.newValue ?? SETTINGS_DEFAULTS[SETTINGS_KEYS.SHOW_NEW]);
      },
    });
  }, []);
};
