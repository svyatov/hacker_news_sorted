# Hacker News Sorted

[![Chrome Web Store Version](https://img.shields.io/chrome-web-store/v/djkcnbncofmjekhlhemlkinfpkamlkaj)](https://chrome.google.com/webstore/detail/hacker-news-sorted/djkcnbncofmjekhlhemlkinfpkamlkaj)
[![Chrome Web Store Users](https://img.shields.io/chrome-web-store/users/djkcnbncofmjekhlhemlkinfpkamlkaj)](https://chrome.google.com/webstore/detail/hacker-news-sorted/djkcnbncofmjekhlhemlkinfpkamlkaj)
[![Chrome Web Store Rating](https://img.shields.io/chrome-web-store/stars/djkcnbncofmjekhlhemlkinfpkamlkaj)](https://chrome.google.com/webstore/detail/hacker-news-sorted/djkcnbncofmjekhlhemlkinfpkamlkaj)
[![CI](https://img.shields.io/github/actions/workflow/status/svyatov/hacker_news_sorted/main.yml)](https://github.com/svyatov/hacker_news_sorted/actions)
[![License](https://img.shields.io/github/license/svyatov/hacker_news_sorted)](https://github.com/svyatov/hacker_news_sorted/blob/main/LICENSE)

A Chrome extension that adds sorting capabilities to [Hacker News](https://news.ycombinator.com). Quickly re-order posts by points, time, or comment count with a single click or keyboard shortcut.

## Features

- **Sort by Points** — Find the most upvoted stories
- **Sort by Time** — See the newest posts first
- **Sort by Comments** — Discover the most discussed topics
- **Restore Default** — Return to HN's original ranking
- **Keyboard Shortcuts** — Press `P`, `T`, `C`, or `D` to sort instantly
- **Persistent Preference** — Your last sort choice is remembered across sessions
- **Visual Highlighting** — Active sort column is highlighted for clarity
- **Vimium Compatible** — Shortcuts auto-disable if Vimium or similar extensions are detected

## Install

[![Install](images/webstore-badge.png)](https://chrome.google.com/webstore/detail/hacker-news-sorted/djkcnbncofmjekhlhemlkinfpkamlkaj)

## Development

```bash
git clone git://github.com/svyatov/hacker_news_sorted.git
cd hacker_news_sorted
bun install
bun dev
```

Then load the extension in Chrome: go to `chrome://extensions`, enable "Developer mode", click "Load unpacked", and select the `build/chrome-mv3-dev` folder.

## Issues

Found a bug or have a suggestion? [Open an issue](https://github.com/svyatov/hacker_news_sorted/issues).

## Contributing

1. Fork it
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Make your changes and run tests (`bun run test`)
4. Commit your changes (`git commit -am 'Added some feature'`)
5. Push to the branch (`git push origin my-new-feature`)
6. Create new Pull Request
