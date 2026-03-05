/**
 * Tests for src/store/requestTree.ts — Tree CRUD operations.
 *
 * Covers findRequest, findAndUpdateRequest, findAndDeleteRequest,
 * findAndUpdateFolder, and findAndDeleteFolder.
 *
 * The simpler functions (createDefaultRequest, addRequestToFolder, addSubFolder)
 * are already tested in empty-collection-new-request.test.ts.
 */
import { describe, it, expect } from 'vitest';
import {
  createDefaultRequest,
  findRequest,
  findAndUpdateRequest,
  findAndDeleteRequest,
  findAndUpdateFolder,
  findAndDeleteFolder,
} from '../src/store/requestTree';
import type { ApiRequest, RequestFolder } from '../src/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeFolder(id: string, opts?: Partial<RequestFolder>): RequestFolder {
  return { id, name: `Folder ${id}`, requests: [], folders: [], expanded: false, ...opts };
}

function makeReq(id: string, opts?: Partial<ApiRequest>): ApiRequest {
  return createDefaultRequest({ id, name: `Request ${id}`, ...opts });
}

// Build a sample tree:
// folders: [
//   A (requests: [r1, r2])
//   B (folders: [C (requests: [r3])], requests: [r4])
// ]
// top-level requests: [r5]

function buildTree() {
  const r1 = makeReq('r1');
  const r2 = makeReq('r2');
  const r3 = makeReq('r3');
  const r4 = makeReq('r4');
  const r5 = makeReq('r5');

  const folderC = makeFolder('C', { requests: [r3] });
  const folderA = makeFolder('A', { requests: [r1, r2] });
  const folderB = makeFolder('B', { folders: [folderC], requests: [r4] });

  return { folders: [folderA, folderB], requests: [r5], r1, r2, r3, r4, r5, folderA, folderB, folderC };
}

// ─── findRequest ─────────────────────────────────────────────────────────────

describe('findRequest', () => {
  it('finds a top-level request', () => {
    const { folders, requests, r5 } = buildTree();
    expect(findRequest(folders, requests, 'r5')).toEqual(r5);
  });

  it('finds a request in a direct child folder', () => {
    const { folders, requests, r1 } = buildTree();
    expect(findRequest(folders, requests, 'r1')).toEqual(r1);
  });

  it('finds a request in a nested folder', () => {
    const { folders, requests, r3 } = buildTree();
    expect(findRequest(folders, requests, 'r3')).toEqual(r3);
  });

  it('returns null for a non-existent request', () => {
    const { folders, requests } = buildTree();
    expect(findRequest(folders, requests, 'non-existent')).toBeNull();
  });

  it('returns null for empty tree', () => {
    expect(findRequest([], [], 'any-id')).toBeNull();
  });
});

// ─── findAndUpdateRequest ────────────────────────────────────────────────────

describe('findAndUpdateRequest', () => {
  it('updates a top-level request', () => {
    const { folders, requests } = buildTree();
    const result = findAndUpdateRequest(folders, requests, 'r5', { name: 'Updated' });
    expect(result.found).toBe(true);
    expect(result.requests.find(r => r.id === 'r5')!.name).toBe('Updated');
  });

  it('updates a request in a direct child folder', () => {
    const { folders, requests } = buildTree();
    const result = findAndUpdateRequest(folders, requests, 'r1', { url: 'https://new.url' });
    expect(result.found).toBe(true);
    expect(result.folders[0].requests.find(r => r.id === 'r1')!.url).toBe('https://new.url');
  });

  it('updates a request in a nested folder', () => {
    const { folders, requests } = buildTree();
    const result = findAndUpdateRequest(folders, requests, 'r3', { method: 'POST' });
    expect(result.found).toBe(true);
    expect(result.folders[1].folders[0].requests[0].method).toBe('POST');
  });

  it('returns found=false for non-existent request', () => {
    const { folders, requests } = buildTree();
    const result = findAndUpdateRequest(folders, requests, 'nope', { name: 'X' });
    expect(result.found).toBe(false);
  });

  it('does not mutate original arrays', () => {
    const { folders, requests } = buildTree();
    const origName = requests[0].name;
    findAndUpdateRequest(folders, requests, 'r5', { name: 'Changed' });
    expect(requests[0].name).toBe(origName);
  });

  it('preserves other request fields when updating', () => {
    const { folders, requests } = buildTree();
    const result = findAndUpdateRequest(folders, requests, 'r5', { name: 'New Name' });
    const updated = result.requests.find(r => r.id === 'r5')!;
    expect(updated.name).toBe('New Name');
    expect(updated.method).toBe('GET'); // unchanged
    expect(updated.id).toBe('r5'); // unchanged
  });
});

