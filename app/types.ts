import type { SETTINGS_KEYS } from '~app/constants';

export type SortVariant = 'default' | 'points' | 'time' | 'comments' | 'velocity' | 'heat';

export type ParsedRow = {
  originalIndex: number;
  title: HTMLElement;
  info: HTMLElement;
  spacer: HTMLElement;
  points: number;
  time: number;
  comments: number;
};

export type SortOption = {
  sortBy: SortVariant;
  text: string;
  shortcut: string;
  // Present = the user can turn this sort off with that boolean setting.
  enableKey?: typeof SETTINGS_KEYS.VELOCITY_ENABLED | typeof SETTINGS_KEYS.HEAT_ENABLED;
};
