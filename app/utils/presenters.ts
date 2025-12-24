import { HIGHLIGHT_CLASS, HIGHLIGHT_SELECTOR } from '~app/constants';
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
  const previousHighlight = infoRow.querySelector(HIGHLIGHT_SELECTOR);

  if (previousHighlight) {
    previousHighlight.classList.remove(HIGHLIGHT_CLASS);
  }

  if (activeSort === 'default') {
    return infoRow;
  }

  const elementGetter = SORT_TO_ELEMENT_GETTER[activeSort];
  const elementToHighlight = elementGetter(infoRow);

  if (elementToHighlight) {
    elementToHighlight.classList.add(HIGHLIGHT_CLASS);
  }

  return infoRow;
};
