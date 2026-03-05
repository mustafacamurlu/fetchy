/**
 * Tests for src/store/entityIndex.ts — Normalized entity index (#26).
 *
 * Validates O(1) entity lookup, incremental index maintenance, ancestor
 * chain building, and navigation helpers.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildEntityIndex,
  createEntityIndex,
  reindexCollection,
  removeCollectionFromIndex,
  indexRequest,
  indexFolder,
  unindexRequest,
  unindexFolder,
  getAncestorChain,
  navigateToFolder,
  getRequestContainer,
  getFolderContainer,
  type EntityIndex,
} from '../src/store/entityIndex';
import type { Collection, RequestFolder, ApiRequest } from '../src/types';
import { createDefaultRequest } from '../src/store/requestTree';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeReq(id: string, overrides?: Partial<ApiRequest>): ApiRequest {
  return createDefaultRequest({ id, name: `Req ${id}`, ...overrides });
}

function makeFolder(id: string, opts?: Partial<RequestFolder>): RequestFolder {
  return { id, name: `Folder ${id}`, requests: [], folders: [], expanded: false, ...opts };
}

/**
 * Build a sample tree:
 *
 * Collection "col-1":
 *   folders: [A (requests: [r1, r2]), B (folders: [C (requests: [r3])], requests: [r4])]
 *   requests: [r5]
 *
 * Collection "col-2":
 *   folders: [D (requests: [r6])]
 *   requests: [r7]
 */
function buildTestData(): { collections: Collection[]; index: EntityIndex } {
  const r1 = makeReq('r1');
  const r2 = makeReq('r2');
  const r3 = makeReq('r3');
  const r4 = makeReq('r4');
  const r5 = makeReq('r5');
  const r6 = makeReq('r6');
  const r7 = makeReq('r7');

  const folderC = makeFolder('C', { requests: [r3] });
  const folderA = makeFolder('A', { requests: [r1, r2] });
  const folderB = makeFolder('B', { folders: [folderC], requests: [r4] });
  const folderD = makeFolder('D', { requests: [r6] });

  const col1: Collection = {
    id: 'col-1',
    name: 'Collection 1',
    folders: [folderA, folderB],
    requests: [r5],
  };

  const col2: Collection = {
    id: 'col-2',
    name: 'Collection 2',
    folders: [folderD],
    requests: [r7],
  };

  const collections = [col1, col2];
  const index = buildEntityIndex(collections);

  return { collections, index };
}

// ─── buildEntityIndex ────────────────────────────────────────────────────────

describe('buildEntityIndex', () => {
  it('indexes all requests across collections', () => {
    const { index } = buildTestData();
    expect(index.requests.size).toBe(7); // r1-r7
    expect(index.requests.has('r1')).toBe(true);
    expect(index.requests.has('r7')).toBe(true);
  });

  it('indexes all folders across collections', () => {
    const { index } = buildTestData();
    expect(index.folders.size).toBe(4); // A, B, C, D
    expect(index.folders.has('A')).toBe(true);
    expect(index.folders.has('D')).toBe(true);
  });

  it('stores correct parent for top-level requests', () => {
    const { index } = buildTestData();
    const loc = index.requests.get('r5');
    expect(loc).toEqual({ collectionId: 'col-1', parentId: null });
  });

  it('stores correct parent for folder-nested requests', () => {
    const { index } = buildTestData();
    expect(index.requests.get('r1')).toEqual({ collectionId: 'col-1', parentId: 'A' });
    expect(index.requests.get('r3')).toEqual({ collectionId: 'col-1', parentId: 'C' });
    expect(index.requests.get('r4')).toEqual({ collectionId: 'col-1', parentId: 'B' });
  });

  it('stores correct parent for top-level folders', () => {
    const { index } = buildTestData();
    expect(index.folders.get('A')).toEqual({ collectionId: 'col-1', parentId: null });
    expect(index.folders.get('B')).toEqual({ collectionId: 'col-1', parentId: null });
  });

  it('stores correct parent for nested folders', () => {
    const { index } = buildTestData();
    expect(index.folders.get('C')).toEqual({ collectionId: 'col-1', parentId: 'B' });
  });

  it('handles empty collections', () => {
    const index = buildEntityIndex([]);
    expect(index.requests.size).toBe(0);
    expect(index.folders.size).toBe(0);
  });

  it('handles collections with no folders or requests', () => {
    const emptyCol: Collection = { id: 'e', name: 'Empty', folders: [], requests: [] };
    const index = buildEntityIndex([emptyCol]);
    expect(index.requests.size).toBe(0);
    expect(index.folders.size).toBe(0);
  });
});

