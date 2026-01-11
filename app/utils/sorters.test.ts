import { describe, expect, it } from 'vitest';

import type { ParsedRow } from '~app/types';

import { sortRows } from './sorters';

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
});
