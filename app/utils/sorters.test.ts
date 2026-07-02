import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FAKE_NOW } from '~app/__fixtures__/testHelpers';
import { SECONDS_PER_HOUR, SECONDS_PER_MINUTE } from '~app/constants';
import type { ParsedRow } from '~app/types';

import { sortRows } from './sorters';

const NOW_SEC = Math.floor(FAKE_NOW / 1000);

const createMockRow = (overrides: Partial<ParsedRow>): ParsedRow => ({
  originalIndex: 0,
  title: document.createElement('tr'),
  info: document.createElement('tr'),
  spacer: document.createElement('tr'),
  points: 0,
  time: 0,
  comments: 0,
  ...overrides,
});

describe('sorters', () => {
  describe('sortRows', () => {
    const mockRows: ParsedRow[] = [
      createMockRow({ originalIndex: 0, points: 100, time: 1000, comments: 50 }),
      createMockRow({ originalIndex: 1, points: 200, time: 500, comments: 25 }),
      createMockRow({ originalIndex: 2, points: 50, time: 1500, comments: 100 }),
    ];

    it('should sort by points descending', () => {
      const sorted = sortRows(mockRows, 'points');
      expect(sorted.map((r) => r.points)).toEqual([200, 100, 50]);
    });

    it('should sort by time descending (most recent first)', () => {
      const sorted = sortRows(mockRows, 'time');
      expect(sorted.map((r) => r.time)).toEqual([1500, 1000, 500]);
    });

    it('should sort by comments descending', () => {
      const sorted = sortRows(mockRows, 'comments');
      expect(sorted.map((r) => r.comments)).toEqual([100, 50, 25]);
    });

    it('should restore original order for default sort', () => {
      const sorted = sortRows(mockRows, 'default');
      expect(sorted.map((r) => r.originalIndex)).toEqual([0, 1, 2]);
    });

    it('should not mutate the original array', () => {
      const original = [...mockRows];
      sortRows(mockRows, 'points');
      expect(mockRows).toEqual(original);
    });

    it('should handle empty array', () => {
      const sorted = sortRows([], 'points');
      expect(sorted).toEqual([]);
    });

    it('should handle single element array', () => {
      const singleRow = [createMockRow({ originalIndex: 0, points: 100 })];
      const sorted = sortRows(singleRow, 'points');
      expect(sorted).toHaveLength(1);
      expect(sorted[0].points).toBe(100);
    });

    it('should handle equal values', () => {
      const equalRows = [
        createMockRow({ originalIndex: 0, points: 100 }),
        createMockRow({ originalIndex: 1, points: 100 }),
        createMockRow({ originalIndex: 2, points: 100 }),
      ];
      const sorted = sortRows(equalRows, 'points');
      expect(sorted.map((r) => r.points)).toEqual([100, 100, 100]);
    });
  });

  describe('velocity', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(FAKE_NOW);
    });
    afterEach(() => vi.useRealTimers());

    it('ranks an older higher-point post above a fresh low-point one (AE1, damping)', () => {
      const young = createMockRow({ originalIndex: 0, points: 15, time: NOW_SEC - 20 * SECONDS_PER_MINUTE });
      const older = createMockRow({ originalIndex: 1, points: 60, time: NOW_SEC - 3 * SECONDS_PER_HOUR });
      const sorted = sortRows([young, older], 'velocity');
      expect(sorted.map((r) => r.originalIndex)).toEqual([1, 0]);
    });

    it('converges to raw points/hour for old posts', () => {
      // old1 rate ~10/h, old2 rate ~5/h — damping barely shifts multi-day posts
      const old1 = createMockRow({ originalIndex: 0, points: 720, time: NOW_SEC - 72 * SECONDS_PER_HOUR });
      const old2 = createMockRow({ originalIndex: 1, points: 600, time: NOW_SEC - 120 * SECONDS_PER_HOUR });
      const sorted = sortRows([old2, old1], 'velocity');
      expect(sorted.map((r) => r.originalIndex)).toEqual([0, 1]);
    });

    it('gives a finite velocity for a zero/missing time and does not throw', () => {
      const recent = createMockRow({ originalIndex: 0, points: 100, time: NOW_SEC - SECONDS_PER_HOUR });
      const noTime = createMockRow({ originalIndex: 1, points: 100, time: 0 });
      let sorted: ParsedRow[] = [];
      expect(() => (sorted = sortRows([recent, noTime], 'velocity'))).not.toThrow();
      // huge age → tiny finite velocity → ranks last, never NaN/Infinity
      expect(sorted.map((r) => r.originalIndex)).toEqual([0, 1]);
    });

    it('clamps a future-dated post (clock skew) so velocity stays finite and positive', () => {
      // Client clock 5h behind this post's server timestamp → raw age is negative.
      const future = createMockRow({ originalIndex: 0, points: 100, time: NOW_SEC + 5 * SECONDS_PER_HOUR });
      const normal = createMockRow({ originalIndex: 1, points: 100, time: NOW_SEC - SECONDS_PER_HOUR });
      let sorted: ParsedRow[] = [];
      expect(() => (sorted = sortRows([future, normal], 'velocity'))).not.toThrow();
      // age clamps to 0 → 100/2 = 50 (finite, positive), above normal's 100/3 ≈ 33.3;
      // without the clamp the denominator would go negative and wrongly sink it last.
      expect(sorted.map((r) => r.originalIndex)).toEqual([0, 1]);
    });
  });

  describe('heat', () => {
    it('ranks a higher comments/points ratio first', () => {
      const chatty = createMockRow({ originalIndex: 0, points: 50, comments: 100 });
      const quiet = createMockRow({ originalIndex: 1, points: 50, comments: 10 });
      const sorted = sortRows([quiet, chatty], 'heat');
      expect(sorted.map((r) => r.originalIndex)).toEqual([0, 1]);
    });

    it('sorts a 0-point/0-comment job post last with no NaN (AE2)', () => {
      const post = createMockRow({ originalIndex: 0, points: 50, comments: 10 });
      const job = createMockRow({ originalIndex: 1, points: 0, comments: 0 });
      const sorted = sortRows([job, post], 'heat');
      expect(sorted.map((r) => r.originalIndex)).toEqual([0, 1]);
    });

    it('sorts a 0-point post with comments last (the Infinity trap)', () => {
      const post = createMockRow({ originalIndex: 0, points: 50, comments: 10 });
      const job = createMockRow({ originalIndex: 1, points: 0, comments: 100 });
      const sorted = sortRows([job, post], 'heat');
      expect(sorted.map((r) => r.originalIndex)).toEqual([0, 1]);
    });
  });

  describe('immutability of derived sorts', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(FAKE_NOW);
    });
    afterEach(() => vi.useRealTimers());

    it('does not mutate the input array', () => {
      const rows = [
        createMockRow({ originalIndex: 0, points: 60, comments: 100, time: NOW_SEC - SECONDS_PER_HOUR }),
        createMockRow({ originalIndex: 1, points: 0, comments: 0, time: NOW_SEC - 2 * SECONDS_PER_HOUR }),
      ];
      const snapshot = [...rows];
      sortRows(rows, 'velocity');
      sortRows(rows, 'heat');
      expect(rows).toEqual(snapshot);
    });
  });
});
