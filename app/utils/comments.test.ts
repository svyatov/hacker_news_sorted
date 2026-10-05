import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

import { clearBody, flush, getRowById, setupCommentThread, store, stored } from '~app/__fixtures__/testHelpers';
import { CSS_CLASSES, MARK_STORAGE_PREFIX, SETTINGS_KEYS } from '~app/constants';
import { settingsStorage } from '~app/utils/settingsStorage';

import { getCommentAuthor, getStoryAuthor, startCommentEnhancements } from './comments';

const OP = 'story_author';
const { OP_HIGHLIGHT, MARK_USER_HIGHLIGHT } = SETTINGS_KEYS;
const badgesIn = (id: string): number => getRowById(id).querySelectorAll(`.${CSS_CLASSES.OP_BADGE}`).length;
const isMarked = (id: string): boolean => getRowById(id).classList.contains(CSS_CLASSES.MARKED_COMMENT);
const isOp = (id: string): boolean => getRowById(id).classList.contains(CSS_CLASSES.OP_COMMENT);
const dotIn = (id: string): HTMLButtonElement => getRowById(id).querySelector(`.${CSS_CLASSES.MARK_DOT}`)!;
const dotPressed = (id: string): boolean => dotIn(id).getAttribute('aria-pressed') === 'true';
const mark = (): string | null => sessionStorage.getItem(`${MARK_STORAGE_PREFIX}1`);
let dispose: () => void;

const start = async (): Promise<void> => {
  dispose = startCommentEnhancements();
  await flush();
};

beforeEach(() => {
  vi.stubGlobal('location', { search: '?id=1' });
  sessionStorage.clear();
  dispose = () => {};
  setupCommentThread({
    storyAuthor: OP,
    comments: [
      { id: 'op1', author: OP },
      { id: 'op2', author: OP, indent: 2, collapsed: true },
      { id: 'a1', author: 'alice' },
      { id: 'a2', author: 'alice', indent: 1 },
      { id: 'b1', author: 'bob' },
      { id: 'case', author: 'Alice' },
      { id: 'deleted', author: '' },
    ],
  });
});

afterEach(() => {
  dispose();
  vi.unstubAllGlobals();
  clearBody();
});

