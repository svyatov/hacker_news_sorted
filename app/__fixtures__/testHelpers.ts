import { vi } from 'vitest';

import { HN_CLASSES } from '~app/constants';

// Fake system time used across newPosts and useSettings tests
export const FAKE_NOW = 1_000_000_000_000;

// ── DOM helpers ──

export const setupTableBody = (ids: string[]): HTMLTableSectionElement => {
  const outerTable = document.createElement('table');
  outerTable.id = 'hnmain';
  const bigboxRow = document.createElement('tr');
  bigboxRow.id = 'bigbox';
  const bigboxTd = document.createElement('td');
  const innerTable = document.createElement('table');
  const tbody = document.createElement('tbody');

  for (const id of ids) {
    const tr = document.createElement('tr');
    tr.classList.add(HN_CLASSES.ATHING);
    tr.id = id;
    tbody.appendChild(tr);
    tbody.appendChild(document.createElement('tr'));
    const spacer = document.createElement('tr');
    spacer.classList.add(HN_CLASSES.SPACER);
    tbody.appendChild(spacer);
  }

  innerTable.appendChild(tbody);
  bigboxTd.appendChild(innerTable);
  bigboxRow.appendChild(bigboxTd);
  outerTable.appendChild(bigboxRow);
  document.body.appendChild(outerTable);
  return tbody;
};

export const clearBody = (): void => {
  document.body.replaceChildren();
};

export const getRowById = (id: string, root: ParentNode = document): HTMLElement =>
  root.querySelector(`[id="${id}"]`) as HTMLElement;

// ── Storage mock factory ──

export interface StorageMock {
  store: Record<string, unknown>;
  mockSet: ReturnType<typeof vi.fn>;
  mockGet: ReturnType<typeof vi.fn>;
  mockWatch: ReturnType<typeof vi.fn>;
  mockUnwatch: ReturnType<typeof vi.fn>;
  watcherCallbacks: Record<string, (change: { newValue: unknown }) => void>;
  reset: () => void;
  StorageClass: new () => Record<string, unknown>;
}

export const createStorageMock = (): StorageMock => {
  const store: Record<string, unknown> = {};
  const watcherCallbacks: Record<string, (change: { newValue: unknown }) => void> = {};

  const mockSet = vi.fn((key: string, value: unknown) => {
    store[key] = value;
    return Promise.resolve();
  });
  const mockGet = vi.fn((key: string) => Promise.resolve(store[key]));
  const mockWatch = vi.fn((map: Record<string, (change: { newValue: unknown }) => void>) => {
    Object.assign(watcherCallbacks, map);
  });
  const mockUnwatch = vi.fn();

  const reset = () => {
    for (const key of Object.keys(store)) delete store[key];
    for (const key of Object.keys(watcherCallbacks)) delete watcherCallbacks[key];
  };

  const StorageClass = class {
    get = mockGet;
    set = mockSet;
    watch = mockWatch;
    unwatch = mockUnwatch;
  } as unknown as new () => Record<string, unknown>;

  return { store, mockSet, mockGet, mockWatch, mockUnwatch, watcherCallbacks, reset, StorageClass };
};
