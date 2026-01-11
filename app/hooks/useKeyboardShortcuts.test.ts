import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useKeyboardShortcuts } from './useKeyboardShortcuts';

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

  const simulateKeyPressOnElement = (
    element: HTMLElement,
    key: string,
    options: Partial<KeyboardEventInit> = {}
  ) => {
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
  });
});
