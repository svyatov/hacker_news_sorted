import { readdirSync } from 'fs';
import path from 'path';

// @ts-expect-error Bun-specific API
const ROOT_DIR = path.resolve(import.meta.dir, '../..');
const BUILD_DIR = path.join(ROOT_DIR, 'build/chrome-mv3-prod');

export const SCREENSHOTS_DIR = path.join(ROOT_DIR, 'images');

const buildFiles = readdirSync(BUILD_DIR);
const cssFile = buildFiles.find((f) => f.startsWith('content.') && f.endsWith('.css'));
const jsFile = buildFiles.find((f) => f.startsWith('content.') && f.endsWith('.js'));
const commentsCssFile = buildFiles.find((f) => f.startsWith('comments.') && f.endsWith('.css'));
const commentsJsFile = buildFiles.find((f) => f.startsWith('comments.') && f.endsWith('.js'));
if (!cssFile || !jsFile || !commentsCssFile || !commentsJsFile) {
  throw new Error('Built assets not found. Run `bun run build` first.');
}

export const CSS_PATH = path.join(BUILD_DIR, cssFile);
export const JS_PATH = path.join(BUILD_DIR, jsFile);
export const COMMENTS_CSS_PATH = path.join(BUILD_DIR, commentsCssFile);
export const COMMENTS_JS_PATH = path.join(BUILD_DIR, commentsJsFile);
