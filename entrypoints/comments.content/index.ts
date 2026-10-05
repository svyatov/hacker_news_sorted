import { defineContentScript } from '#imports';

import { startCommentEnhancements } from '~app/utils/comments';

import './comments.css';

export default defineContentScript({
  matches: ['*://news.ycombinator.com/item*'],
  cssInjectionMode: 'manifest',
  noScriptStartedPostMessage: true,
  main(ctx) {
    ctx.onInvalidated(startCommentEnhancements());
  },
});
