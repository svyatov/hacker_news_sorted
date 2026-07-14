import { readdirSync } from 'node:fs';
import path from 'node:path';

// @ts-expect-error Bun-specific API
const ROOT_DIR = path.resolve(import.meta.dir, '../..');
const BUILD_DIR = path.join(ROOT_DIR, '.output/chrome-mv3');
// WXT emits content scripts under content-scripts/<entrypoint>.{js,css} (verified from a real build, KTD-8).
const CONTENT_SCRIPTS_DIR = path.join(BUILD_DIR, 'content-scripts');

export const SCREENSHOTS_DIR = path.join(ROOT_DIR, 'images');

// Glob by entrypoint-name prefix and fail loud if missing, rather than hardcoding (WXT may add hashes).
const csFiles = readdirSync(CONTENT_SCRIPTS_DIR);
const jsFile = csFiles.find((f) => f.startsWith('hn-sort.') && f.endsWith('.js'));
const cssFile = csFiles.find((f) => f.startsWith('hn-sort.') && f.endsWith('.css'));
const commentsJsFile = csFiles.find((f) => f.startsWith('comments.') && f.endsWith('.js'));
const commentsCssFile = csFiles.find((f) => f.startsWith('comments.') && f.endsWith('.css'));
if (!cssFile || !jsFile || !commentsCssFile || !commentsJsFile) {
  throw new Error('Built content-script assets not found in .output/chrome-mv3. Run `bun run build` first.');
}

export const CSS_PATH = path.join(CONTENT_SCRIPTS_DIR, cssFile);
export const JS_PATH = path.join(CONTENT_SCRIPTS_DIR, jsFile);
export const COMMENTS_CSS_PATH = path.join(CONTENT_SCRIPTS_DIR, commentsCssFile);
export const COMMENTS_JS_PATH = path.join(CONTENT_SCRIPTS_DIR, commentsJsFile);
