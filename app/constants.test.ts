import { describe, expect, it } from 'vitest';

import { SORT_PANEL_EXCLUDE_MATCHES } from '~app/constants';

// Chrome matches the pattern's path part against path + query, with `*` as the only wildcard.
const toRegExp = (pattern: string): RegExp =>
  new RegExp(`^${pattern.replace(/[.?+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
const isExcluded = (path: string): boolean =>
  SORT_PANEL_EXCLUDE_MATCHES.some((pattern) => toRegExp(pattern).test(`https://news.ycombinator.com/${path}`));

describe('SORT_PANEL_EXCLUDE_MATCHES', () => {
  it.each([
    'item?id=1',
    'threads?id=pg',
    'newcomments',
    'context?id=1',
    'bestcomments',
    'noobcomments',
    'highlights',
    'submit',
    'reply?id=1',
    'login?goto=news',
    'forgot',
    'changepw',
    'newpoll',
    'user?id=pg',
    'x?fnid=abc',
    'lists',
    'leaders',
    'newsguidelines.html',
    'newsfaq.html',
    'formatdoc',
  ])('excludes the listless page %s', (path) => {
    expect(isExcluded(path)).toBe(true);
  });

  it.each([
    '',
    'news',
    'newest',
    'front?day=2026-01-01',
    'best',
    'ask',
    'show',
    'shownew',
    'jobs',
    'active',
    'noobstories',
    'submitted?id=pg',
    'favorites?id=pg',
    'upvoted?id=pg',
    'from?site=example.com',
    'news?p=2',
  ])('keeps the story list %s', (path) => {
    expect(isExcluded(path)).toBe(false);
  });
});
