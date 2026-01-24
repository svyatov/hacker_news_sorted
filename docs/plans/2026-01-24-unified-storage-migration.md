# Unified Storage Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all localStorage usage with `@plasmohq/storage` (chrome.storage.sync) for cross-device sync and live reactivity.

**Architecture:** Storage watchers are the single source of truth. `useSettings` hook manages all synced state (sort preference, post IDs, show-new toggle) and exposes reactive values to components. Components write to storage; watchers handle the re-render.

**Tech Stack:** `@plasmohq/storage` (already installed), React hooks, Vitest

---

### Task 1: Expand Settings Keys and Defaults

**Files:**

- Modify: `app/utils/settings.ts`
- Modify: `app/types.ts`
- Modify: `app/constants.ts`

**Step 1: Update `app/utils/settings.ts`**

Replace entire file with:

```ts
export const SETTINGS_KEYS = {
  SHOW_NEW: 'hns-show-new',
  LAST_ACTIVE_SORT: 'hns-last-active-sort',
  POST_IDS_PREFIX: 'hns-post-ids:',
} as const;

export const SETTINGS_DEFAULTS = {
  [SETTINGS_KEYS.SHOW_NEW]: true,
  [SETTINGS_KEYS.LAST_ACTIVE_SORT]: 'points' as const,
} as const;
```

**Step 2: Update `app/types.ts`**

Add `'hns-last-active-sort'` to the `Settings` type:

```ts
export type Settings = {
  'hns-show-new': boolean;
  'hns-last-active-sort': SortVariant;
};
```

**Step 3: Remove `LAST_ACTIVE_SORT_KEY` from `app/constants.ts`**

Delete line 5: `export const LAST_ACTIVE_SORT_KEY = 'hns-last-active-sort';`

**Step 4: Run tests**

Run: `bun run test`
Expected: `app/utils/storage.test.ts` fails (uses removed constant). All other tests pass.

**Step 5: Commit**

```bash
git add app/utils/settings.ts app/types.ts app/constants.ts
git commit -m "refactor: move storage keys to settings.ts"
```

---

### Task 2: Add First-Page Guard and Remove localStorage from newPosts

**Files:**

- Modify: `app/utils/newPosts.ts`
- Modify: `app/utils/newPosts.test.ts`

**Step 1: Write failing tests for `isFirstPage`**

Add to `app/utils/newPosts.test.ts`:

```ts
describe('isFirstPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('should return true for root path without params', () => {
    vi.stubGlobal('location', { pathname: '/', search: '' });
    expect(isFirstPage()).toBe(true);
  });

  it('should return true for /newest without params', () => {
    vi.stubGlobal('location', { pathname: '/newest', search: '' });
    expect(isFirstPage()).toBe(true);
  });

  it('should return false when both next and n params are present', () => {
    vi.stubGlobal('location', { pathname: '/newest', search: '?next=46739210&n=31' });
    expect(isFirstPage()).toBe(false);
  });

  it('should return true when only next param is present', () => {
    vi.stubGlobal('location', { pathname: '/newest', search: '?next=46739210' });
    expect(isFirstPage()).toBe(true);
  });

  it('should return true when only n param is present', () => {
    vi.stubGlobal('location', { pathname: '/newest', search: '?n=31' });
    expect(isFirstPage()).toBe(true);
  });
});
```

Update the import at the top of the test file:

```ts
import { clearNewPostMarkers, getPostIds, isFirstPage, markNewPosts } from './newPosts';
```

**Step 2: Run tests to verify they fail**

Run: `bun run test app/utils/newPosts.test.ts`
Expected: FAIL — `isFirstPage` is not exported

**Step 3: Implement `isFirstPage` and remove localStorage functions**

Replace `app/utils/newPosts.ts` with:

