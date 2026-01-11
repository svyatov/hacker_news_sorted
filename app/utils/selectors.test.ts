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

describe('selectors', () => {
  describe('row selectors', () => {
    let tableBody: HTMLElement;

    beforeEach(() => {
      tableBody = document.createElement('tbody');
      // Create 9 rows: 3 posts worth (title, info, spacer x3)
      for (let i = 0; i < 9; i++) {
        const tr = document.createElement('tr');
        tr.setAttribute('data-row', String(i + 1));
        tableBody.appendChild(tr);
      }
    });

    it('should select title rows (3n+1: 1st, 4th, 7th)', () => {
      const titleRows = getTitleRows(tableBody);
      expect(titleRows.length).toBe(3);
      expect(titleRows[0].getAttribute('data-row')).toBe('1');
      expect(titleRows[1].getAttribute('data-row')).toBe('4');
      expect(titleRows[2].getAttribute('data-row')).toBe('7');
    });

    it('should select info rows (3n+2: 2nd, 5th, 8th)', () => {
      const infoRows = getInfoRows(tableBody);
      expect(infoRows.length).toBe(3);
      expect(infoRows[0].getAttribute('data-row')).toBe('2');
      expect(infoRows[1].getAttribute('data-row')).toBe('5');
      expect(infoRows[2].getAttribute('data-row')).toBe('8');
    });

    it('should select spacer rows (3n+3: 3rd, 6th, 9th)', () => {
      const spacerRows = getSpacerRows(tableBody);
      expect(spacerRows.length).toBe(3);
      expect(spacerRows[0].getAttribute('data-row')).toBe('3');
      expect(spacerRows[1].getAttribute('data-row')).toBe('6');
      expect(spacerRows[2].getAttribute('data-row')).toBe('9');
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
