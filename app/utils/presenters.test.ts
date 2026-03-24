import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CSS_CLASSES, HN_CLASSES, SECONDS_PER_DAY, SECONDS_PER_HOUR, SECONDS_PER_MINUTE } from '~app/constants';
import type { ParsedRow } from '~app/types';
import { nowInSeconds } from '~app/utils/converters';

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

    it('should return "30 minutes ago" for 30 minutes', () =>
      expect(formatAge(nowSec - 30 * SECONDS_PER_MINUTE)).toBe('30 minutes ago'));
    it('should return "1 minute ago" for exactly 1 minute', () =>
      expect(formatAge(nowSec - SECONDS_PER_MINUTE)).toBe('1 minute ago'));
    it('should return "5 hours ago" for 5 hours', () =>
      expect(formatAge(nowSec - 5 * SECONDS_PER_HOUR)).toBe('5 hours ago'));
    it('should return "1 hour ago" for exactly 1 hour', () =>
      expect(formatAge(nowSec - SECONDS_PER_HOUR)).toBe('1 hour ago'));
    it('should return "3 days ago" for 3 days', () =>
      expect(formatAge(nowSec - 3 * SECONDS_PER_DAY)).toBe('3 days ago'));
    it('should return "1 day ago" for exactly 1 day', () =>
      expect(formatAge(nowSec - SECONDS_PER_DAY)).toBe('1 day ago'));
    it('should round 25 hours down to "1 day ago"', () =>
      expect(formatAge(nowSec - 25 * SECONDS_PER_HOUR)).toBe('1 day ago'));
    it('should return "0 minutes ago" for future timestamps', () =>
      expect(formatAge(nowSec + 100)).toBe('0 minutes ago'));
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
      const nowSec = nowInSeconds();
      const row = makeRow('14 hours ago', nowSec - 3 * SECONDS_PER_DAY);
      correctAgeTexts([row]);
      const link = row.info.querySelector('a')!;
      expect(link.textContent).toBe('3 days ago');
      expect(link.getAttribute('href')).toBe('item?id=1');
    });

    it('should save original text in data attribute', () => {
      const nowSec = nowInSeconds();
      const row = makeRow('14 hours ago', nowSec - 3 * SECONDS_PER_DAY);
      correctAgeTexts([row]);
      expect(row.info.querySelector('a')!.getAttribute('data-original-age')).toBe('14 hours ago');
    });

    it('should restore original text', () => {
      const nowSec = nowInSeconds();
      const row = makeRow('14 hours ago', nowSec - 3 * SECONDS_PER_DAY);
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
      const row = makeRow('3 hours ago', nowInSeconds() - SECONDS_PER_DAY);
      row.info.querySelector('a')!.remove();
      expect(() => correctAgeTexts([row])).not.toThrow();
    });

    it('should not overwrite already-saved original text on repeated calls', () => {
      const nowSec = nowInSeconds();
      const row = makeRow('14 hours ago', nowSec - 3 * SECONDS_PER_DAY);
      correctAgeTexts([row]);
      correctAgeTexts([row]);
      expect(row.info.querySelector('a')!.getAttribute('data-original-age')).toBe('14 hours ago');
    });

    it('restoreAgeTexts should be a no-op when no original was saved', () => {
      const row = makeRow('3 hours ago', nowInSeconds() - SECONDS_PER_HOUR);
      restoreAgeTexts([row]);
      expect(row.info.querySelector('a')!.textContent).toBe('3 hours ago');
    });
  });
});
