# Unified Storage Migration

Migrate all localStorage usage to `@plasmohq/storage` (chrome.storage.sync) for cross-device sync and live reactivity.

## Scope

| Data              | Before                        | After                            |
| ----------------- | ----------------------------- | -------------------------------- |
| Sort preference   | localStorage (custom wrapper) | chrome.storage.sync + live watch |
| Post ID snapshots | localStorage (direct)         | chrome.storage.sync + live watch |
| Show-new toggle   | chrome.storage.sync           | No change                        |

## Storage Keys

All defined in `app/utils/settings.ts`:

- `hns-show-new` — boolean (existing)
- `hns-last-active-sort` — SortVariant string (default: `'points'`)
- `hns-post-ids:{pathname}` — JSON array of post ID strings (default: `[]`)

## Reactive Architecture

Storage watchers are the single source of truth. Components subscribe to storage changes rather than managing local React state for synced values.

**Sort preference change (external):**

1. `storage.watch("hns-last-active-sort")` fires
2. Hook updates ControlPanel's active sort state
3. ControlPanel re-sorts rows and updates highlights

**Post IDs change (external):**

1. `storage.watch("hns-post-ids:{pathname}")` fires
2. Hook re-runs `markNewPosts(currentDomIds, newStoredIds)`
3. New-post markers update in place

**Local sort change:**

1. Write new sort value to storage
2. Watcher fires locally — same code path handles re-sort

**Local page load:**

1. Async read of sort preference → apply initial sort
2. Async read of stored post IDs → mark new posts → write current IDs

## First-Page-Only Guard

New-post detection runs only on first pages. If the URL contains pagination query params (`next` and `n`), skip entirely — no read, no write, no highlight. Paginated pages never overwrite the first-page snapshot.

## Empty Snapshot Behavior

If stored post IDs are empty (first visit or post-migration), store current IDs silently. No posts get marked as new.

## File Changes

**Delete:**

- `app/utils/storage.ts` — custom localStorage wrapper
- `app/utils/storage.test.ts` — its tests

**Modify:**

- `app/utils/settings.ts` — add `LAST_ACTIVE_SORT` and `POST_IDS_PREFIX` keys and defaults
- `app/utils/newPosts.ts` — remove `getStoredPostIds()` and `storePostIds()` (keep DOM-only functions: `getPostIds`, `markNewPosts`, `clearNewPostMarkers`)
- `app/hooks/useSettings.ts` — expand to watch sort and post IDs, provide reactive state
- `app/components/ControlPanel.tsx` — use async storage init, subscribe to watcher for sort and post IDs
- `app/components/SortButton.tsx` — write sort via `@plasmohq/storage` instead of `setLastActiveSort()`

**Tests to update:**

- `app/utils/newPosts.test.ts` — remove `getStoredPostIds`/`storePostIds` tests
- `app/hooks/useSettings.test.ts` — cover sort and post ID watching
- `app/components/ControlPanel.test.tsx` — mock `@plasmohq/storage` instead of localStorage
- `app/components/SortButton.test.tsx` — update storage write assertions

## Migration

No migration from localStorage. Acceptable to lose state once. Empty snapshot means no highlights on first load after update.