describe('comment enhancement lifecycle', () => {
  it('highlights the exact OP at every depth without changing collapsed rows', async () => {
    await start();
    expect(getStoryAuthor()).toBe(OP);
    expect(getCommentAuthor(getRowById('case'))).toBe('Alice');
    expect(getCommentAuthor(getRowById('deleted'))).toBeNull();
    for (const id of ['op1', 'op2']) {
      expect(isOp(id)).toBe(true);
      expect(badgesIn(id)).toBe(1);
      expect(getRowById(id).querySelector(`.${CSS_CLASSES.MARK_DOT}`)).toBeNull();
    }
    expect(isOp('a1')).toBe(false);
    expect(badgesIn('a1')).toBe(0);
    expect(getRowById('op2')).toHaveClass('coll');
    expect(getRowById('deleted').querySelector(`.${CSS_CLASSES.MARK_DOT}`)).toBeNull();
  });

  it('marks, replaces and clears through labelled native buttons with exact matching', async () => {
    await start();
    expect(dotIn('a1').tagName).toBe('BUTTON');
    expect(dotPressed('a1')).toBe(false);
    expect(dotIn('a1')).toHaveAccessibleName('Highlight comments by alice');
    dotIn('a1').click();
    expect(mark()).toBe('alice');
    expect(isMarked('a1')).toBe(true);
    expect(isMarked('a2')).toBe(true);
    expect(isMarked('case')).toBe(false);
    expect(dotPressed('a2')).toBe(true);
    expect(dotIn('a2')).toHaveAccessibleName('Unhighlight alice');
    dotIn('b1').click();
    expect(mark()).toBe('bob');
    expect(isMarked('a1')).toBe(false);
    expect(isMarked('a2')).toBe(false);
    expect(dotPressed('a1')).toBe(false);
    expect(isMarked('b1')).toBe(true);
    dotIn('b1').click();
    expect(mark()).toBeNull();
    expect(isMarked('b1')).toBe(false);
    expect(dotPressed('b1')).toBe(false);
  });

  it('follows both popup settings live and preserves OP overlap without duplicates', async () => {
    await start();
    await settingsStorage.set(OP_HIGHLIGHT, false);
    await flush();
    expect(isOp('op1')).toBe(false);
    expect(badgesIn('op1')).toBe(0);
    dotIn('op1').click();
    expect(isMarked('op1')).toBe(true);
    await settingsStorage.set(OP_HIGHLIGHT, true);
    await flush();
    expect(isMarked('op1')).toBe(true);
    expect(isOp('op1')).toBe(true);
    expect(getRowById('op1').querySelector(`.${CSS_CLASSES.MARK_DOT}`)).toBeNull();
    await settingsStorage.set(MARK_USER_HIGHLIGHT, false);
    await flush();
    expect(document.querySelectorAll(`.${CSS_CLASSES.MARK_DOT}`)).toHaveLength(0);
    expect(isMarked('op1')).toBe(false);
    expect(mark()).toBe(OP);
    expect(isOp('op1')).toBe(true);
    await settingsStorage.set(MARK_USER_HIGHLIGHT, true);
    await flush();
    expect(isMarked('op1')).toBe(true);
    dotIn('a1').click();
    dotIn('b1').click();
    dotIn('a2').click();
    expect(badgesIn('op1')).toBe(1);
    expect(badgesIn('op2')).toBe(1);
    expect(document.querySelectorAll(`.${CSS_CLASSES.MARK_DOT}`)).toHaveLength(4);
    expect(await stored(OP_HIGHLIGHT)).toBe('true');
    expect(await stored(MARK_USER_HIGHLIGHT)).toBe('true');
  });

  it('loads Plasmo settings and restores per-thread marks after restart', async () => {
    await store(OP_HIGHLIGHT, false);
    await start();
    expect(isOp('op1')).toBe(false);
    dotIn('a1').click();
    dispose();
    await start();
    expect(isMarked('a1')).toBe(true);
    expect(dotPressed('a1')).toBe(true);
    dispose();
    vi.stubGlobal('location', { search: '?id=200' });
    await start();
    expect(isMarked('a1')).toBe(false);
    dotIn('b1').click();
    expect(sessionStorage.getItem(`${MARK_STORAGE_PREFIX}200`)).toBe('bob');
    expect(mark()).toBe('alice');
  });

  it('does not persist a mark without a thread id', async () => {
    vi.stubGlobal('location', { search: '' });
    await start();
    dotIn('a1').click();
    expect(sessionStorage.length).toBe(0);
    expect(isMarked('a1')).toBe(false);
  });

  it('does not guess a missing story author', async () => {
    setupCommentThread({ storyAuthor: null, comments: [{ id: 'a1', author: 'alice' }] });
    await start();
    expect(getStoryAuthor()).toBeNull();
    expect(isOp('a1')).toBe(false);
    dotIn('a1').click();
    expect(isMarked('a1')).toBe(true);
  });

  it('suppresses OP on comment permalinks while keeping working mark controls', async () => {
    setupCommentThread({ isStory: false, storyAuthor: 'alice', comments: [{ id: 'a1', author: 'alice' }] });
    await start();
    expect(isOp('a1')).toBe(false);
    expect(badgesIn('a1')).toBe(0);
    dotIn('a1').click();
    expect(isMarked('a1')).toBe(true);
  });

  it('handles empty and incomplete comment headers', async () => {
    getRowById('deleted').replaceChildren();
    await start();
    expect(getRowById('deleted').querySelector(`.${CSS_CLASSES.MARK_DOT}`)).toBeNull();
    dispose();
    setupCommentThread();
    await start();
    expect(document.querySelectorAll(`.${CSS_CLASSES.MARK_DOT}`)).toHaveLength(0);
  });

  it('disposes twice, stops settings and detached controls, and restarts with one effective action', async () => {
    await start();
    dotIn('a1').click();
    const oldDot = dotIn('b1');
    const oldDispose = dispose;
    dispose();
    dispose();
    expect(document.querySelectorAll(`.${CSS_CLASSES.MARK_DOT}, .${CSS_CLASSES.OP_BADGE}`)).toHaveLength(0);
    expect(document.querySelectorAll(`.${CSS_CLASSES.OP_COMMENT}, .${CSS_CLASSES.MARKED_COMMENT}`)).toHaveLength(0);
    expect(getRowById('op2')).toHaveClass('coll');
    oldDot.click();
    expect(mark()).toBe('alice');
    await settingsStorage.set(OP_HIGHLIGHT, false);
    await flush();
    expect(document.querySelectorAll(`.${CSS_CLASSES.MARK_DOT}`)).toHaveLength(0);
    await start();
    oldDispose();
    expect(isMarked('a1')).toBe(true);
    dotIn('a1').click();
    expect(mark()).toBeNull();
    expect(isMarked('a1')).toBe(false);
    oldDot.click();
    expect(mark()).toBeNull();
    await settingsStorage.set(OP_HIGHLIGHT, true);
    await flush();
    expect(badgesIn('op1')).toBe(1);
    expect(document.querySelectorAll(`.${CSS_CLASSES.MARK_DOT}`)).toHaveLength(4);
  });

  it('ignores delayed initialization after disposal and replacement', async () => {
    const get = (key: string) => fakeBrowser.storage.sync.get(key);
    let release = (): void => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const delayed = vi.spyOn(fakeBrowser.storage.sync, 'get').mockImplementation(async (keys?: unknown) => {
      await pending;
      return get(keys as string);
    });
    dispose = startCommentEnhancements();
    dispose();
    delayed.mockRestore();
    await start();
    dotIn('a1').click();
    release();
    await flush();
    expect(mark()).toBe('alice');
    expect(isMarked('a1')).toBe(true);
    expect(badgesIn('op1')).toBe(1);
    dispose();
    await settingsStorage.set(OP_HIGHLIGHT, false);
    await flush();
    expect(document.querySelectorAll(`.${CSS_CLASSES.MARK_DOT}, .${CSS_CLASSES.OP_BADGE}`)).toHaveLength(0);
  });
});