// ─── findAndDeleteRequest ────────────────────────────────────────────────────

describe('findAndDeleteRequest', () => {
  it('deletes a top-level request', () => {
    const { folders, requests } = buildTree();
    const result = findAndDeleteRequest(folders, requests, 'r5');
    expect(result.found).toBe(true);
    expect(result.requests).toHaveLength(0);
  });

  it('deletes a request in a direct child folder', () => {
    const { folders, requests } = buildTree();
    const result = findAndDeleteRequest(folders, requests, 'r1');
    expect(result.found).toBe(true);
    expect(result.folders[0].requests).toHaveLength(1); // r2 remains
    expect(result.folders[0].requests[0].id).toBe('r2');
  });

  it('deletes a request in a nested folder', () => {
    const { folders, requests } = buildTree();
    const result = findAndDeleteRequest(folders, requests, 'r3');
    expect(result.found).toBe(true);
    expect(result.folders[1].folders[0].requests).toHaveLength(0);
  });

  it('returns found=false for non-existent request', () => {
    const { folders, requests } = buildTree();
    const result = findAndDeleteRequest(folders, requests, 'ghost');
    expect(result.found).toBe(false);
    expect(result.requests).toHaveLength(1); // unchanged
  });

  it('does not mutate original arrays', () => {
    const { folders, requests } = buildTree();
    findAndDeleteRequest(folders, requests, 'r5');
    expect(requests).toHaveLength(1);
  });
});

// ─── findAndUpdateFolder ─────────────────────────────────────────────────────

describe('findAndUpdateFolder', () => {
  it('updates a top-level folder', () => {
    const { folders } = buildTree();
    const result = findAndUpdateFolder(folders, 'A', { name: 'Renamed A' });
    expect(result.found).toBe(true);
    expect(result.folders[0].name).toBe('Renamed A');
  });

  it('updates a nested folder', () => {
    const { folders } = buildTree();
    const result = findAndUpdateFolder(folders, 'C', { name: 'Renamed C' });
    expect(result.found).toBe(true);
    expect(result.folders[1].folders[0].name).toBe('Renamed C');
  });

  it('returns found=false for non-existent folder', () => {
    const { folders } = buildTree();
    const result = findAndUpdateFolder(folders, 'Z', { name: 'X' });
    expect(result.found).toBe(false);
  });

  it('preserves other folder fields when updating', () => {
    const { folders } = buildTree();
    const result = findAndUpdateFolder(folders, 'A', { expanded: true });
    expect(result.folders[0].expanded).toBe(true);
    expect(result.folders[0].name).toBe('Folder A'); // unchanged
    expect(result.folders[0].requests).toHaveLength(2); // unchanged
  });

  it('does not mutate original arrays', () => {
    const { folders } = buildTree();
    findAndUpdateFolder(folders, 'A', { name: 'Changed' });
    expect(folders[0].name).toBe('Folder A');
  });
});

// ─── findAndDeleteFolder ─────────────────────────────────────────────────────

describe('findAndDeleteFolder', () => {
  it('deletes a top-level folder', () => {
    const { folders } = buildTree();
    const result = findAndDeleteFolder(folders, 'A');
    expect(result.found).toBe(true);
    expect(result.folders).toHaveLength(1);
    expect(result.folders[0].id).toBe('B');
  });

  it('deletes a nested folder', () => {
    const { folders } = buildTree();
    const result = findAndDeleteFolder(folders, 'C');
    expect(result.found).toBe(true);
    expect(result.folders[1].folders).toHaveLength(0);
  });

  it('returns found=false for non-existent folder', () => {
    const { folders } = buildTree();
    const result = findAndDeleteFolder(folders, 'nonexistent');
    expect(result.found).toBe(false);
    expect(result.folders).toHaveLength(2);
  });

  it('does not mutate original arrays', () => {
    const { folders } = buildTree();
    findAndDeleteFolder(folders, 'A');
    expect(folders).toHaveLength(2);
  });
});
