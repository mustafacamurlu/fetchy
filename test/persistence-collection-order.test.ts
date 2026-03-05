/**
 * Regression tests for the collection-order persistence fix in persistence.ts.
 *
 * Before the fix, collections were read back from disk using `api.listDataDir()`
 * which returns files alphabetically by UUID — silently discarding any
 * user-defined drag-drop ordering on every restart.
 *
 * The fix persists a `collectionOrder: string[]` array (of collection ids) in
 * `meta.json` on every write, and restores that order on read by using the
 * exported pure helper `restoreCollectionOrder()`.
 *
 * These tests cover:
 *   - Custom ordering is preserved exactly.
 *   - Collections absent from `collectionOrder` (new/orphaned) are appended.
 *   - Backwards-compatibility: empty or missing `collectionOrder` returns all.
 *   - Stale ids in `collectionOrder` (deleted collections) are ignored.
 *   - Collection objects are returned by reference (no cloning).
 */
import { describe, it, expect } from 'vitest';
import { restoreCollectionOrder } from '../src/store/persistence';

function makeCol(id: string) {
  return { id, name: `Collection ${id}`, folders: [], requests: [] };
}

describe('restoreCollectionOrder', () => {
  it('returns collections in the exact order given by collectionOrder', () => {
    const a = makeCol('a');
    const b = makeCol('b');
    const c = makeCol('c');
    const map = new Map([['a', a], ['b', b], ['c', c]]);

    const result = restoreCollectionOrder(map, ['c', 'a', 'b']);

    expect(result.map(col => col.id)).toEqual(['c', 'a', 'b']);
  });

  it('appends collections not present in collectionOrder at the end', () => {
    const map = new Map([
      ['a', makeCol('a')],
      ['b', makeCol('b')],
      ['new-one', makeCol('new-one')],
    ]);

    const result = restoreCollectionOrder(map, ['b', 'a']);

    expect(result.map(col => col.id)).toEqual(['b', 'a', 'new-one']);
  });

  it('returns all collections when collectionOrder is empty (backwards-compat)', () => {
    const map = new Map([['x', makeCol('x')], ['y', makeCol('y')]]);

    const result = restoreCollectionOrder(map, []);

    expect(result).toHaveLength(2);
    const ids = result.map(col => col.id);
    expect(ids).toContain('x');
    expect(ids).toContain('y');
  });

  it('silently ignores stale ids in collectionOrder that no longer exist on disk', () => {
    const map = new Map([['a', makeCol('a')]]);

    const result = restoreCollectionOrder(map, ['deleted-uuid', 'a', 'another-deleted']);

    expect(result.map(col => col.id)).toEqual(['a']);
  });

  it('returns an empty array for an empty map and an empty order', () => {
    expect(restoreCollectionOrder(new Map(), [])).toEqual([]);
  });

  it('returns an empty array for an empty map even when collectionOrder has ids', () => {
    expect(restoreCollectionOrder(new Map(), ['id-1', 'id-2'])).toEqual([]);
  });

  it('preserves the full collection object (not just the id)', () => {
    const col = makeCol('full-obj');
    const map = new Map([['full-obj', col]]);

    const result = restoreCollectionOrder(map, ['full-obj']);

    expect(result[0]).toEqual(col);
  });

  it('returns the same object reference stored in the map', () => {
    const col = makeCol('ref-check');
    const map = new Map([['ref-check', col]]);

    const result = restoreCollectionOrder(map, ['ref-check']);

    expect(result[0]).toBe(col);
  });

  it('handles a large number of collections in a custom order', () => {
    const ids = Array.from({ length: 50 }, (_, i) => `col-${i}`);
    const map = new Map(ids.map(id => [id, makeCol(id)]));
    const reversed = [...ids].reverse();

    const result = restoreCollectionOrder(map, reversed);

    expect(result.map(col => col.id)).toEqual(reversed);
  });

  it('single collection in both map and order is returned correctly', () => {
    const col = makeCol('solo');
    const map = new Map([['solo', col]]);

    const result = restoreCollectionOrder(map, ['solo']);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('solo');
  });
});