// ─── reindexCollection ──────────────────────────────────────────────────────

describe('reindexCollection', () => {
  it('updates the index after a collection is modified', () => {
    const { collections, index } = buildTestData();

    // Simulate adding a new request to collection 1
    const r8 = makeReq('r8');
    collections[0].requests.push(r8);

    reindexCollection(index, collections[0]);

    expect(index.requests.has('r8')).toBe(true);
    expect(index.requests.get('r8')).toEqual({ collectionId: 'col-1', parentId: null });
    // Existing entries should still be correct
    expect(index.requests.has('r1')).toBe(true);
  });

  it('removes stale entries when entities are removed from collection', () => {
    const { collections, index } = buildTestData();

    // Remove r1 from folder A
    collections[0].folders[0].requests = collections[0].folders[0].requests.filter(r => r.id !== 'r1');

    reindexCollection(index, collections[0]);

    expect(index.requests.has('r1')).toBe(false);
    expect(index.requests.has('r2')).toBe(true); // r2 still in folder A
  });

  it('does not affect other collections', () => {
    const { collections, index } = buildTestData();

    reindexCollection(index, collections[0]);

    // col-2 entities should be unchanged
    expect(index.requests.get('r6')).toEqual({ collectionId: 'col-2', parentId: 'D' });
    expect(index.requests.get('r7')).toEqual({ collectionId: 'col-2', parentId: null });
  });
});

// ─── removeCollectionFromIndex ──────────────────────────────────────────────

describe('removeCollectionFromIndex', () => {
  it('removes all entries belonging to the collection', () => {
    const { index } = buildTestData();

    removeCollectionFromIndex(index, 'col-1');

    // All col-1 entities gone
    expect(index.requests.has('r1')).toBe(false);
    expect(index.requests.has('r5')).toBe(false);
    expect(index.folders.has('A')).toBe(false);
    expect(index.folders.has('C')).toBe(false);

    // col-2 entities remain
    expect(index.requests.has('r6')).toBe(true);
    expect(index.requests.has('r7')).toBe(true);
    expect(index.folders.has('D')).toBe(true);
  });
});

// ─── Incremental updates ────────────────────────────────────────────────────

describe('indexRequest / unindexRequest', () => {
  it('adds and removes a request from the index', () => {
    const index = createEntityIndex();

    indexRequest(index, 'new-r', 'col-1', 'folder-A');
    expect(index.requests.has('new-r')).toBe(true);
    expect(index.requests.get('new-r')).toEqual({ collectionId: 'col-1', parentId: 'folder-A' });

    unindexRequest(index, 'new-r');
    expect(index.requests.has('new-r')).toBe(false);
  });
});

