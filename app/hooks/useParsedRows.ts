import { useEffect, useState } from 'react';

import type { ParsedRow } from '~app/types';
import { getComments, getPoints, getTime } from '~app/utils/parsers';
import { getInfoRows, getSpacerRows, getTableBody, getTitleRows } from '~app/utils/selectors';

export const useParsedRows = (): { parsedRows: ParsedRow[]; footerRows: HTMLElement[] } => {
  const [footerRows, setFooterRows] = useState<HTMLElement[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);

  useEffect(() => {
    const tableBody = getTableBody();
    const titleRows = [...getTitleRows(tableBody)];
    const infoRows = [...getInfoRows(tableBody)];
    const spacerRows = [...getSpacerRows(tableBody)];

    setFooterRows([titleRows.pop(), infoRows.pop()]);
    setParsedRows(
      titleRows.map((_titleRow, index) => {
        return {
          originalIndex: index,
          title: titleRows[index],
          info: infoRows[index],
          spacer: spacerRows[index],
          points: getPoints(infoRows[index]),
          time: getTime(infoRows[index]),
          comments: getComments(infoRows[index]),
        };
      }),
    );
  }, []);

  return { parsedRows, footerRows };
};
