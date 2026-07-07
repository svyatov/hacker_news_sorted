# Hacker News Sorted

[![Chrome Web Store Version](https://img.shields.io/chrome-web-store/v/djkcnbncofmjekhlhemlkinfpkamlkaj)](https://chrome.google.com/webstore/detail/hacker-news-sorted/djkcnbncofmjekhlhemlkinfpkamlkaj)
[![Chrome Web Store Users](https://img.shields.io/chrome-web-store/users/djkcnbncofmjekhlhemlkinfpkamlkaj)](https://chrome.google.com/webstore/detail/hacker-news-sorted/djkcnbncofmjekhlhemlkinfpkamlkaj)
[![Chrome Web Store Rating](https://img.shields.io/chrome-web-store/stars/djkcnbncofmjekhlhemlkinfpkamlkaj)](https://chrome.google.com/webstore/detail/hacker-news-sorted/djkcnbncofmjekhlhemlkinfpkamlkaj)
[![CI](https://img.shields.io/github/actions/workflow/status/svyatov/hacker_news_sorted/main.yml)](https://github.com/svyatov/hacker_news_sorted/actions)
[![codecov](https://codecov.io/gh/svyatov/hacker_news_sorted/graph/badge.svg)](https://codecov.io/gh/svyatov/hacker_news_sorted)
[![License](https://img.shields.io/github/license/svyatov/hacker_news_sorted)](https://github.com/svyatov/hacker_news_sorted/blob/main/LICENSE)

Sort [Hacker News](https://news.ycombinator.com) your way — by points, time, comments, velocity, or heat — instantly.

<img src="images/demo.gif" width="640" alt="Demo">

## Install

<a href="https://chrome.google.com/webstore/detail/hacker-news-sorted/djkcnbncofmjekhlhemlkinfpkamlkaj">
  <img src="images/webstore-badge.png" alt="Available in the Chrome Web Store" width="248" height="75">
</a>

## Features

- **Sort by Points** — Find the most upvoted stories
- **Sort by Time** — See the newest posts first
- **Sort by Comments** — Discover the most discussed topics
- **Sort by Velocity** — Surface the fastest-rising posts (points per hour, damped so brand-new posts don't dominate) — toggle on/off in the popup
- **Sort by Heat** — Find where the debate is (comments per point) — toggle on/off in the popup
- **Restore Default** — Return to HN's original ranking
- **New Post Indicators** — Orange dot marks posts that appeared since your last visit, fading out over a configurable period
- **True Time Ago** — Corrects misleading ages on resurfaced "second chance" posts
- **Comment Author Highlighting** — On thread pages, the story author's comments get a subtle tint and an "OP" badge; click the marker next to any other commenter's name to highlight that user's comments for the thread (persists across reloads). Two independent toggles in the popup
- **Keyboard Shortcuts** — Press `P`, `T`, `C`, `V`, `H`, or `D` to sort instantly
- **Responsive Menu** — Full sort names on wide screens, single-letter labels on medium screens, and a compact dropdown on narrow screens — always collapsing before it would crowd Hacker News's own header links
- **Persistent Preference** — Your last sort choice is remembered across sessions
- **Visual Highlighting** — Active sort column is highlighted for clarity
- **Layout Change Detection** — Warning badge and popup banner if HN changes break sorting
- **Vimium Compatible** — Shortcuts auto-disable if Vimium or similar extensions are detected, with a note naming the conflicting keys
- **Dark Mode** — Settings popup follows your system light/dark color scheme

**Compatibility:** Sorting works on any HN page with a post list (front page, Newest, Ask, Show, etc.); comment author highlighting works on thread (`item?id=`) pages.

## Privacy

No data collection, no external requests — works entirely in your browser.

## Tech Stack

Plasmo · React 19 · TypeScript · Vitest · Bun

## Development

```bash
git clone git://github.com/svyatov/hacker_news_sorted.git
cd hacker_news_sorted
bun install
bun dev
```

Then load the extension in Chrome: go to `chrome://extensions`, enable "Developer mode", click "Load unpacked", and select the `build/chrome-mv3-dev` folder.

```bash
bun run test           # Run tests
bun run test:watch     # Run tests in watch mode
bun run test:coverage  # Run tests with coverage report
bun run lint           # Run ESLint and Prettier checks
bun run fixture:update # Fetch fresh HN HTML for test fixtures
bun run screenshots    # Generate Chrome Web Store screenshots (requires build first)
```

## Issues

Found a bug or have a suggestion? [Open an issue](https://github.com/svyatov/hacker_news_sorted/issues).

## Contributing

1. Fork it
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Make your changes and run tests (`bun run test`)
4. Commit using [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) format (`git commit -m 'feat: add some feature'`)
5. Push to the branch (`git push origin my-new-feature`)
6. Create new Pull Request

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes, following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

## License

[MIT](LICENSE)
