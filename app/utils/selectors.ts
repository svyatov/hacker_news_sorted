import { HN_SELECTORS } from '~app/constants';

export const getControlPanelParentElement = (): HTMLElement | null => {
  return document.querySelector(HN_SELECTORS.CONTROL_PANEL_PARENT);
};

export const getTableBody = (): HTMLElement | null => {
  return document.querySelector(HN_SELECTORS.TABLE_BODY);
};

export const getPostRows = (): HTMLElement[] => {
  return [...(getTableBody()?.querySelectorAll<HTMLElement>(HN_SELECTORS.POST_ROWS) ?? [])];
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
