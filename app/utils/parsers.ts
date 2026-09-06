import { stringToNumber } from '~app/utils/converters';
import { getCommentsElement, getPointsElement, getTimeElement } from '~app/utils/selectors';

export const getPoints = (infoRow: HTMLElement): number => {
  const pointsElement = getPointsElement(infoRow);

  if (pointsElement) {
    return stringToNumber(pointsElement.textContent ?? '');
  }

  return 0;
};

export const getTime = (infoRow: HTMLElement): number => {
  const timeElement = getTimeElement(infoRow);
  if (!timeElement) return 0;

  const title = timeElement.getAttribute('title');
  if (!title) return 0;

  // HN title is an ISO datetime ("2026-09-06T07:21:06.000000Z"); older markup appended a Unix timestamp
  const [iso, unix] = title.split(' ');
  if (unix) return stringToNumber(unix);

  const ms = Date.parse(iso ?? '');
  return Number.isNaN(ms) ? 0 : Math.floor(ms / 1000);
};

export const getComments = (infoRow: HTMLElement): number => {
  const commentsElement = getCommentsElement(infoRow);

  if (commentsElement) {
    return stringToNumber(commentsElement.textContent ?? '');
  }

  return 0;
};
