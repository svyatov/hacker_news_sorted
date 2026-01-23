import { CSS_CLASSES, HN_SELECTORS } from '~app/constants';

const STORAGE_PREFIX = 'hns-post-ids:';

const getStorageKey = (): string => `${STORAGE_PREFIX}${window.location.pathname}`;

export const getPostIds = (): string[] => {
  const tableBody = document.querySelector(HN_SELECTORS.TABLE_BODY);
  if (!tableBody) return [];

  const rows = tableBody.querySelectorAll<HTMLElement>('tr.athing[id]');
  return Array.from(rows, (row) => row.id);
};

export const getStoredPostIds = (): Set<string> => {
  const stored = localStorage.getItem(getStorageKey());
  if (!stored) return new Set();
  return new Set(JSON.parse(stored) as string[]);
};

export const storePostIds = (ids: string[]): void => {
  localStorage.setItem(getStorageKey(), JSON.stringify(ids));
};

export const markNewPosts = (currentIds: string[], previousIds: Set<string>): void => {
  if (previousIds.size === 0) return;

  const tableBody = document.querySelector(HN_SELECTORS.TABLE_BODY);
  if (!tableBody) return;

  for (const id of currentIds) {
    if (!previousIds.has(id)) {
      const row = tableBody.querySelector<HTMLElement>(`tr.athing[id="${id}"]`);
      if (row) row.classList.add(CSS_CLASSES.NEW_POST);
    }
  }
};

export const clearNewPostMarkers = (): void => {
  const tableBody = document.querySelector(HN_SELECTORS.TABLE_BODY);
  if (!tableBody) return;

  const rows = tableBody.querySelectorAll(`.${CSS_CLASSES.NEW_POST}`);
  for (const row of rows) {
    row.classList.remove(CSS_CLASSES.NEW_POST);
  }
};
