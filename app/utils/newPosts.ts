import { Storage, type StorageCallbackMap } from '@plasmohq/storage';

import { CSS_CLASSES, SETTINGS_DEFAULTS, SETTINGS_KEYS } from '~app/constants';
import { getTableBody } from '~app/utils/selectors';
import { watchSettings } from '~app/utils/settings';

// Post id -> discovery time (ms), or -1 for a post that was already there on the first visit.
export type PostTimestamps = Record<string, number>;

const storage = new Storage();

const FADE_PROPERTY = '--hns-fade';

const isFirstPage = (): boolean => {
  const params = new URLSearchParams(window.location.search);
  return !(params.has('p') || params.has('next'));
};

const getPostIds = (): string[] => {
  const tableBody = getTableBody();
  if (!tableBody) return [];

  const rows = tableBody.querySelectorAll<HTMLElement>('tr.athing[id]');
  return Array.from(rows, (row) => row.id);
};

const migratePostIds = (stored: string[] | PostTimestamps): PostTimestamps => {
  if (Array.isArray(stored)) {
    return Object.fromEntries(stored.map((id) => [id, Date.now()]));
  }
  return stored;
};

const getPostRow = (tableBody: HTMLElement | null, id: string) =>
  tableBody?.querySelector<HTMLElement>(`tr.athing[id="${id}"]`);

// Ids come from getPostIds() on the same table in the same tick, so the row exists.
const markRow = (tableBody: HTMLElement | null, id: string, fade: number): void => {
  const row = getPostRow(tableBody, id)!;
  row.classList.add(CSS_CLASSES.NEW_POST);
  row.style.setProperty(FADE_PROPERTY, String(fade));
};

const markNewPosts = (currentIds: string[], previousTimestamps: PostTimestamps, cooldownMs: number): PostTimestamps => {
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
      markRow(tableBody, id, 1);
    } else if (ts > 0) {
      // Previously discovered, keep original timestamp
      result[id] = ts;
      const remaining = ts + cooldownMs - Date.now();
      if (remaining > 0) markRow(tableBody, id, remaining / cooldownMs);
    } else {
      // Known (-1): never was new
      result[id] = -1;
    }
  }

  return result;
};

const updateFadeOpacities = (timestamps: PostTimestamps, cooldownMs: number): void => {
  const tableBody = getTableBody();

  for (const [id, ts] of Object.entries(timestamps)) {
    if (ts <= 0) continue;
    const row = getPostRow(tableBody, id);
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

const clearNewPostMarkers = (): void => {
  const tableBody = getTableBody();
  if (!tableBody) return;

  const rows = tableBody.querySelectorAll<HTMLElement>(`.${CSS_CLASSES.NEW_POST}`);
  for (const row of rows) {
    row.classList.remove(CSS_CLASSES.NEW_POST);
    row.style.removeProperty(FADE_PROPERTY);
  }
};

// Marks the posts on this list page that are new since the last visit, fades the marks over the
// cooldown, and follows the show-new/cooldown settings and other tabs' visits live. Returns dispose.
export const trackNewPosts = (): (() => void) => {
  // Later pages share the first page's pathname key, so they must not read or react to it at all.
  if (!isFirstPage()) return () => {};

  const postIdsKey = `${SETTINGS_KEYS.POST_IDS_PREFIX}${window.location.pathname}`;
  let timestamps: PostTimestamps = {};
  let showNew: boolean = SETTINGS_DEFAULTS[SETTINGS_KEYS.SHOW_NEW];
  let cooldownMs = SETTINGS_DEFAULTS[SETTINGS_KEYS.COOLDOWN] * 1000;
  let interval: ReturnType<typeof setInterval> | undefined;
  // The postIds watcher stays off until init's own write lands, so it can't react to it (no ping-pong).
  let ready = false;
  let disposed = false;

  const applyShowNew = () => getTableBody()?.classList.toggle(CSS_CLASSES.SHOW_NEW, showNew);

  // The single rule for the fade timer: it runs only while shown, alive, and something is still fading.
  const syncInterval = () => {
    clearInterval(interval);
    interval = undefined;
    if (disposed || !showNew || !Object.values(timestamps).some((ts) => ts > 0)) return;
    const period = Math.max(1000, Math.floor(cooldownMs / 50));
    interval = setInterval(() => updateFadeOpacities(timestamps, cooldownMs), period);
  };

  const remark = (previous: PostTimestamps) => {
    clearNewPostMarkers();
    timestamps = markNewPosts(getPostIds(), previous, cooldownMs);
    syncInterval();
  };

  const loadPostIds = async () => {
    if (getPostIds().length > 0) {
      const stored = await storage.get<string[] | PostTimestamps>(postIdsKey);
      remark(stored ? migratePostIds(stored) : {});
      await storage.set(postIdsKey, timestamps);
    }

    ready = true;
  };

  const stopSettings = watchSettings([SETTINGS_KEYS.SHOW_NEW, SETTINGS_KEYS.COOLDOWN], (values, changed) => {
    showNew = values[SETTINGS_KEYS.SHOW_NEW];
    cooldownMs = values[SETTINGS_KEYS.COOLDOWN] * 1000;

    if (changed === SETTINGS_KEYS.COOLDOWN) {
      if (showNew) remark(timestamps);
      return;
    }

    applyShowNew();
    if (!changed) {
      // A rejected storage read (e.g. "extension context invalidated") just leaves posts unmarked.
      loadPostIds().catch(() => {});
    } else if (showNew) {
      remark(timestamps);
    } else {
      clearNewPostMarkers();
      syncInterval();
    }
  });

  const postIdsWatcher: StorageCallbackMap = {
    [postIdsKey]: (change) => {
      if (!ready) return;
      // Never write back: the other tab already stored this value. Merge over our own map, because the
      // other tab only stores the posts on its page: a post that fell off the list since we loaded is
      // missing there, not new.
      const incoming = migratePostIds((change.newValue ?? {}) as string[] | PostTimestamps);
      remark({ ...timestamps, ...incoming });
    },
  };
  storage.watch(postIdsWatcher);

  return () => {
    disposed = true;
    syncInterval();
    stopSettings();
    storage.unwatch(postIdsWatcher);
  };
};
