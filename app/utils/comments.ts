import { CSS_CLASSES, DOT_USER_ATTR, HN_SELECTORS, MARK_STORAGE_PREFIX } from '~app/constants';
import { getItemId, isStoryPage } from '~app/utils/pages';

type HighlightKind = 'op' | 'marked';

export const getStoryAuthor = (): string | null =>
  document.querySelector(HN_SELECTORS.STORY_AUTHOR)?.textContent?.trim() ?? null;

export const getCommentRows = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>(HN_SELECTORS.COMMENT_ROWS));

export const getCommentAuthor = (row: HTMLElement): string | null =>
  row.querySelector(`${HN_SELECTORS.COMMENT_HEAD} ${HN_SELECTORS.COMMENT_AUTHOR}`)?.textContent?.trim() ?? null;

// --- Mark dots ---

const setDotState = (dot: HTMLElement, on: boolean): void => {
  const user = dot.getAttribute(DOT_USER_ATTR) ?? '';
  dot.classList.toggle(CSS_CLASSES.MARK_DOT_ON, on);
  dot.setAttribute('aria-pressed', String(on));
  dot.setAttribute('aria-label', on ? `Unhighlight ${user}` : `Highlight comments by ${user}`);
};

const buildDot = (username: string, onActivate: (username: string) => void): HTMLButtonElement => {
  const dot = document.createElement('button');
  dot.type = 'button';
  dot.className = CSS_CLASSES.MARK_DOT;
  dot.setAttribute(DOT_USER_ATTR, username);
  setDotState(dot, false);
  // Native <button>, so Enter/Space activate for free.
  dot.addEventListener('click', () => onActivate(username));
  return dot;
};

// One dot per comment header (KTD-3), except the story author's — OP is already badged and isn't a
// "regular" user to mark (skipUser). Idempotent: skips a comhead that already has one.
export const injectMarkDots = (onActivate: (username: string) => void, skipUser: string | null = null): void => {
  for (const row of getCommentRows()) {
    const comhead = row.querySelector(HN_SELECTORS.COMMENT_HEAD);
    if (!comhead || comhead.querySelector(`.${CSS_CLASSES.MARK_DOT}`)) continue;

    const hnuser = comhead.querySelector(HN_SELECTORS.COMMENT_AUTHOR);
    const username = hnuser?.textContent?.trim();
    if (!hnuser || !username || username === skipUser) continue;

    // Right after the name (CSS adds the gap). OP comments are skipped, so a badge is never here.
    hnuser.insertAdjacentElement('afterend', buildDot(username, onActivate));
  }
};

export const removeMarkDots = (): void => {
  for (const dot of document.querySelectorAll(`.${CSS_CLASSES.MARK_DOT}`)) dot.remove();
};

// --- Highlighting ---

export const applyUserHighlight = (username: string, kind: HighlightKind): void => {
  for (const row of getCommentRows()) {
    if (getCommentAuthor(row) !== username) continue;
    const comhead = row.querySelector(HN_SELECTORS.COMMENT_HEAD);

    if (kind === 'op') {
      row.classList.add(CSS_CLASSES.OP_COMMENT);
      if (comhead && !comhead.querySelector(`.${CSS_CLASSES.OP_BADGE}`)) {
        const badge = document.createElement('span');
        badge.className = CSS_CLASSES.OP_BADGE;
        badge.textContent = 'OP';
        comhead.querySelector(HN_SELECTORS.COMMENT_AUTHOR)?.insertAdjacentElement('afterend', badge);
      }
    } else {
      row.classList.add(CSS_CLASSES.MARKED_COMMENT);
      const dot = comhead?.querySelector<HTMLElement>(`.${CSS_CLASSES.MARK_DOT}`);
      if (dot) setDotState(dot, true);
    }
  }
};

export const clearHighlights = (): void => {
  for (const row of getCommentRows()) {
    row.classList.remove(CSS_CLASSES.OP_COMMENT, CSS_CLASSES.MARKED_COMMENT);
  }
  for (const badge of document.querySelectorAll(`.${CSS_CLASSES.OP_BADGE}`)) badge.remove();
  for (const dot of document.querySelectorAll<HTMLElement>(`.${CSS_CLASSES.MARK_DOT}`)) setDotState(dot, false);
};

// --- Per-thread mark persistence (sessionStorage, single mark) ---

const markKey = (): string | null => {
  const id = getItemId();
  return id ? `${MARK_STORAGE_PREFIX}${id}` : null;
};

export const getMarkedUser = (): string | null => {
  const key = markKey();
  return key ? sessionStorage.getItem(key) : null;
};

export const setMarkedUser = (username: string | null): void => {
  const key = markKey();
  if (!key) return;
  if (username === null) sessionStorage.removeItem(key);
  else sessionStorage.setItem(key, username);
};

// Single-mark toggle: clicking the marked user's own dot clears it; any other user replaces it (KTD-6).
export const nextMark = (current: string | null, clicked: string): string | null =>
  current === clicked ? null : clicked;

// --- Orchestrator ---

type EnhancementOptions = {
  opEnabled: boolean;
  markEnabled: boolean;
  onMark?: (username: string) => void;
};

// Idempotent: clears every extension-added class/badge/dot-state, then re-applies from the current
// settings + stored mark. Toggle watchers and dot activations both route through this (KTD-6, KTD-8).
export const applyCommentEnhancements = ({ opEnabled, markEnabled, onMark = () => {} }: EnhancementOptions): void => {
  clearHighlights();

  // The story author, when identifiable (null on comment-permalink pages — KTD-8).
  const op = isStoryPage() ? getStoryAuthor() : null;

  if (opEnabled && op) applyUserHighlight(op, 'op');

  if (markEnabled) {
    // Skip a star on the OP's comments only while they're badged; with OP highlighting off the
    // author is just a regular, markable user.
    injectMarkDots(onMark, opEnabled ? op : null);
    const marked = getMarkedUser();
    if (marked) applyUserHighlight(marked, 'marked');
  } else {
    removeMarkDots();
  }
};