describe('indexFolder / unindexFolder', () => {
  it('indexes a folder and its nested children', () => {
    const index = createEntityIndex();
    const innerReq = makeReq('ir1');
    const innerFolder = makeFolder('inner', { requests: [innerReq] });
    const outerFolder = makeFolder('outer', { folders: [innerFolder], requests: [makeReq('ir2')] });

    indexFolder(index, outerFolder, 'col-1', null);

    expect(index.folders.has('outer')).toBe(true);
    expect(index.folders.has('inner')).toBe(true);
    expect(index.requests.has('ir1')).toBe(true);
    expect(index.requests.has('ir2')).toBe(true);
    expect(index.folders.get('inner')).toEqual({ collectionId: 'col-1', parentId: 'outer' });
  });

  it('unindexes a folder and all nested children', () => {
    const { index } = buildTestData();

    // Folder B contains folder C (with r3) and r4
    const folderB: RequestFolder = {
      id: 'B',
      name: 'Folder B',
      folders: [{ id: 'C', name: 'Folder C', requests: [makeReq('r3')], folders: [] }],
      requests: [makeReq('r4')],
    };

    unindexFolder(index, folderB);

    expect(index.folders.has('B')).toBe(false);
    expect(index.folders.has('C')).toBe(false);
    expect(index.requests.has('r3')).toBe(false);
    expect(index.requests.has('r4')).toBe(false);
    // Other entities still indexed
    expect(index.requests.has('r1')).toBe(true);
  });
});

// ─── getAncestorChain ───────────────────────────────────────────────────────

describe('getAncestorChain', () => {
  it('returns empty array for a top-level folder', () => {
    const { index } = buildTestData();
    expect(getAncestorChain(index, 'A')).toEqual([]);
    expect(getAncestorChain(index, 'B')).toEqual([]);
  });

  it('returns parent IDs for a nested folder', () => {
    const { index } = buildTestData();
    // C is inside B, which is at root
    expect(getAncestorChain(index, 'C')).toEqual(['B']);
  });

  it('returns null for a non-existent folder', () => {
    const { index } = buildTestData();
    expect(getAncestorChain(index, 'nonexistent')).toBeNull();
  });

  it('handles deeply nested folders', () => {
    const deep = makeFolder('deep');
    const mid = makeFolder('mid', { folders: [deep] });
    const top = makeFolder('top', { folders: [mid] });

    const col: Collection = { id: 'c', name: 'C', folders: [top], requests: [] };
    const index = buildEntityIndex([col]);

    expect(getAncestorChain(index, 'deep')).toEqual(['top', 'mid']);
    expect(getAncestorChain(index, 'mid')).toEqual(['top']);
    expect(getAncestorChain(index, 'top')).toEqual([]);
  });
});

// ─── navigateToFolder ───────────────────────────────────────────────────────

describe('navigateToFolder', () => {
  it('navigates to a top-level folder', () => {
    const { collections, index } = buildTestData();
    const folder = navigateToFolder(collections[0], index, 'A');
    expect(folder).not.toBeNull();
    expect(folder!.id).toBe('A');
    expect(folder!.name).toBe('Folder A');
  });

  it('navigates to a nested folder', () => {
    const { collections, index } = buildTestData();
    const folder = navigateToFolder(collections[0], index, 'C');
    expect(folder).not.toBeNull();
    expect(folder!.id).toBe('C');
  });

  it('returns null for a non-existent folder', () => {
    const { collections, index } = buildTestData();
    expect(navigateToFolder(collections[0], index, 'ghost')).toBeNull();
  });

  it('returns null when folder is in a different collection', () => {
    const { collections, index } = buildTestData();
    // D is in col-2, not col-1
    expect(navigateToFolder(collections[0], index, 'D')).toBeNull();
  });

  it('returns the actual object reference for mutation', () => {
    const { collections, index } = buildTestData();
    const folder = navigateToFolder(collections[0], index, 'A');
    expect(folder).toBe(collections[0].folders[0]); // same reference
  });
});

// ─── getRequestContainer ────────────────────────────────────────────────────

