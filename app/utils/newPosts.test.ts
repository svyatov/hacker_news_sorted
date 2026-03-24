import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CSS_CLASSES, HN_SELECTORS } from '~app/constants';

import type { PostTimestamps } from './newPosts';
import {
  clearNewPostMarkers,
  getPostIds,
  isFirstPage,
  markNewPosts,
  migratePostIds,
  updateFadeOpacities,
} from './newPosts';

const COOLDOWN = 600; // 10 minutes (seconds)
const COOLDOWN_MS = COOLDOWN * 1000;

const setupTableBody = (ids: string[]) => {
  const outerTable = document.createElement('table');
  outerTable.id = 'hnmain';

  const bigboxRow = document.createElement('tr');
  bigboxRow.id = 'bigbox';
  const bigboxTd = document.createElement('td');
  const innerTable = document.createElement('table');
  const tbody = document.createElement('tbody');

  for (const id of ids) {
    const tr = document.createElement('tr');
    tr.classList.add('athing');
    tr.id = id;
    tbody.appendChild(tr);

    const infoTr = document.createElement('tr');
    tbody.appendChild(infoTr);

    const spacerTr = document.createElement('tr');
    spacerTr.classList.add('spacer');
    tbody.appendChild(spacerTr);
  }

  innerTable.appendChild(tbody);
  bigboxTd.appendChild(innerTable);
  bigboxRow.appendChild(bigboxTd);
  outerTable.appendChild(bigboxRow);
  document.body.appendChild(outerTable);
};

const clearBody = () => {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
};

const getRowById = (tbody: Element, id: string) => tbody.querySelector(`[id="${id}"]`) as HTMLElement;

