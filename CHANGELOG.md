# Changelog

## Unreleased

* `new` active sort column is now highlighted with bold text
* `fix` fixed array mutation bug in sortRows (now creates a copy before sorting)
* `fix` fixed null reference issues in parsers and selectors (added proper null checks)
* `fix` fixed typo: hightlightText → highlightText
* `fix` added missing footerRows dependency to useEffect in ControlPanel
* `fix` added missing setActiveSort dependency to useCallback in SortButton
* `perf` optimized getLastActiveSort to use useState initializer instead of calling on every render
* `chg` improved localStorage error handling with try/catch blocks
* `chg` simplified CSS class construction in SortButton (template literal instead of array join)
* `chg` extracted POLL_INTERVAL_MS constant in content.tsx
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
