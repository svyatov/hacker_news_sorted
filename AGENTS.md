# AGENTS.md

## Project Overview

Hacker News Sorted is a Chrome extension that adds sorting capabilities to Hacker News (news.ycombinator.com). Users can sort posts by points, time, comments, velocity, heat, or restore the default order. Built with the WXT framework and React.

## Commands

```bash
bun dev            # Start WXT dev server (dev build at build/chrome-mv3-dev; load it as an unpacked extension manually, WXT 0.21 only auto-opens a browser if web-ext is installed)
bun run build      # Production build (wxt build → build/chrome-mv3; `outDir` in wxt.config.ts)
bun run package    # Package extension for distribution (wxt zip)
bun run release    # Build and package
bun run test       # Run tests (uses Vitest); pass a path to run one file: bun run test app/popup.test.tsx
bun run test:integration # Run list-page and comment-page selector integration tests against the two HN fixtures
bun run test:watch # Run tests in watch mode
bun run test:coverage # Run tests with coverage report
bun run lint       # Run Biome, Prettier, and TypeScript checks
bun run fixture:update # Fetch fresh HN HTML for test fixtures
bun run screenshots    # Generate Chrome Web Store screenshots (requires `bun run build` first)
bun run demo           # Generate demo video (.mp4) and GIF (requires `bun run build` first)
```

## Architecture

### Content Script Entry Point

