/**
 * Regression tests for the enableMapSet() fix in appStore.ts.
 *
 * The upstream PR #27 refactor introduced `_entityIndex` which stores
 * Map<string, EntityLocation> objects inside immer-managed Zustand state.
 * immer v10 does NOT proxy Map/Set by default — it requires `enableMapSet()`
 * to be called once at app startup.  Without it every action that calls
 * `navigateToFolder()` (folder toggle, add/rename/delete folder/request)
 * throws silently and leaves state unchanged.
 *
 * These tests verify that the Map-based entity index can be read and mutated
 * inside an immer `produce()` call — which is exactly what appStore actions do.
 */
import { describe, it, expect } from 'vitest';
import { enableMapSet, produce } from 'immer';

// Mirror what appStore.ts does at module level.
enableMapSet();

type EntityLocation = { collectionId: string; parentId: string | null };

describe('immer MapSet support (_entityIndex in appStore)', () => {
  it('reads an existing key from a Map inside produce', () => {
    // immer revokes proxies after produce() returns, so we read primitive
    // values inside the recipe rather than capturing the proxy object itself.
    const state = { index: new Map<string, EntityLocation>([['f1', { parentId: null, collectionId: 'c1' }]]) };
    let collectionId: string | undefined;
    let parentId: string | null | undefined;
    produce(state, draft => {
      const entry = draft.index.get('f1');
      collectionId = entry?.collectionId;
      parentId = entry?.parentId;
    });
    expect(collectionId).toBe('c1');
    expect(parentId).toBeNull();
  });

  it('sets a new key in a Map inside produce', () => {
    const state = { index: new Map<string, string>() };
    const next = produce(state, draft => {
      draft.index.set('key', 'value');
    });
    expect(next.index.get('key')).toBe('value');
    // Original must be unchanged (immutability)
    expect(state.index.has('key')).toBe(false);
  });

  it('toggleFolderExpanded scenario: mutates folder.expanded via entity index Map lookup', () => {
    // This is the exact sequence executed by the toggleFolderExpanded action.
    const state = {
      _entityIndex: {
        folders: new Map<string, EntityLocation>([
          ['folder-1', { collectionId: 'col-1', parentId: null }],
        ]),
        requests: new Map<string, EntityLocation>(),
      },
      collections: [
        {
          id: 'col-1',
          folders: [{ id: 'folder-1', name: 'My Folder', expanded: false, requests: [], folders: [] }],
          requests: [],
        },
      ],
    };

    const next = produce(state, draft => {
      const loc = (draft._entityIndex.folders as Map<string, EntityLocation>).get('folder-1');
      if (loc) {
        const col = draft.collections.find((c: any) => c.id === loc.collectionId);
        const folder = col?.folders.find((f: any) => f.id === 'folder-1');
        if (folder) folder.expanded = !folder.expanded;
      }
    });

    expect(next.collections[0].folders[0].expanded).toBe(true);
    // Original must not be mutated
    expect(state.collections[0].folders[0].expanded).toBe(false);
  });

  it('toggling twice returns to the original expanded state', () => {
    const initial = {
      _entityIndex: {
        folders: new Map<string, EntityLocation>([['f1', { collectionId: 'c1', parentId: null }]]),
        requests: new Map<string, EntityLocation>(),
      },
      collections: [
        { id: 'c1', folders: [{ id: 'f1', expanded: true, requests: [], folders: [] }], requests: [] },
      ],
    };

    const toggle = (s: typeof initial) =>
      produce(s, draft => {
        const loc = (draft._entityIndex.folders as Map<string, EntityLocation>).get('f1');
        if (loc) {
          const col = draft.collections.find((c: any) => c.id === loc.collectionId);
          const folder = col?.folders.find((f: any) => f.id === 'f1');
          if (folder) folder.expanded = !folder.expanded;
        }
      });

    const afterTwoToggles = toggle(toggle(initial));
    expect(afterTwoToggles.collections[0].folders[0].expanded).toBe(true);
  });

  it('returns undefined for an unknown key without throwing', () => {
    const state = { index: new Map<string, string>([['a', 'A']]) };
    let result: string | undefined = 'sentinel';
    produce(state, draft => {
      result = draft.index.get('does-not-exist');
    });
    expect(result).toBeUndefined();
  });
});
