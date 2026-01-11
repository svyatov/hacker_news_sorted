import { HN_SELECTORS } from '~app/constants';

export const getControlPanelParentElement = (): HTMLElement | null => {
  return document.querySelector(HN_SELECTORS.CONTROL_PANEL_PARENT);
};

export const getTableBody = (): HTMLElement | null => {
  return document.querySelector(HN_SELECTORS.TABLE_BODY);
};

export const getTitleRows = (tableBody: HTMLElement): NodeListOf<HTMLElement> => {
  return tableBody.querySelectorAll(HN_SELECTORS.TITLE_ROWS);
};

export const getInfoRows = (tableBody: HTMLElement): NodeListOf<HTMLElement> => {
  return tableBody.querySelectorAll(HN_SELECTORS.INFO_ROWS);
};

export const getSpacerRows = (tableBody: HTMLElement): NodeListOf<HTMLElement> => {
  return tableBody.querySelectorAll(HN_SELECTORS.SPACER_ROWS);
};

export const getPointsElement = (infoRow: HTMLElement): HTMLElement | null => {
  return infoRow.querySelector(HN_SELECTORS.POINTS);
};

export const getTimeElement = (infoRow: HTMLElement): HTMLElement | null => {
  const regularPost = infoRow.querySelector<HTMLElement>(HN_SELECTORS.TIME_REGULAR);
  const promoPost = infoRow.querySelector<HTMLElement>(HN_SELECTORS.TIME_PROMO);

  return regularPost || promoPost;
};

export const getCommentsElement = (infoRow: HTMLElement): HTMLElement | null => {
  return infoRow.querySelector(HN_SELECTORS.COMMENTS);
};