- `entrypoints/hn-sort.content/index.tsx` - Main entry point, injects the ControlPanel into HN's header via WXT's `createIntegratedUi` — a light-DOM `<span id="hns-control-panel">` mount (`tag: 'span'`, `append: 'first'`) plus page-global `cssInjectionMode: 'manifest'`, not a shadow root, so `content.css` styles both the panel and HN's own list rows exactly as before. Its `excludeMatches` is `SORT_PANEL_EXCLUDE_MATCHES` from `app/constants.ts` (unit-tested in `app/constants.test.ts`), covering every listless HN page: comment/thread views (`item*`, also handled by comments.content, plus `threads*`, `newcomments*`, `context*`, `bestcomments*`, `noobcomments*`, `highlights*`), form/profile pages (`submit`, `reply*`, `login*`, `forgot*`, `changepw*`, `newpoll*`, `user*`, `x*`), list indexes (`lists*`, `leaders*`), and static help pages (`*.html`, `formatdoc*`), so the sort panel never loads where there is no list table to sort and would otherwise falsely flag a broken layout (KTD-5). `submit` has no trailing `*` so it cannot match the `submitted` story list; story-list routes are intentionally not excluded. Both content scripts set `noScriptStartedPostMessage` so WXT does not post a startup message into the page (Plasmo never did). `waitForPanelParent` (the header-cell MutationObserver wait) lives in `app/utils/layout.ts` so its observer-vs-timeout race is unit-testable
- `entrypoints/hn-sort.content/content.css` - Styles for the control panel, sort highlighting, and new-post indicators. Three-tier responsive menu: full names on wide screens, single-letter labels on medium, and a native `<select>` dropdown tier on narrow screens. **Both** tier switches are count-aware — one `@media` block per enabled-option count (4/5/6) keyed on the `#hns-control-panel[data-sort-count='N']` attribute — because each tier's width, and thus the point at which it would push HN's own header nav onto a second line, grows with the option count. Word↔letter (`min-width` 1280/1360/1440px); letter↔dropdown (`max-width` 1080/1120/1160px) hides `.hns-buttons-tier` and shows `.hns-dropdown-tier`. All breakpoints are calibrated against HN's header so the menu always collapses to a more compact tier _before_ it would wrap HN's nav (measured letter-row wrap floors ~1044/1084/1124px; the dropdown has no visible label so it stays as narrow as HN's own ~750px nav-wrap floor)
- Detects layout breakage: `setLayoutStatus` (`app/utils/layout.ts`) writes `hns-layout-ok` to `sync:` WXT storage as a raw boolean (not through `settingsStorage`, so an old version's `=== false` check keeps working), `false` if HN's header cell does not appear within `LAYOUT_TIMEOUT_MS` (3000 ms) or the list table body (`getTableBody()`) is missing, else `true`
- Once the layout check passes, starts new-post tracking with `ctx.onInvalidated(trackNewPosts())`. New-post tracking is independent of React and the panel
- **Dev gotcha**: WXT's dev server hot-reloads most edits, but content-script CSS or entrypoint-config changes may still need a page reload (or an extension reload) to appear

### Comment-Page Content Script

- `entrypoints/comments.content/index.ts` - Separate WXT content script (`defineContentScript`) matching `*://news.ycombinator.com/item*` (comment/thread pages), independent of the sort panel. A thin shell whose `main()` passes the two toggle keys to `watchSettings`, which calls `applyCommentEnhancements` once both load and again on every popup change without reload, and wires a dot-activate callback (routes the click through `nextMark`: same user clears, else replaces)
- `entrypoints/comments.content/comments.css` - Palette-consistent styles (injected page-wide via `import './comments.css'` + `cssInjectionMode: 'manifest'`): OP tint (`#ff6600` at ~7% over `#f6f6ef`) + filled-orange "OP" badge; lighter marked-user tint; the mark control is a native `<button>` (Enter/Space activate for free) kept inline (padding gives the hit area without inflating the header line), an outline diamond (`◇`) that becomes a filled orange diamond (`◆`) under `.hns-mark-dot-on`, and a `:focus-visible` ring
- All logic is in `app/utils/comments.ts` (pure DOM, unit-tested in JSDOM, KTD-2). Exports: `getStoryAuthor`, `getCommentRows`, `getCommentAuthor` (exact, case-sensitive matching, KTD-4), `clearHighlights`, `injectMarkDots(onActivate, skipUser)` (skips `skipUser`'s comments, idempotent per comhead), `getMarkedUser`/`setMarkedUser`/`nextMark` (single mark in `sessionStorage` keyed by thread id, KTD-6), and the idempotent `applyCommentEnhancements({ opEnabled, markEnabled, onMark })` orchestrator. The orchestrator clears, then re-applies from settings + stored mark: it computes the OP once via `isStoryPage()`/`getStoryAuthor()`, gates OP highlighting on it, and passes it to `injectMarkDots` as the skip user only while OP highlighting is on (with it off, the story author is markable like anyone else). The private helpers `applyUserHighlight` and `removeMarkDots` are used only by the orchestrator
- `app/utils/pages.ts` - `getItemId()` (reads `?id=` from the query string) and `isStoryPage()` (true when `.fatitem` carries a `.titleline`). `item?id=` also serves comment-permalink pages where the `.fatitem` is a linked comment, not the story; `isStoryPage()` gates OP highlighting off there so it never badges the wrong author, while marker dots keep working (KTD-8, AE6)

### Background Service Worker

- `entrypoints/background.ts` - Thin `defineBackground` shell that calls `initBadge()` from `app/utils/badge.ts` (badge logic lives in `app/` so it stays unit-testable, mirroring the comment script's app/utils + entrypoint split)
- `app/utils/badge.ts` - Manages the extension badge based on layout health status: shows a red `:(` badge when the raw `hns-layout-ok` boolean is `false` in `sync:` WXT storage (read and watched with `storage` directly), and restores badge state on service worker restart
- Dev icon: a `build:publicAssets` hook in `wxt.config.ts` swaps `public/icon/*.png` for the color-swapped `public-dev/icon/*.png` (white background, orange mark) in development mode, so a `bun dev` build is easy to tell from the store version

### Popup Entry Point

- `entrypoints/popup/` - WXT HTML entrypoint: `index.html` (mounts `#app`) + `main.tsx` (`createRoot(...).render(<App/>)`) + `App.tsx` (the popup component) + co-located `popup.css`
- `entrypoints/popup/App.tsx` - Settings popup UI in four `fieldset.hns-group` groups: new-post toggle + highlight duration (the cooldown input is clamped to `COOLDOWN_BOUNDS` on blur), true time ago, the Velocity and Heat sort toggles, and the two comment-highlighting toggles (OP, marked-user). All toggles default on. Every checkbox renders through the local `Toggle` component (label, `hns-hint` description, optional `ariaLabel`). Shows a warning banner when layout detection fails
- `entrypoints/popup/popup.css` - Popup styles (toggle switches, setting groups, hints, warning banner); follows system light/dark via `color-scheme: light dark` + semantic CSS custom properties overridden in a `@media (prefers-color-scheme: dark)` block (brand `#ff6600` unchanged across schemes)
- Uses a local `useSettingsStorage` hook in `App.tsx`: it renders the `SETTINGS_DEFAULTS` value first, follows the stored value through `watchSettings`, and its setter updates state at once, then writes through `settingsStorage` (so the cooldown input does not lag while typing)

### Component Structure

- `app/components/ControlPanel.tsx` - Main UI component, consumes sort state + `enabledSortOptions` + `settled` from `useSettings`. Maps over the enabled options (buttons + separators, plus a native `<select>` for the mobile dropdown tier), gates first paint on `settled` (KTD-8), publishes the enabled-option count on the panel root via the `data-sort-count` attribute for count-aware CSS breakpoints (KTD-3), and renders a `role="status"` conflict note listing intercepted hotkeys when `useKeyboardShortcuts` reports any (KTD-5)
- `app/components/SortButton.tsx` - Individual sort option buttons (points/time/comments/velocity/heat/default)

### Data Flow

1. `useSettings` hook reads sort preference from `chrome.storage.sync`, exposes reactive `activeSort`, the derived `enabledSortOptions` list, and a `settled` first-paint flag; validates `activeSort` against the enabled set (unknown/disabled → `default`, R6)
2. `useParsedRows` hook extracts post data from HN's DOM on mount: one row set per `getPostRows()` row (title, then the info and spacer rows that follow it)
3. `sortRows` creates a new sorted array based on active sort option (velocity/heat are computed at sort time, not stored)
4. `updateTable` prepends the reordered post rows to the table body, so whatever follows the posts (the "More" footer) stays last with no footer detection, and highlights the active sort column (velocity/heat span two columns, so they highlight nothing, KTD-2)

### Key Utils

- `app/utils/selectors.ts` - DOM selectors for HN's table structure. `getPostRows()` is the one definition of a post on a list page (`tr.athing.submission`, followed by its info row, then a spacer row; comment lists such as `favorites?comments=t` have `tr.athing` rows without `submission`, so they yield no posts); `useParsedRows` and `newPosts` read posts through it, and `updateTable` writes back the rows `useParsedRows` found
- `app/utils/layout.ts` - `waitForPanelParent` (waits for HN's header cell) + `LAYOUT_TIMEOUT_MS`
- `app/utils/parsers.ts` - Extract numeric values (points, time, comments) from info rows; `getTime` delegates to `parseAgeTitle`, which reads the `.age` title attribute in every format HN has used (legacy `"ISO_DATETIME UNIX_TIMESTAMP"`, `"2026-09-06T07:21:06.000000Z"` from 2026-08-27, zone-less `"2026-09-14T13:00:46"` since 2026-09-13)
- `app/utils/settings.ts` - `watchSettings(keys, onChange)`: the one way to follow synced settings live (used by `useSettings`, `newPosts`, and `comments.content`)
- `app/utils/converters.ts` - `stringToNumber` (parseInt wrapper), `nowInSeconds` (current epoch in seconds — use instead of inline `Math.floor(Date.now() / 1000)`)
- `app/utils/sorters.ts` - `sortRows(parsedRows, sortBy)` returns a new array sorted descending by the variant's value (`default` restores HN order via `originalIndex`); velocity = `points / (ageHours + 2)`, heat = `comments / points`
- `app/utils/presenters.ts` - DOM manipulation to update table, highlight active sort column, and correct age text (`formatAge`, `correctAgeTexts`, `restoreAgeTexts`)
- `app/utils/newPosts.ts` - New-post tracking behind one entry point, `trackNewPosts(): () => void` (see Settings & New Post Detection)

### Keyboard Shortcuts

- `app/hooks/useKeyboardShortcuts.ts` - Keyboard event handler with Vimium conflict detection
- Keys: P (points), T (time), C (comments), V (velocity), H (heat), D (default)
- Ignores keys typed in inputs, textareas, and contenteditable elements, and keys held with Ctrl, Alt, or Meta. `ControlPanel` passes an empty option list until `settled`, so hotkeys stay inert before first paint
- Takes `enabledSortOptions` and derives the live key set — a disabled sort's key is inert (skipped before conflict detection, so it neither sorts nor flags a conflict)
- Auto-disables ALL shortcuts if another extension (e.g., Vimium) handles any of the keys; returns the accumulated set of conflicting keys (React state) so `ControlPanel` can name them in the conflict note (KTD-5)

### Settings & New Post Detection

- `app/utils/settingsStorage.ts` - `settingsStorage.get/set/watch`: the one wrapper over WXT `storage` (`sync:` area) for synced settings. It keeps Plasmo's on-disk encoding (`JSON.stringify` on write, `JSON.parse` on read and in watch callbacks; a missing or unparsable value decodes to `undefined`, so callers apply `SETTINGS_DEFAULTS` with `??`), so old and new versions share synced values with no migration (`docs/adr/0001-keep-plasmo-json-encoding-on-wxt-storage.md`). It has no tests of its own; `settings.test.ts`, `newPosts.test.ts`, `useSettings.test.ts`, and `useReviewPrompt.test.ts` cover it by seeding Plasmo-format values in `fakeBrowser`
- `app/hooks/useSettings.ts` - Hook for the panel's synced state via `settingsStorage` (chrome.storage.sync):
  - Sort preference (`activeSort` / `setActiveSort`) — syncs across devices, reactive via watchers
  - True time ago toggle (`showTrueTimeAgo`) — exposes reactive boolean for age text correction
  - Sort toggles: every `SORT_OPTIONS` entry with an `enableKey` is toggleable; the hook follows those keys generically (`TOGGLE_KEYS`) through one `watchSettings` call and derives `enabledSortOptions` (the SORT_OPTIONS subset the panel, dropdown, and hotkeys all consume); every snapshot is validated via `resolveActiveSort`, which resolves unknown/disabled sorts to `default` locally without writing back (KTD-6, no ping-pong). A toggle change re-checks the sort on screen, so re-enabling a sort does not bring back the stored one
  - `settled` flag — flips after the async init read so the panel doesn't flash a six-option layout before reflowing (KTD-8)
- `app/utils/newPosts.ts` - `trackNewPosts()` starts new-post tracking for the current list page and returns dispose. Everything else in the file, apart from the exported `PostTimestamps` type, is private and tested only through that boundary (`newPosts.test.ts`):
  - Post timestamps: stores `Record<string, number>` (post ID → discovery timestamp, `-1` for known) per pathname; migrates the old `string[]` format
  - Show-new toggle: applies/removes the `hns-show-new` CSS class on the table body
  - Fade: `markRow` sets `--hns-fade` on new-post rows and a timer (`updateFadeOpacities`) lowers it over the cooldown, removing the class once a row reaches 0. One `syncInterval()` rule governs that timer: it runs only while show-new is on, the tracker is not disposed, and some post is still fading
  - Follows `hns-show-new` and `hns-cooldown` through `watchSettings`, and watches the page's post-ids key itself; the post-ids watcher stays off until init's own write lands and never writes back (no ping-pong)
- All settings sync across devices via `chrome.storage.sync`
- New-post detection only runs on first pages (skips paginated pages with `?p=...` or `?next=...`)

### True Time Ago

- HN "second chance" posts show misleading age text (e.g., "7 hours ago" for a 3-day-old resubmission) because the server resets the display text while the title attribute retains the original submission timestamp
- `formatAge` in `app/utils/presenters.ts` computes correct age from Unix timestamp; `correctAgeTexts`/`restoreAgeTexts` swap the `<a>` text inside `.age` spans, preserving originals via `data-original-age`
- Toggle in popup (default: on), wired through `useSettings` → `ControlPanel` useEffect
- The same text-vs-title gap is why the timestamp canary in `selectors.integration.test.ts` only requires 3 agreeing "N hours ago" rows

### Review Prompt

- `app/hooks/useReviewPrompt.ts` - Manages review prompt lifecycle:
  - Tracks install timestamp and sort count in `chrome.storage.sync`
  - Shows a dismissible speech-bubble toast below the sort menu after 7 days of use OR 20 sorts (`shouldPrompt`, the pure threshold check; a click on the already-active sort does not count)
  - The toast returns on every page load until dismissed; dismissal persists to storage (`hns-review-dismissed`), so it never returns after that
  - Persistent review link always visible in extension popup (`entrypoints/popup/App.tsx`)

### Constants

- `app/constants.ts` holds every constant (storage keys and defaults, CSS class names, HN selectors, `SORT_OPTIONS`); shared types live in `app/types.ts`
- To make a sort toggleable, add an `hns-<name>-enabled` key to `SETTINGS_KEYS`/`SETTINGS_DEFAULTS` and set it as the sort's `enableKey`; `useSettings` needs no change. Adding an option or a toggle also needs: matching count-aware `@media` blocks in `content.css` for the new enabled-option count, a unique `shortcut` letter, and a `Toggle` in `entrypoints/popup/App.tsx` (popup toggles are wired by hand)

## Path Aliases

Use `~` prefix for imports from project root (e.g., `~app/components/ControlPanel`).

## Linting

- **Biome**: `biome.json` (recommended ruleset; `noNonNullAssertion` and `noCommaOperator` off)
- **Prettier**: `.prettierrc.mjs` with single quotes, trailing commas, 120 char width
- **Git hooks**: `lefthook.yml`. pre-commit refuses a commit on `main` (`LEFTHOOK_EXCLUDE=branch` skips it), and runs a betterleaks secret scan, `biome lint`, and Prettier (re-stages its fixes) on staged files; commit-msg enforces Conventional Commits; pre-push runs the CI checks in order: `bun run lint`, `bun run test:coverage`, `bun run build`
- `bun install` installs the hooks (lefthook's postinstall). The secret scan needs `betterleaks` on PATH (`brew install betterleaks`) and reads `.gitleaks.toml` (default rules; `app/__fixtures__/*.html` allowlisted because HN snapshots carry anonymous `auth=` tokens)
- `bun install` also runs `wxt prepare`, which generates `.wxt/` (the tsconfig base and `#imports` types). Rerun it if `.wxt/` is missing, or `tsc --noEmit` and the path aliases break
- CI: `.github/workflows/main.yml` (push and PR to `main`) runs lint, `test:coverage` (uploaded to Codecov), and build. `.github/workflows/monitor.yml` runs daily at 09:00 UTC and on dispatch: it refetches both fixtures from live HN and runs `bun run test:integration`, so a failure means HN markup or timestamps changed. It never commits the refreshed fixtures

## Code Style

- Prettier configured with single quotes, trailing commas, 120 char width
- Import order: builtins, third-party (incl. WXT's `#imports`), @plasmohq, ~aliases, relative

## Testing

- **Framework**: Vitest with JSDOM and React Testing Library
- **Coverage**: `app/**` must stay at 100% statements, branches, functions, and lines (`coverage.thresholds` in `vitest.config.ts`); `bun run test:coverage` fails in CI below that. Cover a new branch with a test, or delete it if no input can reach it. `entrypoints/`, `scripts/`, and `app/__fixtures__/` are outside the gate, which is why entrypoint logic lives in `app/utils`
- **Config**: `vitest.config.ts` with path aliases and coverage settings; `restoreMocks: true` restores every `vi.spyOn` before each test, so a test file needs no `afterEach` restore; pins `process.env.TZ = 'Asia/Kolkata'` (non-UTC, no DST) so any local-time date parsing fails tests (guarded by a test in `app/utils/parsers.test.ts`)
- **Setup**: `vitest.config.ts` adds WXT's `WxtVitest()` plugin, which resolves `#imports` and points WXT's `browser` at `fakeBrowser` (`wxt/testing/fake-browser`); `vitest.setup.ts` loads the jest-dom matchers and resets `fakeBrowser` before each test. Storage tests seed `fakeBrowser.storage.sync` with Plasmo-format values (JSON strings) and assert the raw values written back. React Testing Library registers its own cleanup in the files that import it
- **Environment**: jsdom by default; a test file that touches no DOM starts with `// @vitest-environment node` to skip the jsdom setup cost

### Fixtures

- `app/__fixtures__/hn-homepage.html` - Real HN homepage snapshot for DOM testing
- `app/__fixtures__/hn-item.html` - Real HN thread (`item?id=`) snapshot for comment-selector drift testing
- `app/__fixtures__/loadFixture.ts` - Helper functions to load fixtures
- `app/__fixtures__/updateFixture.ts` - Script to refresh both fixtures from live HN: stamps `hn-homepage.html` with `<!-- hns-fetched-at: ISO -->`, then saves the most-commented homepage story as `hn-item.html` (`pickTopCommentedItemId`, exported and unit-tested). Network calls run only under `import.meta.main`, so importing the file is safe
- `app/__fixtures__/testHelpers.ts` - Shared test helpers: `setupTableBody` (HN list DOM builder), `setupCommentThread` (HN item-page DOM builder), `clearBody`, `getRowById`, `FAKE_NOW` constant
- Run `bun run fixture:update` to refresh when HN markup changes

### Test Files

Tests are co-located with source files using the `.test.ts` / `.test.tsx` suffix. Vitest only collects `app/**/*.test.{ts,tsx}`, so tests for `entrypoints/` code live in `app/`:

- `app/utils/*.test.ts` - Unit tests for utility functions
- `app/constants.test.ts` - `SORT_PANEL_EXCLUDE_MATCHES` coverage
- `app/content-css-breakpoints.test.ts` - Asserts `content.css` has a word↔letter and a letter↔dropdown `@media` block for every reachable `data-sort-count` (derived from `SORT_OPTIONS`); adding a toggleable sort fails here until the CSS gains the new count's blocks
- `app/hn-selectors.test.ts` - Fails on any string literal in `app/`, `entrypoints/`, or `scripts/` (tests and `app/constants.ts` aside) that names HN markup (`#hnmain`, `.athing`, `.hnuser`, ...); add the selector to `HN_SELECTORS` and pass it in instead
- `app/popup.test.tsx` - Popup (`entrypoints/popup/App.tsx`) component tests on `fakeBrowser`, seeded with Plasmo-format values
- `app/__fixtures__/updateFixture.test.ts` - `pickTopCommentedItemId`, including a run against the real homepage fixture, and a check that the updater's user agent sends the Chrome version in `CHROME_MAJOR` (a `CHROME_MAJOR` bump fails here until `updateFixture.ts` follows)
- `app/utils/selectors.integration.test.ts` - List-page selectors run against `hn-homepage.html` (breaks if HN markup changes), plus the timestamp canary: every `.age` title must parse, and at least 3 "N hours ago" rows must agree with their title relative to the `<!-- hns-fetched-at: ... -->` stamp `updateFixture.ts` writes at the top of the fixture (a fixed count, not a share, because second-chance posts, whose text is younger than their title, can fill over half the front page; a local-time parsing bug makes zero hour rows agree)
- `app/utils/comments.integration.test.ts` - Comment-page selectors run against `hn-item.html` (breaks if HN item markup changes); `bun run test:integration` runs both integration suites
- `app/components/*.test.tsx` - Component tests
- `app/hooks/*.test.ts` - Hook tests

## Screenshots

Chrome Web Store screenshots are auto-generated using Playwright:

- `scripts/generate-screenshots.ts` - Entry point, orchestrates browser setup and capture
- `scripts/screenshots/browser.ts` - Browser launch, extension injection, variant capture loop
- `scripts/screenshots/constants.ts` - Variant configs (sort type, title, subtitle, filename), overlay/arrow styles, and the real-Chrome fingerprint both generators launch with (`channel: 'chrome'`, matching UA + `sec-ch-ua` client hints, `CHROME_MAJOR`) to avoid HN's automation 429s. Bump `CHROME_MAJOR` with the installed Chrome
- `scripts/screenshots/htmlCache.ts` - `gotoCached` serves HN's top-level document from a local daily cache (`scripts/screenshots/.hn-cache/`, gitignored) so repeated generator runs don't trip HN's 429 rate-limiting on the `/item` endpoint; sub-resources still load live so pages stay styled. Shared by both generators
- `scripts/screenshots/overlays.ts` - Injects descriptive overlay cards and pointer arrows into the page
- `scripts/screenshots/paths.ts` - Resolves build output (`build/chrome-mv3`) and image directory paths, globbing WXT's emitted `content-scripts/hn-sort.{js,css}` sort bundle **and** `content-scripts/comments.{js,css}` comment bundle (fail-loud if missing)
- `scripts/screenshots/comments.ts` - Shared item-page helper used by both generators: `injectCommentsBundle` (inject the built `content-scripts/comments.{js,css}` onto an `item?id=` page, wait for a `.hns-mark-dot` to confirm it ran) and `markUser` (click a user's mark dot via its `data-hns-user` attribute)
- `scripts/screenshots/types.ts` - `VariantConfig` type (a `commentThreadId`/`markUser` pair routes a variant through the item-page branch instead of the homepage sort path)

Most variants sort HN's homepage, but the last one (`screen_comment_highlight.png`) navigates to a curated `item?id=` thread (`COMMENT_THREAD_ID` in `constants.ts`), injects the comment bundle, and marks a user to show the OP badge + marked-user tint. `captureVariants` stable-sorts every variant with a `commentThreadId` after all homepage variants, because once the loop leaves the homepage the sort panel is gone and a later homepage variant would hang. Declaration order in `VARIANTS` does not matter.

Workflow: `bun run build` then `bun run screenshots`. Output goes to `images/`.

### Demo Video/GIF

- `scripts/generate-demo.ts` - Records a Playwright video of the extension in action, converts to `.mp4` (YouTube/CWS) and `.gif` (README) via ffmpeg. After the homepage sort sequence it navigates mid-recording to the curated `COMMENT_THREAD_ID` thread, injects the comment bundle (via the shared `scripts/screenshots/comments.ts` helper), and clicks a mark dot to demonstrate OP-badge + marked-user highlighting; the homepage-computed `#hnmain` crop is reused for the item page (asserted to share the x-bound — KTD3)
- `scripts/screenshots/chromePolyfill.ts` - Minimal `chrome.storage` polyfill for running content scripts in Playwright (used by both screenshot and demo scripts, and by the comment bundle whose toggles default on). Required because content scripts call `chrome.storage.sync` which doesn't exist outside an extension context.

Workflow: `bun run build` then `bun run demo`. Requires ffmpeg installed. Output goes to `images/`.

## Agent skills

### Issue tracker

Issues live in GitHub Issues on svyatov/hacker_news_sorted (gh CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: bug, enhancement, needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` at the root, ADRs in `docs/adr/` once the first one is written. See `docs/agents/domain.md`.

## Commit Conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for commit messages:

- `feat:` — new feature
- `fix:` — bug fix
- `perf:` — performance improvement
- `refactor:` — code change that neither fixes a bug nor adds a feature
- `docs:` — documentation only
- `style:` — formatting, linting (no code logic change)
- `test:` — adding/updating tests
- `chore:` — maintenance, dependencies, config
- `ci:` — CI/CD changes
- `build:` — build system or external dependencies
- `revert:` - reverts a previous commit

Use a scope when relevant: `feat(shortcuts): add vim-style navigation`. The `commit-msg` hook (`lefthook.yml`) rejects a first line that does not match `type(scope)!: description`; `!` marks a breaking change.

## Changelog

The changelog follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format with these categories (in order): Added, Changed, Deprecated, Removed, Fixed, Security. Each category must appear at most once per release section — always append to an existing category rather than creating a duplicate. Sections for 2.2.0 and older predate this order; leave them as they are.

## Chrome Web Store Description

`description.txt` is the copy used on the Chrome Web Store listing page. It contains benefit-oriented copy with a changelog at the bottom in the format `YYYY-MM-DD - vX.Y.Z - summary`. When doing a version bump/release, update the `Recent changes:` section (keep last 5 versions). Keep it non-technical.

## Before Committing

Before committing any meaningful change, ensure:

1. `README.md` is updated if the change affects user-facing features or setup instructions
2. `AGENTS.md` is updated if the change affects architecture, commands, or development workflow
3. `CHANGELOG.md` has the change listed under the `## [Unreleased]` section
