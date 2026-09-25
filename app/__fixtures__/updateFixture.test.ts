// @vitest-environment node
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
