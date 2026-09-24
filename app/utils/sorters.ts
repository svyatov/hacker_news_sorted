import { SECONDS_PER_HOUR } from '~app/constants';
import type { ParsedRow, SortVariant } from '~app/types';
import { nowInSeconds } from '~app/utils/converters';

// Damped velocity denominator, mirroring HN's own gravity formula shape (age + 2).
const VELOCITY_DAMPING_HOURS = 2;
// 0-points rows (e.g. job posts) can't yield a real comments/points ratio; a finite
// below-zero sentinel sinks them to the bottom without the Infinity/NaN of naive division.
const HEAT_ZERO_POINTS_SENTINEL = -1;

const velocity = (row: ParsedRow): number => {
  // Clamp age at 0 so a client clock running behind a post's server timestamp can't drive the
  // denominator to zero/negative (Infinity/NaN/negative rank); keeps the no-Infinity/NaN guarantee.
  const ageHours = Math.max(0, (nowInSeconds() - row.time) / SECONDS_PER_HOUR);
  return row.points / (ageHours + VELOCITY_DAMPING_HOURS);
};

const heat = (row: ParsedRow): number => (row.points === 0 ? HEAT_ZERO_POINTS_SENTINEL : row.comments / row.points);

export const sortRows = (parsedRows: ParsedRow[], sortBy: SortVariant): ParsedRow[] => {
  switch (sortBy) {
    case 'points':
      return sortByValue(parsedRows, (row) => row.points);
    case 'time':
      return sortByValue(parsedRows, (row) => row.time);
    case 'comments':
      return sortByValue(parsedRows, (row) => row.comments);
    case 'velocity':
      return sortByValue(parsedRows, velocity);
    case 'heat':
      return sortByValue(parsedRows, heat);
    default:
      return sortByValue(parsedRows, (row) => -row.originalIndex);
  }
};

const sortByValue = (parsedRows: ParsedRow[], getValue: (row: ParsedRow) => number): ParsedRow[] => {
  return [...parsedRows].sort((rowA, rowB) => getValue(rowB) - getValue(rowA));
};
