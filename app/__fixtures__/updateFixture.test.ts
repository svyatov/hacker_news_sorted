import { describe, expect, it } from 'vitest';

import { loadFixture } from './loadFixture';
import { pickTopCommentedItemId } from './updateFixture';

describe('pickTopCommentedItemId', () => {
  it('returns the item id of the most-commented story on the homepage', () => {
    const html = loadFixture('hn-homepage.html');
    const id = pickTopCommentedItemId(html);

    const counts = [...html.matchAll(/item\?id=(\d+)">(\d+)&nbsp;comments/g)];
    const max = counts.reduce((best, m) => (Number(m[2]) > Number(best[2]) ? m : best));
    expect(id).toBe(max[1]);
  });

  it('throws when the homepage has no commented stories', () => {
    expect(() => pickTopCommentedItemId('<html>no stories</html>')).toThrow();
  });
});
