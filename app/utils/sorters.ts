import type { ParsedRow, SortVariant } from '~app/types';

type SortableKey = Extract<keyof ParsedRow, 'points' | 'time' | 'comments' | 'originalIndex'>;
type SortOrder = 'asc' | 'desc';

export const sortRows = (parsedRows: ParsedRow[], sortBy: SortVariant): ParsedRow[] => {
  switch (sortBy) {
    case 'points':
      return sortByKey(parsedRows, 'points');
    case 'time':
      return sortByKey(parsedRows, 'time', 'asc');
    case 'comments':
      return sortByKey(parsedRows, 'comments');
    default:
      return sortByKey(parsedRows, 'originalIndex', 'asc');
  }
};

const sortByKey = (parsedRows: ParsedRow[], key: SortableKey, order: SortOrder = 'desc'): ParsedRow[] => {
  return parsedRows.sort((rowA, rowB) => {
    return order === 'asc' ? rowA[key] - rowB[key] : rowB[key] - rowA[key];
  });
};
