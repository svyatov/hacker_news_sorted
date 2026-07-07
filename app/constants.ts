import type { SortOption } from '~app/types';

// Extension constants
export const CONTROL_PANEL_ROOT_ID = 'hns-control-panel';
// Enabled-option count (4–6) published on the panel root so count-aware CSS breakpoints
// can pick the right word↔letter switch point (CSS can't read React state).
export const SORT_COUNT_ATTR = 'data-sort-count';
// Comment-page mark control: the attribute holding a star button's target username, and the
// sessionStorage key prefix for the per-thread single mark (KTD-6).
export const DOT_USER_ATTR = 'data-hns-user';
export const MARK_STORAGE_PREFIX = 'hns-marked-user:';

// Settings keys and defaults (chrome.storage.sync)
export const SETTINGS_KEYS = {
  SHOW_NEW: 'hns-show-new',
  LAST_ACTIVE_SORT: 'hns-last-active-sort',
  POST_IDS_PREFIX: 'hns-post-ids:',
  LAYOUT_OK: 'hns-layout-ok',
  REVIEW_DISMISSED: 'hns-review-dismissed',
  INSTALL_TIMESTAMP: 'hns-install-ts',
  SORT_COUNT: 'hns-sort-count',
  COOLDOWN: 'hns-cooldown',
  TRUE_TIME_AGO: 'hns-true-time-ago',
  VELOCITY_ENABLED: 'hns-velocity-enabled',
  HEAT_ENABLED: 'hns-heat-enabled',
  OP_HIGHLIGHT: 'hns-op-highlight',
  MARK_USER_HIGHLIGHT: 'hns-mark-user-highlight',
} as const;

export const SETTINGS_DEFAULTS = {
  [SETTINGS_KEYS.SHOW_NEW]: true as boolean,
  [SETTINGS_KEYS.LAST_ACTIVE_SORT]: 'points' as const,
  [SETTINGS_KEYS.LAYOUT_OK]: true as boolean,
  [SETTINGS_KEYS.REVIEW_DISMISSED]: false as boolean,
  [SETTINGS_KEYS.INSTALL_TIMESTAMP]: 0 as number,
  [SETTINGS_KEYS.SORT_COUNT]: 0 as number,
  [SETTINGS_KEYS.COOLDOWN]: 3600 as number,
  [SETTINGS_KEYS.TRUE_TIME_AGO]: true as boolean,
  [SETTINGS_KEYS.VELOCITY_ENABLED]: true as boolean,
  [SETTINGS_KEYS.HEAT_ENABLED]: true as boolean,
  [SETTINGS_KEYS.OP_HIGHLIGHT]: true as boolean,
  [SETTINGS_KEYS.MARK_USER_HIGHLIGHT]: true as boolean,
} as const;

// Time conversions
export const SECONDS_PER_MINUTE = 60;
export const SECONDS_PER_HOUR = 3_600;
export const SECONDS_PER_DAY = 86_400;

export const COOLDOWN_BOUNDS = {
  MIN: 10,
  MAX: SECONDS_PER_DAY,
} as const;

// Chrome Web Store
export const CWS_REVIEW_URL =
  'https://chromewebstore.google.com/detail/hacker-news-sorted/djkcnbncofmjekhlhemlkinfpkamlkaj/reviews';

// Review prompt thresholds
export const REVIEW_PROMPT_DAYS = 7;
export const REVIEW_PROMPT_SORTS = 20;

// Extension CSS classes
export const CSS_CLASSES = {
  HIGHLIGHT: 'hns-highlight',
  SORT_BY_LABEL: 'hns-sort-by-label',
  BTN: 'hns-btn',
  BTN_TEXT: 'hns-btn-text',
  BTN_SHORTCUT: 'hns-btn-shortcut',
  ACTIVE: 'hns-active',
  DIVIDER: 'hns-divider',
  SHOW_NEW: 'hns-show-new',
  NEW_POST: 'hns-new-post',
  CONFLICT_NOTE: 'hns-conflict-note',
  BUTTONS_TIER: 'hns-buttons-tier',
  DROPDOWN_TIER: 'hns-dropdown-tier',
  DROPDOWN: 'hns-dropdown',
  REVIEW_TOAST: 'hns-review-toast',
  REVIEW_LINK: 'hns-review-link',
  REVIEW_SUB: 'hns-review-sub',
  REVIEW_CLOSE: 'hns-review-close',
  // Comment-page highlighting (contents/comments.ts + comments.css)
  OP_COMMENT: 'hns-op-comment',
  OP_BADGE: 'hns-op-badge',
  MARK_DOT: 'hns-mark-dot',
  MARK_DOT_ON: 'hns-mark-dot-on',
  MARKED_COMMENT: 'hns-marked-comment',
} as const;

export const CSS_SELECTORS = {
  HIGHLIGHT: `.${CSS_CLASSES.HIGHLIGHT}`,
} as const;

// Sort options configuration. Order matters — the menu and dropdown render in this order.
// Two couplings to keep in sync when editing this list:
//   1. content.css has count-aware @media blocks keyed on data-sort-count — one word<->letter block
//      AND one letter<->dropdown block per possible enabled-option count (4/5/6). Adding an option —
//      or another disable toggle — changes those widths and needs matching blocks, or the panel
//      stays in single-letter mode at all widths / collapses at the wrong width and wraps HN's nav.
//   2. useKeyboardShortcuts derives its hotkeys from `shortcut` below — keep the letters unique.
export const SORT_OPTIONS: SortOption[] = [
  { sortBy: 'points', text: 'points', shortcut: 'P' },
  { sortBy: 'time', text: 'time', shortcut: 'T' },
  { sortBy: 'comments', text: 'comments', shortcut: 'C' },
  { sortBy: 'velocity', text: 'velocity', shortcut: 'V' },
  { sortBy: 'heat', text: 'heat', shortcut: 'H' },
  { sortBy: 'default', text: 'default', shortcut: 'D' },
];

// HN DOM selectors and classes
export const HN_SELECTORS = {
  // Page structure
  CONTROL_PANEL_PARENT: '#hnmain tr:has(> td > .pagetop > .hnname) > td:last-child',
  TABLE_BODY: '#hnmain #bigbox > td > table > tbody',

  // Row patterns (relative to table body)
  TITLE_ROWS: 'tr:nth-child(3n+1)',
  INFO_ROWS: 'tr:nth-child(3n+2)',
  SPACER_ROWS: 'tr:nth-child(3n+3)',

  // Info row elements (relative to info row)
  POINTS: 'td.subtext > span > span.score',
  TIME_REGULAR: 'td.subtext > span > span.age',
  TIME_PROMO: 'td.subtext > span.age',
  COMMENTS: 'td.subtext > span > a[href^="item?id="]',

  // Comment/item pages
  STORY_AUTHOR: '.fatitem .hnuser',
  STORY_LINK: '.fatitem .titleline',
  COMMENT_ROWS: 'tr.athing.comtr[id]',
  COMMENT_AUTHOR: '.hnuser',
  COMMENT_HEAD: '.comhead',
} as const;

// HN CSS classes (for building test fixtures)
export const HN_CLASSES = {
  SUBTEXT: 'subtext',
  SUBLINE: 'subline',
  SCORE: 'score',
  AGE: 'age',
  ATHING: 'athing',
  SPACER: 'spacer',
  COMTR: 'comtr',
  COMHEAD: 'comhead',
  HNUSER: 'hnuser',
  FATITEM: 'fatitem',
  TITLELINE: 'titleline',
} as const;
