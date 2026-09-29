// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadFixture } from './loadFixture';
import { pickTopCommentedItemId } from './updateFixture';

describe('pickTopCommentedItemId', () => {
  it('returns the item id of the most-commented story', () => {
    const html = [
      '<a href="item?id=11">5&nbsp;comments</a>',
      '<a href="item?id=22">42&nbsp;comments</a>',
      '<a href="item?id=33">7&nbsp;comments</a>',
      '<a href="item?id=44">discuss</a>',
    ].join('');
    expect(pickTopCommentedItemId(html)).toBe('22');
  });

  it('finds a commented story on the real homepage markup', () => {
    expect(pickTopCommentedItemId(loadFixture('hn-homepage.html'))).toMatch(/^\d+$/);
  });

  it('throws when the homepage has no commented stories', () => {
    expect(() => pickTopCommentedItemId('<html>no stories</html>')).toThrow();
  });
});

// The updater keeps its own user agent string (importing the generators' one would add an app-to-scripts
// import), so a CHROME_MAJOR bump fails here until the updater's Chrome version follows it.
describe('updater user agent', () => {
  it('sends the Chrome version in CHROME_MAJOR', () => {
    const read = (file: string) => readFileSync(join(__dirname, '..', '..', file), 'utf8');
    const [, chromeMajor] = read('scripts/screenshots/constants.ts').match(/CHROME_MAJOR = '(\d+)'/)!;
    const [, updaterMajor] = read('app/__fixtures__/updateFixture.ts').match(/Chrome\/(\d+)\./)!;
    expect(updaterMajor).toBe(chromeMajor);
  });
});
