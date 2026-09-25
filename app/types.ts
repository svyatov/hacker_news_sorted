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
  title: string;
  // Present = the user can turn this sort off with that boolean setting (any `hns-*-enabled` key).
  enableKey?: Extract<(typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS], `${string}-enabled`>;
};
