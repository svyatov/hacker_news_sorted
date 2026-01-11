# Changelog

## v2.2.0

* `new` added keyboard shortcuts for sorting (P=points, T=time, C=comments, D=default)
* `new` added Vimium compatibility - shortcuts auto-disable if another extension handles the keys
* `new` added comprehensive test suite with Vitest and React Testing Library (94 tests)
* `new` added fixture system for DOM testing with real HN HTML snapshots
* `new` added `bun run fixture:update` script to refresh test fixtures
* `new` added GitHub Actions CI workflow for running tests and build
* `fix` fixed type safety issue in useParsedRows (footer array could contain undefined)
* `perf` changed innerText to textContent in parsers to avoid layout reflows
* `chg` switched from pnpm to bun as package manager
* `chg` extracted HN DOM selectors and CSS classes to constants module
* `chg` removed unused regex constants (MINUTES_REGEX, HOURS_REGEX, DAYS_REGEX)
* `chg` added test scripts: `bun run test`, `bun run test:watch`, `bun run test:coverage`
* `sec` fixed security vulnerabilities via dependency overrides (msgpackr, lmdb, svelte, content-security-policy-parser)
* `chg` removed unused submit.yml GitHub Actions workflow

## v2.1.0

* `new` active sort column is now highlighted with bold text
* `fix` fixed array mutation bug in sortRows (now creates a copy before sorting)
* `fix` fixed null reference issues in parsers and selectors (added proper null checks)
* `fix` fixed typo: hightlightText → highlightText
* `fix` fixed date validation in getTime parser (now correctly checks isNaN instead of === 0)
* `fix` added missing footerRows dependency to useEffect in ControlPanel
* `fix` added missing setActiveSort dependency to useCallback in SortButton
* `perf` replaced polling mechanism with MutationObserver in content.tsx for better performance
* `perf` optimized getLastActiveSort to use useState initializer instead of calling on every render
* `perf` added useMemo for parsedRows to memoize expensive DOM parsing operations
* `perf` replaced DOM cloning with CSS classes in highlightActiveSort to avoid expensive cloneNode operations
* `perf` memoized sorted rows calculation in ControlPanel to avoid re-sorting on every render
* `chg` improved localStorage error handling with try/catch blocks
* `chg` simplified CSS class construction in SortButton (template literal instead of array join)
* `chg` extracted root element injection logic into injectRootElement function in content.tsx
* `chg` refactored highlightActiveSort to use lookup map instead of if/else chain
* `chg` added NonDefaultSortVariant type for better type safety
* `chg` removed unused relativeTimeToMinutes function from converters
* `chg` added SortOption type and refactored SortButton to use it
* `chg` changed reset button text from 'reset' to 'default' and shortcut from 'R' to 'D'
* `chg` moved sortOptions array outside ControlPanel component
* `chg` removed clsx dependency, replaced with manual className construction
* `chg` refactored constants naming convention to UPPER_SNAKE_CASE
* `chg` moved regex constants from converters to constants module
* `chg` added editor settings configuration (.cursor/settings.json)
* `chg` migrated prettier config from .mjs to .ts format and cleaned up (removed JSDoc, formatting adjustments)

## v2.0.3

* `fix` fixed time parsing by extracting date from timestamp title attribute
* `chg` updated dependencies (React 19, Plasmo 0.90.5, and others)

## v2.0.2

* `fix` fixes typo

## v2.0.1

* `new` support lower resolutions by switching to single letters
* `chg` control panel lower-cased to better fit the design

## v2.0.0

* `new` the project is rewritten with TypeScript and [Plasmo framework](https://docs.plasmo.com)
* `new` the chosen sorting method is now persists across the sessions
* `new` return to the original sort order is now available
* `chg` the license is changed to MIT
* `chg` switched to Manifest v3
* `chg` changelog moved to the separate file

## v1.0.1

* `fix` query selectors fixed
* `chg` code slightly simplified and reformatted with prettier

## v1.0.0

* `new` extension uploaded to [Google Web Store](https://chrome.google.com/webstore/detail/hacker-news-sorted/djkcnbncofmjekhlhemlkinfpkamlkaj)
* `add` icons and screenshots added

## v0.0.2

* `add` menu to the top right corner for sorting by points, time and comments (points is default)

## v0.0.1

* `add` auto-sorting news by points in descending order
