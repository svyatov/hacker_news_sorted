import { useCallback, useEffect, useRef } from 'react';

import type { SortVariant } from '~app/types';

type KeyboardShortcutsConfig = {
  onSort: (sortBy: SortVariant) => void;
};

const TARGET_KEYS = ['p', 't', 'c', 'd'] as const;

const KEY_TO_SORT: Record<(typeof TARGET_KEYS)[number], SortVariant> = {
  p: 'points',
  t: 'time',
  c: 'comments',
  d: 'default',
};

const isTypingInInput = (target: EventTarget | null): boolean => {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName;
  if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
    return true;
  }

  // Check both isContentEditable property and contentEditable attribute
  // (for compatibility with JSDOM and other environments)
  return target.isContentEditable || target.contentEditable === 'true';
};

export const useKeyboardShortcuts = ({ onSort }: KeyboardShortcutsConfig): void => {
  const conflictDetected = useRef(false);
  const checkedKeys = useRef(new Set<string>());

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      // Only care about our target keys
      if (!TARGET_KEYS.includes(key as (typeof TARGET_KEYS)[number])) {
        return;
      }

      // Skip if typing in input/textarea
      if (isTypingInInput(event.target)) {
        return;
      }

      // Skip if modifier keys pressed (Ctrl, Alt, Meta)
      if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      // Conflict detection: check each key once
      if (!checkedKeys.current.has(key)) {
        checkedKeys.current.add(key);
        if (event.defaultPrevented) {
          // Another extension handles this key - disable ALL our shortcuts
          conflictDetected.current = true;
        }
      }

      // If conflict detected, don't handle any shortcuts
      if (conflictDetected.current) {
        return;
      }

      // Handle the sort
      event.preventDefault();
      onSort(KEY_TO_SORT[key as (typeof TARGET_KEYS)[number]]);
    },
    [onSort]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
};
