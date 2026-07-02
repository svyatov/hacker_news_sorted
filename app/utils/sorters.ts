import { SECONDS_PER_HOUR } from '~app/constants';
import type { ParsedRow, SortVariant } from '~app/types';
import { nowInSeconds } from '~app/utils/converters';

type SortableKey = Extract<keyof ParsedRow, 'points' | 'time' | 'comments' | 'originalIndex'>;
type SortOrder = 'asc' | 'desc';

// Damped velocity denominator, mirroring HN's own gravity formula shape (age + 2).
const VELOCITY_DAMPING_HOURS = 2;
// 0-points rows (e.g. job posts) can't yield a real comments/points ratio; a finite
// below-zero sentinel sinks them to the bottom without the Infinity/NaN of naive division.
const HEAT_ZERO_POINTS_SENTINEL = -1;

const velocity = (row: ParsedRow): number => {
  const ageHours = (nowInSeconds() - row.time) / SECONDS_PER_HOUR;
  return row.points / (ageHours + VELOCITY_DAMPING_HOURS);
};

const heat = (row: ParsedRow): number => (row.points === 0 ? HEAT_ZERO_POINTS_SENTINEL : row.comments / row.points);

export const sortRows = (parsedRows: ParsedRow[], sortBy: SortVariant): ParsedRow[] => {
  switch (sortBy) {
    case 'points':
      return sortByKey(parsedRows, 'points');
    case 'time':
      return sortByKey(parsedRows, 'time');
    case 'comments':
      return sortByKey(parsedRows, 'comments');
    case 'velocity':
      return sortByValue(parsedRows, velocity);
    case 'heat':
      return sortByValue(parsedRows, heat);
    default:
      return sortByKey(parsedRows, 'originalIndex', 'asc');
  }
};

const sortByKey = (parsedRows: ParsedRow[], key: SortableKey, order: SortOrder = 'desc'): ParsedRow[] => {
  return [...parsedRows].sort((rowA, rowB) => {
    return order === 'asc' ? rowA[key] - rowB[key] : rowB[key] - rowA[key];
  });
};

const sortByValue = (parsedRows: ParsedRow[], valueOf: (row: ParsedRow) => number): ParsedRow[] => {
  return [...parsedRows].sort((rowA, rowB) => valueOf(rowB) - valueOf(rowA));
};
