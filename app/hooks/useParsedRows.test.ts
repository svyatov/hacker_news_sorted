import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { setupHNHomepage } from '~app/__fixtures__/loadFixture';
import { clearBody } from '~app/__fixtures__/testHelpers';

import { useParsedRows } from './useParsedRows';

afterEach(clearBody);

describe('useParsedRows', () => {
  it('returns nothing when the page has no list table', () => {
    const { result } = renderHook(() => useParsedRows());
    expect(result.current).toEqual([]);
  });

  it('parses one row set per post', () => {
    setupHNHomepage();
    const { result } = renderHook(() => useParsedRows());
    const parsedRows = result.current;

    expect(parsedRows).toHaveLength(30);
    expect(parsedRows[0]).toMatchObject({ originalIndex: 0, title: document.querySelector('tr.athing.submission') });
    expect(parsedRows[0]!.info.querySelector('.subtext')).not.toBeNull();
    expect(parsedRows.every((row) => row.spacer.classList.contains('spacer'))).toBe(true);
    expect(parsedRows[0]!.time).toBeGreaterThan(0);
  });
});
