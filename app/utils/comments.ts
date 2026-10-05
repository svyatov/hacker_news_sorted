import { CSS_CLASSES, DOT_USER_ATTR, HN_SELECTORS, MARK_STORAGE_PREFIX, SETTINGS_KEYS } from '~app/constants';
import { getItemId, isStoryPage } from '~app/utils/pages';
import { watchSettings } from '~app/utils/settings';

type HighlightKind = 'op' | 'marked' | 'own';

export const getStoryAuthor = (): string | null =>
  document.querySelector(HN_SELECTORS.STORY_AUTHOR)?.textContent?.trim() ?? null;

export const getCommentRows = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>(HN_SELECTORS.COMMENT_ROWS));

export const getCommentAuthor = (row: HTMLElement): string | null =>
  row.querySelector(`${HN_SELECTORS.COMMENT_HEAD} ${HN_SELECTORS.COMMENT_AUTHOR}`)?.textContent?.trim() ?? null;

const getLoggedInUser = (): string | null => {
  const account = document.querySelector(HN_SELECTORS.ACCOUNT);
  const username = account?.textContent?.trim();
  return username && account?.getAttribute('href') === `user?id=${username}` ? username : null;
};

// --- Mark dots ---

const setDotState = (dot: HTMLElement, on: boolean): void => {
  const user = dot.getAttribute(DOT_USER_ATTR)!;
  dot.classList.toggle(CSS_CLASSES.MARK_DOT_ON, on);
  dot.setAttribute('aria-pressed', String(on));
  dot.setAttribute('aria-label', on ? `Unhighlight ${user}` : `Highlight comments by ${user}`);
};

const buildDot = (username: string, onActivate: (username: string) => void, signal: AbortSignal): HTMLButtonElement => {
  const dot = document.createElement('button');
  dot.type = 'button';
  dot.className = CSS_CLASSES.MARK_DOT;
  dot.setAttribute(DOT_USER_ATTR, username);
  setDotState(dot, false);
  // Native <button>, so Enter/Space activate for free.
  dot.addEventListener('click', () => onActivate(username), { signal });
  return dot;
};

// One dot per comment header, except own comments and the currently badged OP. Idempotent.
const injectMarkDots = (
  onActivate: (username: string) => void,
  skipUsers: Array<string | null>,
  signal: AbortSignal,
): void => {
  for (const row of getCommentRows()) {
    const comhead = row.querySelector(HN_SELECTORS.COMMENT_HEAD);
    if (!comhead) continue;

    const hnuser = comhead.querySelector(HN_SELECTORS.COMMENT_AUTHOR);
    const username = hnuser?.textContent?.trim();
    if (skipUsers.includes(username ?? null)) {
      comhead.querySelector(`.${CSS_CLASSES.MARK_DOT}`)?.remove();
      continue;
    }
    if (!hnuser || !username || comhead.querySelector(`.${CSS_CLASSES.MARK_DOT}`)) continue;

    // Right after the name (CSS adds the gap). Badged authors are skipped.
    hnuser.insertAdjacentElement('afterend', buildDot(username, onActivate, signal));
  }
};

const removeMarkDots = (): void => {
  for (const dot of document.querySelectorAll(`.${CSS_CLASSES.MARK_DOT}`)) dot.remove();
};

// --- Highlighting ---

const applyUserHighlight = (username: string, kind: HighlightKind): void => {
  for (const row of getCommentRows()) {
    if (getCommentAuthor(row) !== username) continue;
    // The author matched, so the comhead exists; clearHighlights ran first, so no badge is there yet.
    const comhead = row.querySelector(HN_SELECTORS.COMMENT_HEAD)!;

    if (kind !== 'marked') {
      row.classList.add(kind === 'op' ? CSS_CLASSES.OP_COMMENT : CSS_CLASSES.MARKED_COMMENT);
      const badge = document.createElement('span');
      badge.className = kind === 'op' ? CSS_CLASSES.OP_BADGE : CSS_CLASSES.OWN_BADGE;
      badge.textContent = kind === 'op' ? 'OP' : 'You';
      comhead.querySelector(HN_SELECTORS.COMMENT_AUTHOR)!.insertAdjacentElement('afterend', badge);
    } else {
      row.classList.add(CSS_CLASSES.MARKED_COMMENT);
      const dot = comhead.querySelector<HTMLElement>(`.${CSS_CLASSES.MARK_DOT}`);
      if (dot) setDotState(dot, true);
    }
  }
};

