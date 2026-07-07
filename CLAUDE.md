# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hacker News Sorted is a Chrome extension that adds sorting capabilities to Hacker News (news.ycombinator.com). Users can sort posts by points, time, comments, velocity, heat, or restore the default order. Built with Plasmo framework and React.

## Knowledge Base

- `docs/solutions/` — documented solutions to past problems (bugs, best practices, workflow patterns), organized by category with YAML frontmatter (`module`, `tags`, `problem_type`). Relevant when implementing or debugging in a documented area.
- `CONCEPTS.md` — shared domain vocabulary (control panel, menu tiers, derived sorts like Velocity/Heat). Relevant when orienting to the codebase or discussing domain concepts.

## Commands

```bash
bun dev            # Start development server (loads extension from build/chrome-mv3-dev)
bun run build      # Production build
bun run package    # Package extension for distribution
bun run release    # Build and package
bun run test       # Run tests (uses Vitest)
bun run test:integration # Run selector integration tests against the HN fixture
bun run test:watch # Run tests in watch mode
bun run test:coverage # Run tests with coverage report
bun run lint       # Run ESLint and Prettier checks
bun run fixture:update # Fetch fresh HN HTML for test fixtures
bun run screenshots    # Generate Chrome Web Store screenshots (requires `bun run build` first)
bun run demo           # Generate demo video (.mp4) and GIF (requires `bun run build` first)
```

## Architecture

### Content Script Entry Point

