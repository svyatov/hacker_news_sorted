# Keep Plasmo's JSON-string encoding on WXT storage

`@plasmohq/storage` saved every setting in `chrome.storage.sync` as a JSON string (`true` as `"true"`, `points` as `"\"points\""`), and WXT storage saves raw values. When we moved to WXT storage, we kept the stored bytes unchanged: a thin wrapper calls `JSON.stringify` on write and `JSON.parse` on read. Existing users then need no migration, and old and new versions can share synced settings during a rollout or after a rollback. If a reader takes these values raw, a stored `"false"` is a truthy string, and every disabled toggle comes back on. `hns-layout-ok` was always a raw boolean, written by the sort content script and compared with `=== false` by the badge, so its writer bypasses the wrapper and it stays raw on disk. A reader can still go through the wrapper, because `JSON.parse(false)` returns `false`.

## Considered Options

- **Raw values, one-time migration, tolerant reader.** Rejected. A synced device that still runs the old version writes JSON strings again, so the tolerant reader could never be removed. A rollback to the old version reads a raw sort name as undefined and loses new-post history.
- **WXT versioned items (`defineItem` + migrations).** Rejected. It adds a `key$` meta item to sync storage for each key, it does not fit the per-page post-ids keys, and it has the same cross-device problem.
