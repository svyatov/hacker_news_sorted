import { fireEvent, screen } from '@testing-library/dom';
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
let resize: () => void;

const start = async (): Promise<void> => {
  dispose = startCommentEnhancements();
  await flush();
};

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      private readonly targets = new Set<Element>();
      constructor(callback: () => void) {
        resize = () => {
          if (this.targets.size > 0) callback();
        };
      }
      observe(target: Element) {
        this.targets.add(target);
      }
      disconnect() {
        this.targets.clear();
      }
    },
  );
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
  vi.useRealTimers();
  vi.unstubAllGlobals();
  clearBody();
});

describe('comment enhancement lifecycle', () => {
  it('keeps You shortcuts, empty states, unrelated keys and remount disposal consistent', async () => {
    document.body.insertAdjacentHTML(
      'afterbegin',
      '<span class="pagetop"><a id="me" href="user?id=alice">alice</a></span>',
    );
    let scroll = 0;
    vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => scroll);
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(function (this: HTMLElement) {
      return (this.hidden ? [] : [{ height: 20 }]) as unknown as DOMRectList;
    });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return { top: (this.id === 'a1' ? 100 : 500) - scroll, height: 32 } as DOMRect;
    });
    const move = vi.spyOn(window, 'scrollTo').mockImplementation((options) => {
      scroll = (options as ScrollToOptions).top!;
    });
    await start();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'own' } });
    expect(fireEvent.keyDown(document, { key: ']' })).toBe(false);
    expect(scroll).toBe(60);
    expect(screen.getByRole('status')).toHaveTextContent('1 of 2 on page');
    dispose();
    move.mockClear();
    fireEvent.keyDown(document, { key: ']' });
    expect(move).not.toHaveBeenCalled();
    await start();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'own' } });
    fireEvent.keyDown(document, { key: ']' });
    expect(move).toHaveBeenCalledTimes(1);
    expect(scroll).toBe(460);
    move.mockClear();
    expect(fireEvent.keyDown(document.body, { key: 'Tab' })).toBe(true);
    expect(fireEvent.keyDown(document.body, { key: 'p' })).toBe(true);
    expect(move).not.toHaveBeenCalled();
    getRowById('a1').hidden = true;
    getRowById('a2').hidden = true;
    expect(fireEvent.keyDown(document.body, { key: '[' })).toBe(true);
    expect(screen.getByRole('status')).toHaveTextContent('No visible matches');
    expect(move).not.toHaveBeenCalled();
  });

  it('detects a later intercepted press after successful navigation, but ignores interception during typing', async () => {
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{ height: 20 }] as unknown as DOMRectList);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: 100, height: 32 } as DOMRect);
    await start();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const editor = document.createElement('textarea');
    document.body.append(editor);
    const typing = new KeyboardEvent('keydown', { key: ']', bubbles: true, cancelable: true });
    typing.preventDefault();
    editor.dispatchEvent(typing);
    expect(screen.queryByText(/Navigation shortcuts disabled/)).toBeNull();
    expect(fireEvent.keyDown(document.body, { key: ']' })).toBe(false);
    const intercepted = new KeyboardEvent('keydown', { key: ']', bubbles: true, cancelable: true });
    intercepted.preventDefault();
    document.body.dispatchEvent(intercepted);
    document.body.dispatchEvent(intercepted);
    expect(screen.getAllByText(/Navigation shortcuts disabled/)).toHaveLength(1);
    expect(fireEvent.keyDown(document.body, { key: '[' })).toBe(true);
  });

  it('disables both shortcuts on interception while controls and group changes remain usable', async () => {
    let scroll = 0;
    vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => scroll);
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{ height: 20 }] as unknown as DOMRectList);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return { top: (this.id === 'op1' ? 100 : 500) - scroll, height: 32 } as DOMRect;
    });
    vi.spyOn(window, 'scrollTo').mockImplementation((options) => {
      scroll = (options as ScrollToOptions).top!;
    });
    await start();
    const intercepted = new KeyboardEvent('keydown', { key: ']', bubbles: true, cancelable: true });
    intercepted.preventDefault();
    document.body.dispatchEvent(intercepted);
    expect(scroll).toBe(0);
    expect(screen.getByRole('navigation')).toHaveTextContent('Navigation shortcuts disabled');
    expect(screen.getByRole('navigation')).toHaveTextContent(']');
    expect(fireEvent.keyDown(document.body, { key: ']' })).toBe(true);
    screen.getByRole('button', { name: 'Next' }).click();
    expect(scroll).toBe(60);
    dotIn('b1').click();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'marked' } });
    expect(fireEvent.keyDown(document.body, { key: ']' })).toBe(true);
    expect(fireEvent.keyDown(document.body, { key: '[' })).toBe(true);
    expect(scroll).toBe(60);
    screen.getByRole('button', { name: 'Next' }).click();
    expect(scroll).toBe(460);
    dispose();
    expect(screen.queryByText(/Navigation shortcuts disabled/)).toBeNull();
    expect(fireEvent.keyDown(document.body, { key: '[' })).toBe(true);
    await start();
    fireEvent.keyDown(document.body, { key: '[' });
    expect(scroll).toBe(60);
  });

  it.each(['input', 'button', 'summary'])('does not consume bracket interaction with a native %s', async (tag) => {
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{ height: 20 }] as unknown as DOMRectList);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: 100, height: 32 } as DOMRect);
    await start();
    const control = document.createElement(tag);
    document.body.append(control);
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    expect(fireEvent.keyDown(control, { key: ']' })).toBe(true);
    expect(scroll).not.toHaveBeenCalled();
  });

  it.each(['ctrlKey', 'altKey', 'metaKey', 'shiftKey', 'isComposing'])(
    'leaves %s bracket presses untouched',
    async (guard) => {
      vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{ height: 20 }] as unknown as DOMRectList);
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: 100, height: 32 } as DOMRect);
      await start();
      const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
      expect(fireEvent.keyDown(document.body, { key: ']', [guard]: true })).toBe(true);
      expect(scroll).not.toHaveBeenCalled();
    },
  );

  it('leaves nested editable typing untouched', async () => {
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{ height: 20 }] as unknown as DOMRectList);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: 100, height: 32 } as DOMRect);
    await start();
    document.body.insertAdjacentHTML('beforeend', '<div contenteditable=""><span id="typing">reply</span></div>');
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    expect(fireEvent.keyDown(document.getElementById('typing')!, { key: ']' })).toBe(true);
    expect(scroll).not.toHaveBeenCalled();
  });

  it('leaves native group selection untouched', async () => {
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{ height: 20 }] as unknown as DOMRectList);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: 100, height: 32 } as DOMRect);
    await start();
    const group = screen.getByRole('combobox');
    group.focus();
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    expect(fireEvent.keyDown(group, { key: ']' })).toBe(true);
    expect(group).toHaveFocus();
    expect(group).toHaveValue('op');
    expect(scroll).not.toHaveBeenCalled();
  });

  it('leaves reply typing untouched', async () => {
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{ height: 20 }] as unknown as DOMRectList);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: 100, height: 32 } as DOMRect);
    await start();
    const scroll = vi.spyOn(window, 'scrollTo');
    const editor = document.createElement('textarea');
    document.body.append(editor);
    editor.focus();
    expect(fireEvent.keyDown(editor, { key: ']' })).toBe(true);
    expect(editor).toHaveFocus();
    expect(scroll).not.toHaveBeenCalled();
  });

  it('uses bracket keys for the selected group with toolbar boundaries and current reading position', async () => {
    let scroll = 0;
    vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => scroll);
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{ height: 20 }] as unknown as DOMRectList);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return { top: (this.id === 'op1' ? 100 : 500) - scroll, height: 32 } as DOMRect;
    });
    vi.spyOn(window, 'scrollTo').mockImplementation((options) => {
      scroll = (options as ScrollToOptions).top!;
    });
    await start();
    expect(screen.getByRole('button', { name: 'Previous' })).toHaveTextContent('[');
    expect(screen.getByRole('button', { name: 'Next' })).toHaveTextContent(']');
    expect(fireEvent.keyDown(document.body, { key: '[' })).toBe(true);
    expect(scroll).toBe(0);
    expect(fireEvent.keyDown(document.body, { key: ']' })).toBe(false);
    expect(scroll).toBe(60);
    expect(screen.getByRole('status')).toHaveTextContent('1 of 1 on page');
    expect(fireEvent.keyDown(document.body, { key: ']' })).toBe(true);
    expect(scroll).toBe(60);
    dotIn('b1').click();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'marked' } });
    fireEvent.keyDown(document.body, { key: ']' });
    expect(scroll).toBe(460);
    expect(screen.getByRole('status')).toHaveTextContent('1 of 1 on page');
    scroll = 600;
    fireEvent.keyDown(document.body, { key: '[' });
    expect(scroll).toBe(460);
    dotIn('b1').click();
    expect(fireEvent.keyDown(document.body, { key: '[' })).toBe(true);
    expect(scroll).toBe(460);
    expect(screen.getByRole('status')).toHaveTextContent('Marked user unavailable');
  });

  it('keeps an identified You eligible with no visible replies instead of guessing a position', async () => {
    document.body.insertAdjacentHTML(
      'afterbegin',
      '<span class="pagetop"><a id="me" href="user?id=alice">alice</a></span>',
    );
    await start();
    const group = screen.getByRole('combobox');
    expect(group).toHaveValue('');
    expect(screen.getByRole('option', { name: 'You' })).toBeEnabled();
    fireEvent.change(group, { target: { value: 'own' } });
    expect(screen.getByRole('status')).toHaveTextContent('No visible matches on page');
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    await settingsStorage.set(OP_HIGHLIGHT, false);
    await flush();
    expect(group).toHaveValue('own');
    dispose();
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(document.querySelectorAll(`.${CSS_CLASSES.OWN_BADGE}`)).toHaveLength(0);
  });

  it('falls back to You after OP and Marked user, keeping You selected through other marks and switches', async () => {
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{ height: 20 }] as unknown as DOMRectList);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: 100, height: 32 } as DOMRect);
    document.body.insertAdjacentHTML(
      'afterbegin',
      '<span class="pagetop"><a id="me" href="user?id=alice">alice</a></span>',
    );
    await store(OP_HIGHLIGHT, false);
    sessionStorage.setItem(`${MARK_STORAGE_PREFIX}1`, 'bob');
    await start();
    expect(screen.getByRole('combobox')).toHaveValue('marked');
    dispose();
    sessionStorage.setItem(`${MARK_STORAGE_PREFIX}1`, 'alice');
    await start();
    const group = screen.getByRole('combobox');
    expect(group).toHaveValue('own');
    expect(screen.getByRole('option', { name: 'Marked user' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Before 1 of 2 on page');
    dotIn('b1').click();
    expect(group).toHaveValue('own');
    expect(mark()).toBe('bob');
    await settingsStorage.set(MARK_USER_HIGHLIGHT, false);
    await flush();
    expect(group).toHaveValue('own');
    expect(screen.getByRole('option', { name: 'You' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
    expect(getRowById('a1')).toHaveTextContent('You');
  });

  it('leaves pages without a comment surface alone', async () => {
    document.querySelector('table.comment-tree')!.remove();
    await start();
    await settingsStorage.set(OP_HIGHLIGHT, false);
    await flush();
    expect(screen.queryByRole('navigation')).toBeNull();
    dispose();
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('starts one OP navigator inside the comment surface, excluding collapsed matches', async () => {
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{ height: 20 }] as unknown as DOMRectList);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: 40, height: 32 } as DOMRect);
    await start();
    const toolbar = screen.getByRole('navigation', { name: 'Comment navigation' });
    expect(toolbar.parentElement).toBe(document.querySelector('table.comment-tree')!.parentElement);
    expect(screen.getByRole('combobox', { name: 'Comment group' })).toHaveValue('op');
    expect(toolbar).toHaveTextContent('1 of 1 on page');
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    dotIn('a1').click();
    expect(screen.getAllByRole('navigation')).toHaveLength(1);
    expect(screen.getByRole('combobox')).toHaveValue('op');
    dispose();
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it.each(['op', 'own'])(
    'navigates %s from the reading position without wrapping, including clamped bottom jumps',
    async (role) => {
      document.body.insertAdjacentHTML(
        'afterbegin',
        `<span class="pagetop"><a id="me" href="user?id=${OP}">${OP}</a></span>`,
      );
      getRowById('op2').classList.remove('coll');
      let scroll = 0;
      let firstTop = 100;
      let toolbarHeight = 32;
      vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => scroll);
      vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{ height: 20 }] as unknown as DOMRectList);
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
        return { top: (this.id === 'op1' ? firstTop : 500) - scroll, height: toolbarHeight } as DOMRect;
      });
      vi.spyOn(window, 'scrollTo').mockImplementation((options) => {
        scroll = Math.min((options as ScrollToOptions).top!, 300);
        window.dispatchEvent(new Event('scroll'));
      });
      await start();
      fireEvent.change(screen.getByRole('combobox'), { target: { value: role } });
      const next = screen.getByRole('button', { name: 'Next' });
      const previous = screen.getByRole('button', { name: 'Previous' });
      expect(screen.getByRole('status')).toHaveTextContent('Before 1 of 2 on page');
      next.click();
      expect(scroll).toBe(60);
      expect(screen.getByRole('status')).toHaveTextContent('1 of 2 on page');
      next.click();
      expect(scroll).toBe(300);
      expect(screen.getByRole('status')).toHaveTextContent('2 of 2 on page');
      expect(next).toBeDisabled();
      previous.click();
      expect(scroll).toBe(60);
      expect(previous).toBeDisabled();
      scroll = 200;
      fireEvent.scroll(window);
      await new Promise((resolve) => requestAnimationFrame(resolve));
      expect(screen.getByRole('status')).toHaveTextContent('Between 1 and 2 of 2 on page');
      expect(previous).toBeEnabled();
      expect(next).toBeEnabled();
      previous.click();
      expect(scroll).toBe(60);
      firstTop = 200;
      resize();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      expect(screen.getByRole('status')).toHaveTextContent('Before 1 of 2 on page');
      next.click();
      toolbarHeight = 64;
      resize();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      expect(screen.getByRole('status')).toHaveTextContent('Between 1 and 2 of 2 on page');
      next.click();
      getRowById('op2').classList.add('coll');
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(screen.getByRole('status')).toHaveTextContent('After 1 of 1 on page');
    },
  );

  it('keeps reader intent through mark replacement, clearing, and both live switches', async () => {
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{ height: 20 }] as unknown as DOMRectList);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: 100, height: 32 } as DOMRect);
    await start();
    const group = screen.getByRole('combobox');
    dotIn('a1').click();
    expect(group).toHaveValue('op');
    fireEvent.change(group, { target: { value: 'marked' } });
    group.focus();
    expect(screen.getByRole('status')).toHaveTextContent('Before 1 of 2 on page');
    dotIn('b1').click();
    expect(group).toHaveValue('marked');
    expect(group).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent('Before 1 of 1 on page');
    dotIn('b1').click();
    expect(group).toHaveValue('marked');
    expect(screen.getByRole('status')).toHaveTextContent('Marked user unavailable');
    expect(screen.getByRole('option', { name: 'Marked user' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    dotIn('a1').click();
    await settingsStorage.set(MARK_USER_HIGHLIGHT, false);
    await flush();
    expect(group).toHaveValue('marked');
    expect(screen.getByRole('status')).toHaveTextContent('Marked user unavailable');
    await settingsStorage.set(MARK_USER_HIGHLIGHT, true);
    await flush();
    expect(screen.getByRole('status')).toHaveTextContent('Before 1 of 2 on page');
    fireEvent.change(group, { target: { value: 'op' } });
    await settingsStorage.set(OP_HIGHLIGHT, false);
    await flush();
    expect(group).toHaveValue('op');
    expect(screen.getByRole('status')).toHaveTextContent('OP unavailable');
    expect(screen.getByRole('option', { name: 'OP' })).toBeDisabled();
  });

  it.each(['op', 'own'])(
    'tracks %s native collapse transitions and hidden descendants without retargeting',
    async (role) => {
      document.body.insertAdjacentHTML(
        'afterbegin',
        `<span class="pagetop"><a id="me" href="user?id=${OP}">${OP}</a></span>`,
      );
      getRowById('op2').classList.remove('coll');
      vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(function (this: HTMLElement) {
        return (this.closest('[hidden], [style="display: none;"]') ? [] : [{ height: 20 }]) as unknown as DOMRectList;
      });
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: 100, height: 32 } as DOMRect);
      await start();
      const group = screen.getByRole('combobox');
      fireEvent.change(group, { target: { value: role } });
      expect(screen.getByRole('status')).toHaveTextContent('Before 1 of 2 on page');
      getRowById('op1').classList.add('coll');
      getRowById('op2').style.display = 'none';
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(group).toHaveValue(role);
      expect(screen.getByRole('status')).toHaveTextContent('No visible matches');
      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
      getRowById('op1').classList.remove('coll');
      getRowById('op2').style.display = '';
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(screen.getByRole('status')).toHaveTextContent('Before 1 of 2 on page');
      document.querySelector('table.comment-tree')!.setAttribute('hidden', '');
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(screen.getByRole('status')).toHaveTextContent('No visible matches');
    },
  );

  it('initializes to Marked user when OP has no visible matches and never chooses an empty role', async () => {
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{ height: 20 }] as unknown as DOMRectList);
    setupCommentThread({ comments: [{ id: 'a1', author: 'alice' }] });
    sessionStorage.setItem(`${MARK_STORAGE_PREFIX}1`, 'alice');
    await start();
    expect(screen.getByRole('combobox')).toHaveValue('marked');
    dispose();
    sessionStorage.clear();
    await start();
    expect(screen.getByRole('combobox')).toHaveValue('');
    expect(screen.getByRole('status')).toHaveTextContent('No visible matches');
    expect(screen.getByRole('option', { name: 'OP' })).toBeEnabled();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'op' } });
    dotIn('a1').click();
    expect(screen.getByRole('combobox')).toHaveValue('op');
    expect(screen.getByRole('status')).toHaveTextContent('No visible matches');
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('recomputes geometry, validates stale destinations, and stops scheduled work on disposal', async () => {
    let top = 100;
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{ height: 20 }] as unknown as DOMRectList);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ top, height: 32 }) as DOMRect);
    await start();
    const next = screen.getByRole('button', { name: 'Next' });
    expect(next).toBeEnabled();
    top = -100;
    resize();
    fireEvent.resize(window);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(screen.getByRole('status')).toHaveTextContent('After 1 of 1 on page');
    top = 100;
    fireEvent.scroll(window);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    getRowById('op1').classList.add('coll');
    const scroll = vi.spyOn(window, 'scrollTo');
    next.click();
    expect(scroll).not.toHaveBeenCalled();
    expect(next).toBeDisabled();
    resize();
    dispose();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(screen.queryByRole('navigation')).toBeNull();
    next.click();
    expect(scroll).not.toHaveBeenCalled();
  });

  it('cancels pending navigator work on disposal', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] });
    await start();
    vi.advanceTimersToNextFrame();
    const measure = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect');
    resize();
    vi.advanceTimersToNextFrame();
    expect(measure).toHaveBeenCalled();
    measure.mockClear();

    resize();
    dispose();
    await Promise.resolve();
    vi.advanceTimersToNextFrame();
    expect(measure).not.toHaveBeenCalled();
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it.each([
    ['collapse', () => getRowById('op1').classList.toggle('coll')],
    ['resize', () => resize()],
  ] as const)('stops navigator work from later %s events after disposal', async (_event, trigger) => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] });
    await start();
    vi.advanceTimersToNextFrame();
    const measure = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect');
    trigger();
    await Promise.resolve();
    vi.advanceTimersToNextFrame();
    expect(measure).toHaveBeenCalled();

    dispose();
    await Promise.resolve();
    vi.advanceTimersToNextFrame();
    measure.mockClear();
    trigger();
    await Promise.resolve();
    vi.advanceTimersToNextFrame();
    expect(measure).not.toHaveBeenCalled();
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('uses only the account on each page load, preserving old self-marks without applying them', async () => {
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{ height: 20 }] as unknown as DOMRectList);
    await store(OP_HIGHLIGHT, false);
    document.body.insertAdjacentHTML(
      'afterbegin',
      '<span class="pagetop"><a id="me" href="user?id=alice">alice</a></span>',
    );
    sessionStorage.setItem(`${MARK_STORAGE_PREFIX}1`, 'alice');
    await start();
    expect(getRowById('a1')).toHaveTextContent('You');
    expect(getRowById('a1').querySelector(`.${CSS_CLASSES.MARK_DOT}`)).toBeNull();
    expect(mark()).toBe('alice');
    expect(screen.getByRole('combobox')).toHaveValue('own');
    expect(screen.getByRole('option', { name: 'Marked user' })).toBeDisabled();
    dispose();
    const account = document.querySelector<HTMLAnchorElement>('#me')!;
    account.textContent = 'bob';
    account.href = 'user?id=bob';
    await start();
    expect(getRowById('a1')).not.toHaveTextContent('You');
    expect(isMarked('a1')).toBe(true);
    expect(dotPressed('a1')).toBe(true);
    expect(getRowById('b1')).toHaveTextContent('You');
    expect(screen.getByRole('combobox')).toHaveValue('marked');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'own' } });
    expect(screen.getByRole('status')).toHaveTextContent('1 on page');
    dispose();
    account.remove();
    await start();
    expect(document.querySelectorAll(`.${CSS_CLASSES.OWN_BADGE}`)).toHaveLength(0);
    expect(dotIn('b1')).toHaveAccessibleName('Highlight comments by bob');
    expect(screen.getByRole('option', { name: 'You' })).toBeDisabled();
  });

  it('keeps own highlighting on permalink replies without enhancing the top item', async () => {
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{ height: 20 }] as unknown as DOMRectList);
    setupCommentThread({ isStory: false, storyAuthor: 'alice', comments: [{ id: 'a1', author: 'alice' }] });
    document.body.insertAdjacentHTML(
      'afterbegin',
      '<span class="pagetop"><a id="me" href="user?id=alice">alice</a></span>',
    );
    await start();
    expect(isOp('a1')).toBe(false);
    expect(getRowById('a1')).toHaveTextContent('You');
    expect(document.querySelectorAll(`.${CSS_CLASSES.OWN_BADGE}`)).toHaveLength(1);
    expect(screen.getByRole('combobox')).toHaveValue('own');
    expect(screen.getByRole('option', { name: 'OP' })).toBeDisabled();
  });

  it.each([
    '<a id="me" href="user?id=alice">alice</a>',
    '<span class="pagetop"><a href="user?id=alice">alice</a></span>',
    '<span class="pagetop"><a id="me" href="user?id="> </a></span>',
    '<span class="pagetop"><a id="me" href="user?id=Alice">alice</a></span>',
  ])('does not guess identity from incomplete or misplaced markup: %s', async (markup) => {
    document.body.insertAdjacentHTML('afterbegin', markup);
    await start();
    expect(document.querySelectorAll(`.${CSS_CLASSES.OWN_BADGE}`)).toHaveLength(0);
    expect(dotIn('a1')).toHaveAccessibleName('Highlight comments by alice');
    expect(screen.getByRole('option', { name: 'You' })).toBeDisabled();
  });

  it('does not identify an account from an unrecognized profile link', async () => {
    document.body.insertAdjacentHTML(
      'afterbegin',
      '<span class="pagetop"><a id="me" href="user?id=bob">alice</a></span>',
    );
    await start();
    expect(getRowById('a1')).not.toHaveTextContent('You');
    expect(getRowById('b1')).not.toHaveTextContent('You');
    expect(dotIn('a1')).toHaveAccessibleName('Highlight comments by alice');
  });

  it('gives OP appearance precedence over own appearance and an old self-mark', async () => {
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{ height: 20 }] as unknown as DOMRectList);
    document.body.insertAdjacentHTML(
      'afterbegin',
      `<span class="pagetop"><a id="me" href="user?id=${OP}">${OP}</a></span>`,
    );
    sessionStorage.setItem(`${MARK_STORAGE_PREFIX}1`, OP);
    await start();
    expect(isOp('op1')).toBe(true);
    expect(isMarked('op1')).toBe(false);
    expect(getRowById('op1')).not.toHaveTextContent('You');
    expect(badgesIn('op1')).toBe(1);
    expect(screen.getByRole('combobox')).toHaveValue('op');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'own' } });
    expect(screen.getByRole('status')).toHaveTextContent('1 on page');
    await settingsStorage.set(OP_HIGHLIGHT, false);
    await flush();
    expect(isOp('op1')).toBe(false);
    expect(isMarked('op1')).toBe(true);
    expect(getRowById('op1')).toHaveTextContent('You');
    expect(getRowById('op2')).toHaveClass('coll');
    expect(getRowById('op1').querySelector(`.${CSS_CLASSES.MARK_DOT}`)).toBeNull();
    expect(screen.getByRole('combobox')).toHaveValue('own');
    expect(screen.getByRole('option', { name: 'OP' })).toBeDisabled();
    expect(screen.getByRole('option', { name: 'You' })).toBeEnabled();
    await settingsStorage.set(OP_HIGHLIGHT, true);
    await flush();
    expect(getRowById('op1')).not.toHaveTextContent('You');
    expect(isMarked('op1')).toBe(false);
    expect(mark()).toBe(OP);
  });

  it('keeps own comments unmarkable and preserves another author through live settings', async () => {
    document.body.insertAdjacentHTML(
      'afterbegin',
      '<span class="pagetop"><a id="me" href="user?id=alice">alice</a></span>',
    );
    sessionStorage.setItem(`${MARK_STORAGE_PREFIX}1`, 'bob');
    await start();
    expect(getRowById('a1').querySelector(`.${CSS_CLASSES.MARK_DOT}`)).toBeNull();
    expect(isMarked('b1')).toBe(true);
    dotIn('case').click();
    expect(mark()).toBe('Alice');
    expect(isMarked('a1')).toBe(true);
    expect(isMarked('case')).toBe(true);
    await settingsStorage.set(MARK_USER_HIGHLIGHT, false);
    await flush();
    expect(getRowById('a1')).toHaveTextContent('You');
    expect(isMarked('a1')).toBe(true);
    expect(isMarked('case')).toBe(false);
    await settingsStorage.set(MARK_USER_HIGHLIGHT, true);
    await flush();
    expect(getRowById('a1').querySelectorAll(`.${CSS_CLASSES.OWN_BADGE}`)).toHaveLength(1);
    expect(getRowById('a1').querySelector(`.${CSS_CLASSES.MARK_DOT}`)).toBeNull();
    expect(mark()).toBe('Alice');
  });

  it('automatically identifies exact own comments without either enhancement switch', async () => {
    document.body.insertAdjacentHTML(
      'afterbegin',
      '<span class="pagetop"><a id="me" href="user?id=alice">alice</a></span>',
    );
    await store(OP_HIGHLIGHT, false);
    await store(MARK_USER_HIGHLIGHT, false);
    await start();
    for (const id of ['a1', 'a2']) {
      expect(getRowById(id)).toHaveTextContent('You');
      expect(isMarked(id)).toBe(true);
      expect(getRowById(id).querySelector(`.${CSS_CLASSES.MARK_DOT}`)).toBeNull();
    }
    expect(getRowById('case')).not.toHaveTextContent('You');
    expect(isMarked('case')).toBe(false);
    dispose();
    expect(getRowById('a1')).not.toHaveTextContent('You');
    expect(isMarked('a1')).toBe(false);
  });

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
    document.body.insertAdjacentHTML(
      'afterbegin',
      '<span class="pagetop"><a id="me" href="user?id=Alice">Alice</a></span>',
    );
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
    expect(getRowById('case').querySelectorAll(`.${CSS_CLASSES.OWN_BADGE}`)).toHaveLength(1);
    dispose();
    await settingsStorage.set(OP_HIGHLIGHT, false);
    await flush();
    expect(document.querySelectorAll(`.${CSS_CLASSES.MARK_DOT}, .${CSS_CLASSES.OP_BADGE}`)).toHaveLength(0);
    expect(document.querySelectorAll(`.${CSS_CLASSES.OWN_BADGE}`)).toHaveLength(0);
  });
});
