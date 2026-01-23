import { CSS_CLASSES, CSS_SELECTORS } from '~app/constants';
import type { NonDefaultSortVariant, ParsedRow, SortVariant } from '~app/types';
import { getCommentsElement, getPointsElement, getTableBody, getTimeElement } from '~app/utils/selectors';

export const updateTable = (parsedRows: ParsedRow[], footerRows: HTMLElement[], activeSort: SortVariant): void => {
  if (parsedRows.length === 0) return;

  const tableBody = getTableBody();
  if (!tableBody) return;

  const sortedRowsFragment = document.createDocumentFragment();
  const sortedTableBody = sortedRowsFragment.appendChild(document.createElement('tbody'));

  parsedRows.forEach((rowSet) => {
    sortedTableBody.appendChild(rowSet.title);
    sortedTableBody.appendChild(highlightActiveSort(rowSet.info, activeSort));
    sortedTableBody.appendChild(rowSet.spacer);
  });

  footerRows.forEach((row) => {
    sortedTableBody.appendChild(row);
  });

  tableBody.replaceWith(sortedRowsFragment);
};

const SORT_TO_ELEMENT_GETTER: Record<NonDefaultSortVariant, (row: HTMLElement) => HTMLElement | null> = {
  points: getPointsElement,
  time: getTimeElement,
  comments: getCommentsElement,
};

export const highlightActiveSort = (infoRow: HTMLElement, activeSort: SortVariant): HTMLElement => {
  const previousHighlight = infoRow.querySelector(CSS_SELECTORS.HIGHLIGHT);

  if (previousHighlight) {
    previousHighlight.classList.remove(CSS_CLASSES.HIGHLIGHT);
  }

  if (activeSort === 'default') {
    return infoRow;
  }

  const elementGetter = SORT_TO_ELEMENT_GETTER[activeSort];
  const elementToHighlight = elementGetter(infoRow);

  if (elementToHighlight) {
    elementToHighlight.classList.add(CSS_CLASSES.HIGHLIGHT);
  }

  return infoRow;
};
