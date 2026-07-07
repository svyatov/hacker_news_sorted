import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearBody, getRowById, setupCommentThread } from '~app/__fixtures__/testHelpers';
import { CSS_CLASSES } from '~app/constants';

import {
  applyCommentEnhancements,
  clearHighlights,
  getCommentAuthor,
  getMarkedUser,
  getStoryAuthor,
  injectMarkDots,
  nextMark,
  setMarkedUser,
} from './comments';

const OP = 'story_author';

const badgesIn = (id: string): number => getRowById(id).querySelectorAll(`.${CSS_CLASSES.OP_BADGE}`).length;
const isMarked = (id: string): boolean => getRowById(id).classList.contains(CSS_CLASSES.MARKED_COMMENT);
const isOp = (id: string): boolean => getRowById(id).classList.contains(CSS_CLASSES.OP_COMMENT);
const dotIn = (id: string): HTMLButtonElement => getRowById(id).querySelector(`.${CSS_CLASSES.MARK_DOT}`)!;
const dotPressed = (id: string): boolean => dotIn(id).getAttribute('aria-pressed') === 'true';

beforeEach(() => {
  vi.stubGlobal('location', { search: '?id=1' });
  sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearBody();
});

describe('getStoryAuthor', () => {
  it('returns the submitter', () => {
    setupCommentThread({ storyAuthor: 'jdoe' });
    expect(getStoryAuthor()).toBe('jdoe');
  });

  it('returns null when no author node exists in .fatitem', () => {
    setupCommentThread({ storyAuthor: null });
    expect(getStoryAuthor()).toBeNull();
  });
});

describe('getCommentAuthor', () => {
  it('matches exactly and case-sensitively', () => {
    setupCommentThread({ comments: [{ id: '1', author: 'Simon' }] });
    expect(getCommentAuthor(getRowById('1'))).toBe('Simon');
    expect(getCommentAuthor(getRowById('1'))).not.toBe('simon');
  });
});

describe('OP highlighting (AE4)', () => {
  beforeEach(() => {
    setupCommentThread({
      storyAuthor: OP,
      comments: [
        { id: '1', author: OP, indent: 0 },
        { id: '2', author: 'reader', indent: 1 },
        { id: '3', author: OP, indent: 2, collapsed: true },
        { id: '4', author: OP, indent: 1 },
      ],
    });
  });

  it('tints and badges every submitter comment at any depth, incl. collapsed', () => {
    applyCommentEnhancements({ opEnabled: true, markEnabled: false });

    for (const id of ['1', '3', '4']) {
      expect(isOp(id), `#${id} should be OP-tinted`).toBe(true);
      expect(badgesIn(id), `#${id} should have exactly one badge`).toBe(1);
    }
    expect(isOp('2')).toBe(false);
    expect(badgesIn('2')).toBe(0);
    // Collapsed row keeps its badge on the still-visible header line.
    expect(getRowById('3').classList.contains('coll')).toBe(true);
  });

  it('does not duplicate the badge when the orchestrator re-runs (idempotent)', () => {
    applyCommentEnhancements({ opEnabled: true, markEnabled: false });
    applyCommentEnhancements({ opEnabled: true, markEnabled: false });
    expect(badgesIn('1')).toBe(1);
    expect(badgesIn('4')).toBe(1);
  });
});

