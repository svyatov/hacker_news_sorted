import { CSS_CLASSES, DOT_USER_ATTR, HN_SELECTORS, MARK_STORAGE_PREFIX, SETTINGS_KEYS } from '~app/constants';
import type { CommentNavigationOrder } from '~app/types';
import { getItemId, isStoryPage } from '~app/utils/pages';
import { parseAgeTitle } from '~app/utils/parsers';
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

type NavigationGroup = 'op' | 'marked' | 'own';

const createNavigator = () => {
  const tree = document.querySelector<HTMLElement>(HN_SELECTORS.COMMENT_TREE);
  if (!tree) return null;
  const controller = new AbortController();
  const { signal } = controller;
  const toolbar = document.createElement('nav');
  toolbar.className = CSS_CLASSES.COMMENT_NAVIGATION;
  toolbar.setAttribute('aria-label', 'Comment navigation');
  const group = document.createElement('select');
  group.setAttribute('aria-label', 'Comment group');
  const empty = new Option('Choose group', '');
  empty.disabled = true;
  const opOption = new Option('OP', 'op');
  const markedOption = new Option('Marked user', 'marked');
  const ownOption = new Option('You', 'own');
  group.append(empty, opOption, markedOption, ownOption);
  const previous = document.createElement('button');
  previous.type = 'button';
  previous.textContent = '[ Prev';
  previous.setAttribute('aria-label', 'Previous');
  const next = document.createElement('button');
  next.type = 'button';
  next.textContent = 'Next ]';
  next.setAttribute('aria-label', 'Next');
  const status = document.createElement('span');
  status.setAttribute('role', 'status');
  toolbar.append(status, previous, next, group);
  tree.before(toolbar);
  let selected: NavigationGroup | null = null;
  let order: CommentNavigationOrder = 'chronological';
  let initialized = false;
  let authors: Record<NavigationGroup, string | null> = { op: null, marked: null, own: null };
  let landed: { row: HTMLElement; scroll: number; top: number; anchor: number } | null = null;
  let before: HTMLElement | undefined;
  let after: HTMLElement | undefined;
  let frame = 0;
  let motionFrame = 0;
  let shortcutsDisabled = false;
  const stopMotion = (): void => {
    cancelAnimationFrame(motionFrame);
    motionFrame = 0;
    landed = null;
  };
  const interruptMotion = (event: Event): void => {
    if (event.type !== 'wheel' && event.composedPath().some((target) => target === previous || target === next)) return;
    if (motionFrame) stopMotion();
  };
  for (const event of ['wheel', 'touchstart', 'pointerdown'])
    window.addEventListener(event, interruptMotion, { signal, passive: true });
  const matches = (role: NavigationGroup): HTMLElement[] =>
    getCommentRows().filter(
      (row) =>
        !!authors[role] &&
        getCommentAuthor(row) === authors[role] &&
        !row.classList.contains('coll') &&
        row.getClientRects().length > 0,
    );
  // A 6px gap keeps the preceding reply link fully under the sticky toolbar.
  const getAnchor = (): number => toolbar.getBoundingClientRect().height + 6;
  const update = (): void => {
    toolbar.setAttribute(
      'aria-description',
      order === 'thread' ? 'Comments ordered as they appear in the thread.' : 'Comments ordered from oldest to newest.',
    );
    previous.title = `${order === 'thread' ? 'Previous' : 'Older'} comment ([). Shortcut conflict detection is best-effort.`;
    next.title = `${order === 'thread' ? 'Next' : 'Newer'} comment (]). Shortcut conflict detection is best-effort.`;
    opOption.disabled = !authors.op;
    markedOption.disabled = !authors.marked;
    ownOption.disabled = !authors.own;
    if (!initialized) {
      selected = (['op', 'marked', 'own'] as const).find((role) => authors[role] && matches(role).length > 0) ?? null;
      initialized = true;
    }
    group.value = selected ?? '';
    const visibleRows = selected ? matches(selected) : [];
    const rows =
      order === 'thread'
        ? visibleRows
        : visibleRows
            .map((row) => ({
              row,
              time:
                parseAgeTitle(row.querySelector(HN_SELECTORS.COMMENT_TIME)?.getAttribute('title') ?? '') ||
                Number.POSITIVE_INFINITY,
            }))
            .sort((a, b) => a.time - b.time)
            .map(({ row }) => row);
    const anchor = getAnchor();
    if (
      landed &&
      (landed.scroll !== window.scrollY ||
        !rows.includes(landed.row) ||
        landed.top !== landed.row.getBoundingClientRect().top ||
        landed.anchor !== anchor)
    )
      stopMotion();
    const current = rows.findIndex((row) =>
      landed ? row === landed.row : Math.abs(row.getBoundingClientRect().top - anchor) <= 1,
    );
    if (current >= 0) {
      before = rows[current - 1];
      after = rows[current + 1];
      status.textContent = `${current + 1} of ${rows.length} on page`;
    } else {
      // Manual scrolling establishes a reading origin in visual order; navigation
      // then follows its chronological neighbors, which can be elsewhere on the page.
      const preceding = visibleRows.filter((row) => row.getBoundingClientRect().top < anchor).at(-1);
      const index = visibleRows.some((row) => row.getBoundingClientRect().top > anchor)
        ? preceding
          ? rows.indexOf(preceding) + 1
          : 0
        : rows.length;
      before = rows[index - 1];
      after = rows[index];
      status.textContent =
        selected && !authors[selected]
          ? `${group.selectedOptions[0]!.textContent} unavailable`
          : !rows.length
            ? 'No visible matches on page'
            : index === 0
              ? `Before 1 of ${rows.length} on page`
              : index === rows.length
                ? `After ${index} of ${rows.length} on page`
                : `Between ${index} and ${index + 1} of ${rows.length} on page`;
    }
    status.title = status.textContent;
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
    stopMotion();
    const origin = window.scrollY;
    const destination = origin + row.getBoundingClientRect().top - getAnchor();
    const rememberLanding = (): void => {
      landed = {
        row,
        scroll: window.scrollY,
        top: row.getBoundingClientRect().top,
        anchor: getAnchor(),
      };
      update();
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.scrollTo({ top: destination, behavior: 'instant' });
      rememberLanding();
      return;
    }
    const started = performance.now();
    const animate = (time: number): void => {
      // Validate the saved landing before this frame can replace its geometry.
      update();
      if (!landed) return;
      const progress = Math.min((time - started) / 180, 1);
      const eased = 1 - (1 - progress) ** 3;
      window.scrollTo({ top: origin + (destination - origin) * eased, behavior: 'instant' });
      rememberLanding();
      motionFrame = progress < 1 ? requestAnimationFrame(animate) : 0;
    };
    motionFrame = requestAnimationFrame(animate);
    // Repeated navigation advances from the intended target while it is in flight.
    rememberLanding();
  };
  previous.addEventListener('click', () => jump('previous'), { signal });
  next.addEventListener('click', () => jump('next'), { signal });
  document.addEventListener(
    'keydown',
    (event) => {
      if (
        motionFrame &&
        ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Escape'].includes(event.key)
      )
        stopMotion();
      if (event.key !== '[' && event.key !== ']') return;
      if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey || event.isComposing) return;
      if (
        event.target instanceof Element &&
        event.target.closest(
          'input, textarea, select, button, summary, [contenteditable]:not([contenteditable="false"])',
        )
      )
        return;
      // Best-effort detection, as on list pages: earlier preventDefault is observable,
      // but handlers that stop propagation or run later cannot always be detected.
      if (event.defaultPrevented && !shortcutsDisabled) {
        shortcutsDisabled = true;
        const conflict = document.createElement('span');
        conflict.setAttribute('role', 'status');
        conflict.textContent = `Navigation shortcuts disabled: ${event.key} was intercepted. Use Previous/Next controls. Conflict detection is best-effort.`;
        toolbar.append(conflict);
      }
      if (shortcutsDisabled) return;
      update();
      const control = event.key === '[' ? previous : next;
      if (control.disabled) return;
      event.preventDefault();
      jump(event.key === '[' ? 'previous' : 'next');
    },
    { signal },
  );
  group.addEventListener(
    'change',
    () => {
      selected = group.value as NavigationGroup;
      stopMotion();
      update();
    },
    { signal },
  );
  return {
    reconcile: (
      op: string | null,
      marked: string | null,
      own: string | null,
      navigationOrder: CommentNavigationOrder,
    ): void => {
      stopMotion();
      order = navigationOrder;
      authors = { op, marked, own };
      update();
    },
    dispose: (): void => {
      controller.abort();
      stopMotion();
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
  const unwatch = watchSettings(
    [
      SETTINGS_KEYS.OP_HIGHLIGHT,
      SETTINGS_KEYS.MARK_USER_HIGHLIGHT,
      SETTINGS_KEYS.COMMENT_NAVIGATION,
      SETTINGS_KEYS.COMMENT_NAVIGATION_ORDER,
    ],
    (values) => {
      if (values[SETTINGS_KEYS.COMMENT_NAVIGATION]) navigator ??= createNavigator();
      else {
        navigator?.dispose();
        navigator = null;
      }
      apply = () => {
        applyCommentEnhancements({
          opEnabled: values[SETTINGS_KEYS.OP_HIGHLIGHT],
          markEnabled: values[SETTINGS_KEYS.MARK_USER_HIGHLIGHT],
          onMark,
          signal: controller.signal,
        });
        const op = values[SETTINGS_KEYS.OP_HIGHLIGHT] && isStoryPage() ? getStoryAuthor() : null;
        const marked = values[SETTINGS_KEYS.MARK_USER_HIGHLIGHT] ? getMarkedUser() : null;
        const own = getLoggedInUser();
        navigator?.reconcile(
          op,
          marked === own ? null : marked,
          own,
          values[SETTINGS_KEYS.COMMENT_NAVIGATION_ORDER] === 'thread' ? 'thread' : 'chronological',
        );
      };
      apply();
    },
  );

  return () => {
    if (controller.signal.aborted) return;
    controller.abort();
    unwatch();
    navigator?.dispose();
    clearHighlights();
    removeMarkDots();
  };
};
