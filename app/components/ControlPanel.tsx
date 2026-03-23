import { Fragment, useCallback, useEffect, useMemo, type ReactElement } from 'react';

import SortButton from '~app/components/SortButton';
import { CSS_CLASSES, CWS_REVIEW_URL, SORT_OPTIONS } from '~app/constants';
import { useKeyboardShortcuts } from '~app/hooks/useKeyboardShortcuts';
import { useParsedRows } from '~app/hooks/useParsedRows';
import { useReviewPrompt } from '~app/hooks/useReviewPrompt';
import { useSettings } from '~app/hooks/useSettings';
import type { SortVariant } from '~app/types';
import { updateTable } from '~app/utils/presenters';
import { sortRows } from '~app/utils/sorters';

const sortOptionsCount = SORT_OPTIONS.length - 1;

const ControlPanel = (): ReactElement => {
  const { activeSort, setActiveSort } = useSettings();
  const { parsedRows, footerRows } = useParsedRows();
  const { showPrompt, dismissPrompt, incrementSortCount } = useReviewPrompt();

  const sortedRows = useMemo(() => sortRows(parsedRows, activeSort), [parsedRows, activeSort]);

  useEffect(() => {
    updateTable(sortedRows, footerRows, activeSort);
  }, [sortedRows, footerRows, activeSort]);

  const handleSort = useCallback(
    (sortBy: SortVariant) => {
      if (sortBy === activeSort) return;
      setActiveSort(sortBy);
      incrementSortCount();
    },
    [activeSort, setActiveSort, incrementSortCount],
  );

  useKeyboardShortcuts({ onSort: handleSort });

  return (
    <>
      <span className={CSS_CLASSES.SORT_BY_LABEL}>sort by:</span>

      {SORT_OPTIONS.map((option, index) => (
        <Fragment key={option.sortBy}>
          <SortButton sortOption={option} activeSort={activeSort} setActiveSort={handleSort} />
          {index < sortOptionsCount && ' · '}
        </Fragment>
      ))}

      <span className={CSS_CLASSES.DIVIDER}>|</span>

      {showPrompt && (
        <span className={CSS_CLASSES.REVIEW_TOAST}>
          <a href={CWS_REVIEW_URL} target="_blank" rel="noopener" className={CSS_CLASSES.REVIEW_LINK}>
            <span>{'Enjoying HN Sorted? Leave a review \u2764\ufe0f'}</span>
            <span className={CSS_CLASSES.REVIEW_SUB}>Support the extension, help others discover it</span>
          </a>
          <button type="button" className={CSS_CLASSES.REVIEW_CLOSE} onClick={dismissPrompt} aria-label="Dismiss">
            {'\u00d7'}
          </button>
        </span>
      )}
    </>
  );
};

export default ControlPanel;
