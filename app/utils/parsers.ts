import { stringToNumber } from '~app/utils/converters';
import { getCommentsElement, getPointsElement, getTimeElement } from '~app/utils/selectors';

const TITLE_UNIX_TS_INDEX = 1;

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

  const unixTs = parseInt(title.split(' ')[TITLE_UNIX_TS_INDEX]);
  return isNaN(unixTs) ? 0 : unixTs;
};

export const getComments = (infoRow: HTMLElement): number => {
  const commentsElement = getCommentsElement(infoRow);

  if (commentsElement) {
    return stringToNumber(commentsElement.textContent ?? '');
  }

  return 0;
};
