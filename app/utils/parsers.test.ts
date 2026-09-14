import { beforeEach, describe, expect, it } from 'vitest';

import { HN_CLASSES } from '~app/constants';

import { getComments, getPoints, getTime, parseAgeTitle } from './parsers';

describe('parsers', () => {
  let infoRow: HTMLElement;

  beforeEach(() => {
    infoRow = document.createElement('tr');
  });

  it('runs under a non-UTC timezone so local-time parsing is caught', () => {
    expect(new Date().getTimezoneOffset()).toBe(-330);
  });

  describe('parseAgeTitle', () => {
    it.each([
      ['2026-01-11T18:49:32', 1768157372], // since 2026-09-13: zone-less means UTC, never local
      ['2026-01-11T18:49:32.000000Z', 1768157372], // 2026-08-27 .. 2026-09-12
      ['2026-01-11T18:49:32 1768157372', 1768157372], // legacy: Unix suffix
      ['2026-01-11T18:49:32 1768157400', 1768157400], // Unix suffix wins over the ISO part
      ['2026-01-11 18:49:32', 1768157372], // space separator
      ['2026-01-11T18:49:32+05:30', 1768137572], // explicit offset applied
      ['2026-01-11T18:49:32 UTC', 1768157372],
      ['2026-01-11', 1768089600], // date-only: midnight UTC
      ['26-01-11T18:49:32', 0], // 2-digit year rejected
      ['invalid-date', 0],
      ['', 0],
    ])('parseAgeTitle(%j) -> %i', (title, expected) => {
      expect(parseAgeTitle(title)).toBe(expected);
    });
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
    it('should parse the zone-less ISO datetime from title attribute as UTC', () => {
      // HN title format since 2026-09-13: "ISO_DATETIME" with no zone suffix
      infoRow.innerHTML = `<td class="${HN_CLASSES.SUBTEXT}"><span><span class="${HN_CLASSES.AGE}" title="2026-01-11T18:49:32">3 hours ago</span></span></td>`;
      expect(getTime(infoRow)).toBe(1768157372);
    });

    it('should prefer the unix timestamp in the legacy title format', () => {
      // Legacy HN title format: "ISO_DATETIME UNIX_TIMESTAMP"
      infoRow.innerHTML = `<td class="${HN_CLASSES.SUBTEXT}"><span><span class="${HN_CLASSES.AGE}" title="2026-01-11T18:49:32 1768157372">3 hours ago</span></span></td>`;
      expect(getTime(infoRow)).toBe(1768157372);
    });

    it('should return 0 when no time element exists', () => {
      infoRow.innerHTML = `<td class="${HN_CLASSES.SUBTEXT}"></td>`;
      expect(getTime(infoRow)).toBe(0);
    });

    it('should return 0 when title attribute is missing', () => {
      infoRow.innerHTML = `<td class="${HN_CLASSES.SUBTEXT}"><span><span class="${HN_CLASSES.AGE}">3 hours ago</span></span></td>`;
      expect(getTime(infoRow)).toBe(0);
    });

    it('should return 0 for invalid title format', () => {
      infoRow.innerHTML = `<td class="${HN_CLASSES.SUBTEXT}"><span><span class="${HN_CLASSES.AGE}" title="invalid-date">3 hours ago</span></span></td>`;
      expect(getTime(infoRow)).toBe(0);
    });

    it('should handle promo posts with different structure', () => {
      infoRow.innerHTML = `<td class="${HN_CLASSES.SUBTEXT}"><span class="${HN_CLASSES.AGE}" title="2026-01-11T18:49:32.000000Z">3 hours ago</span></td>`;
      expect(getTime(infoRow)).toBe(1768157372);
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
