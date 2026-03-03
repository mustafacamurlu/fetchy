/**
 * Normalized entity index for O(1) lookups (#26).
 *
 * Maintains flat `Map<id, EntityLocation>` maps alongside the existing
 * recursive Collection tree.  All heavy-lifting CRUD operations in
 * `requestTree.ts` consult this index for O(1) entity location before
 * navigating the immer draft.
 *
 * The index is **not persisted** — it is rebuilt from the collections array
 * on every rehydrate / import, and updated incrementally during mutations.
 */

import type { Collection, ApiRequest, RequestFolder } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Where an entity lives inside the collection tree. */
export interface EntityLocation {
  /** ID of the owning collection. */
  collectionId: string;
  /** ID of the parent folder, or `null` when the entity sits at the
   *  collection root (i.e. `collection.requests` or `collection.folders`). */
  parentId: string | null;
}

/**
 * Flat lookup tables for requests and folders.
 *
 * Both maps use the entity's `id` as key and store only lightweight
 * location metadata — no references to the entities themselves, which
 * would become stale after an immer produce cycle.
 */
export interface EntityIndex {
  requests: Map<string, EntityLocation>;
  folders: Map<string, EntityLocation>;
}

// ─── Build / Rebuild ─────────────────────────────────────────────────────────

/** Create a fresh empty index. */
export function createEntityIndex(): EntityIndex {
  return { requests: new Map(), folders: new Map() };
}

/** Build a complete index from an array of collections. */
export function buildEntityIndex(collections: Collection[]): EntityIndex {
  const index = createEntityIndex();
  for (const collection of collections) {
    indexContainer(index, collection.id, null, collection.folders, collection.requests);
  }
  return index;
}

/**
 * Re-index a single collection (e.g. after an import or bulk edit).
 * Removes all stale entries for that collection first.
 */
export function reindexCollection(index: EntityIndex, collection: Collection): void {
  removeCollectionFromIndex(index, collection.id);
  indexContainer(index, collection.id, null, collection.folders, collection.requests);
}

/** Remove every index entry that belongs to the given collection. */
export function removeCollectionFromIndex(index: EntityIndex, collectionId: string): void {
  for (const [id, loc] of index.requests) {
    if (loc.collectionId === collectionId) index.requests.delete(id);
  }
  for (const [id, loc] of index.folders) {
    if (loc.collectionId === collectionId) index.folders.delete(id);
  }
}

// ─── Incremental updates ────────────────────────────────────────────────────

/** Register a new request in the index. */
export function indexRequest(
  index: EntityIndex,
  requestId: string,
  collectionId: string,
  parentId: string | null,
): void {
  index.requests.set(requestId, { collectionId, parentId });
}

/** Register a new folder (and all its nested children) in the index. */
export function indexFolder(
  index: EntityIndex,
  folder: RequestFolder,
  collectionId: string,
  parentId: string | null,
): void {
  index.folders.set(folder.id, { collectionId, parentId });
  indexContainer(index, collectionId, folder.id, folder.folders, folder.requests);
}

/** Remove a single request entry from the index. */
export function unindexRequest(index: EntityIndex, requestId: string): void {
  index.requests.delete(requestId);
}

/** Remove a folder and all of its nested children from the index. */
export function unindexFolder(index: EntityIndex, folder: RequestFolder): void {
  index.folders.delete(folder.id);
  for (const req of folder.requests) {
    index.requests.delete(req.id);
  }
  for (const sub of folder.folders) {
    unindexFolder(index, sub);
  }
}

// ─── Navigation helpers ─────────────────────────────────────────────────────

/**
 * Build the ancestor ID chain from root down to (but not including) the
 * target folder.  Returns `null` if the folder is not in the index.
 *
 * Example: for a folder at `collection > A > B > target`, returns `['A', 'B']`.
 */
export function getAncestorChain(index: EntityIndex, folderId: string): string[] | null {
  const chain: string[] = [];
  let currentId: string | null = folderId;

  // Walk parent pointers up to the collection root
  while (currentId !== null) {
    const loc = index.folders.get(currentId);
    if (!loc) return null;
    if (loc.parentId !== null) {
      chain.unshift(loc.parentId);
    }
    currentId = loc.parentId;
  }

  return chain;
}

/**
 * Navigate the tree to a specific folder using the ancestor chain from the
 * index.  Works with both regular objects and immer drafts.
 *
 * Returns the folder, or `null` if navigation fails.
 */
export function navigateToFolder(
  collection: Collection,
  index: EntityIndex,
  folderId: string,
): RequestFolder | null {
  // Build path from root → target
  const path = getAncestorChain(index, folderId);
  if (path === null) return null;

  // Append the target itself
  const fullPath = [...path, folderId];

  let folders = collection.folders;
  let folder: RequestFolder | undefined;

  for (const id of fullPath) {
    folder = folders.find(f => f.id === id);
    if (!folder) return null;
    folders = folder.folders;
  }

  return folder ?? null;
}

/**
 * Navigate to the container (collection root or parent folder) that holds
 * a given request.  Returns the `requests` array reference (works with
 * immer drafts for direct mutation).
 */
export function getRequestContainer(
  collections: Collection[],
  index: EntityIndex,
  requestId: string,
): { requests: ApiRequest[]; collection: Collection } | null {
  const loc = index.requests.get(requestId);
  if (!loc) return null;

  const collection = collections.find(c => c.id === loc.collectionId);
  if (!collection) return null;

  if (loc.parentId === null) {
    return { requests: collection.requests, collection };
  }

  const folder = navigateToFolder(collection, index, loc.parentId);
  if (!folder) return null;

  return { requests: folder.requests, collection };
}

/**
 * Navigate to the container that holds a given folder's `folders` array.
 */
export function getFolderContainer(
  collections: Collection[],
  index: EntityIndex,
  folderId: string,
): { folders: RequestFolder[]; collection: Collection } | null {
  const loc = index.folders.get(folderId);
  if (!loc) return null;

  const collection = collections.find(c => c.id === loc.collectionId);
  if (!collection) return null;

  if (loc.parentId === null) {
    return { folders: collection.folders, collection };
  }

  const parentFolder = navigateToFolder(collection, index, loc.parentId);
  if (!parentFolder) return null;

  return { folders: parentFolder.folders, collection };
}

// ─── Internal ────────────────────────────────────────────────────────────────

function indexContainer(
  index: EntityIndex,
  collectionId: string,
  parentFolderId: string | null,
  folders: RequestFolder[],
  requests: ApiRequest[],
): void {
  for (const req of requests) {
    index.requests.set(req.id, { collectionId, parentId: parentFolderId });
  }
  for (const folder of folders) {
    index.folders.set(folder.id, { collectionId, parentId: parentFolderId });
    indexContainer(index, collectionId, folder.id, folder.folders, folder.requests);
  }
}
