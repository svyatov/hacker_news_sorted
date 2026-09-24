import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { setupHNHomepage } from '~app/__fixtures__/loadFixture';
import { clearBody } from '~app/__fixtures__/testHelpers';

import { useParsedRows } from './useParsedRows';

afterEach(clearBody);

describe('useParsedRows', () => {
  it('returns nothing when the page has no list table', () => {
    const { result } = renderHook(() => useParsedRows());
    expect(result.current).toEqual({ parsedRows: [], footerRows: [] });
  });

  it('parses one row set per post and splits off the "More" footer', () => {
    setupHNHomepage();
    const { result } = renderHook(() => useParsedRows());
    const { parsedRows, footerRows } = result.current;

    expect(parsedRows).toHaveLength(document.querySelectorAll('tr.athing.submission').length);
    expect(parsedRows[0]).toMatchObject({ originalIndex: 0, title: document.querySelector('tr.athing.submission') });
    expect(parsedRows[0]!.time).toBeGreaterThan(0);
    expect(footerRows).toHaveLength(2);
    expect(footerRows[1]!.querySelector('.morelink')).not.toBeNull();
  });
});
