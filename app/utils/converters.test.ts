import { describe, expect, it } from 'vitest';

import { stringToNumber } from './converters';

describe('converters', () => {
  describe('stringToNumber', () => {
    it('should parse valid integer strings', () => {
      expect(stringToNumber('42')).toBe(42);
      expect(stringToNumber('0')).toBe(0);
      expect(stringToNumber('999')).toBe(999);
    });

    it('should parse strings with trailing text', () => {
      expect(stringToNumber('150 points')).toBe(150);
      expect(stringToNumber('42 comments')).toBe(42);
    });

    it('should handle whitespace', () => {
      expect(stringToNumber('  42  ')).toBe(42);
      expect(stringToNumber(' 100')).toBe(100);
    });

    it('should return 0 for non-numeric strings', () => {
      expect(stringToNumber('abc')).toBe(0);
      expect(stringToNumber('')).toBe(0);
      expect(stringToNumber('hello world')).toBe(0);
    });

    it('should handle negative numbers', () => {
      expect(stringToNumber('-5')).toBe(-5);
      expect(stringToNumber('-100')).toBe(-100);
    });

    it('should truncate decimal values', () => {
      expect(stringToNumber('3.14')).toBe(3);
      expect(stringToNumber('99.9')).toBe(99);
    });
  });
});
