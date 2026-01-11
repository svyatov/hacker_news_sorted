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
bun run fixture:update # Fetch fresh HN HTML for test fixtures
```

## Architecture

### Content Script Entry Point
- `content.tsx` - Main entry point, injects the ControlPanel into HN's header using Plasmo's content script UI lifecycle
- `content.css` - Styles for the control panel and sort highlighting

### Component Structure
- `app/components/ControlPanel.tsx` - Main UI component with sort buttons, manages active sort state
- `app/components/SortButton.tsx` - Individual sort option buttons (points/time/comments/default)

### Data Flow
1. `useParsedRows` hook extracts post data from HN's DOM on mount (title, info, spacer rows per post)
2. `sortRows` creates a new sorted array based on active sort option
3. `updateTable` replaces the table body with reordered rows and highlights the active sort column

### Key Utils
- `app/utils/selectors.ts` - DOM selectors for HN's table structure (title rows at 3n+1, info rows at 3n+2, spacer rows at 3n+3)
- `app/utils/parsers.ts` - Extract numeric values (points, time, comments) from info rows
- `app/utils/sorters.ts` - Sort functions for each sort variant
- `app/utils/presenters.ts` - DOM manipulation to update table and highlight active sort column
- `app/utils/storage.ts` - localStorage persistence for last active sort preference

### Keyboard Shortcuts
- `app/hooks/useKeyboardShortcuts.ts` - Keyboard event handler with Vimium conflict detection
- Keys: P (points), T (time), C (comments), D (default)
- Auto-disables if another extension (e.g., Vimium) handles any of the keys

### Constants
- `app/constants.ts` - Centralized constants including:
  - Extension constants (CSS classes, localStorage keys)
  - `HN_SELECTORS` - DOM selectors for HN page structure
  - `HN_CLASSES` - HN CSS class names for building test fixtures

### Types
- `SortVariant`: 'default' | 'points' | 'time' | 'comments'
- `ParsedRow`: Contains DOM elements (title, info, spacer) and parsed numeric values for a single post

## Path Aliases

Use `~` prefix for imports from project root (e.g., `~app/components/ControlPanel`).

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
