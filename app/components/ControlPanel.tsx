import { Fragment, useCallback, useEffect, useMemo, type ReactElement } from 'react';

import SortButton from '~app/components/SortButton';
import { CONTROL_PANEL_ROOT_ID, CSS_CLASSES, CWS_REVIEW_URL, SORT_COUNT_ATTR } from '~app/constants';
import { useKeyboardShortcuts } from '~app/hooks/useKeyboardShortcuts';
import { useParsedRows } from '~app/hooks/useParsedRows';
import { useReviewPrompt } from '~app/hooks/useReviewPrompt';
import { useSettings } from '~app/hooks/useSettings';
import type { SortVariant } from '~app/types';
import { correctAgeTexts, restoreAgeTexts, updateTable } from '~app/utils/presenters';
import { sortRows } from '~app/utils/sorters';

// Shared so the dropdown's visible label and its aria-label can't drift apart.
const SORT_BY_TEXT = 'Sort by';

const ControlPanel = (): ReactElement | null => {
  const { activeSort, setActiveSort, showTrueTimeAgo, enabledSortOptions, settled } = useSettings();
  const { parsedRows, footerRows } = useParsedRows();
  const { showPrompt, dismissPrompt, incrementSortCount } = useReviewPrompt();

  const sortedRows = useMemo(() => sortRows(parsedRows, activeSort), [parsedRows, activeSort]);

  useEffect(() => {
    // Wait for the settled read so the table sorts once with the resolved sort, instead of
    // reordering from the default first and then again once settings load (PE2).
    if (!settled) return;
    updateTable(sortedRows, footerRows, activeSort);
    if (showTrueTimeAgo) {
      correctAgeTexts(sortedRows);
    } else {
      restoreAgeTexts(sortedRows);
    }
  }, [sortedRows, footerRows, activeSort, showTrueTimeAgo, settled]);

  // Publish the enabled-option count on the imperatively-created panel root (outside
  // React's tree) so count-aware CSS breakpoints can key off it (KTD-3).
  useEffect(() => {
    document.getElementById(CONTROL_PANEL_ROOT_ID)?.setAttribute(SORT_COUNT_ATTR, String(enabledSortOptions.length));
  }, [enabledSortOptions.length]);

  const handleSort = useCallback(
    (sortBy: SortVariant) => {
      if (sortBy === activeSort) return;
      setActiveSort(sortBy);
      incrementSortCount();
    },
    [activeSort, setActiveSort, incrementSortCount],
  );

  const conflictKeys = useKeyboardShortcuts({ onSort: handleSort, enabledSortOptions });

  // Wait for the settled settings read before painting so the panel doesn't flash a
  // six-option layout that reflows to four/five for users who disabled a sort (KTD-8).
  if (!settled) return null;

  const lastIndex = enabledSortOptions.length - 1;

  return (
    <>
      <span className={CSS_CLASSES.BUTTONS_TIER}>
        <span className={CSS_CLASSES.SORT_BY_LABEL}>sort by:</span>

        {enabledSortOptions.map((option, index) => (
          <Fragment key={option.sortBy}>
            <SortButton sortOption={option} activeSort={activeSort} setActiveSort={handleSort} />
            {index < lastIndex && ' · '}
          </Fragment>
        ))}

        <span className={CSS_CLASSES.DIVIDER}>|</span>

        {conflictKeys.size > 0 && (
          <span className={CSS_CLASSES.CONFLICT_NOTE} role="status">
            {`hotkeys off: ${[...conflictKeys].map((key) => key.toUpperCase()).join(', ')} taken by another extension`}
          </span>
        )}

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
      </span>

      <span className={CSS_CLASSES.DROPDOWN_TIER}>
        <span className={CSS_CLASSES.DROPDOWN_LABEL}>{SORT_BY_TEXT}</span>
        <select
          className={CSS_CLASSES.DROPDOWN}
          aria-label={SORT_BY_TEXT}
          value={activeSort}
          onChange={(event) => handleSort(event.target.value as SortVariant)}>
          {enabledSortOptions.map((option) => (
            <option key={option.sortBy} value={option.sortBy}>
              {option.text}
            </option>
          ))}
        </select>
      </span>
    </>
  );
};

export default ControlPanel;
