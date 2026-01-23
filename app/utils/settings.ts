export const SETTINGS_KEYS = {
  SHOW_NEW: 'hns-show-new',
} as const;

export const SETTINGS_DEFAULTS = {
  [SETTINGS_KEYS.SHOW_NEW]: true,
} as const;