- `content.tsx` - Main entry point, injects the ControlPanel into HN's header using Plasmo's content script UI lifecycle
- `content.css` - Styles for the control panel, sort highlighting, and new-post indicators. Three-tier responsive menu: full names on wide screens, single-letter labels on medium, and a native `<select>` dropdown tier on narrow screens. **Both** tier switches are count-aware — one `@media` block per enabled-option count (4/5/6) keyed on the `#hns-control-panel[data-sort-count='N']` attribute — because each tier's width, and thus the point at which it would push HN's own header nav onto a second line, grows with the option count. Word↔letter (`min-width` 1280/1360/1440px); letter↔dropdown (`max-width` 1080/1120/1160px) hides `.hns-buttons-tier` and shows `.hns-dropdown-tier`. All breakpoints are calibrated against HN's header so the menu always collapses to a more compact tier _before_ it would wrap HN's nav (measured letter-row wrap floors ~1044/1084/1124px; the dropdown has no visible label so it stays as narrow as HN's own ~750px nav-wrap floor)
- Detects layout breakage: writes `hns-layout-ok` to `chrome.storage.sync` based on whether expected DOM elements are found (with a 3-second timeout)
- **Dev gotcha**: Plasmo hot-reload often doesn't pick up content script CSS or `useState` initial value changes — reload the HN page (or the extension itself) to see updates

### Background Service Worker

- `background.ts` - Manages the extension badge based on layout health status
- Shows a red "!" badge when `hns-layout-ok` is `false` in `chrome.storage.sync`
- Listens for storage changes and restores badge state on service worker restart

### Popup Entry Point

- `popup.tsx` - Settings popup UI with grouped layout: dependent settings (new-post toggle + highlight duration) share a `fieldset.hns-group`, independent settings get separate groups; each setting has a `hns-hint` description; shows a warning banner when layout detection fails. Includes per-sort toggles for Velocity and Heat (both default on)
- `popup.css` - Popup styles (toggle switches, setting groups, hints, warning banner); follows system light/dark via `color-scheme: light dark` + semantic CSS custom properties overridden in a `@media (prefers-color-scheme: dark)` block (brand `#ff6600` unchanged across schemes)
- Uses `useSettingsStorage` helper — a typed wrapper around `useStorage` that auto-resolves defaults from `SETTINGS_DEFAULTS`

### Component Structure

- `app/components/ControlPanel.tsx` - Main UI component, consumes sort state + `enabledSortOptions` + `settled` from `useSettings`. Maps over the enabled options (buttons + separators, plus a native `<select>` for the mobile dropdown tier), gates first paint on `settled` (KTD-8), publishes the enabled-option count on the panel root via the `data-sort-count` attribute for count-aware CSS breakpoints (KTD-3), and renders a `role="status"` conflict note listing intercepted hotkeys when `useKeyboardShortcuts` reports any (KTD-5)
- `app/components/SortButton.tsx` - Individual sort option buttons (points/time/comments/velocity/heat/default)

### Data Flow

1. `useSettings` hook reads sort preference and post IDs from `chrome.storage.sync`, marks new posts, exposes reactive `activeSort`, the derived `enabledSortOptions` list, and a `settled` first-paint flag; validates `activeSort` against the enabled set (unknown/disabled → `default`, R6)
2. `useParsedRows` hook extracts post data from HN's DOM on mount (title, info, spacer rows per post)
3. `sortRows` creates a new sorted array based on active sort option (velocity/heat are computed at sort time, not stored)
4. `updateTable` replaces the table body with reordered rows and highlights the active sort column (velocity/heat span two columns, so they highlight nothing — KTD-2)

### Key Utils

- `app/utils/selectors.ts` - DOM selectors for HN's table structure (title rows at 3n+1, info rows at 3n+2, spacer rows at 3n+3)
- `app/utils/parsers.ts` - Extract numeric values (points, time, comments) from info rows; `getTime` parses the Unix timestamp (second part) from the `.age` title attribute (`"ISO_DATETIME UNIX_TIMESTAMP"`)
- `app/utils/converters.ts` - `stringToNumber` (parseInt wrapper), `nowInSeconds` (current epoch in seconds — use instead of inline `Math.floor(Date.now() / 1000)`)
- `app/utils/sorters.ts` - Sort functions for each sort variant; velocity = `points / (ageHours + 2)` (damped), heat = `comments / points` with a below-zero sentinel for 0-points rows so job posts sink without `Infinity`/`NaN`
- `app/utils/presenters.ts` - DOM manipulation to update table, highlight active sort column, and correct age text (`formatAge`, `correctAgeTexts`, `restoreAgeTexts`); `highlightActiveSort` early-returns for any variant without a column getter (default/velocity/heat/unknown), which also removes the cross-version crash from an unmapped variant arriving via sync
- `app/utils/newPosts.ts` - New post detection and fade: exports `PostTimestamps` type, `migratePostIds`, `markNewPosts` (with cooldown-aware opacity), `updateFadeOpacities`, `clearNewPostMarkers`, `isFirstPage`

### Keyboard Shortcuts

- `app/hooks/useKeyboardShortcuts.ts` - Keyboard event handler with Vimium conflict detection
- Keys: P (points), T (time), C (comments), V (velocity), H (heat), D (default)
- Takes `enabledSortOptions` and derives the live key set — a disabled sort's key is inert (skipped before conflict detection, so it neither sorts nor flags a conflict)
- Auto-disables ALL shortcuts if another extension (e.g., Vimium) handles any of the keys; returns the accumulated set of conflicting keys (React state) so `ControlPanel` can name them in the conflict note (KTD-5)

### Settings & New Post Detection

- `app/hooks/useSettings.ts` - Central hook managing all synced state via `@plasmohq/storage` (chrome.storage.sync):
  - Sort preference (`activeSort` / `setActiveSort`) — syncs across devices, reactive via watchers
  - Post timestamps — stores `Record<string, number>` (post ID → discovery timestamp, `-1` for known) per page; migrates old `string[]` format automatically
  - Show-new toggle — applies/removes `hns-show-new` CSS class on table body
  - Fade interval — drives `--hns-fade` CSS custom property on new-post rows, with cooldown/showNew-aware lifecycle and memory leak guards (`mountedRef`, `intervalRef`, `showNewRef`)
  - True time ago toggle (`showTrueTimeAgo`) — exposes reactive boolean for age text correction
  - Velocity/Heat enabled toggles — derive `enabledSortOptions` (the SORT_OPTIONS subset the panel, dropdown, and hotkeys all consume); validated in the init read and both watchers (last-active-sort + toggle changes) via `resolveActiveSort`, which resolves unknown/disabled sorts to `default` locally without writing back (KTD-6, no ping-pong). Ref mirrors (`velocityEnabledRef`/`heatEnabledRef`) keep watchers validating against current state
  - `settled` flag — flips after the async init read so the panel doesn't flash a six-option layout before reflowing (KTD-8)
- All settings sync across devices via `chrome.storage.sync`
- New-post detection only runs on first pages (skips paginated pages with `?p=...` or `?next=...`)

### True Time Ago

- HN "second chance" posts show misleading age text (e.g., "7 hours ago" for a 3-day-old resubmission) because the server resets the display text while the title attribute retains the original submission timestamp
- `formatAge` in `app/utils/presenters.ts` computes correct age from Unix timestamp; `correctAgeTexts`/`restoreAgeTexts` swap the `<a>` text inside `.age` spans, preserving originals via `data-original-age`
- Toggle in popup (default: on), wired through `useSettings` → `ControlPanel` useEffect

### Review Prompt

- `app/hooks/useReviewPrompt.ts` - Manages review prompt lifecycle:
  - Tracks install timestamp and sort count in `chrome.storage.sync`
  - Shows a dismissible speech-bubble toast below the sort menu after 7 days of use OR 20 sorts
  - Dismissal persists to storage (shown at most once)
  - Persistent review link always visible in extension popup (`popup.tsx`)

### Constants

- `app/constants.ts` - Centralized constants including:
  - Extension constants (`CONTROL_PANEL_ROOT_ID`, `SORT_COUNT_ATTR` — the `data-sort-count` attribute driving count-aware CSS breakpoints)
  - `CSS_CLASSES` - Extension CSS class names (highlight, buttons, labels, `SHOW_NEW`, `NEW_POST`, `CONFLICT_NOTE`, `BUTTONS_TIER`, `DROPDOWN_TIER`, `DROPDOWN`)
  - `CSS_SELECTORS` - Derived CSS selectors from class names
  - `SORT_OPTIONS` - Sort option configuration array (sort variant, display text, keyboard shortcut); order: points, time, comments, velocity, heat, default
  - `SETTINGS_KEYS` - Storage key names for chrome.storage.sync (`SHOW_NEW`, `LAST_ACTIVE_SORT`, `POST_IDS_PREFIX`, `COOLDOWN`, `TRUE_TIME_AGO`, `VELOCITY_ENABLED`, `HEAT_ENABLED`)
  - `SETTINGS_DEFAULTS` - Default values for settings
  - `COOLDOWN_BOUNDS` - Min/max bounds for cooldown input validation
  - `SECONDS_PER_MINUTE`, `SECONDS_PER_HOUR`, `SECONDS_PER_DAY` - Time unit constants (used in presenters and tests)
  - `HN_SELECTORS` - DOM selectors for HN page structure
  - `HN_CLASSES` - HN CSS class names for building test fixtures

### Types

- `SortVariant`: 'default' | 'points' | 'time' | 'comments' | 'velocity' | 'heat'
- `ParsedRow`: Contains DOM elements (title, info, spacer) and parsed numeric values for a single post
- `PostTimestamps`: `Record<string, number>` — post ID → discovery timestamp (`Date.now()`), or `-1` for known/never-new posts (exported from `app/utils/newPosts.ts`)
- `Settings`: Shape for extension settings (`hns-show-new` boolean, `hns-last-active-sort` SortVariant)

## Path Aliases

Use `~` prefix for imports from project root (e.g., `~app/components/ControlPanel`).

## Linting

- **ESLint**: `eslint.config.ts` with TypeScript and React Hooks plugins
- **Prettier**: `.prettierrc.mjs` with single quotes, trailing commas, 120 char width
- **Pre-commit hook**: `simple-git-hooks` + `lint-staged` runs ESLint on `*.{ts,tsx}` and Prettier on all files
- Run `bun run prepare` after cloning to install git hooks

## Code Style

- Prettier configured with single quotes, trailing commas, 120 char width
- Import order: builtins, third-party, @plasmo, @plasmohq, ~aliases, relative

## Testing

- **Framework**: Vitest with JSDOM and React Testing Library
- **Config**: `vitest.config.ts` with path aliases and coverage settings
- **Setup**: `vitest.setup.ts` with jest-dom matchers and localStorage mock

### Fixtures

- `app/__fixtures__/hn-homepage.html` - Real HN HTML snapshot for DOM testing
- `app/__fixtures__/loadFixture.ts` - Helper functions to load fixtures
- `app/__fixtures__/updateFixture.ts` - Script to refresh fixtures from live HN
- `app/__fixtures__/testHelpers.ts` - Shared test helpers: `setupTableBody` (HN DOM builder), `clearBody`, `getRowById`, `FAKE_NOW` constant, `createStorageMock` factory (for `@plasmohq/storage` mocks)
- Run `bun run fixture:update` to refresh when HN markup changes

### Test Files

Tests are co-located with source files using `.test.ts` / `.test.tsx` suffix:

- `app/utils/*.test.ts` - Unit tests for utility functions
- `app/utils/selectors.integration.test.ts` - Selectors run against the real HN fixture (breaks if HN markup changes)
- `app/components/*.test.tsx` - Component tests
- `app/hooks/*.test.ts` - Hook tests

## Screenshots

Chrome Web Store screenshots are auto-generated using Playwright:

- `scripts/generate-screenshots.ts` - Entry point, orchestrates browser setup and capture
- `scripts/screenshots/browser.ts` - Browser launch, extension injection, variant capture loop
- `scripts/screenshots/constants.ts` - Variant configs (sort type, title, subtitle, filename), overlay/arrow styles
- `scripts/screenshots/overlays.ts` - Injects descriptive overlay cards and pointer arrows into the page
- `scripts/screenshots/paths.ts` - Resolves build output and image directory paths
- `scripts/screenshots/types.ts` - `VariantConfig` type

Workflow: `bun run build` then `bun run screenshots`. Output goes to `images/`.

### Demo Video/GIF

- `scripts/generate-demo.ts` - Records a Playwright video of the extension in action, converts to `.mp4` (YouTube/CWS) and `.gif` (README) via ffmpeg
- `scripts/screenshots/chromePolyfill.ts` - Minimal `chrome.storage` polyfill for running content scripts in Playwright (used by both screenshot and demo scripts). Required because content scripts call `chrome.storage.sync` which doesn't exist outside an extension context.

Workflow: `bun run build` then `bun run demo`. Requires ffmpeg installed. Output goes to `images/`.

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

Use a scope when relevant: `feat(shortcuts): add vim-style navigation`

## Changelog

The changelog follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format with these categories (in order): Added, Changed, Deprecated, Removed, Fixed, Security. Each category must appear at most once per release section — always append to an existing category rather than creating a duplicate.

## Chrome Web Store Description

`description.txt` is the copy used on the Chrome Web Store listing page. It contains benefit-oriented copy with a changelog at the bottom in the format `YYYY-MM-DD - vX.Y.Z - summary`. When doing a version bump/release, update the `Recent changes:` section (keep last 5 versions). Keep it non-technical.

## Before Committing

Before committing any meaningful change, ensure:

1. `README.md` is updated if the change affects user-facing features or setup instructions
2. `CLAUDE.md` is updated if the change affects architecture, commands, or development workflow
3. `CHANGELOG.md` has the change listed under the `## [Unreleased]` section
