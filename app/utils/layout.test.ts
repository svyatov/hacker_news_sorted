import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearBody } from '~app/__fixtures__/testHelpers';

import { LAYOUT_TIMEOUT_MS, waitForPanelParent } from './layout';

// Minimal HN header so getControlPanelParentElement's CONTROL_PANEL_PARENT selector resolves.
// The last header cell (.hns-target) is the element waitForPanelParent should hand back.
const buildHeader = (): HTMLElement => {
  const table = document.createElement('table');
  table.id = 'hnmain';
  table.innerHTML =
    '<tr><td><span class="pagetop"><b class="hnname">HN</b></span></td><td class="hns-target"></td></tr>';
  return table;
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  clearBody();
});

describe('waitForPanelParent', () => {
  it('resolves the header cell immediately when it is already present', async () => {
    document.body.appendChild(buildHeader());
    const setSpy = vi.spyOn(globalThis, 'setTimeout');

    const parent = await waitForPanelParent();

    expect(parent).toHaveClass('hns-target');
    expect(setSpy, 'no timeout should be armed on the synchronous hit').not.toHaveBeenCalled();
  });

  it('resolves once the header appears and clears the pending timeout', async () => {
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');

    const promise = waitForPanelParent(1000);
    document.body.appendChild(buildHeader()); // triggers the MutationObserver
    const parent = await promise; // observer resolves on the next microtask

    expect(parent).toHaveClass('hns-target');
    expect(clearSpy, 'early resolve must cancel the broken-layout timeout').toHaveBeenCalled();
  });

  it('resolves null when the header never appears within the timeout', async () => {
    vi.useFakeTimers();

    const promise = waitForPanelParent(LAYOUT_TIMEOUT_MS);
    await vi.advanceTimersByTimeAsync(LAYOUT_TIMEOUT_MS);

    await expect(promise).resolves.toBeNull();
  });
});