describe('getRequestContainer', () => {
  it('finds container for a top-level request', () => {
    const { collections, index } = buildTestData();
    const container = getRequestContainer(collections, index, 'r5');
    expect(container).not.toBeNull();
    expect(container!.requests).toBe(collections[0].requests);
    expect(container!.collection).toBe(collections[0]);
  });

  it('finds container for a request in a direct child folder', () => {
    const { collections, index } = buildTestData();
    const container = getRequestContainer(collections, index, 'r1');
    expect(container).not.toBeNull();
    expect(container!.requests[0].id).toBe('r1');
  });

  it('finds container for a deeply nested request', () => {
    const { collections, index } = buildTestData();
    const container = getRequestContainer(collections, index, 'r3');
    expect(container).not.toBeNull();
    // r3 is in folder C
    expect(container!.requests.some(r => r.id === 'r3')).toBe(true);
  });

  it('returns null for a non-existent request', () => {
    const { collections, index } = buildTestData();
    expect(getRequestContainer(collections, index, 'nonexistent')).toBeNull();
  });

  it('finds requests in the second collection', () => {
    const { collections, index } = buildTestData();
    const container = getRequestContainer(collections, index, 'r7');
    expect(container).not.toBeNull();
    expect(container!.collection.id).toBe('col-2');
  });
});

// ─── getFolderContainer ─────────────────────────────────────────────────────

describe('getFolderContainer', () => {
  it('finds container for a top-level folder', () => {
    const { collections, index } = buildTestData();
    const container = getFolderContainer(collections, index, 'A');
    expect(container).not.toBeNull();
    expect(container!.folders).toBe(collections[0].folders);
  });

  it('finds container for a nested folder', () => {
    const { collections, index } = buildTestData();
    const container = getFolderContainer(collections, index, 'C');
    expect(container).not.toBeNull();
    // C's parent is B, so the container's folders array is B's folders
    expect(container!.folders.some(f => f.id === 'C')).toBe(true);
  });

  it('returns null for a non-existent folder', () => {
    const { collections, index } = buildTestData();
    expect(getFolderContainer(collections, index, 'ghost')).toBeNull();
  });
});

// ─── Integration: index stays correct through operations ────────────────────

describe('integration: index correctness through mutations', () => {
  let collections: Collection[];
  let index: EntityIndex;

  beforeEach(() => {
    const data = buildTestData();
    collections = data.collections;
    index = data.index;
  });

  it('adding a request and querying immediately works', () => {
    const newReq = makeReq('r99');
    collections[0].requests.push(newReq);
    indexRequest(index, 'r99', 'col-1', null);

    const container = getRequestContainer(collections, index, 'r99');
    expect(container).not.toBeNull();
    expect(container!.requests.some(r => r.id === 'r99')).toBe(true);
  });

  it('deleting a request and querying returns null', () => {
    collections[0].requests = collections[0].requests.filter(r => r.id !== 'r5');
    unindexRequest(index, 'r5');

    expect(getRequestContainer(collections, index, 'r5')).toBeNull();
  });

  it('moving a request between collections updates correctly', () => {
    // Move r1 from col-1/folder-A to col-2 root
    const r1 = collections[0].folders[0].requests.find(r => r.id === 'r1')!;
    collections[0].folders[0].requests = collections[0].folders[0].requests.filter(r => r.id !== 'r1');
    collections[1].requests.push(r1);

    unindexRequest(index, 'r1');
    indexRequest(index, 'r1', 'col-2', null);

    const container = getRequestContainer(collections, index, 'r1');
    expect(container).not.toBeNull();
    expect(container!.collection.id).toBe('col-2');
  });

  it('full reindex after structural changes restores consistency', () => {
    // Make drastic changes
    const newFolder = makeFolder('X', { requests: [makeReq('rx1'), makeReq('rx2')] });
    collections[0].folders.push(newFolder);
    collections[0].requests = []; // remove r5

    reindexCollection(index, collections[0]);

    expect(index.requests.has('r5')).toBe(false);
    expect(index.requests.has('rx1')).toBe(true);
    expect(index.requests.has('rx2')).toBe(true);
    expect(index.folders.has('X')).toBe(true);
    expect(index.folders.get('X')).toEqual({ collectionId: 'col-1', parentId: null });
  });
});
