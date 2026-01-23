import { Fragment, useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';

import SortButton from '~app/components/SortButton';
import { CSS_CLASSES, SORT_OPTIONS } from '~app/constants';
import { useKeyboardShortcuts } from '~app/hooks/useKeyboardShortcuts';
import { useParsedRows } from '~app/hooks/useParsedRows';
import type { SortVariant } from '~app/types';
import { updateTable } from '~app/utils/presenters';
import { sortRows } from '~app/utils/sorters';
import { getLastActiveSort, setLastActiveSort } from '~app/utils/storage';

const sortOptionsCount = SORT_OPTIONS.length - 1;

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
      <span className={CSS_CLASSES.SORT_BY_LABEL}>sort by:</span>

      {SORT_OPTIONS.map((option, index) => (
        <Fragment key={option.sortBy}>
          <SortButton sortOption={option} activeSort={activeSort} setActiveSort={setActiveSort} />
          {index < sortOptionsCount && ' · '}
        </Fragment>
      ))}

      <span className={CSS_CLASSES.DIVIDER}>|</span>
    </>
  );
};

export default ControlPanel;
