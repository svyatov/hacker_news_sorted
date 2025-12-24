import { HIGHLIGHT_CLASS, HIGHLIGHT_SELECTOR } from '~app/constants';
import type { ParsedRow, SortVariant } from '~app/types';
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

export const highlightActiveSort = (infoRow: HTMLElement, activeSort: SortVariant): HTMLElement => {
  const previousHighlights = infoRow.querySelector(HIGHLIGHT_SELECTOR);

  if (previousHighlights) {
    previousHighlights.classList.remove(HIGHLIGHT_CLASS);
  }

  if (activeSort === 'default') {
    return infoRow;
  }

  const pointsElement = getPointsElement(infoRow);
  const timeElement = getTimeElement(infoRow);
  const commentsElement = getCommentsElement(infoRow);

  if (activeSort === 'points' && pointsElement) {
    pointsElement.classList.add(HIGHLIGHT_CLASS);
  } else if (activeSort === 'time' && timeElement) {
    timeElement.classList.add(HIGHLIGHT_CLASS);
  } else if (activeSort === 'comments' && commentsElement) {
    commentsElement.classList.add(HIGHLIGHT_CLASS);
  }

  return infoRow;
};
