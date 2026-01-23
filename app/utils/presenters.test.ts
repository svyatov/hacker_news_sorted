import { beforeEach, describe, expect, it } from 'vitest';

import { CSS_CLASSES, HN_CLASSES } from '~app/constants';

import { highlightActiveSort } from './presenters';

describe('presenters', () => {
  describe('highlightActiveSort', () => {
    let infoRow: HTMLElement;

    beforeEach(() => {
      infoRow = document.createElement('tr');
      infoRow.innerHTML = `
        <td class="${HN_CLASSES.SUBTEXT}">
          <span>
            <span class="${HN_CLASSES.SCORE}">100 points</span>
            <span class="${HN_CLASSES.AGE}" title="2024-01-15">2h ago</span>
            <a href="item?id=123">50 comments</a>
          </span>
        </td>
      `;
    });

    it('should highlight points element when sorting by points', () => {
      highlightActiveSort(infoRow, 'points');
      const score = infoRow.querySelector(`.${HN_CLASSES.SCORE}`);
      expect(score?.classList.contains(CSS_CLASSES.HIGHLIGHT)).toBe(true);
    });

    it('should highlight time element when sorting by time', () => {
      highlightActiveSort(infoRow, 'time');
      const age = infoRow.querySelector(`.${HN_CLASSES.AGE}`);
      expect(age?.classList.contains(CSS_CLASSES.HIGHLIGHT)).toBe(true);
    });

    it('should highlight comments element when sorting by comments', () => {
      highlightActiveSort(infoRow, 'comments');
      const comments = infoRow.querySelector('a[href^="item?id="]');
      expect(comments?.classList.contains(CSS_CLASSES.HIGHLIGHT)).toBe(true);
    });

    it('should not add highlight for default sort', () => {
      highlightActiveSort(infoRow, 'default');
      expect(infoRow.querySelector(`.${CSS_CLASSES.HIGHLIGHT}`)).toBeNull();
    });

    it('should remove previous highlight when changing sort', () => {
      highlightActiveSort(infoRow, 'points');
      highlightActiveSort(infoRow, 'comments');

      const score = infoRow.querySelector(`.${HN_CLASSES.SCORE}`);
      expect(score?.classList.contains(CSS_CLASSES.HIGHLIGHT)).toBe(false);

      const comments = infoRow.querySelector('a[href^="item?id="]');
      expect(comments?.classList.contains(CSS_CLASSES.HIGHLIGHT)).toBe(true);
    });

    it('should remove highlight when switching to default', () => {
      highlightActiveSort(infoRow, 'points');
      highlightActiveSort(infoRow, 'default');

      expect(infoRow.querySelector(`.${CSS_CLASSES.HIGHLIGHT}`)).toBeNull();
    });

    it('should return the same infoRow element', () => {
      const result = highlightActiveSort(infoRow, 'points');
      expect(result).toBe(infoRow);
    });

    it('should handle missing target element gracefully', () => {
      const emptyInfoRow = document.createElement('tr');
      emptyInfoRow.innerHTML = `<td class="${HN_CLASSES.SUBTEXT}"></td>`;

      expect(() => highlightActiveSort(emptyInfoRow, 'points')).not.toThrow();
      expect(emptyInfoRow.querySelector(`.${CSS_CLASSES.HIGHLIGHT}`)).toBeNull();
    });

    it('should handle multiple highlight/unhighlight cycles', () => {
      highlightActiveSort(infoRow, 'points');
      highlightActiveSort(infoRow, 'time');
      highlightActiveSort(infoRow, 'comments');
      highlightActiveSort(infoRow, 'default');
      highlightActiveSort(infoRow, 'points');

      const highlighted = infoRow.querySelectorAll(`.${CSS_CLASSES.HIGHLIGHT}`);
      expect(highlighted.length).toBe(1);
      expect(highlighted[0].classList.contains(HN_CLASSES.SCORE)).toBe(true);
    });
  });
});
