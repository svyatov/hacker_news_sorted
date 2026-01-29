import { CSS_CLASSES } from '~app/constants';
import { getTableBody } from '~app/utils/selectors';

export const isFirstPage = (): boolean => {
  const params = new URLSearchParams(window.location.search);
  return !(params.has('p') || params.has('next'));
};

export const getPostIds = (): string[] => {
  const tableBody = getTableBody();
  if (!tableBody) return [];

  const rows = tableBody.querySelectorAll<HTMLElement>('tr.athing[id]');
  return Array.from(rows, (row) => row.id);
};

export const markNewPosts = (currentIds: string[], previousIds: Set<string>): void => {
  if (previousIds.size === 0) return;

  const tableBody = getTableBody();
  if (!tableBody) return;

  for (const id of currentIds) {
    if (!previousIds.has(id)) {
      const row = tableBody.querySelector<HTMLElement>(`tr.athing[id="${id}"]`);
      if (row) row.classList.add(CSS_CLASSES.NEW_POST);
    }
  }
};

export const clearNewPostMarkers = (): void => {
  const tableBody = getTableBody();
  if (!tableBody) return;

  const rows = tableBody.querySelectorAll(`.${CSS_CLASSES.NEW_POST}`);
  for (const row of rows) {
    row.classList.remove(CSS_CLASSES.NEW_POST);
  }
};
