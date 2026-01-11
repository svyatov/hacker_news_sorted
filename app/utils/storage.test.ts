import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LAST_ACTIVE_SORT_KEY } from '~app/constants';

import { getLastActiveSort, setLastActiveSort } from './storage';

describe('storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getLastActiveSort', () => {
    it('should return stored sort variant "points"', () => {
      vi.spyOn(localStorage, 'getItem').mockReturnValue('points');
      expect(getLastActiveSort()).toBe('points');
    });

    it('should return stored sort variant "time"', () => {
      vi.spyOn(localStorage, 'getItem').mockReturnValue('time');
      expect(getLastActiveSort()).toBe('time');
    });

    it('should return stored sort variant "comments"', () => {
      vi.spyOn(localStorage, 'getItem').mockReturnValue('comments');
      expect(getLastActiveSort()).toBe('comments');
    });

    it('should return stored sort variant "default"', () => {
      vi.spyOn(localStorage, 'getItem').mockReturnValue('default');
      expect(getLastActiveSort()).toBe('default');
    });

    it('should return "points" as default when nothing stored', () => {
      vi.spyOn(localStorage, 'getItem').mockReturnValue(null);
      expect(getLastActiveSort()).toBe('points');
    });

    it('should return "points" for invalid stored values', () => {
      vi.spyOn(localStorage, 'getItem').mockReturnValue('invalid');
      expect(getLastActiveSort()).toBe('points');
    });

    it('should return "points" for empty string', () => {
      vi.spyOn(localStorage, 'getItem').mockReturnValue('');
      expect(getLastActiveSort()).toBe('points');
    });

    it('should handle localStorage errors gracefully', () => {
      vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('localStorage disabled');
      });
      expect(getLastActiveSort()).toBe('points');
    });
  });

  describe('setLastActiveSort', () => {
    it('should store the sort variant', () => {
      const setItemSpy = vi.spyOn(localStorage, 'setItem');
      setLastActiveSort('comments');
      expect(setItemSpy).toHaveBeenCalledWith(LAST_ACTIVE_SORT_KEY, 'comments');
    });

    it('should store "points"', () => {
      const setItemSpy = vi.spyOn(localStorage, 'setItem');
      setLastActiveSort('points');
      expect(setItemSpy).toHaveBeenCalledWith(LAST_ACTIVE_SORT_KEY, 'points');
    });

    it('should store "time"', () => {
      const setItemSpy = vi.spyOn(localStorage, 'setItem');
      setLastActiveSort('time');
      expect(setItemSpy).toHaveBeenCalledWith(LAST_ACTIVE_SORT_KEY, 'time');
    });

    it('should store "default"', () => {
      const setItemSpy = vi.spyOn(localStorage, 'setItem');
      setLastActiveSort('default');
      expect(setItemSpy).toHaveBeenCalledWith(LAST_ACTIVE_SORT_KEY, 'default');
    });

    it('should handle localStorage errors gracefully', () => {
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('localStorage disabled');
      });
      expect(() => setLastActiveSort('time')).not.toThrow();
    });
  });
});
