import type { Page } from 'playwright';

import { CSS_CLASSES, DOT_USER_ATTR } from '~app/constants';

import { COMMENTS_CSS_PATH, COMMENTS_JS_PATH } from './paths';

/**
 * Inject the built comment content-script bundle into an already-loaded `item?id=` page,
 * then wait for a bundle-injected mark dot to confirm the script actually ran (a bare
 * comment row exists in raw HN HTML and would not prove injection).
 */
export async function injectCommentsBundle(page: Page): Promise<void> {
  await page.addStyleTag({ path: COMMENTS_CSS_PATH });
  await page.addScriptTag({ path: COMMENTS_JS_PATH });
  await page.waitForSelector(`.${CSS_CLASSES.MARK_DOT}`, { timeout: 5000 });
}

/** Click the mark dot for `username`, exercising the real onMark → nextMark → setMarkedUser path. */
export async function markUser(page: Page, username: string): Promise<void> {
  await page.click(`.${CSS_CLASSES.MARK_DOT}[${DOT_USER_ATTR}="${username}"]`);
  await page.waitForTimeout(150);
}
