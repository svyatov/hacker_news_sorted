import { defineContentScript } from '#imports';

import { SETTINGS_DEFAULTS, SETTINGS_KEYS } from '~app/constants';
import { applyCommentEnhancements, getMarkedUser, nextMark, setMarkedUser } from '~app/utils/comments';
import { watchSettings } from '~app/utils/settings';

import './comments.css';

export default defineContentScript({
  matches: ['*://news.ycombinator.com/item*'],
  cssInjectionMode: 'manifest',
  noScriptStartedPostMessage: true,
  main() {
    const toggles = {
      opEnabled: SETTINGS_DEFAULTS[SETTINGS_KEYS.OP_HIGHLIGHT],
      markEnabled: SETTINGS_DEFAULTS[SETTINGS_KEYS.MARK_USER_HIGHLIGHT],
    };

    // Single mark per thread: clicking the active user's dot clears it, any other user replaces it.
    const onMark = (username: string): void => {
      setMarkedUser(nextMark(getMarkedUser(), username));
      apply();
    };

    const apply = (): void => applyCommentEnhancements({ ...toggles, onMark });

    // Applies once both toggles load, then again on every popup change.
    watchSettings([SETTINGS_KEYS.OP_HIGHLIGHT, SETTINGS_KEYS.MARK_USER_HIGHLIGHT], (values) => {
      toggles.opEnabled = values[SETTINGS_KEYS.OP_HIGHLIGHT];
      toggles.markEnabled = values[SETTINGS_KEYS.MARK_USER_HIGHLIGHT];
      apply();
    });
  },
});