const clearHighlights = (): void => {
  for (const row of getCommentRows()) {
    row.classList.remove(CSS_CLASSES.OP_COMMENT, CSS_CLASSES.MARKED_COMMENT);
  }
  for (const badge of document.querySelectorAll(`.${CSS_CLASSES.OP_BADGE}, .${CSS_CLASSES.OWN_BADGE}`)) badge.remove();
  for (const dot of document.querySelectorAll<HTMLElement>(`.${CSS_CLASSES.MARK_DOT}`)) setDotState(dot, false);
};

// --- Per-thread mark persistence (sessionStorage, single mark) ---

const markKey = (): string | null => {
  const id = getItemId();
  return id ? `${MARK_STORAGE_PREFIX}${id}` : null;
};

const getMarkedUser = (): string | null => {
  const key = markKey();
  return key ? sessionStorage.getItem(key) : null;
};

const setMarkedUser = (username: string | null): void => {
  const key = markKey();
  if (!key) return;
  if (username === null) sessionStorage.removeItem(key);
  else sessionStorage.setItem(key, username);
};

// Single-mark toggle: clicking the marked user's own dot clears it; any other user replaces it (KTD-6).
const nextMark = (current: string | null, clicked: string): string | null => (current === clicked ? null : clicked);

// --- Orchestrator ---

type NavigationGroup = 'op' | 'marked';

const createNavigator = (signal: AbortSignal) => {
  const tree = document.querySelector<HTMLElement>(HN_SELECTORS.COMMENT_TREE);
  if (!tree) return null;
  const toolbar = document.createElement('nav');
  toolbar.className = CSS_CLASSES.COMMENT_NAVIGATION;
  toolbar.setAttribute('aria-label', 'Comment navigation');
  const group = document.createElement('select');
  group.setAttribute('aria-label', 'Comment group');
  const empty = new Option('Choose group', '');
  empty.disabled = true;
  const opOption = new Option('OP', 'op');
  const markedOption = new Option('Marked user', 'marked');
  group.append(empty, opOption, markedOption);
  const previous = document.createElement('button');
  previous.type = 'button';
  previous.textContent = 'Previous';
  const next = document.createElement('button');
  next.type = 'button';
  next.textContent = 'Next';
  const status = document.createElement('span');
  status.setAttribute('role', 'status');
  toolbar.append(group, previous, next, status);
  tree.before(toolbar);
  let selected: NavigationGroup | null = null;
  let initialized = false;
  let authors: Record<NavigationGroup, string | null> = { op: null, marked: null };
  let landed: { row: HTMLElement; scroll: number; top: number; anchor: number } | null = null;
  let before: HTMLElement | undefined;
  let after: HTMLElement | undefined;
  let frame = 0;
  const matches = (role: NavigationGroup): HTMLElement[] =>
    getCommentRows().filter(
      (row) =>
        !!authors[role] &&
        getCommentAuthor(row) === authors[role] &&
        !row.classList.contains('coll') &&
        row.getClientRects().length > 0,
    );
  const update = (): void => {
    opOption.disabled = !authors.op;
    markedOption.disabled = !authors.marked;
    if (!initialized) {
      selected = (['op', 'marked'] as const).find((role) => authors[role] && matches(role).length > 0) ?? null;
      initialized = true;
    }
    group.value = selected ?? '';
    const rows = selected ? matches(selected) : [];
    const anchor = toolbar.getBoundingClientRect().height + 8;
    if (
      landed &&
      (landed.scroll !== window.scrollY ||
        !rows.includes(landed.row) ||
        landed.top !== landed.row.getBoundingClientRect().top ||
        landed.anchor !== anchor)
    )
      landed = null;
    const current = rows.findIndex((row) =>
      landed ? row === landed.row : Math.abs(row.getBoundingClientRect().top - anchor) <= 1,
    );
    if (current >= 0) {
      before = rows[current - 1];
      after = rows[current + 1];
      status.textContent = `${current + 1} of ${rows.length} on page`;
    } else {
      before = rows.filter((row) => row.getBoundingClientRect().top < anchor).at(-1);
      after = rows.find((row) => row.getBoundingClientRect().top > anchor);
      const index = before ? rows.indexOf(before) + 1 : 0;
      status.textContent =
        selected && !authors[selected]
          ? `${selected === 'op' ? 'OP' : 'Marked user'} unavailable`
          : !rows.length
            ? 'No visible matches on page'
            : index === 0
              ? `Before 1 of ${rows.length} on page`
              : index === rows.length
                ? `After ${index} of ${rows.length} on page`
                : `Between ${index} and ${index + 1} of ${rows.length} on page`;
    }
    previous.disabled = !before;
    next.disabled = !after;
  };
  const schedule = (): void => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      update();
    });
  };
  window.addEventListener('scroll', schedule, { signal, passive: true });
  window.addEventListener('resize', schedule, { signal });
  const observer = new MutationObserver(schedule);
  observer.observe(tree, { attributes: true, attributeFilter: ['class', 'style', 'hidden'], subtree: true });
  const resizeObserver = new ResizeObserver(schedule);
  resizeObserver.observe(tree);
  resizeObserver.observe(toolbar);
  const jump = (direction: 'previous' | 'next'): void => {
    update();
    const row = direction === 'previous' ? before : after;
    if (!row) return;
    window.scrollTo({
      top: window.scrollY + row.getBoundingClientRect().top - toolbar.getBoundingClientRect().height - 8,
      behavior: 'instant',
    });
    landed = {
      row,
      scroll: window.scrollY,
      top: row.getBoundingClientRect().top,
      anchor: toolbar.getBoundingClientRect().height + 8,
    };
    update();
  };
  previous.addEventListener('click', () => jump('previous'), { signal });
  next.addEventListener('click', () => jump('next'), { signal });
  group.addEventListener(
    'change',
    () => {
      selected = group.value as NavigationGroup;
      landed = null;
      update();
    },
    { signal },
  );
  return {
    reconcile: (op: string | null, marked: string | null): void => {
      authors = { op, marked };
      update();
    },
    dispose: (): void => {
      observer.disconnect();
      resizeObserver.disconnect();
      cancelAnimationFrame(frame);
      toolbar.remove();
    },
  };
};

