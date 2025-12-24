export const getControlPanelParentElement = (): HTMLElement | null => {
  return document.querySelector(
    'body > center > table > tbody > tr:nth-child(1) > td > table > tbody > tr > td:nth-child(3)',
  );
};

export const getTableBody = (): HTMLElement | null => {
  return document.querySelector('body > center > table > tbody > tr:nth-child(3) > td > table > tbody');
};

export const getTitleRows = (tableBody: HTMLElement): NodeListOf<HTMLElement> => {
  return tableBody.querySelectorAll('tr:nth-child(3n+1)');
};

export const getInfoRows = (tableBody: HTMLElement): NodeListOf<HTMLElement> => {
  return tableBody.querySelectorAll('tr:nth-child(3n+2)');
};

export const getSpacerRows = (tableBody: HTMLElement): NodeListOf<HTMLElement> => {
  return tableBody.querySelectorAll('tr:nth-child(3n+3)');
};

export const getPointsElement = (infoRow: HTMLElement): HTMLElement | null => {
  return infoRow.querySelector('td.subtext > span > span.score');
};

export const getTimeElement = (infoRow: HTMLElement): HTMLElement | null => {
  const regularPost = infoRow.querySelector<HTMLElement>('td.subtext > span > span.age');
  const promoPost = infoRow.querySelector<HTMLElement>('td.subtext > span.age');

  return regularPost || promoPost;
};

export const getCommentsElement = (infoRow: HTMLElement): HTMLElement | null => {
  return infoRow.querySelector('td.subtext > span > a[href^="item?id="]');
};
