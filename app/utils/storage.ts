import { LastActiveSortKey } from '~app/constants';
import type { SortVariant } from '~app/types';

export const getLastActiveSort = (): SortVariant => {
  return (localStorage.getItem(LastActiveSortKey) as SortVariant) || 'points';
};

export const setLastActiveSort = (sortBy: SortVariant): void => {
  localStorage.setItem(LastActiveSortKey, sortBy);
};
