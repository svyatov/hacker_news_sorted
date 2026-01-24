import { Fragment, useCallback, useEffect, useMemo, type ReactElement } from 'react';

import SortButton from '~app/components/SortButton';
import { CSS_CLASSES, SORT_OPTIONS } from '~app/constants';
import { useKeyboardShortcuts } from '~app/hooks/useKeyboardShortcuts';
import { useParsedRows } from '~app/hooks/useParsedRows';
import { useSettings } from '~app/hooks/useSettings';
import type { SortVariant } from '~app/types';
import { updateTable } from '~app/utils/presenters';
import { sortRows } from '~app/utils/sorters';

const sortOptionsCount = SORT_OPTIONS.length - 1;

const ControlPanel = (): ReactElement => {
  const { activeSort, setActiveSort } = useSettings();
  const { parsedRows, footerRows } = useParsedRows();

  const sortedRows = useMemo(() => sortRows(parsedRows, activeSort), [parsedRows, activeSort]);

  useEffect(() => {
    updateTable(sortedRows, footerRows, activeSort);
  }, [sortedRows, footerRows, activeSort]);

  const handleSort = useCallback(
    (sortBy: SortVariant) => {
      if (sortBy === activeSort) return;
      setActiveSort(sortBy);
    },
    [activeSort, setActiveSort],
  );

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
