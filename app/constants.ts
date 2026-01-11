// Extension constants
export const CONTROL_PANEL_ROOT_ID = 'hns-control-panel';
export const LAST_ACTIVE_SORT_KEY = 'hns-last-active-sort';
export const HIGHLIGHT_CLASS = 'hns-highlight';
export const HIGHLIGHT_SELECTOR = `.${HIGHLIGHT_CLASS}`;

// HN DOM selectors and classes
export const HN_SELECTORS = {
  // Page structure
  CONTROL_PANEL_PARENT: 'body > center > table > tbody > tr:nth-child(1) > td > table > tbody > tr > td:nth-child(3)',
  TABLE_BODY: 'body > center > table > tbody > tr:nth-child(3) > td > table > tbody',

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
