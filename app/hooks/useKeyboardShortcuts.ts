import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SORT_OPTIONS } from '~app/constants';
import type { SortOption, SortVariant } from '~app/types';

type KeyboardShortcutsConfig = {
  onSort: (sortBy: SortVariant) => void;
  enabledSortOptions?: SortOption[];
};

const TARGET_KEYS = ['p', 't', 'c', 'v', 'h', 'd'] as const;
type TargetKey = (typeof TARGET_KEYS)[number];

const KEY_TO_SORT: Record<TargetKey, SortVariant> = {
  p: 'points',
  t: 'time',
  c: 'comments',
  v: 'velocity',
  h: 'heat',
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

export const useKeyboardShortcuts = ({
  onSort,
  enabledSortOptions = SORT_OPTIONS,
}: KeyboardShortcutsConfig): Set<string> => {
  const [conflictKeys, setConflictKeys] = useState<Set<string>>(new Set());
  const conflictKeysRef = useRef<Set<string>>(new Set());
  const checkedKeys = useRef(new Set<string>());

  // Only keys whose sort is currently enabled are live; a disabled sort's key is inert
  // (skipped before conflict detection, so pressing it neither sorts nor flags a conflict).
  const activeKeys = useMemo(() => {
    const enabled = new Set(enabledSortOptions.map((option) => option.sortBy));
    return new Set<string>(TARGET_KEYS.filter((key) => enabled.has(KEY_TO_SORT[key])));
  }, [enabledSortOptions]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      // Only care about our target keys, and only while their sort is enabled
      if (!activeKeys.has(key)) {
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

      // Conflict detection: check each key once, accumulating the keys another
      // extension has claimed. Any conflict disables ALL our shortcuts (unchanged).
      if (!checkedKeys.current.has(key)) {
        checkedKeys.current.add(key);
        if (event.defaultPrevented) {
          conflictKeysRef.current = new Set(conflictKeysRef.current).add(key);
          setConflictKeys(conflictKeysRef.current);
        }
      }

      if (conflictKeysRef.current.size > 0 || event.defaultPrevented) {
        return;
      }

      // Handle the sort
      event.preventDefault();
      onSort(KEY_TO_SORT[key as TargetKey]);
    },
    [onSort, activeKeys],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return conflictKeys;
};
