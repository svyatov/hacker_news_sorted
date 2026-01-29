# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.0]

### Added

- New post indicators — orange dot marks posts that appeared since your last visit (enabled by default)
- Popup settings UI to toggle new-post indicators from the extension icon
- `@plasmohq/storage` for reactive settings sync between popup and content script
- ESLint with TypeScript and React Hooks plugins
- Prettier check in CI lint step
- Pre-commit hook via simple-git-hooks and lint-staged
- Chrome Web Store description file (`description.txt`)
- Playwright-based screenshot generator for Chrome Web Store images (`bun run screenshots`)
- New screenshots: default order and new-post indicators

### Changed

- Sort preference and new-post detection now sync across devices via `chrome.storage.sync`
- New-post indicators only appear on first pages (not paginated pages)
- Sort buttons use semantic `<button>` elements with `aria-pressed` for accessibility
- Added visible `:focus-visible` outline for keyboard navigation of sort buttons
- Replaced Chrome Web Store badge with high-resolution version for Retina displays
- Updated dev dependencies to latest versions
- Improved README with badges, features section, and cleaner layout
- Switched to Conventional Commits and Keep a Changelog formats
- Removed Cursor-specific editor settings
- Consolidated CSS class constants into `CSS_CLASSES`, `CSS_SELECTORS`, and `SORT_OPTIONS` objects
- Added `data-sort` attribute to sort buttons for programmatic access
- Regenerated Chrome Web Store screenshots with current HN content and optimized file sizes

### Security

- Added explicit read-only permissions to CI workflow to restrict GITHUB_TOKEN scope

## [2.2.0]

### Added

- Keyboard shortcuts for sorting (P=points, T=time, C=comments, D=default)
- Vimium compatibility — shortcuts auto-disable if another extension handles the keys
- Comprehensive test suite with Vitest and React Testing Library (94 tests)
- Fixture system for DOM testing with real HN HTML snapshots
- `bun run fixture:update` script to refresh test fixtures
- GitHub Actions CI workflow for running tests and build

### Fixed

- Type safety issue in useParsedRows (footer array could contain undefined)

### Changed

- `innerText` to `textContent` in parsers to avoid layout reflows
- Switched from pnpm to bun as package manager
- Extracted HN DOM selectors and CSS classes to constants module
- Removed unused regex constants (MINUTES_REGEX, HOURS_REGEX, DAYS_REGEX)
- Added test scripts: `bun run test`, `bun run test:watch`, `bun run test:coverage`
- Removed unused submit.yml GitHub Actions workflow

### Security

- Fixed vulnerabilities via dependency overrides (msgpackr, lmdb, svelte, content-security-policy-parser)

## [2.1.0]

### Added

- Active sort column is now highlighted with bold text

### Fixed

- Array mutation bug in sortRows (now creates a copy before sorting)
- Null reference issues in parsers and selectors (added proper null checks)
- Typo: hightlightText → highlightText
- Date validation in getTime parser (now correctly checks isNaN instead of === 0)
- Missing footerRows dependency to useEffect in ControlPanel
- Missing setActiveSort dependency to useCallback in SortButton

### Changed

- Replaced polling mechanism with MutationObserver in content.tsx for better performance
- Optimized getLastActiveSort to use useState initializer instead of calling on every render
- Added useMemo for parsedRows to memoize expensive DOM parsing operations
- Replaced DOM cloning with CSS classes in highlightActiveSort to avoid expensive cloneNode operations
- Memoized sorted rows calculation in ControlPanel to avoid re-sorting on every render
- Improved localStorage error handling with try/catch blocks
- Simplified CSS class construction in SortButton (template literal instead of array join)
- Extracted root element injection logic into injectRootElement function in content.tsx
- Refactored highlightActiveSort to use lookup map instead of if/else chain
- Added NonDefaultSortVariant type for better type safety
- Removed unused relativeTimeToMinutes function from converters
- Added SortOption type and refactored SortButton to use it
- Changed reset button text from 'reset' to 'default' and shortcut from 'R' to 'D'
- Moved sortOptions array outside ControlPanel component
- Removed clsx dependency, replaced with manual className construction
- Refactored constants naming convention to UPPER_SNAKE_CASE
- Moved regex constants from converters to constants module
- Migrated prettier config from .mjs to .ts format

## [2.0.3]

### Fixed

- Time parsing by extracting date from timestamp title attribute

### Changed

- Updated dependencies (React 19, Plasmo 0.90.5, and others)

## [2.0.2]

### Fixed

- Typo fix

## [2.0.1]

### Added

- Support lower resolutions by switching to single letters

### Changed

- Control panel lower-cased to better fit the design

## [2.0.0]

### Added

- Rewritten with TypeScript and [Plasmo framework](https://docs.plasmo.com)
- Chosen sorting method now persists across sessions
- Return to original sort order is now available

### Changed

- License changed to MIT
- Switched to Manifest v3
- Changelog moved to separate file

## [1.0.1]

### Fixed

- Query selectors fixed

### Changed

- Code slightly simplified and reformatted with prettier

## [1.0.0]

### Added

- Extension uploaded to [Google Web Store](https://chrome.google.com/webstore/detail/hacker-news-sorted/djkcnbncofmjekhlhemlkinfpkamlkaj)
- Icons and screenshots

## [0.0.2]

### Added

- Menu to the top right corner for sorting by points, time and comments (points is default)

## [0.0.1]

### Added

- Auto-sorting news by points in descending order