type EnhancementOptions = {
  opEnabled: boolean;
  markEnabled: boolean;
  onMark: (username: string) => void;
  signal: AbortSignal;
};

// Idempotent: clears every extension-added class/badge/dot-state, then re-applies from the current
// settings + stored mark. Toggle watchers and dot activations both route through this (KTD-6, KTD-8).
const applyCommentEnhancements = ({ opEnabled, markEnabled, onMark, signal }: EnhancementOptions): void => {
  clearHighlights();

  // The story author, when identifiable (null on comment-permalink pages — KTD-8).
  const op = isStoryPage() ? getStoryAuthor() : null;
  const own = getLoggedInUser();

  if (opEnabled && op) applyUserHighlight(op, 'op');
  if (own && !(opEnabled && own === op)) applyUserHighlight(own, 'own');

  if (markEnabled) {
    // Skip the mark dot on the OP's comments only while they're badged; with OP highlighting off the
    // author is just a regular, markable user.
    injectMarkDots(onMark, [own, opEnabled ? op : null], signal);
    const marked = getMarkedUser();
    if (marked && marked !== own) applyUserHighlight(marked, 'marked');
  } else {
    removeMarkDots();
  }
};

// Owns settings, mark actions, and all DOM enhancements until content-script invalidation.
export const startCommentEnhancements = (): (() => void) => {
  const controller = new AbortController();
  let navigator: ReturnType<typeof createNavigator>;
  let apply: () => void;
  const onMark = (username: string): void => {
    setMarkedUser(nextMark(getMarkedUser(), username));
    apply();
  };
  const unwatch = watchSettings([SETTINGS_KEYS.OP_HIGHLIGHT, SETTINGS_KEYS.MARK_USER_HIGHLIGHT], (values) => {
    navigator ??= createNavigator(controller.signal);
    apply = () => {
      applyCommentEnhancements({
        opEnabled: values[SETTINGS_KEYS.OP_HIGHLIGHT],
        markEnabled: values[SETTINGS_KEYS.MARK_USER_HIGHLIGHT],
        onMark,
        signal: controller.signal,
      });
      const op = values[SETTINGS_KEYS.OP_HIGHLIGHT] && isStoryPage() ? getStoryAuthor() : null;
      const marked = values[SETTINGS_KEYS.MARK_USER_HIGHLIGHT] ? getMarkedUser() : null;
      navigator?.reconcile(op, marked === getLoggedInUser() ? null : marked);
    };
    apply();
  });

  return () => {
    if (controller.signal.aborted) return;
    controller.abort();
    unwatch();
    navigator?.dispose();
    clearHighlights();
    removeMarkDots();
  };
};
