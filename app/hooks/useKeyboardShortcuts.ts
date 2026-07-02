import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SORT_OPTIONS } from '~app/constants';
import type { SortOption, SortVariant } from '~app/types';

type KeyboardShortcutsConfig = {
  onSort: (sortBy: SortVariant) => void;
  enabledSortOptions?: SortOption[];
};

// Hotkeys derive from SORT_OPTIONS so a shortcut change there can't silently diverge from the
// handler (single source of truth). Letters are lower-cased for case-insensitive matching.
const KEY_TO_SORT: Record<string, SortVariant> = Object.fromEntries(
  SORT_OPTIONS.map((option) => [option.shortcut.toLowerCase(), option.sortBy]),
);
const TARGET_KEYS = Object.keys(KEY_TO_SORT);

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

  // Reconcile recorded conflicts with the live key set: when a sort is disabled its key is no
  // longer our shortcut, so drop it from the note (R11) and stop it gating the rest; prune
  // checkedKeys too so a key that is later re-enabled gets conflict-checked afresh.
  useEffect(() => {
    const keep = (set: Set<string>) => new Set([...set].filter((key) => activeKeys.has(key)));
    checkedKeys.current = keep(checkedKeys.current);
    const prunedConflicts = keep(conflictKeysRef.current);
    if (prunedConflicts.size !== conflictKeysRef.current.size) {
      conflictKeysRef.current = prunedConflicts;
      setConflictKeys(prunedConflicts);
    }
  }, [activeKeys]);

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

      // Bail if any prior conflict was recorded (all-or-nothing), or if THIS press is being
      // prevented by another extension — the latter also covers a key intercepted only on a
      // later press, which the check-once block above skips.
      if (conflictKeysRef.current.size > 0 || event.defaultPrevented) {
        return;
      }

      // Handle the sort
      event.preventDefault();
      onSort(KEY_TO_SORT[key]);
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
