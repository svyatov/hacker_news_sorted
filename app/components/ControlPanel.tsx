import { Fragment, useEffect, useState, type ReactElement } from 'react';

import SortButton from '~app/components/SortButton';
import { useParsedRows } from '~app/hooks/useParsedRows';
import type { SortOption, SortVariant } from '~app/types';
import { updateTable } from '~app/utils/presenters';
import { sortRows } from '~app/utils/sorters';
import { getLastActiveSort } from '~app/utils/storage';

const sortOptions: SortOption[] = [
  { sortBy: 'points', text: 'points', shortcut: 'P' },
  { sortBy: 'time', text: 'time', shortcut: 'T' },
  { sortBy: 'comments', text: 'comments', shortcut: 'C' },
  { sortBy: 'default', text: 'default', shortcut: 'D' },
];

const sortOptionsCount = sortOptions.length - 1;

const ControlPanel = (): ReactElement => {
  const [activeSort, setActiveSort] = useState<SortVariant>(() => getLastActiveSort());
  const { parsedRows, footerRows } = useParsedRows();

  useEffect(() => {
    updateTable(sortRows(parsedRows, activeSort), footerRows, activeSort);
  }, [activeSort, parsedRows, footerRows]);

  return (
    <>
      <span className="hns-sort-by-label">sort by:</span>

      {sortOptions.map((option, index) => (
        <Fragment key={option.sortBy}>
          <SortButton sortOption={option} activeSort={activeSort} setActiveSort={setActiveSort} />
          {index < sortOptionsCount && ' · '}
        </Fragment>
      ))}

      <span className="hns-divider">|</span>
    </>
  );
};

export default ControlPanel;
