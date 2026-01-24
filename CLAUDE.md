# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hacker News Sorted is a Chrome extension that adds sorting capabilities to Hacker News (news.ycombinator.com). Users can sort posts by points, time, comments, or restore the default order. Built with Plasmo framework and React.

## Commands

```bash
bun dev            # Start development server (loads extension from build/chrome-mv3-dev)
bun run build      # Production build
bun run package    # Package extension for distribution
bun run release    # Build and package
bun run test       # Run tests (uses Vitest)
bun run test:watch # Run tests in watch mode
bun run test:coverage # Run tests with coverage report
bun run lint       # Run ESLint and Prettier checks
bun run fixture:update # Fetch fresh HN HTML for test fixtures
bun run screenshots    # Generate Chrome Web Store screenshots (requires `bun run build` first)
```

## Architecture

### Content Script Entry Point

- `content.tsx` - Main entry point, injects the ControlPanel into HN's header using Plasmo's content script UI lifecycle
- `content.css` - Styles for the control panel, sort highlighting, and new-post indicators

### Popup Entry Point

- `popup.tsx` - Settings popup UI with toggle switch for new-post indicators
- `popup.css` - Popup styles (toggle switches, layout)
- Uses `@plasmohq/storage` `useStorage` hook for reactive persistence to `chrome.storage.sync`

### Component Structure

- `app/components/ControlPanel.tsx` - Main UI component with sort buttons, consumes sort state from `useSettings` hook
- `app/components/SortButton.tsx` - Individual sort option buttons (points/time/comments/default)

### Data Flow

1. `useSettings` hook reads sort preference and post IDs from `chrome.storage.sync`, marks new posts, exposes reactive `activeSort`
2. `useParsedRows` hook extracts post data from HN's DOM on mount (title, info, spacer rows per post)
3. `sortRows` creates a new sorted array based on active sort option
4. `updateTable` replaces the table body with reordered rows and highlights the active sort column

### Key Utils

- `app/utils/selectors.ts` - DOM selectors for HN's table structure (title rows at 3n+1, info rows at 3n+2, spacer rows at 3n+3)
- `app/utils/parsers.ts` - Extract numeric values (points, time, comments) from info rows
- `app/utils/sorters.ts` - Sort functions for each sort variant
- `app/utils/presenters.ts` - DOM manipulation to update table and highlight active sort column
- `app/utils/newPosts.ts` - New post detection: extracts post IDs from DOM, marks new rows with CSS class, provides `isFirstPage` guard

### Keyboard Shortcuts

- `app/hooks/useKeyboardShortcuts.ts` - Keyboard event handler with Vimium conflict detection
- Keys: P (points), T (time), C (comments), D (default)
- Auto-disables if another extension (e.g., Vimium) handles any of the keys

### Settings & New Post Detection

- `app/hooks/useSettings.ts` - Central hook managing all synced state via `@plasmohq/storage` (chrome.storage.sync):
  - Sort preference (`activeSort` / `setActiveSort`) — syncs across devices, reactive via watchers
  - Post ID snapshots — stores/compares post IDs for new-post detection, first-page only
  - Show-new toggle — applies/removes `hns-show-new` CSS class on table body
- All settings sync across devices via `chrome.storage.sync`
- New-post detection only runs on first pages (skips paginated pages with `?p=...` or `?next=...`)

### Constants

- `app/constants.ts` - Centralized constants including:
  - Extension constants (`CONTROL_PANEL_ROOT_ID`)
  - `CSS_CLASSES` - Extension CSS class names (highlight, buttons, labels, `SHOW_NEW`, `NEW_POST`)
  - `CSS_SELECTORS` - Derived CSS selectors from class names
  - `SORT_OPTIONS` - Sort option configuration array (sort variant, display text, keyboard shortcut)
  - `SETTINGS_KEYS` - Storage key names for chrome.storage.sync (`SHOW_NEW`, `LAST_ACTIVE_SORT`, `POST_IDS_PREFIX`)
  - `SETTINGS_DEFAULTS` - Default values for settings
  - `HN_SELECTORS` - DOM selectors for HN page structure
  - `HN_CLASSES` - HN CSS class names for building test fixtures

### Types

- `SortVariant`: 'default' | 'points' | 'time' | 'comments'
- `ParsedRow`: Contains DOM elements (title, info, spacer) and parsed numeric values for a single post
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
- Run `bun run fixture:update` to refresh when HN markup changes

### Test Files

Tests are co-located with source files using `.test.ts` / `.test.tsx` suffix:

- `app/utils/*.test.ts` - Unit tests for utility functions
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

`description.txt` is the copy used on the Chrome Web Store listing page. It contains a plain-language feature summary and a short changelog for end users. When doing a version bump/release, add a one-line summary to the `Changelog:` section in this file (e.g., `v2.2 - Added keyboard shortcuts, Vimium compatibility`). Keep it non-technical.

## Before Committing

Before committing any meaningful change, ensure:

1. `README.md` is updated if the change affects user-facing features or setup instructions
2. `CLAUDE.md` is updated if the change affects architecture, commands, or development workflow
3. `CHANGELOG.md` has the change listed under the `## [Unreleased]` section
