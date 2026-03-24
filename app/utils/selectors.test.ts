import { beforeEach, describe, expect, it } from 'vitest';

import { HN_CLASSES } from '~app/constants';

import {
  getCommentsElement,
  getInfoRows,
  getPointsElement,
  getSpacerRows,
  getTimeElement,
  getTitleRows,
} from './selectors';

const POST_COUNT = 3;
const ROWS_PER_POST = 3; // title + info + spacer

describe('selectors', () => {
  describe('row selectors', () => {
    let tableBody: HTMLElement;

    beforeEach(() => {
      tableBody = document.createElement('tbody');
      for (let i = 0; i < POST_COUNT * ROWS_PER_POST; i++) {
        const tr = document.createElement('tr');
        tr.setAttribute('data-row', String(i + 1));
        tableBody.appendChild(tr);
      }
    });

    it('should select the first row of each 3-row post group', () => {
      const titleRows = getTitleRows(tableBody);
      expect(titleRows.length).toBe(POST_COUNT);
      for (let i = 0; i < POST_COUNT; i++) {
        expect(titleRows[i].getAttribute('data-row')).toBe(String(i * ROWS_PER_POST + 1));
      }
    });

    it('should select the second row of each 3-row post group', () => {
      const infoRows = getInfoRows(tableBody);
      expect(infoRows.length).toBe(POST_COUNT);
      for (let i = 0; i < POST_COUNT; i++) {
        expect(infoRows[i].getAttribute('data-row')).toBe(String(i * ROWS_PER_POST + 2));
      }
    });

    it('should select the third row of each 3-row post group', () => {
      const spacerRows = getSpacerRows(tableBody);
      expect(spacerRows.length).toBe(POST_COUNT);
      for (let i = 0; i < POST_COUNT; i++) {
        expect(spacerRows[i].getAttribute('data-row')).toBe(String(i * ROWS_PER_POST + 3));
      }
    });

    it('should handle empty table body', () => {
      const emptyTableBody = document.createElement('tbody');
      expect(getTitleRows(emptyTableBody).length).toBe(0);
      expect(getInfoRows(emptyTableBody).length).toBe(0);
      expect(getSpacerRows(emptyTableBody).length).toBe(0);
    });
  });

  describe('info row element selectors', () => {
    let infoRow: HTMLElement;

    beforeEach(() => {
      infoRow = document.createElement('tr');
    });

    describe('getPointsElement', () => {
      it('should find points element', () => {
        infoRow.innerHTML = `<td class="${HN_CLASSES.SUBTEXT}"><span><span class="${HN_CLASSES.SCORE}">100 points</span></span></td>`;
        const element = getPointsElement(infoRow);
        expect(element).not.toBeNull();
        expect(element?.textContent).toBe('100 points');
      });

      it('should return null when points element is missing', () => {
        infoRow.innerHTML = `<td class="${HN_CLASSES.SUBTEXT}"><span></span></td>`;
        expect(getPointsElement(infoRow)).toBeNull();
      });
    });

    describe('getTimeElement', () => {
      it('should find time element (regular post)', () => {
        infoRow.innerHTML = `<td class="${HN_CLASSES.SUBTEXT}"><span><span class="${HN_CLASSES.AGE}" title="2024-01-15">2h</span></span></td>`;
        const element = getTimeElement(infoRow);
        expect(element).not.toBeNull();
        expect(element?.getAttribute('title')).toBe('2024-01-15');
      });

      it('should find time element (promo post)', () => {
        infoRow.innerHTML = `<td class="${HN_CLASSES.SUBTEXT}"><span class="${HN_CLASSES.AGE}" title="2024-01-15">2h</span></td>`;
        const element = getTimeElement(infoRow);
        expect(element).not.toBeNull();
        expect(element?.getAttribute('title')).toBe('2024-01-15');
      });

      it('should return null when time element is missing', () => {
        infoRow.innerHTML = `<td class="${HN_CLASSES.SUBTEXT}"><span></span></td>`;
        expect(getTimeElement(infoRow)).toBeNull();
      });

      it('should prefer regular post selector over promo post', () => {
        infoRow.innerHTML = `
          <td class="${HN_CLASSES.SUBTEXT}">
            <span><span class="${HN_CLASSES.AGE}" title="regular">regular</span></span>
            <span class="${HN_CLASSES.AGE}" title="promo">promo</span>
          </td>
        `;
        const element = getTimeElement(infoRow);
        expect(element?.getAttribute('title')).toBe('regular');
      });
    });

    describe('getCommentsElement', () => {
      it('should find comments element', () => {
        infoRow.innerHTML = `<td class="${HN_CLASSES.SUBTEXT}"><span><a href="item?id=123">5 comments</a></span></td>`;
        const element = getCommentsElement(infoRow);
        expect(element).not.toBeNull();
        expect(element?.textContent).toBe('5 comments');
      });

      it('should return null when comments element is missing', () => {
        infoRow.innerHTML = `<td class="${HN_CLASSES.SUBTEXT}"><span></span></td>`;
        expect(getCommentsElement(infoRow)).toBeNull();
      });

      it('should not match non-item links', () => {
        infoRow.innerHTML = `<td class="${HN_CLASSES.SUBTEXT}"><span><a href="user?id=123">username</a></span></td>`;
        expect(getCommentsElement(infoRow)).toBeNull();
      });
    });
  });
});