```ts
import { CSS_CLASSES, HN_SELECTORS } from '~app/constants';

export const isFirstPage = (): boolean => {
  const params = new URLSearchParams(window.location.search);
  return !(params.has('next') && params.has('n'));
};

export const getPostIds = (): string[] => {
  const tableBody = document.querySelector(HN_SELECTORS.TABLE_BODY);
  if (!tableBody) return [];

  const rows = tableBody.querySelectorAll<HTMLElement>('tr.athing[id]');
  return Array.from(rows, (row) => row.id);
};

export const markNewPosts = (currentIds: string[], previousIds: Set<string>): void => {
  if (previousIds.size === 0) return;

  const tableBody = document.querySelector(HN_SELECTORS.TABLE_BODY);
  if (!tableBody) return;

  for (const id of currentIds) {
    if (!previousIds.has(id)) {
      const row = tableBody.querySelector<HTMLElement>(`tr.athing[id="${id}"]`);
      if (row) row.classList.add(CSS_CLASSES.NEW_POST);
    }
  }
};

export const clearNewPostMarkers = (): void => {
  const tableBody = document.querySelector(HN_SELECTORS.TABLE_BODY);
  if (!tableBody) return;

  const rows = tableBody.querySelectorAll(`.${CSS_CLASSES.NEW_POST}`);
  for (const row of rows) {
    row.classList.remove(CSS_CLASSES.NEW_POST);
  }
};
```

**Step 4: Remove `getStoredPostIds` and `storePostIds` tests**

Remove the `describe('getStoredPostIds', ...)` block (lines 99-151) and `describe('storePostIds', ...)` block (lines 154-180) from the test file. Also remove `getStoredPostIds` and `storePostIds` from the import.

**Step 5: Run tests**

Run: `bun run test app/utils/newPosts.test.ts`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add app/utils/newPosts.ts app/utils/newPosts.test.ts
git commit -m "refactor: remove localStorage from newPosts, add isFirstPage guard"
```

---

### Task 3: Rewrite useSettings Hook

**Files:**

- Modify: `app/hooks/useSettings.ts`

**Step 1: Rewrite the hook**

Replace `app/hooks/useSettings.ts` with:

```ts
import { useCallback, useEffect, useRef, useState } from 'react';

import { Storage } from '@plasmohq/storage';

import { CSS_CLASSES, HN_SELECTORS } from '~app/constants';
import type { SortVariant } from '~app/types';
import { clearNewPostMarkers, getPostIds, isFirstPage, markNewPosts } from '~app/utils/newPosts';
import { SETTINGS_DEFAULTS, SETTINGS_KEYS } from '~app/utils/settings';

const storage = new Storage();

const getPostIdsKey = (): string => `${SETTINGS_KEYS.POST_IDS_PREFIX}${window.location.pathname}`;

type UseSettingsReturn = {
  activeSort: SortVariant;
  setActiveSort: (sort: SortVariant) => void;
};

