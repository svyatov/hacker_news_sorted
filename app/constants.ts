import type { SortOption } from '~app/types';

// Extension constants
export const CONTROL_PANEL_ROOT_ID = 'hns-control-panel';

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
} as const;

export const SETTINGS_DEFAULTS = {
  [SETTINGS_KEYS.SHOW_NEW]: true as boolean,
  [SETTINGS_KEYS.LAST_ACTIVE_SORT]: 'points' as const,
  [SETTINGS_KEYS.LAYOUT_OK]: true as boolean,
  [SETTINGS_KEYS.REVIEW_DISMISSED]: false as boolean,
  [SETTINGS_KEYS.INSTALL_TIMESTAMP]: 0 as number,
  [SETTINGS_KEYS.SORT_COUNT]: 0 as number,
  [SETTINGS_KEYS.COOLDOWN]: 3600 as number,
} as const;

export const COOLDOWN_BOUNDS = {
  MIN: 10,
  MAX: 86_400,
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
  REVIEW_TOAST: 'hns-review-toast',
  REVIEW_LINK: 'hns-review-link',
  REVIEW_SUB: 'hns-review-sub',
  REVIEW_CLOSE: 'hns-review-close',
} as const;

export const CSS_SELECTORS = {
  HIGHLIGHT: `.${CSS_CLASSES.HIGHLIGHT}`,
} as const;

// Sort options configuration
export const SORT_OPTIONS: SortOption[] = [
  { sortBy: 'points', text: 'points', shortcut: 'P' },
  { sortBy: 'time', text: 'time', shortcut: 'T' },
  { sortBy: 'comments', text: 'comments', shortcut: 'C' },
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
} as const;

// HN CSS classes (for building test fixtures)
export const HN_CLASSES = {
  SUBTEXT: 'subtext',
  SUBLINE: 'subline',
  SCORE: 'score',
  AGE: 'age',
  ATHING: 'athing',
  SPACER: 'spacer',
} as const;
