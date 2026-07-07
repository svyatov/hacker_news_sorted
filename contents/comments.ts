import type { PlasmoCSConfig } from 'plasmo';

import { Storage, type StorageCallbackMap } from '@plasmohq/storage';

import { SETTINGS_DEFAULTS, SETTINGS_KEYS } from '~app/constants';
import { applyCommentEnhancements, getMarkedUser, nextMark, setMarkedUser } from '~app/utils/comments';

export const config: PlasmoCSConfig = {
  matches: ['*://news.ycombinator.com/item*'],
  css: ['comments.css'],
};

const storage = new Storage();

const toggles = {
  opEnabled: SETTINGS_DEFAULTS[SETTINGS_KEYS.OP_HIGHLIGHT],
  markEnabled: SETTINGS_DEFAULTS[SETTINGS_KEYS.MARK_USER_HIGHLIGHT],
};

// Keys a live popup change has already applied — init's slower async read must not clobber them.
const settled = new Set<string>();

// Single mark per thread: clicking the active user's dot clears it, any other user replaces it.
const onMark = (username: string): void => {
  setMarkedUser(nextMark(getMarkedUser(), username));
  apply();
};

const apply = (): void => applyCommentEnhancements({ ...toggles, onMark });

const readToggle = async (key: keyof typeof SETTINGS_DEFAULTS): Promise<boolean> =>
  ((await storage.get<boolean>(key)) ?? SETTINGS_DEFAULTS[key]) as boolean;

// Register watchers BEFORE init so a toggle flipped during the async load isn't lost, and record
// which keys they touch so the in-flight init read below can't overwrite a fresher value (TOCTOU).
const watcherMap: StorageCallbackMap = {
  [SETTINGS_KEYS.OP_HIGHLIGHT]: (change) => {
    settled.add(SETTINGS_KEYS.OP_HIGHLIGHT);
    toggles.opEnabled = (change.newValue as boolean | undefined) ?? SETTINGS_DEFAULTS[SETTINGS_KEYS.OP_HIGHLIGHT];
    apply();
  },
  [SETTINGS_KEYS.MARK_USER_HIGHLIGHT]: (change) => {
    settled.add(SETTINGS_KEYS.MARK_USER_HIGHLIGHT);
    toggles.markEnabled =
      (change.newValue as boolean | undefined) ?? SETTINGS_DEFAULTS[SETTINGS_KEYS.MARK_USER_HIGHLIGHT];
    apply();
  },
};
storage.watch(watcherMap);

const init = async (): Promise<void> => {
  const op = await readToggle(SETTINGS_KEYS.OP_HIGHLIGHT);
  if (!settled.has(SETTINGS_KEYS.OP_HIGHLIGHT)) toggles.opEnabled = op;
  const mark = await readToggle(SETTINGS_KEYS.MARK_USER_HIGHLIGHT);
  if (!settled.has(SETTINGS_KEYS.MARK_USER_HIGHLIGHT)) toggles.markEnabled = mark;
  apply();
};

// Degrade to defaults rather than a blank thread if a storage read rejects mid-session.
init().catch(apply);
