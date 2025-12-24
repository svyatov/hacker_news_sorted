import { useMemo } from 'react';

import type { ParsedRow } from '~app/types';
import { getComments, getPoints, getTime } from '~app/utils/parsers';
import { getInfoRows, getSpacerRows, getTableBody, getTitleRows } from '~app/utils/selectors';

export const useParsedRows = (): { parsedRows: ParsedRow[]; footerRows: HTMLElement[] } => {
  const { parsedRows, footerRows } = useMemo(() => {
    const tableBody = getTableBody();
    if (!tableBody) {
      return { parsedRows: [], footerRows: [] };
    }

    const titleRows = [...getTitleRows(tableBody)];
    const infoRows = [...getInfoRows(tableBody)];
    const spacerRows = [...getSpacerRows(tableBody)];

    const footer = [titleRows.pop(), infoRows.pop()];

    const parsed = titleRows.map((_titleRow, index) => {
      return {
        originalIndex: index,
        title: titleRows[index],
        info: infoRows[index],
        spacer: spacerRows[index],
        points: getPoints(infoRows[index]),
        time: getTime(infoRows[index]),
        comments: getComments(infoRows[index]),
      };
    });

    return { parsedRows: parsed, footerRows: footer };
  }, []);

  return { parsedRows, footerRows };
};
