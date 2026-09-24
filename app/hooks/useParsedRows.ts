import { useMemo } from 'react';

import type { ParsedRow } from '~app/types';
import { getComments, getPoints, getTime } from '~app/utils/parsers';
import { getPostRows } from '~app/utils/selectors';

export const useParsedRows = (): ParsedRow[] =>
  useMemo(
    () =>
      getPostRows().map((title, originalIndex) => {
        const info = title.nextElementSibling as HTMLElement;
        return {
          originalIndex,
          title,
          info,
          spacer: info.nextElementSibling as HTMLElement,
          points: getPoints(info),
          time: getTime(info),
          comments: getComments(info),
        };
      }),
    [],
  );
