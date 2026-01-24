import { SETTINGS_KEYS } from '~app/constants';

export type SortVariant = 'default' | 'points' | 'time' | 'comments';
export type NonDefaultSortVariant = Exclude<SortVariant, 'default'>;

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
};

export type Settings = {
  [(typeof SETTINGS_KEYS)['SHOW_NEW']]: boolean;
  [(typeof SETTINGS_KEYS)['LAST_ACTIVE_SORT']]: SortVariant;
};
