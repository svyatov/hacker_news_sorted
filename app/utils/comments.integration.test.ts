import { describe, expect, it } from 'vitest';

import { loadAndSetupFixture, loadFixture } from '~app/__fixtures__/loadFixture';
import { flush, setupCommentThread } from '~app/__fixtures__/testHelpers';
import { CSS_CLASSES, HN_SELECTORS } from '~app/constants';

import { getCommentAuthor, getCommentRows, getStoryAuthor, startCommentEnhancements } from './comments';

// Guards against HN markup drift on item pages: every comment-page selector must still resolve
// against a real story thread. Refresh with `bun run fixture:update`.
describe('comment selectors (integration with live HN item HTML)', () => {
  it('identifies own comments from sanitized authentic account markup and stops after sign-out', async () => {
    setupCommentThread({ comments: [{ id: 'own', author: 'reader' }] });
    document.body.insertAdjacentHTML('afterbegin', loadFixture('hn-account-signed-in.html'));
    const dispose = startCommentEnhancements();
    await flush();
    expect(getCommentRows()[0]).toHaveTextContent('You');
    expect(getCommentRows()[0]?.querySelector(`.${CSS_CLASSES.MARK_DOT}`)).toBeNull();
    dispose();
    setupCommentThread({ comments: [{ id: 'own', author: 'reader' }] });
    document.body.insertAdjacentHTML('afterbegin', loadFixture('hn-account-signed-out.html'));
    const disposeAnonymous = startCommentEnhancements();
    await flush();
    expect(getCommentRows()[0]).not.toHaveTextContent('You');
    expect(getCommentRows()[0]?.querySelector(`.${CSS_CLASSES.MARK_DOT}`)).toHaveAccessibleName(
      'Highlight comments by reader',
    );
    disposeAnonymous();
  });

  it('matches every item-page HN_SELECTOR against real markup', () => {
    loadAndSetupFixture('hn-item.html');

    const cases: Array<[keyof typeof HN_SELECTORS, string]> = [
      ['STORY_AUTHOR', HN_SELECTORS.STORY_AUTHOR],
      ['STORY_LINK', HN_SELECTORS.STORY_LINK],
      ['COMMENT_ROWS', HN_SELECTORS.COMMENT_ROWS],
      ['COMMENT_AUTHOR', HN_SELECTORS.COMMENT_AUTHOR],
      ['COMMENT_HEAD', HN_SELECTORS.COMMENT_HEAD],
    ];

    for (const [name, selector] of cases) {
      expect(document.querySelectorAll(selector).length, `${name} should match at least one node`).toBeGreaterThan(0);
    }
  });

  // Presence checks above would pass even if HN moved the username out of `.comhead`; assert the
  // author helpers actually resolve a name against the real composite selectors they use.
  it('resolves getStoryAuthor and getCommentAuthor against real markup', () => {
    loadAndSetupFixture('hn-item.html');
    expect(getStoryAuthor()).toBeTruthy();
    expect(getCommentAuthor(getCommentRows()[0]!)).toBeTruthy();
  });
});
