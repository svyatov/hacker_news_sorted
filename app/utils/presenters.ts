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
  const clonedInfoRow = infoRow.cloneNode(true) as HTMLElement;
  const pointsElement = getPointsElement(clonedInfoRow);
  const timeElement = getTimeElement(clonedInfoRow);
  const commentsElement = getCommentsElement(clonedInfoRow);

  if (activeSort === 'points' && pointsElement) {
    highlightText(pointsElement);
  }

  if (activeSort === 'time' && timeElement) {
    highlightText(timeElement);
  }

  if (activeSort === 'comments' && commentsElement) {
    highlightText(commentsElement);
  }

  return clonedInfoRow;
};

const highlightText = (element: HTMLElement) => {
  element.style.fontWeight = 'bold';
};
