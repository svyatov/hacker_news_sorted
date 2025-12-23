import { LAST_ACTIVE_SORT_KEY } from '~app/constants';
import type { SortVariant } from '~app/types';

export const getLastActiveSort = (): SortVariant => {
  return (localStorage.getItem(LAST_ACTIVE_SORT_KEY) as SortVariant) || 'points';
};

export const setLastActiveSort = (sortBy: SortVariant): void => {
  localStorage.setItem(LAST_ACTIVE_SORT_KEY, sortBy);
};
