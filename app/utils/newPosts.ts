import { CSS_CLASSES } from '~app/constants';
import { getTableBody } from '~app/utils/selectors';

export type PostTimestamps = Record<string, number>;

const FADE_PROPERTY = '--hns-fade';

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

export const migratePostIds = (stored: string[] | PostTimestamps): PostTimestamps => {
  if (Array.isArray(stored)) {
    return Object.fromEntries(stored.map((id) => [id, Date.now()]));
  }
  return stored;
};

export const markNewPosts = (
  currentIds: string[],
  previousTimestamps: PostTimestamps,
  cooldownMs: number,
): PostTimestamps => {
  const result: PostTimestamps = {};

  if (Object.keys(previousTimestamps).length === 0) {
    for (const id of currentIds) result[id] = -1;
    return result;
  }

  const tableBody = getTableBody();

  for (const id of currentIds) {
    const ts = previousTimestamps[id];

    if (ts === undefined) {
      // New post
      result[id] = Date.now();
      if (tableBody) {
        const row = tableBody.querySelector<HTMLElement>(`tr.athing[id="${id}"]`);
        if (row) {
          row.classList.add(CSS_CLASSES.NEW_POST);
          row.style.setProperty(FADE_PROPERTY, '1');
        }
      }
    } else if (ts > 0) {
      // Previously discovered, keep original timestamp
      result[id] = ts;
      const remaining = ts + cooldownMs - Date.now();
      if (remaining > 0 && tableBody) {
        const row = tableBody.querySelector<HTMLElement>(`tr.athing[id="${id}"]`);
        if (row) {
          row.classList.add(CSS_CLASSES.NEW_POST);
          row.style.setProperty(FADE_PROPERTY, String(remaining / cooldownMs));
        }
      }
    } else {
      // Known (-1): never was new
      result[id] = -1;
    }
  }

  return result;
};

export const updateFadeOpacities = (timestamps: PostTimestamps, cooldownMs: number): void => {
  const tableBody = getTableBody();

  for (const [id, ts] of Object.entries(timestamps)) {
    if (ts <= 0) continue;

    if (!tableBody) continue;
    const row = tableBody.querySelector<HTMLElement>(`tr.athing[id="${id}"]`);
    if (!row) continue;

    const opacity = Math.max(0, (ts + cooldownMs - Date.now()) / cooldownMs);
    if (opacity <= 0) {
      row.classList.remove(CSS_CLASSES.NEW_POST);
      row.style.removeProperty(FADE_PROPERTY);
    } else {
      row.style.setProperty(FADE_PROPERTY, String(opacity));
    }
  }
};

export const clearNewPostMarkers = (): void => {
  const tableBody = getTableBody();
  if (!tableBody) return;

  const rows = tableBody.querySelectorAll<HTMLElement>(`.${CSS_CLASSES.NEW_POST}`);
  for (const row of rows) {
    row.classList.remove(CSS_CLASSES.NEW_POST);
    row.style.removeProperty(FADE_PROPERTY);
  }
};
