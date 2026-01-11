import { beforeEach, describe, expect, it } from 'vitest';

import { HN_CLASSES } from '~app/constants';

import { getComments, getPoints, getTime } from './parsers';

describe('parsers', () => {
  let infoRow: HTMLElement;

  beforeEach(() => {
    infoRow = document.createElement('tr');
  });

  describe('getPoints', () => {
    it('should extract points from info row', () => {
      infoRow.innerHTML = `
        <td class="${HN_CLASSES.SUBTEXT}">
          <span><span class="${HN_CLASSES.SCORE}">150 points</span></span>
        </td>
      `;
      expect(getPoints(infoRow)).toBe(150);
    });

    it('should return 0 when no points element exists', () => {
      infoRow.innerHTML = `<td class="${HN_CLASSES.SUBTEXT}"></td>`;
      expect(getPoints(infoRow)).toBe(0);
    });

    it('should handle single point', () => {
      infoRow.innerHTML = `
        <td class="${HN_CLASSES.SUBTEXT}">
          <span><span class="${HN_CLASSES.SCORE}">1 point</span></span>
        </td>
      `;
      expect(getPoints(infoRow)).toBe(1);
    });

    it('should handle large point values', () => {
      infoRow.innerHTML = `
        <td class="${HN_CLASSES.SUBTEXT}">
          <span><span class="${HN_CLASSES.SCORE}">9999 points</span></span>
        </td>
      `;
      expect(getPoints(infoRow)).toBe(9999);
    });
  });

  describe('getTime', () => {
    it('should extract timestamp from title attribute (regular post)', () => {
      // Real HN format: "2026-01-11T18:49:32 1768157372" (ISO datetime + unix timestamp)
      const isoDate = '2024-01-15T10:30:00';
      const unixTimestamp = Math.floor(new Date(isoDate).getTime() / 1000);
      infoRow.innerHTML = `
        <td class="${HN_CLASSES.SUBTEXT}">
          <span><span class="${HN_CLASSES.AGE}" title="${isoDate} ${unixTimestamp}">3 hours ago</span></span>
        </td>
      `;
      const result = getTime(infoRow);
      // Parser splits by space and takes first part (ISO date)
      expect(result).toBe(new Date(isoDate).getTime());
    });

    it('should return Infinity when no time element exists', () => {
      infoRow.innerHTML = `<td class="${HN_CLASSES.SUBTEXT}"></td>`;
      expect(getTime(infoRow)).toBe(Infinity);
    });

    it('should return Infinity when title attribute is missing', () => {
      infoRow.innerHTML = `
        <td class="${HN_CLASSES.SUBTEXT}">
          <span><span class="${HN_CLASSES.AGE}">3 hours ago</span></span>
        </td>
      `;
      expect(getTime(infoRow)).toBe(Infinity);
    });

    it('should return Infinity for invalid date', () => {
      infoRow.innerHTML = `
        <td class="${HN_CLASSES.SUBTEXT}">
          <span><span class="${HN_CLASSES.AGE}" title="invalid-date">3 hours ago</span></span>
        </td>
      `;
      expect(getTime(infoRow)).toBe(Infinity);
    });

    it('should handle promo posts with different structure', () => {
      const isoDate = '2024-01-15T10:30:00';
      const unixTimestamp = Math.floor(new Date(isoDate).getTime() / 1000);
      infoRow.innerHTML = `
        <td class="${HN_CLASSES.SUBTEXT}">
          <span class="${HN_CLASSES.AGE}" title="${isoDate} ${unixTimestamp}">3 hours ago</span>
        </td>
      `;
      const result = getTime(infoRow);
      expect(result).toBe(new Date(isoDate).getTime());
    });
  });

  describe('getComments', () => {
    it('should extract comment count from info row', () => {
      infoRow.innerHTML = `
        <td class="${HN_CLASSES.SUBTEXT}">
          <span><a href="item?id=12345">42\u00a0comments</a></span>
        </td>
      `;
      expect(getComments(infoRow)).toBe(42);
    });

    it('should return 0 when no comments link exists', () => {
      infoRow.innerHTML = `<td class="${HN_CLASSES.SUBTEXT}"></td>`;
      expect(getComments(infoRow)).toBe(0);
    });

    it('should handle single comment', () => {
      infoRow.innerHTML = `
        <td class="${HN_CLASSES.SUBTEXT}">
          <span><a href="item?id=12345">1\u00a0comment</a></span>
        </td>
      `;
      expect(getComments(infoRow)).toBe(1);
    });

    it('should handle "discuss" text (0 comments)', () => {
      infoRow.innerHTML = `
        <td class="${HN_CLASSES.SUBTEXT}">
          <span><a href="item?id=12345">discuss</a></span>
        </td>
      `;
      expect(getComments(infoRow)).toBe(0);
    });

    it('should handle large comment counts', () => {
      infoRow.innerHTML = `
        <td class="${HN_CLASSES.SUBTEXT}">
          <span><a href="item?id=12345">1234\u00a0comments</a></span>
        </td>
      `;
      expect(getComments(infoRow)).toBe(1234);
    });
  });
});
