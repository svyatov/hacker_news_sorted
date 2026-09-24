import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearBody, setupTableBody } from '~app/__fixtures__/testHelpers';
import { HN_CLASSES } from '~app/constants';

import { getCommentsElement, getPointsElement, getPostRows, getTimeElement } from './selectors';

describe('selectors', () => {
  describe('getPostRows', () => {
    afterEach(clearBody);

    it('returns the submission row of each post, in order', () => {
      const tbody = setupTableBody(['a', 'b']);
      tbody.append(document.createElement('tr'));

      expect(getPostRows().map((row) => row.id)).toEqual(['a', 'b']);
    });

    // Favorite and upvoted comment lists use the list table too, with two-row athing comments.
    it('skips comment rows', () => {
      const tbody = setupTableBody([]);
      const comment = document.createElement('tr');
      comment.className = HN_CLASSES.ATHING;
      comment.id = 'c1';
      tbody.append(comment, document.createElement('tr'));

      expect(getPostRows()).toEqual([]);
    });

    it('returns nothing when the page has no list table', () => {
      expect(getPostRows()).toEqual([]);
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
