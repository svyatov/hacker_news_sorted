import { defineContentScript } from '#imports';

import { SETTINGS_KEYS } from '~app/constants';
import { applyCommentEnhancements, getMarkedUser, nextMark, setMarkedUser } from '~app/utils/comments';
import { watchSettings } from '~app/utils/settings';

import './comments.css';

export default defineContentScript({
  matches: ['*://news.ycombinator.com/item*'],
  cssInjectionMode: 'manifest',
  noScriptStartedPostMessage: true,
  main() {
    // Re-applies with the latest toggles. Set by the first settings snapshot, which also injects the dots
    // that are the only other caller (via onMark).
    let apply = (): void => {};

    // Single mark per thread: clicking the active user's dot clears it, any other user replaces it.
    const onMark = (username: string): void => {
      setMarkedUser(nextMark(getMarkedUser(), username));
      apply();
    };

    // Applies once both toggles load, then again on every popup change.
    watchSettings([SETTINGS_KEYS.OP_HIGHLIGHT, SETTINGS_KEYS.MARK_USER_HIGHLIGHT], (values) => {
      apply = () =>
        applyCommentEnhancements({
          opEnabled: values[SETTINGS_KEYS.OP_HIGHLIGHT],
          markEnabled: values[SETTINGS_KEYS.MARK_USER_HIGHLIGHT],
          onMark,
        });
      apply();
    });
  },
});
