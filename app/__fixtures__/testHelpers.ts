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

// ── Comment-thread DOM builder (mirrors HN's item-page markup) ──

export interface CommentSpec {
  id: string;
  author: string;
  collapsed?: boolean;
  indent?: number;
}

export interface CommentThreadOptions {
  storyAuthor?: string | null; // submitter (story) or permalinked comment author; null → no author node
  isStory?: boolean; // true → .fatitem carries a story titleline; false → comment-permalink page (KTD-8)
  comments?: CommentSpec[];
}

const userLink = (author: string | null): string =>
  author ? `<a href="user?id=${author}" class="${HN_CLASSES.HNUSER}">${author}</a>` : '';

const commentRow = ({ id, author, collapsed = false, indent = 0 }: CommentSpec): string => `
  <tr class="${HN_CLASSES.ATHING} ${HN_CLASSES.COMTR}${collapsed ? ' coll' : ''}" id="${id}">
    <td><table><tr>
      <td class="ind" indent="${indent}"></td>
      <td class="default">
        <div><span class="${HN_CLASSES.COMHEAD}">${userLink(author)}
          <span class="${HN_CLASSES.AGE}" title="2026-07-06T18:00:00 1783363200"><a href="item?id=${id}">1 hour ago</a></span>
        </span></div>
        <div class="comment"><div class="commtext c00">comment ${id}</div></div>
      </td>
    </tr></table></td>
  </tr>`;

export const setupCommentThread = (options: CommentThreadOptions = {}): void => {
  const { storyAuthor = 'story_author', isStory = true, comments = [] } = options;

  const fatitem = isStory
    ? `<table class="${HN_CLASSES.FATITEM}">
        <tr class="${HN_CLASSES.ATHING} submission" id="story">
          <td class="title"><span class="${HN_CLASSES.TITLELINE}"><a href="https://example.com">A Story Title</a></span></td>
        </tr>
        <tr><td class="subtext"><span class="subline">${userLink(storyAuthor)}
          <span class="${HN_CLASSES.AGE}" title="2026-07-06T16:00:00 1783356000">3 hours ago</span></span></td></tr>
      </table>`
    : `<table class="${HN_CLASSES.FATITEM}">
        <tr class="${HN_CLASSES.ATHING}" id="permalink">
          <td class="default"><div><span class="${HN_CLASSES.COMHEAD}">${userLink(storyAuthor)}
            <span class="${HN_CLASSES.AGE}" title="2026-07-06T16:00:00 1783356000">3 hours ago</span></span></div></td>
        </tr>
      </table>`;

  const tree = `<table class="comment-tree">${comments.map(commentRow).join('')}</table>`;
  document.body.innerHTML = `<center><table id="hnmain"><tr id="bigbox"><td>${fatitem}${tree}</td></tr></table></center>`;
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
