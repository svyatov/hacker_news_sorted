import { CSS_CLASSES, CSS_SELECTORS, SECONDS_PER_DAY, SECONDS_PER_HOUR, SECONDS_PER_MINUTE } from '~app/constants';
import type { NonDefaultSortVariant, ParsedRow, SortVariant } from '~app/types';
import { nowInSeconds } from '~app/utils/converters';
import { getCommentsElement, getPointsElement, getTableBody, getTimeElement } from '~app/utils/selectors';

const DATA_ORIGINAL_AGE = 'data-original-age';

export const updateTable = (parsedRows: ParsedRow[], footerRows: HTMLElement[], activeSort: SortVariant): void => {
  if (parsedRows.length === 0) return;

  const tableBody = getTableBody();
  if (!tableBody) return;

  const fragment = document.createDocumentFragment();

  parsedRows.forEach((rowSet) => {
    fragment.appendChild(rowSet.title);
    fragment.appendChild(highlightActiveSort(rowSet.info, activeSort));
    fragment.appendChild(rowSet.spacer);
  });

  footerRows.forEach((row) => {
    fragment.appendChild(row);
  });

  tableBody.replaceChildren(fragment);
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

const pluralize = (count: number, singular: string): string => `${count} ${count === 1 ? singular : singular + 's'}`;

export const formatAge = (unixTimestamp: number): string => {
  const secondsAgo = nowInSeconds() - unixTimestamp;
  if (secondsAgo < 0) return '0 minutes ago';

  const days = Math.floor(secondsAgo / SECONDS_PER_DAY);
  if (days > 0) return `${pluralize(days, 'day')} ago`;

  const hours = Math.floor(secondsAgo / SECONDS_PER_HOUR);
  if (hours > 0) return `${pluralize(hours, 'hour')} ago`;

  const minutes = Math.floor(secondsAgo / SECONDS_PER_MINUTE);
  return `${pluralize(minutes, 'minute')} ago`;
};

export const correctAgeTexts = (parsedRows: ParsedRow[]): void => {
  for (const row of parsedRows) {
    if (row.time === 0) continue;
    const ageEl = getTimeElement(row.info);
    const link = ageEl?.querySelector('a');
    if (!link) continue;
    if (!link.hasAttribute(DATA_ORIGINAL_AGE)) {
      link.setAttribute(DATA_ORIGINAL_AGE, link.textContent ?? '');
    }
    link.textContent = formatAge(row.time);
  }
};

export const restoreAgeTexts = (parsedRows: ParsedRow[]): void => {
  for (const row of parsedRows) {
    const ageEl = getTimeElement(row.info);
    const link = ageEl?.querySelector('a');
    if (!link) continue;
    const original = link.getAttribute(DATA_ORIGINAL_AGE);
    if (original !== null) {
      link.textContent = original;
      link.removeAttribute(DATA_ORIGINAL_AGE);
    }
  }
};
