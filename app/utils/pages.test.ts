import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearBody, setupCommentThread } from '~app/__fixtures__/testHelpers';

import { getItemId, isStoryPage } from './pages';

describe('getItemId', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('extracts the id from the query string', () => {
    vi.stubGlobal('location', { search: '?id=48808482' });
    expect(getItemId()).toBe('48808482');
  });

  it('returns null when no id is present', () => {
    vi.stubGlobal('location', { search: '?foo=bar' });
    expect(getItemId()).toBeNull();
  });
});

describe('isStoryPage', () => {
  afterEach(clearBody);

  it('is true on a canonical story page (fatitem carries a title link)', () => {
    setupCommentThread({ isStory: true, comments: [{ id: '1', author: 'a' }] });
    expect(isStoryPage()).toBe(true);
  });

  it('is false on a comment-permalink page (fatitem is a comment)', () => {
    setupCommentThread({ isStory: false, comments: [{ id: '1', author: 'a' }] });
    expect(isStoryPage()).toBe(false);
  });
});
