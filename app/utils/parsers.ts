import { stringToNumber } from '~app/utils/converters';
import { getCommentsElement, getPointsElement, getTimeElement } from '~app/utils/selectors';

export const getPoints = (infoRow: HTMLElement): number => {
  const pointsElement = getPointsElement(infoRow);

  if (pointsElement) {
    return stringToNumber(pointsElement.innerText);
  }

  return 0;
};

export const getTime = (infoRow: HTMLElement): number => {
  const timeElement = getTimeElement(infoRow);

  if (!timeElement) {
    return Infinity;
  }

  const timeStamp = timeElement.getAttribute('title');

  return Date.now() - new Date(timeStamp).getTime();
};

export const getComments = (infoRow: HTMLElement): number => {
  const commentsElement = getCommentsElement(infoRow);

  if (commentsElement) {
    return stringToNumber(commentsElement.innerText);
  }

  return 0;
};
