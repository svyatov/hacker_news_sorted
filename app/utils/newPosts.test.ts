import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CSS_CLASSES, HN_SELECTORS } from '~app/constants';

import { clearNewPostMarkers, getPostIds, getStoredPostIds, markNewPosts, storePostIds } from './newPosts';

const setupTableBody = (ids: string[]) => {
  const center = document.createElement('center');
  const outerTable = document.createElement('table');
  const outerTbody = document.createElement('tbody');
  const row3 = document.createElement('tr');
  const td = document.createElement('td');
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
  td.appendChild(innerTable);
  row3.appendChild(td);

  const row1 = document.createElement('tr');
  const row2 = document.createElement('tr');
  outerTbody.appendChild(row1);
  outerTbody.appendChild(row2);
  outerTbody.appendChild(row3);
  outerTable.appendChild(outerTbody);
  center.appendChild(outerTable);
  document.body.appendChild(center);
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
  });

  afterEach(() => {
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

  describe('getStoredPostIds', () => {
    it('should return stored IDs as a Set', () => {
      vi.spyOn(localStorage, 'getItem').mockReturnValue(JSON.stringify(['post-1', 'post-2', 'post-3']));

      const result = getStoredPostIds();
      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(3);
      expect(result.has('post-1')).toBe(true);
      expect(result.has('post-2')).toBe(true);
      expect(result.has('post-3')).toBe(true);
    });

    it('should return empty Set when nothing stored', () => {
      vi.spyOn(localStorage, 'getItem').mockReturnValue(null);
      expect(getStoredPostIds()).toEqual(new Set());
    });

    it('should key storage by pathname', () => {
      vi.stubGlobal('location', { pathname: '/ask' });
      vi.spyOn(localStorage, 'getItem').mockReturnValue(JSON.stringify(['post-4']));

      const result = getStoredPostIds();
      expect(result.has('post-4')).toBe(true);
      expect(localStorage.getItem).toHaveBeenCalledWith('hns-post-ids:/ask');
    });

    it('should work with /show pathname', () => {
      vi.stubGlobal('location', { pathname: '/show' });
      vi.spyOn(localStorage, 'getItem').mockReturnValue(JSON.stringify(['post-6']));

      expect(getStoredPostIds().has('post-6')).toBe(true);
      expect(localStorage.getItem).toHaveBeenCalledWith('hns-post-ids:/show');
    });

    it('should use / pathname by default', () => {
      vi.spyOn(localStorage, 'getItem').mockReturnValue(JSON.stringify(['post-1']));

      getStoredPostIds();
      expect(localStorage.getItem).toHaveBeenCalledWith('hns-post-ids:/');
    });

    it('should deduplicate stored IDs via Set', () => {
      vi.spyOn(localStorage, 'getItem').mockReturnValue(JSON.stringify(['post-1', 'post-1', 'post-2']));

      const result = getStoredPostIds();
      expect(result.size).toBe(2);
    });

    it('should throw on malformed JSON', () => {
      vi.spyOn(localStorage, 'getItem').mockReturnValue('not-valid-json');

      expect(() => getStoredPostIds()).toThrow();
    });
  });

  describe('storePostIds', () => {
    it('should store IDs as JSON in localStorage', () => {
      storePostIds(['post-1', 'post-2']);

      expect(localStorage.setItem).toHaveBeenCalledWith('hns-post-ids:/', JSON.stringify(['post-1', 'post-2']));
    });

    it('should key storage by pathname', () => {
      vi.stubGlobal('location', { pathname: '/ask' });
      storePostIds(['post-3']);

      expect(localStorage.setItem).toHaveBeenCalledWith('hns-post-ids:/ask', JSON.stringify(['post-3']));
    });

    it('should store with /show pathname', () => {
      vi.stubGlobal('location', { pathname: '/show' });
      storePostIds(['post-4']);

      expect(localStorage.setItem).toHaveBeenCalledWith('hns-post-ids:/show', JSON.stringify(['post-4']));
    });

    it('should handle empty array', () => {
      storePostIds([]);

      expect(localStorage.setItem).toHaveBeenCalledWith('hns-post-ids:/', '[]');
    });
  });

  describe('markNewPosts', () => {
    it('should add NEW_POST class to rows not in previousIds', () => {
      setupTableBody(['post-1', 'post-2', 'post-3']);
      const previousIds = new Set(['post-1']);

      markNewPosts(['post-1', 'post-2', 'post-3'], previousIds);

      const tbody = document.querySelector(HN_SELECTORS.TABLE_BODY)!;
      expect(getRowById(tbody, 'post-1').classList.contains(CSS_CLASSES.NEW_POST)).toBe(false);
      expect(getRowById(tbody, 'post-2').classList.contains(CSS_CLASSES.NEW_POST)).toBe(true);
      expect(getRowById(tbody, 'post-3').classList.contains(CSS_CLASSES.NEW_POST)).toBe(true);
    });

    it('should not mark any posts when all are in previousIds', () => {
      setupTableBody(['post-1', 'post-2']);
      const previousIds = new Set(['post-1', 'post-2']);

      markNewPosts(['post-1', 'post-2'], previousIds);

      const tbody = document.querySelector(HN_SELECTORS.TABLE_BODY)!;
      expect(getRowById(tbody, 'post-1').classList.contains(CSS_CLASSES.NEW_POST)).toBe(false);
      expect(getRowById(tbody, 'post-2').classList.contains(CSS_CLASSES.NEW_POST)).toBe(false);
    });

    it('should skip marking when previousIds is empty', () => {
      setupTableBody(['post-1', 'post-2']);
      const previousIds = new Set<string>();

      markNewPosts(['post-1', 'post-2'], previousIds);

      const tbody = document.querySelector(HN_SELECTORS.TABLE_BODY)!;
      expect(getRowById(tbody, 'post-1').classList.contains(CSS_CLASSES.NEW_POST)).toBe(false);
      expect(getRowById(tbody, 'post-2').classList.contains(CSS_CLASSES.NEW_POST)).toBe(false);
    });

    it('should handle missing table body gracefully', () => {
      const previousIds = new Set(['post-1']);
      expect(() => markNewPosts(['post-2'], previousIds)).not.toThrow();
    });

    it('should handle IDs in currentIds that do not exist in DOM', () => {
      setupTableBody(['post-1']);
      const previousIds = new Set(['post-1']);

      expect(() => markNewPosts(['post-1', 'post-99'], previousIds)).not.toThrow();
    });

    it('should mark all posts as new when none were previously seen', () => {
      setupTableBody(['post-1', 'post-2', 'post-3']);
      const previousIds = new Set(['old-1', 'old-2']);

      markNewPosts(['post-1', 'post-2', 'post-3'], previousIds);

      const tbody = document.querySelector(HN_SELECTORS.TABLE_BODY)!;
      expect(getRowById(tbody, 'post-1').classList.contains(CSS_CLASSES.NEW_POST)).toBe(true);
      expect(getRowById(tbody, 'post-2').classList.contains(CSS_CLASSES.NEW_POST)).toBe(true);
      expect(getRowById(tbody, 'post-3').classList.contains(CSS_CLASSES.NEW_POST)).toBe(true);
    });
  });

  describe('clearNewPostMarkers', () => {
    it('should remove NEW_POST class from all marked rows', () => {
      setupTableBody(['post-1', 'post-2', 'post-3']);
      const tbody = document.querySelector(HN_SELECTORS.TABLE_BODY)!;
      getRowById(tbody, 'post-1').classList.add(CSS_CLASSES.NEW_POST);
      getRowById(tbody, 'post-3').classList.add(CSS_CLASSES.NEW_POST);

      clearNewPostMarkers();

      expect(getRowById(tbody, 'post-1').classList.contains(CSS_CLASSES.NEW_POST)).toBe(false);
      expect(getRowById(tbody, 'post-2').classList.contains(CSS_CLASSES.NEW_POST)).toBe(false);
      expect(getRowById(tbody, 'post-3').classList.contains(CSS_CLASSES.NEW_POST)).toBe(false);
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
