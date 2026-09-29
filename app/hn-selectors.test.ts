// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// HN_SELECTORS in app/constants.ts is the one place HN markup lives, so a markup change is fixed
// there and the monitor's integration tests cover it. A selector string copied into app code or a
// generator script escapes both; this check fails on any string literal that names HN markup.
const ROOT = join(__dirname, '..');
const HN_MARKUP =
  /#(hnmain|bigbox)\b|\.(athing|submission|comtr|comhead|hnuser|fatitem|titleline|subtext|score|age|pagetop|hnname|comment-tree)\b/;
const STRING_LITERAL = /'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g;

const sourceFiles = ['app', 'entrypoints', 'scripts'].flatMap((dir) =>
  readdirSync(join(ROOT, dir), { recursive: true, encoding: 'utf8' })
    .map((file) => join(dir, file))
    .filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file) && file !== join('app', 'constants.ts')),
);

const stripComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');

describe('HN selectors', () => {
  it('live only in HN_SELECTORS', () => {
    const copies = sourceFiles.flatMap((file) =>
      (stripComments(readFileSync(join(ROOT, file), 'utf8')).match(STRING_LITERAL) ?? [])
        .filter((literal) => HN_MARKUP.test(literal))
        .map((literal) => `${file}: ${literal}`),
    );
    expect(copies).toEqual([]);
  });
});
