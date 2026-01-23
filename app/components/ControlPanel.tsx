import { Fragment, useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';

import SortButton from '~app/components/SortButton';
import { useKeyboardShortcuts } from '~app/hooks/useKeyboardShortcuts';
import { useParsedRows } from '~app/hooks/useParsedRows';
import type { SortOption, SortVariant } from '~app/types';
import { updateTable } from '~app/utils/presenters';
import { sortRows } from '~app/utils/sorters';
import { getLastActiveSort, setLastActiveSort } from '~app/utils/storage';

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

  const sortedRows = useMemo(() => sortRows(parsedRows, activeSort), [parsedRows, activeSort]);

  useEffect(() => {
    updateTable(sortedRows, footerRows, activeSort);
  }, [sortedRows, footerRows, activeSort]);

  // Handler for keyboard shortcuts
  const handleSort = useCallback(
    (sortBy: SortVariant) => {
      if (sortBy === activeSort) return;
      setActiveSort(sortBy);
      setLastActiveSort(sortBy);
    },
    [activeSort],
  );

  // Enable keyboard shortcuts (P, T, C, D keys)
  useKeyboardShortcuts({ onSort: handleSort });

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
