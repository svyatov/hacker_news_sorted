import { stringToNumber } from '~app/utils/converters';
import { getCommentsElement, getPointsElement, getTimeElement } from '~app/utils/selectors';

export const getPoints = (infoRow: HTMLElement): number => {
  const pointsElement = getPointsElement(infoRow);

  if (pointsElement) {
    return stringToNumber(pointsElement.textContent ?? '');
  }

  return 0;
};

// ISO-ish datetime: date, optional [T or space]time with optional seconds/fraction, optional zone.
const ISO_LIKE =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?)?\s*(?:Z|UTC|GMT|([+-])(\d{2}):?(\d{2}))?$/i;

/** HN `.age` title -> Unix seconds, or 0. HN's clock is UTC, so zone-less datetimes are UTC, never local. */
export const parseAgeTitle = (title: string): number => {
  const unix = title.match(/(?:^|\s)(\d{10})(?:\s|$)/); // legacy "ISO UNIX" format: exact, zone-free
  if (unix) return Number(unix[1]);

  const m = ISO_LIKE.exec(title.trim());
  if (!m) return 0;
  const [, y, mo, d, h = '0', mi = '0', s = '0', sign, oh = '0', om = '0'] = m;
  const offset = (sign === '-' ? -1 : 1) * (Number(oh) * 60 + Number(om)) * 60;
  return Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)) / 1000 - offset;
};

export const getTime = (infoRow: HTMLElement): number =>
  parseAgeTitle(getTimeElement(infoRow)?.getAttribute('title') ?? '');

export const getComments = (infoRow: HTMLElement): number => {
  const commentsElement = getCommentsElement(infoRow);

  if (commentsElement) {
    return stringToNumber(commentsElement.textContent ?? '');
  }

  return 0;
};