describe('newPosts', () => {
  beforeEach(() => {
    clearBody();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000_000_000);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('getPostIds', () => {
    it('should extract IDs from athing rows', () => {
      setupTableBody(['post-1', 'post-2', 'post-3']);
      expect(getPostIds()).toEqual(['post-1', 'post-2', 'post-3']);
    });

    it('should return empty array when no table body exists', () => {
      expect(getPostIds()).toEqual([]);
    });

    it('should return empty array when table body has no athing rows', () => {
      setupTableBody([]);
      expect(getPostIds()).toEqual([]);
    });

    it('should only select tr elements with both .athing class and id attribute', () => {
      setupTableBody(['post-1']);
      const tbody = document.querySelector(HN_SELECTORS.TABLE_BODY)!;

      const noIdRow = document.createElement('tr');
      noIdRow.classList.add('athing');
      tbody.appendChild(noIdRow);

      const noClassRow = document.createElement('tr');
      noClassRow.id = 'post-99';
      tbody.appendChild(noClassRow);

      expect(getPostIds()).toEqual(['post-1']);
    });

    it('should handle duplicate IDs in the DOM', () => {
      setupTableBody(['post-1', 'post-1', 'post-2']);
      expect(getPostIds()).toEqual(['post-1', 'post-1', 'post-2']);
    });
  });

  describe('isFirstPage', () => {
    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    it('should return true for root path without params', () => {
      vi.stubGlobal('location', { pathname: '/', search: '' });
      expect(isFirstPage()).toBe(true);
    });

    it('should return true for /newest without params', () => {
      vi.stubGlobal('location', { pathname: '/newest', search: '' });
      expect(isFirstPage()).toBe(true);
    });

    it('should return false when next param is present', () => {
      vi.stubGlobal('location', { pathname: '/newest', search: '?next=46739210&n=31' });
      expect(isFirstPage()).toBe(false);
    });

    it('should return false when p param is present', () => {
      vi.stubGlobal('location', { pathname: '/news', search: '?p=2' });
      expect(isFirstPage()).toBe(false);
    });

    it('should return true when only n param is present', () => {
      vi.stubGlobal('location', { pathname: '/newest', search: '?n=31' });
      expect(isFirstPage()).toBe(true);
    });
  });

  describe('migratePostIds', () => {
    it('should convert string array to PostTimestamps with Date.now()', () => {
      const result = migratePostIds(['post-1', 'post-2', 'post-3']);
      expect(result).toEqual({
        'post-1': 1_000_000_000_000,
        'post-2': 1_000_000_000_000,
        'post-3': 1_000_000_000_000,
      });
    });

    it('should return empty object for empty array', () => {
      expect(migratePostIds([])).toEqual({});
    });

    it('should pass through PostTimestamps unchanged', () => {
      const timestamps: PostTimestamps = { 'post-1': -1, 'post-2': 999 };
      expect(migratePostIds(timestamps)).toBe(timestamps);
    });
  });

  describe('markNewPosts', () => {
    it('should add NEW_POST class and set --hns-fade to newly discovered posts', () => {
      setupTableBody(['post-1', 'post-2', 'post-3']);
      const previous: PostTimestamps = { 'post-1': -1 };

      const result = markNewPosts(['post-1', 'post-2', 'post-3'], previous, COOLDOWN_MS);

      const tbody = document.querySelector(HN_SELECTORS.TABLE_BODY)!;
      expect(getRowById(tbody, 'post-1').classList.contains(CSS_CLASSES.NEW_POST)).toBe(false);
      expect(getRowById(tbody, 'post-2').classList.contains(CSS_CLASSES.NEW_POST)).toBe(true);
      expect(getRowById(tbody, 'post-3').classList.contains(CSS_CLASSES.NEW_POST)).toBe(true);
      expect(getRowById(tbody, 'post-2').style.getPropertyValue('--hns-fade')).toBe('1');
      expect(getRowById(tbody, 'post-3').style.getPropertyValue('--hns-fade')).toBe('1');
      expect(result['post-1']).toBe(-1);
      expect(result['post-2']).toBe(1_000_000_000_000);
      expect(result['post-3']).toBe(1_000_000_000_000);
    });

    it('should not mark any posts when all are known', () => {
      setupTableBody(['post-1', 'post-2']);
      const previous: PostTimestamps = { 'post-1': -1, 'post-2': -1 };

      const result = markNewPosts(['post-1', 'post-2'], previous, COOLDOWN_MS);

      const tbody = document.querySelector(HN_SELECTORS.TABLE_BODY)!;
      expect(getRowById(tbody, 'post-1').classList.contains(CSS_CLASSES.NEW_POST)).toBe(false);
      expect(getRowById(tbody, 'post-2').classList.contains(CSS_CLASSES.NEW_POST)).toBe(false);
      expect(result['post-1']).toBe(-1);
      expect(result['post-2']).toBe(-1);
    });

    it('should return all IDs as -1 when previousTimestamps is empty (first visit)', () => {
      setupTableBody(['post-1', 'post-2']);

      const result = markNewPosts(['post-1', 'post-2'], {}, COOLDOWN_MS);

      const tbody = document.querySelector(HN_SELECTORS.TABLE_BODY)!;
      expect(getRowById(tbody, 'post-1').classList.contains(CSS_CLASSES.NEW_POST)).toBe(false);
      expect(getRowById(tbody, 'post-2').classList.contains(CSS_CLASSES.NEW_POST)).toBe(false);
      expect(result).toEqual({ 'post-1': -1, 'post-2': -1 });
    });

    it('should handle missing table body gracefully', () => {
      const previous: PostTimestamps = { 'post-1': -1 };
      expect(() => markNewPosts(['post-2'], previous, COOLDOWN_MS)).not.toThrow();
    });

    it('should handle IDs in currentIds that do not exist in DOM', () => {
      setupTableBody(['post-1']);
      const previous: PostTimestamps = { 'post-1': -1 };

      expect(() => markNewPosts(['post-1', 'post-99'], previous, COOLDOWN_MS)).not.toThrow();
    });

    it('should mark all posts as new when none were previously seen', () => {
      setupTableBody(['post-1', 'post-2', 'post-3']);
      const previous: PostTimestamps = { 'old-1': -1, 'old-2': -1 };

      markNewPosts(['post-1', 'post-2', 'post-3'], previous, COOLDOWN_MS);

      const tbody = document.querySelector(HN_SELECTORS.TABLE_BODY)!;
      expect(getRowById(tbody, 'post-1').classList.contains(CSS_CLASSES.NEW_POST)).toBe(true);
      expect(getRowById(tbody, 'post-2').classList.contains(CSS_CLASSES.NEW_POST)).toBe(true);
      expect(getRowById(tbody, 'post-3').classList.contains(CSS_CLASSES.NEW_POST)).toBe(true);
    });

    it('should re-apply fading posts with correct intermediate opacity', () => {
      setupTableBody(['post-1']);
      const halfwayTs = Date.now() - COOLDOWN_MS / 2; // halfway through cooldown
      const previous: PostTimestamps = { 'post-1': halfwayTs };

      const result = markNewPosts(['post-1'], previous, COOLDOWN_MS);

      const tbody = document.querySelector(HN_SELECTORS.TABLE_BODY)!;
      expect(getRowById(tbody, 'post-1').classList.contains(CSS_CLASSES.NEW_POST)).toBe(true);
      expect(Number(getRowById(tbody, 'post-1').style.getPropertyValue('--hns-fade'))).toBeCloseTo(0.5);
      expect(result['post-1']).toBe(halfwayTs);
    });

    it('should keep timestamp but not show indicator for expired posts', () => {
      setupTableBody(['post-1']);
      const expiredTs = Date.now() - COOLDOWN_MS - 1000; // past cooldown
      const previous: PostTimestamps = { 'post-1': expiredTs };

      const result = markNewPosts(['post-1'], previous, COOLDOWN_MS);

      const tbody = document.querySelector(HN_SELECTORS.TABLE_BODY)!;
      expect(getRowById(tbody, 'post-1').classList.contains(CSS_CLASSES.NEW_POST)).toBe(false);
      expect(result['post-1']).toBe(expiredTs); // timestamp preserved, not -1
    });

    it('should revive indicator when cooldown is increased past expiry', () => {
      setupTableBody(['post-1']);
      const ts = Date.now() - 120_000; // 2 minutes ago
      const previous: PostTimestamps = { 'post-1': ts };

      // With 1-minute cooldown: expired
      const result1 = markNewPosts(['post-1'], previous, 60_000);
      const tbody = document.querySelector(HN_SELECTORS.TABLE_BODY)!;
      expect(getRowById(tbody, 'post-1').classList.contains(CSS_CLASSES.NEW_POST)).toBe(false);
      expect(result1['post-1']).toBe(ts);

      // With 5-minute cooldown: alive again
      const result2 = markNewPosts(['post-1'], result1, 300_000);
      expect(getRowById(tbody, 'post-1').classList.contains(CSS_CLASSES.NEW_POST)).toBe(true);
      expect(result2['post-1']).toBe(ts);
    });
  });

  describe('updateFadeOpacities', () => {
    it('should set correct --hns-fade values on DOM elements', () => {
      setupTableBody(['post-1', 'post-2']);
      const tbody = document.querySelector(HN_SELECTORS.TABLE_BODY)!;
      getRowById(tbody, 'post-1').classList.add(CSS_CLASSES.NEW_POST);
      getRowById(tbody, 'post-2').classList.add(CSS_CLASSES.NEW_POST);

      const timestamps: PostTimestamps = {
        'post-1': Date.now() - COOLDOWN_MS / 4, // 75% remaining
        'post-2': Date.now() - COOLDOWN_MS / 2, // 50% remaining
      };

      updateFadeOpacities(timestamps, COOLDOWN_MS);

      expect(Number(getRowById(tbody, 'post-1').style.getPropertyValue('--hns-fade'))).toBeCloseTo(0.75);
      expect(Number(getRowById(tbody, 'post-2').style.getPropertyValue('--hns-fade'))).toBeCloseTo(0.5);
    });

    it('should remove class when opacity reaches 0 but preserve timestamp', () => {
      setupTableBody(['post-1']);
      const tbody = document.querySelector(HN_SELECTORS.TABLE_BODY)!;
      getRowById(tbody, 'post-1').classList.add(CSS_CLASSES.NEW_POST);

      const timestamps: PostTimestamps = {
        'post-1': Date.now() - COOLDOWN_MS - 1000, // past cooldown
      };

      updateFadeOpacities(timestamps, COOLDOWN_MS);

      expect(getRowById(tbody, 'post-1').classList.contains(CSS_CLASSES.NEW_POST)).toBe(false);
      expect(getRowById(tbody, 'post-1').style.getPropertyValue('--hns-fade')).toBe('');
      // Timestamp is NOT modified by updateFadeOpacities
      expect(timestamps['post-1']).toBe(Date.now() - COOLDOWN_MS - 1000);
    });

    it('should skip IDs with timestamp -1', () => {
      setupTableBody(['post-1']);

      const timestamps: PostTimestamps = { 'post-1': -1 };
      updateFadeOpacities(timestamps, COOLDOWN_MS);

      // No class was added/removed, no error thrown
      const tbody = document.querySelector(HN_SELECTORS.TABLE_BODY)!;
      expect(getRowById(tbody, 'post-1').classList.contains(CSS_CLASSES.NEW_POST)).toBe(false);
    });

    it('should handle missing DOM elements gracefully', () => {
      setupTableBody([]);
      const timestamps: PostTimestamps = { 'post-1': Date.now() };

      expect(() => updateFadeOpacities(timestamps, COOLDOWN_MS)).not.toThrow();
    });
  });

  describe('clearNewPostMarkers', () => {
    it('should remove NEW_POST class and --hns-fade from all marked rows', () => {
      setupTableBody(['post-1', 'post-2', 'post-3']);
      const tbody = document.querySelector(HN_SELECTORS.TABLE_BODY)!;
      getRowById(tbody, 'post-1').classList.add(CSS_CLASSES.NEW_POST);
      getRowById(tbody, 'post-1').style.setProperty('--hns-fade', '0.5');
      getRowById(tbody, 'post-3').classList.add(CSS_CLASSES.NEW_POST);
      getRowById(tbody, 'post-3').style.setProperty('--hns-fade', '0.8');

      clearNewPostMarkers();

      expect(getRowById(tbody, 'post-1').classList.contains(CSS_CLASSES.NEW_POST)).toBe(false);
      expect(getRowById(tbody, 'post-1').style.getPropertyValue('--hns-fade')).toBe('');
      expect(getRowById(tbody, 'post-2').classList.contains(CSS_CLASSES.NEW_POST)).toBe(false);
      expect(getRowById(tbody, 'post-3').classList.contains(CSS_CLASSES.NEW_POST)).toBe(false);
      expect(getRowById(tbody, 'post-3').style.getPropertyValue('--hns-fade')).toBe('');
    });

    it('should handle no marked rows gracefully', () => {
      setupTableBody(['post-1', 'post-2']);
      expect(() => clearNewPostMarkers()).not.toThrow();
    });

    it('should handle missing table body gracefully', () => {
      expect(() => clearNewPostMarkers()).not.toThrow();
    });
  });
});