export const useSettings = (): UseSettingsReturn => {
  const [activeSort, setActiveSortState] = useState<SortVariant>(SETTINGS_DEFAULTS[SETTINGS_KEYS.LAST_ACTIVE_SORT]);
  const initializedRef = useRef(false);

  const setActiveSort = useCallback((sort: SortVariant) => {
    storage.set(SETTINGS_KEYS.LAST_ACTIVE_SORT, sort);
  }, []);

  useEffect(() => {
    const tableBody = document.querySelector(HN_SELECTORS.TABLE_BODY);

    // --- Show New ---
    const applyShowNew = (enabled: boolean) => {
      if (!tableBody) return;
      if (enabled) {
        tableBody.classList.add(CSS_CLASSES.SHOW_NEW);
      } else {
        tableBody.classList.remove(CSS_CLASSES.SHOW_NEW);
      }
    };

    // --- Post IDs ---
    const applyPostIds = (storedIds: string[]) => {
      if (!tableBody || !isFirstPage()) return;
      clearNewPostMarkers();
      const currentIds = getPostIds();
      const previousIds = new Set(storedIds);
      markNewPosts(currentIds, previousIds);
    };

    // --- Init ---
    const init = async () => {
      const showNew = await storage.get<boolean>(SETTINGS_KEYS.SHOW_NEW);
      applyShowNew(showNew ?? SETTINGS_DEFAULTS[SETTINGS_KEYS.SHOW_NEW]);

      const sort = await storage.get<SortVariant>(SETTINGS_KEYS.LAST_ACTIVE_SORT);
      setActiveSortState(sort ?? SETTINGS_DEFAULTS[SETTINGS_KEYS.LAST_ACTIVE_SORT]);

      if (isFirstPage()) {
        const postIdsKey = getPostIdsKey();
        const storedIds = await storage.get<string[]>(postIdsKey);
        const currentIds = getPostIds();

        if (currentIds.length > 0) {
          const previousIds = new Set(storedIds ?? []);
          markNewPosts(currentIds, previousIds);
          await storage.set(postIdsKey, currentIds);
        }
      }

      initializedRef.current = true;
    };

    init();

    // --- Watchers ---
    storage.watch({
      [SETTINGS_KEYS.SHOW_NEW]: (change) => {
        applyShowNew(change.newValue ?? SETTINGS_DEFAULTS[SETTINGS_KEYS.SHOW_NEW]);
      },
      [SETTINGS_KEYS.LAST_ACTIVE_SORT]: (change) => {
        if (!initializedRef.current) return;
        setActiveSortState(change.newValue ?? SETTINGS_DEFAULTS[SETTINGS_KEYS.LAST_ACTIVE_SORT]);
      },
      [getPostIdsKey()]: (change) => {
        if (!initializedRef.current) return;
        applyPostIds(change.newValue ?? []);
      },
    });
  }, []);

  return { activeSort, setActiveSort };
};
```

**Step 2: Run lint**

Run: `bun run lint`
Expected: PASS

**Step 3: Commit**

```bash
git add app/hooks/useSettings.ts
git commit -m "feat: expand useSettings to manage sort and post IDs via sync storage"
```

---

### Task 4: Update ControlPanel

**Files:**

- Modify: `app/components/ControlPanel.tsx`

**Step 1: Rewrite ControlPanel to use the hook**

Replace `app/components/ControlPanel.tsx` with:

```tsx
import { Fragment, useCallback, useEffect, useMemo, type ReactElement } from 'react';

import SortButton from '~app/components/SortButton';
import { CSS_CLASSES, SORT_OPTIONS } from '~app/constants';
import { useKeyboardShortcuts } from '~app/hooks/useKeyboardShortcuts';
import { useParsedRows } from '~app/hooks/useParsedRows';
import { useSettings } from '~app/hooks/useSettings';
import { updateTable } from '~app/utils/presenters';
import { sortRows } from '~app/utils/sorters';

const sortOptionsCount = SORT_OPTIONS.length - 1;

const ControlPanel = (): ReactElement => {
  const { activeSort, setActiveSort } = useSettings();
  const { parsedRows, footerRows } = useParsedRows();

  const sortedRows = useMemo(() => sortRows(parsedRows, activeSort), [parsedRows, activeSort]);

  useEffect(() => {
    updateTable(sortedRows, footerRows, activeSort);
  }, [sortedRows, footerRows, activeSort]);

  const handleSort = useCallback(
    (sortBy: SortVariant) => {
      if (sortBy === activeSort) return;
      setActiveSort(sortBy);
    },
    [activeSort, setActiveSort],
  );

  useKeyboardShortcuts({ onSort: handleSort });

  return (
    <>
      <span className={CSS_CLASSES.SORT_BY_LABEL}>sort by:</span>

      {SORT_OPTIONS.map((option, index) => (
        <Fragment key={option.sortBy}>
          <SortButton sortOption={option} activeSort={activeSort} setActiveSort={setActiveSort} />
          {index < sortOptionsCount && ' · '}
        </Fragment>
      ))}

      <span className={CSS_CLASSES.DIVIDER}>|</span>
    </>
  );
};

