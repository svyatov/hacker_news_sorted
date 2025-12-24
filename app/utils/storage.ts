import { LAST_ACTIVE_SORT_KEY } from '~app/constants';
import type { SortVariant } from '~app/types';

export const getLastActiveSort = (): SortVariant => {
  try {
    const stored = localStorage.getItem(LAST_ACTIVE_SORT_KEY);

    if (stored && ['points', 'time', 'comments', 'default'].includes(stored)) {
      return stored as SortVariant;
    }
  } catch {
    // localStorage may be disabled or unavailable
  }

  return 'points';
};

export const setLastActiveSort = (sortBy: SortVariant): void => {
  try {
    localStorage.setItem(LAST_ACTIVE_SORT_KEY, sortBy);
  } catch {
    // localStorage may be disabled or unavailable
  }
};
