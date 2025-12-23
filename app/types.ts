export type SortVariant = 'default' | 'points' | 'time' | 'comments';

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