export default ControlPanel;
```

Note: Add `SortVariant` import — `import type { SortVariant } from '~app/types';`

**Step 2: Commit**

```bash
git add app/components/ControlPanel.tsx
git commit -m "refactor: ControlPanel uses useSettings for sort state"
```

---

### Task 5: Update SortButton

**Files:**

- Modify: `app/components/SortButton.tsx`

**Step 1: Remove storage import and direct write**

Replace `app/components/SortButton.tsx` with:

```tsx
import { useCallback, type ReactElement } from 'react';

import { CSS_CLASSES } from '~app/constants';
import type { SortOption, SortVariant } from '~app/types';

type ControlPanelButtonProps = {
  sortOption: SortOption;
  activeSort: SortVariant;
  setActiveSort: (sortBy: SortVariant) => void;
};

const SortButton = ({ sortOption, activeSort, setActiveSort }: ControlPanelButtonProps): ReactElement => {
  const { sortBy, text, shortcut } = sortOption;
  const isActive = activeSort === sortBy;
  const cssClasses = `${CSS_CLASSES.BTN}${isActive ? ` ${CSS_CLASSES.ACTIVE}` : ''}`;

  const updateActiveSort = useCallback(() => {
    if (isActive) return;
    setActiveSort(sortBy);
  }, [sortBy, isActive, setActiveSort]);

  return (
    <button
      type="button"
      onClick={updateActiveSort}
      className={cssClasses}
      data-sort={sortBy}
      aria-pressed={isActive}
      title={sortBy === 'default' ? 'Original sort order' : `Sort by ${sortBy}`}>
      <span className={CSS_CLASSES.BTN_TEXT}>{text}</span>
      <span className={CSS_CLASSES.BTN_SHORTCUT}>{shortcut}</span>
    </button>
  );
};

export default SortButton;
```

**Step 2: Commit**

```bash
git add app/components/SortButton.tsx
git commit -m "refactor: SortButton delegates storage write to parent"
```

---

### Task 6: Update Tests

**Files:**

- Modify: `app/components/ControlPanel.test.tsx`
- Modify: `app/components/SortButton.test.tsx`
- Delete: `app/utils/storage.ts`
- Delete: `app/utils/storage.test.ts`

**Step 1: Update ControlPanel test mocks**

In `app/components/ControlPanel.test.tsx`, replace the `vi.mock('~app/utils/storage', ...)` block with a mock for `useSettings`:

```ts
vi.mock('~app/hooks/useSettings', () => ({
  useSettings: () => ({
    activeSort: 'points',
    setActiveSort: vi.fn(),
  }),
}));
```

Remove the `vi.mock('~app/utils/storage', ...)` block entirely.

**Step 2: Update SortButton test**

In `app/components/SortButton.test.tsx`, remove the `vi.mock('~app/utils/storage', ...)` block entirely (lines 10-12). The component no longer imports storage.

**Step 3: Delete old storage files**

```bash
rm app/utils/storage.ts app/utils/storage.test.ts
```

**Step 4: Run all tests**

Run: `bun run test`
Expected: All tests PASS

**Step 5: Run lint**

Run: `bun run lint`
Expected: PASS

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor: remove localStorage storage module, update test mocks"
```

---

### Task 7: Final Verification

**Step 1: Run full test suite**

Run: `bun run test`
Expected: All tests PASS

**Step 2: Run lint**

Run: `bun run lint`
Expected: PASS

**Step 3: Run build**

Run: `bun run build`
Expected: Build succeeds with no errors

**Step 4: Update CLAUDE.md and CHANGELOG.md**

In `CLAUDE.md`:

- Remove mention of `app/utils/storage.ts` from Architecture section
- Update `useSettings` description to mention sort and post IDs
- Update Data Flow section

In `CHANGELOG.md` under `## [Unreleased]`:

- Add under "Changed": "Sort preference and new-post detection now sync across devices via chrome.storage.sync"
- Add under "Changed": "New-post indicators only appear on first pages (not paginated pages)"

**Step 5: Commit**

```bash
git add CLAUDE.md CHANGELOG.md
git commit -m "docs: update docs for unified storage migration"
```