describe('marked-user highlighting', () => {
  beforeEach(() => {
    setupCommentThread({
      storyAuthor: OP,
      comments: [
        { id: 'a1', author: 'alice' },
        { id: 'a2', author: 'alice' },
        { id: 'b1', author: 'bob' },
      ],
    });
  });

  it('injects an off, labelled button dot on every comment header', () => {
    injectMarkDots(() => {});
    for (const id of ['a1', 'a2', 'b1']) {
      const dot = dotIn(id);
      expect(dot.tagName).toBe('BUTTON');
      expect(dot.getAttribute('aria-pressed')).toBe('false');
      expect(dot.getAttribute('aria-label')).toBeTruthy();
    }
  });

  it('clicking a dot invokes onActivate with that row author', () => {
    const onActivate = vi.fn();
    injectMarkDots(onActivate);
    dotIn('b1').click();
    expect(onActivate).toHaveBeenCalledExactlyOnceWith('bob');
  });

  it('stars the OP only when OP highlighting is off (a badged author is not markable)', () => {
    setupCommentThread({
      storyAuthor: OP,
      comments: [
        { id: 'op1', author: OP },
        { id: 'r1', author: 'reader' },
      ],
    });
    // OP highlighting on → author is badged, so no star.
    applyCommentEnhancements({ opEnabled: true, markEnabled: true });
    expect(getRowById('op1').querySelector(`.${CSS_CLASSES.MARK_DOT}`)).toBeNull();
    expect(getRowById('r1').querySelector(`.${CSS_CLASSES.MARK_DOT}`)).not.toBeNull();

    // OP highlighting off → author is a regular user and gets a star.
    applyCommentEnhancements({ opEnabled: false, markEnabled: true });
    expect(getRowById('op1').querySelector(`.${CSS_CLASSES.MARK_DOT}`)).not.toBeNull();
  });

  it('moves the single mark from A to B (AE1)', () => {
    setMarkedUser('alice');
    applyCommentEnhancements({ opEnabled: false, markEnabled: true });
    expect(isMarked('a1')).toBe(true);
    expect(dotPressed('a1')).toBe(true);

    setMarkedUser('bob');
    applyCommentEnhancements({ opEnabled: false, markEnabled: true });
    expect(getMarkedUser()).toBe('bob');
    expect(isMarked('a1')).toBe(false);
    expect(isMarked('a2')).toBe(false);
    expect(dotPressed('a1')).toBe(false);
    expect(isMarked('b1')).toBe(true);
    expect(dotPressed('b1')).toBe(true);
  });

  it('clears the mark when the active user is unmarked (AE2)', () => {
    setMarkedUser('bob');
    applyCommentEnhancements({ opEnabled: false, markEnabled: true });

    setMarkedUser(null);
    applyCommentEnhancements({ opEnabled: false, markEnabled: true });
    expect(getMarkedUser()).toBeNull();
    for (const id of ['a1', 'a2', 'b1']) {
      expect(isMarked(id)).toBe(false);
      expect(dotPressed(id)).toBe(false);
    }
  });

  it('removes dots and the visual mark but keeps OP when marked-user highlighting is off (AE5)', () => {
    setupCommentThread({
      storyAuthor: OP,
      comments: [
        { id: 'op1', author: OP },
        { id: 'r1', author: 'reader' },
      ],
    });
    setMarkedUser('reader');
    applyCommentEnhancements({ opEnabled: true, markEnabled: true });
    // Only the reader gets a dot — the OP comment is badged, not dotted.
    expect(document.querySelectorAll(`.${CSS_CLASSES.MARK_DOT}`).length).toBe(1);
    expect(isMarked('r1')).toBe(true);

    applyCommentEnhancements({ opEnabled: true, markEnabled: false });
    expect(document.querySelectorAll(`.${CSS_CLASSES.MARK_DOT}`).length).toBe(0);
    expect(document.querySelectorAll(`.${CSS_CLASSES.MARKED_COMMENT}`).length).toBe(0);
    // OP highlighting is unaffected.
    expect(isOp('op1')).toBe(true);
    expect(badgesIn('op1')).toBe(1);
  });
});

describe('mark persistence (AE3)', () => {
  it('persists per thread id in sessionStorage', () => {
    vi.stubGlobal('location', { search: '?id=100' });
    setMarkedUser('alice');
    expect(getMarkedUser()).toBe('alice');

    vi.stubGlobal('location', { search: '?id=200' });
    expect(getMarkedUser()).toBeNull();
  });
});

describe('nextMark (single-mark toggle: AE1 replace, AE2 clear)', () => {
  it('clears when the marked user is clicked again', () => {
    expect(nextMark('alice', 'alice')).toBeNull();
  });

  it('replaces the mark when a different user is clicked', () => {
    expect(nextMark('alice', 'bob')).toBe('bob');
  });

  it('sets the first mark from empty', () => {
    expect(nextMark(null, 'alice')).toBe('alice');
  });
});

describe('comment-permalink page (AE6, KTD-8)', () => {
  it('skips OP highlighting but still injects working dots', () => {
    setupCommentThread({
      isStory: false,
      storyAuthor: 'permalinked_author',
      comments: [
        { id: '1', author: 'permalinked_author' },
        { id: '2', author: 'reader' },
      ],
    });

    applyCommentEnhancements({ opEnabled: true, markEnabled: true });
    expect(document.querySelectorAll(`.${CSS_CLASSES.OP_COMMENT}`).length).toBe(0);
    expect(document.querySelectorAll(`.${CSS_CLASSES.OP_BADGE}`).length).toBe(0);
    expect(document.querySelectorAll(`.${CSS_CLASSES.MARK_DOT}`).length).toBe(2);
  });
});

describe('clearHighlights', () => {
  it('removes classes, badges, and resets dot state', () => {
    setupCommentThread({
      storyAuthor: OP,
      comments: [
        { id: '1', author: OP },
        { id: '2', author: 'reader' },
      ],
    });
    setMarkedUser('reader');
    applyCommentEnhancements({ opEnabled: true, markEnabled: true });
    expect(isOp('1')).toBe(true);
    expect(dotPressed('2')).toBe(true);

    clearHighlights();
    expect(isOp('1')).toBe(false);
    expect(badgesIn('1')).toBe(0);
    expect(dotPressed('2')).toBe(false);
  });
});
