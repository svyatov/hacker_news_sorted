import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CSS_CLASSES, HN_CLASSES } from '~app/constants';
import type { ParsedRow } from '~app/types';

import { correctAgeTexts, formatAge, highlightActiveSort, restoreAgeTexts } from './presenters';

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

  describe('formatAge', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-24T12:00:00Z'));
    });
    afterEach(() => vi.useRealTimers());

    const nowSec = Math.floor(new Date('2026-03-24T12:00:00Z').getTime() / 1000);

    it('should format minutes', () => expect(formatAge(nowSec - 30 * 60)).toBe('30 minutes ago'));
    it('should format singular minute', () => expect(formatAge(nowSec - 60)).toBe('1 minute ago'));
    it('should format hours', () => expect(formatAge(nowSec - 5 * 3600)).toBe('5 hours ago'));
    it('should format singular hour', () => expect(formatAge(nowSec - 3600)).toBe('1 hour ago'));
    it('should format days', () => expect(formatAge(nowSec - 3 * 86400)).toBe('3 days ago'));
    it('should format singular day', () => expect(formatAge(nowSec - 86400)).toBe('1 day ago'));
    it('should use days for 25 hours', () => expect(formatAge(nowSec - 25 * 3600)).toBe('1 day ago'));
    it('should handle future timestamps', () => expect(formatAge(nowSec + 100)).toBe('0 minutes ago'));
  });

  describe('correctAgeTexts / restoreAgeTexts', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-24T12:00:00Z'));
    });
    afterEach(() => vi.useRealTimers());

    const makeRow = (ageText: string, unixTs: number): ParsedRow => {
      const info = document.createElement('tr');
      const td = document.createElement('td');
      td.className = HN_CLASSES.SUBTEXT;
      const span = document.createElement('span');
      const ageSpan = document.createElement('span');
      ageSpan.className = HN_CLASSES.AGE;
      ageSpan.setAttribute('title', `2026-01-01T00:00:00 ${unixTs}`);
      const link = document.createElement('a');
      link.href = 'item?id=1';
      link.textContent = ageText;
      ageSpan.appendChild(link);
      span.appendChild(ageSpan);
      td.appendChild(span);
      info.appendChild(td);
      return {
        originalIndex: 0,
        title: document.createElement('tr'),
        info,
        spacer: document.createElement('tr'),
        points: 0,
        time: unixTs,
        comments: 0,
      };
    };

    it('should correct age text and preserve link', () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const row = makeRow('14 hours ago', nowSec - 3 * 86400);
      correctAgeTexts([row]);
      const link = row.info.querySelector('a')!;
      expect(link.textContent).toBe('3 days ago');
      expect(link.getAttribute('href')).toBe('item?id=1');
    });

    it('should save original text in data attribute', () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const row = makeRow('14 hours ago', nowSec - 3 * 86400);
      correctAgeTexts([row]);
      expect(row.info.querySelector('a')!.getAttribute('data-original-age')).toBe('14 hours ago');
    });

    it('should restore original text', () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const row = makeRow('14 hours ago', nowSec - 3 * 86400);
      correctAgeTexts([row]);
      restoreAgeTexts([row]);
      const link = row.info.querySelector('a')!;
      expect(link.textContent).toBe('14 hours ago');
      expect(link.hasAttribute('data-original-age')).toBe(false);
    });

    it('should skip rows with time === 0', () => {
      const row = makeRow('3 hours ago', 0);
      row.time = 0;
      correctAgeTexts([row]);
      expect(row.info.querySelector('a')!.textContent).toBe('3 hours ago');
    });

    it('should skip rows without a link inside .age', () => {
      const row = makeRow('3 hours ago', Math.floor(Date.now() / 1000) - 86400);
      row.info.querySelector('a')!.remove();
      expect(() => correctAgeTexts([row])).not.toThrow();
    });

    it('should not overwrite already-saved original text on repeated calls', () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const row = makeRow('14 hours ago', nowSec - 3 * 86400);
      correctAgeTexts([row]);
      correctAgeTexts([row]);
      expect(row.info.querySelector('a')!.getAttribute('data-original-age')).toBe('14 hours ago');
    });

    it('restoreAgeTexts should be a no-op when no original was saved', () => {
      const row = makeRow('3 hours ago', Math.floor(Date.now() / 1000) - 3600);
      restoreAgeTexts([row]);
      expect(row.info.querySelector('a')!.textContent).toBe('3 hours ago');
    });
  });
});
