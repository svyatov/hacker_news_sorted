import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SORT_OPTIONS } from '~app/constants';

import { useKeyboardShortcuts } from './useKeyboardShortcuts';

const withoutSort = (sortBy: string) => SORT_OPTIONS.filter((o) => o.sortBy !== sortBy);

describe('useKeyboardShortcuts', () => {
  const mockOnSort = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any remaining event listeners
  });

  const simulateKeyPress = (key: string, options: Partial<KeyboardEventInit> = {}) => {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      ...options,
    });
    document.dispatchEvent(event);
    return event;
  };

  const simulateKeyPressOnElement = (element: HTMLElement, key: string, options: Partial<KeyboardEventInit> = {}) => {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      ...options,
    });
    element.dispatchEvent(event);
    return event;
  };

  it('should call onSort with "points" when P is pressed', () => {
    renderHook(() => useKeyboardShortcuts({ onSort: mockOnSort }));

    simulateKeyPress('p');
    expect(mockOnSort).toHaveBeenCalledWith('points');
  });

  it('should call onSort with "time" when T is pressed', () => {
    renderHook(() => useKeyboardShortcuts({ onSort: mockOnSort }));

    simulateKeyPress('t');
    expect(mockOnSort).toHaveBeenCalledWith('time');
  });

  it('should call onSort with "comments" when C is pressed', () => {
    renderHook(() => useKeyboardShortcuts({ onSort: mockOnSort }));

    simulateKeyPress('c');
    expect(mockOnSort).toHaveBeenCalledWith('comments');
  });

  it('should call onSort with "default" when D is pressed', () => {
    renderHook(() => useKeyboardShortcuts({ onSort: mockOnSort }));

    simulateKeyPress('d');
    expect(mockOnSort).toHaveBeenCalledWith('default');
  });

  it('should call onSort with "velocity" when V is pressed', () => {
    renderHook(() => useKeyboardShortcuts({ onSort: mockOnSort }));

    simulateKeyPress('v');
    expect(mockOnSort).toHaveBeenCalledWith('velocity');
  });

  it('should call onSort with "heat" when H is pressed', () => {
    renderHook(() => useKeyboardShortcuts({ onSort: mockOnSort }));

    simulateKeyPress('h');
    expect(mockOnSort).toHaveBeenCalledWith('heat');
  });

  it('should handle uppercase keys', () => {
    renderHook(() => useKeyboardShortcuts({ onSort: mockOnSort }));

    simulateKeyPress('P');
    expect(mockOnSort).toHaveBeenCalledWith('points');
  });

  it('should ignore keys when Ctrl is pressed', () => {
    renderHook(() => useKeyboardShortcuts({ onSort: mockOnSort }));

    simulateKeyPress('p', { ctrlKey: true });
    expect(mockOnSort).not.toHaveBeenCalled();
  });

  it('should ignore keys when Alt is pressed', () => {
    renderHook(() => useKeyboardShortcuts({ onSort: mockOnSort }));

    simulateKeyPress('p', { altKey: true });
    expect(mockOnSort).not.toHaveBeenCalled();
  });

  it('should ignore keys when Meta is pressed', () => {
    renderHook(() => useKeyboardShortcuts({ onSort: mockOnSort }));

    simulateKeyPress('p', { metaKey: true });
    expect(mockOnSort).not.toHaveBeenCalled();
  });

  it('should ignore non-target keys', () => {
    renderHook(() => useKeyboardShortcuts({ onSort: mockOnSort }));

    simulateKeyPress('a');
    simulateKeyPress('x');
    simulateKeyPress('1');
    expect(mockOnSort).not.toHaveBeenCalled();
  });

  it('should ignore keys when focused on input', () => {
    renderHook(() => useKeyboardShortcuts({ onSort: mockOnSort }));

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    simulateKeyPressOnElement(input, 'p');
    expect(mockOnSort).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('should ignore keys when focused on textarea', () => {
    renderHook(() => useKeyboardShortcuts({ onSort: mockOnSort }));

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();

    simulateKeyPressOnElement(textarea, 'p');
    expect(mockOnSort).not.toHaveBeenCalled();

    document.body.removeChild(textarea);
  });

  it('should ignore keys when focused on contentEditable element', () => {
    renderHook(() => useKeyboardShortcuts({ onSort: mockOnSort }));

    const div = document.createElement('div');
    div.contentEditable = 'true';
    document.body.appendChild(div);
    div.focus();

    simulateKeyPressOnElement(div, 'p');
    expect(mockOnSort).not.toHaveBeenCalled();

    document.body.removeChild(div);
  });

  it('should clean up event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = renderHook(() => useKeyboardShortcuts({ onSort: mockOnSort }));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });

  describe('conflict detection', () => {
    it('should disable all shortcuts when one key conflict is detected', () => {
      renderHook(() => useKeyboardShortcuts({ onSort: mockOnSort }));

      // Simulate another extension preventing the 'p' key
      const event = new KeyboardEvent('keydown', { key: 'p', bubbles: true });
      Object.defineProperty(event, 'defaultPrevented', { value: true });
      document.dispatchEvent(event);

      // Now try pressing other keys - they should all be ignored
      simulateKeyPress('t');
      simulateKeyPress('c');
      simulateKeyPress('d');

      expect(mockOnSort).not.toHaveBeenCalled();
    });

    it('should work normally when no conflicts are detected', () => {
      renderHook(() => useKeyboardShortcuts({ onSort: mockOnSort }));

      simulateKeyPress('p');
      simulateKeyPress('t');
      simulateKeyPress('c');
      simulateKeyPress('d');

      expect(mockOnSort).toHaveBeenCalledTimes(4);
      expect(mockOnSort).toHaveBeenCalledWith('points');
      expect(mockOnSort).toHaveBeenCalledWith('time');
      expect(mockOnSort).toHaveBeenCalledWith('comments');
      expect(mockOnSort).toHaveBeenCalledWith('default');
    });

    it('should only check each key once for conflicts', () => {
      renderHook(() => useKeyboardShortcuts({ onSort: mockOnSort }));

      // First press - no conflict
      simulateKeyPress('p');
      expect(mockOnSort).toHaveBeenCalledWith('points');

      mockOnSort.mockClear();

      // Second press of same key - should still work (not re-checking)
      simulateKeyPress('p');
      expect(mockOnSort).toHaveBeenCalledWith('points');
    });

    it('bails on a later intercepted press of an already-checked key without recording a conflict', () => {
      const { result } = renderHook(() => useKeyboardShortcuts({ onSort: mockOnSort }));

      // First press, not intercepted: sorts and records the key as checked (no conflict yet).
      simulateKeyPress('p');
      expect(mockOnSort).toHaveBeenCalledWith('points');
      expect(result.current.size).toBe(0);
      mockOnSort.mockClear();

      // Same key intercepted on a LATER press: the check-once block is skipped, but the
      // defaultPrevented bail still stops the sort — and the key is not added to the conflict set.
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'p', bubbles: true });
        Object.defineProperty(event, 'defaultPrevented', { value: true });
        document.dispatchEvent(event);
      });

      expect(mockOnSort).not.toHaveBeenCalled();
      expect(result.current.size).toBe(0);
    });

    it('lands an intercepted key in the returned conflict set and stops all shortcuts (AE4)', () => {
      const { result } = renderHook(() => useKeyboardShortcuts({ onSort: mockOnSort }));

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 't', bubbles: true });
        Object.defineProperty(event, 'defaultPrevented', { value: true });
        document.dispatchEvent(event);
      });

      expect(result.current.has('t')).toBe(true);

      simulateKeyPress('p');
      simulateKeyPress('c');
      expect(mockOnSort).not.toHaveBeenCalled();
    });

    it('accumulates multiple intercepted keys in the conflict set', () => {
      const { result } = renderHook(() => useKeyboardShortcuts({ onSort: mockOnSort }));

      act(() => {
        const tEvent = new KeyboardEvent('keydown', { key: 't', bubbles: true });
        Object.defineProperty(tEvent, 'defaultPrevented', { value: true });
        document.dispatchEvent(tEvent);
        const cEvent = new KeyboardEvent('keydown', { key: 'c', bubbles: true });
        Object.defineProperty(cEvent, 'defaultPrevented', { value: true });
        document.dispatchEvent(cEvent);
      });

      expect(result.current.has('t')).toBe(true);
      expect(result.current.has('c')).toBe(true);
    });
  });

  describe('enabled gating', () => {
    it('does nothing when a disabled sort key is pressed (AE3 hotkey half)', () => {
      renderHook(() => useKeyboardShortcuts({ onSort: mockOnSort, enabledSortOptions: withoutSort('velocity') }));

      simulateKeyPress('v');
      expect(mockOnSort).not.toHaveBeenCalled();

      // The other derived key still works
      simulateKeyPress('h');
      expect(mockOnSort).toHaveBeenCalledWith('heat');
    });

    it('does not flag a conflict for a disabled key', () => {
      const { result } = renderHook(() =>
        useKeyboardShortcuts({ onSort: mockOnSort, enabledSortOptions: withoutSort('velocity') }),
      );

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'v', bubbles: true });
        Object.defineProperty(event, 'defaultPrevented', { value: true });
        document.dispatchEvent(event);
      });

      expect(result.current.size).toBe(0);
      // Enabled shortcuts keep working
      simulateKeyPress('p');
      expect(mockOnSort).toHaveBeenCalledWith('points');
    });

    it('drops a conflicting key from the note once its sort is disabled, re-enabling the rest (R11)', () => {
      const { result, rerender } = renderHook(
        ({ opts }) => useKeyboardShortcuts({ onSort: mockOnSort, enabledSortOptions: opts }),
        { initialProps: { opts: SORT_OPTIONS } },
      );

      // Another extension intercepts V → recorded, and all-or-nothing disables every shortcut
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'v', bubbles: true });
        Object.defineProperty(event, 'defaultPrevented', { value: true });
        document.dispatchEvent(event);
      });
      expect(result.current.has('v')).toBe(true);
      simulateKeyPress('p');
      expect(mockOnSort).not.toHaveBeenCalled();

      // User disables Velocity: V is no longer our shortcut, so it leaves the conflict set
      // and the remaining hotkeys come back.
      rerender({ opts: withoutSort('velocity') });
      expect(result.current.has('v')).toBe(false);
      simulateKeyPress('p');
      expect(mockOnSort).toHaveBeenCalledWith('points');
    });
  });
});
