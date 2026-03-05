import { Collection, RequestAuth, RequestFolder } from '../types';
import { navigateToFolder, type EntityIndex } from '../store/entityIndex';

/**
 * Build the ancestor path from the collection root down to the target folder.
 * Returns an array of folders ordered from root → … → target, or null if the
 * folder is not found.
 *
 * When an EntityIndex is provided, this uses O(1) parent-pointer lookups
 * instead of a full recursive tree scan (#26).
 */
function buildAncestorPath(
  folders: RequestFolder[],
  targetId: string,
  path: RequestFolder[] = [],
  collection?: Collection,
  index?: EntityIndex,
): RequestFolder[] | null {
  // ── Fast path: use the entity index when available ──
  if (index && collection) {
    const chain: RequestFolder[] = [];
    let currentId: string | null = targetId;

    // Walk parent pointers from target up to the collection root
    const visited = new Set<string>();
    while (currentId !== null) {
      if (visited.has(currentId)) break; // safety: prevent infinite loops
      visited.add(currentId);

      const folder = navigateToFolder(collection, index, currentId);
      if (!folder) return null;
      chain.unshift(folder);

      const loc = index.folders.get(currentId);
      currentId = loc?.parentId ?? null;
    }
    return chain.length > 0 ? chain : null;
  }

  // ── Legacy path: recursive tree walk ──
  for (const folder of folders) {
    const currentPath = [...path, folder];
    if (folder.id === targetId) return currentPath;
    const found = buildAncestorPath(folder.folders, targetId, currentPath);
    if (found) return found;
  }
  return null;
}

/**
 * Resolve inherited auth by walking the full ancestor chain:
 *   target folder → parent folder → … → root folder → collection
 *
 * Returns the first auth whose type is neither 'none' nor 'inherit',
 * or null if nothing is found.
 *
 * Accepts an optional EntityIndex for O(1) parent-chain resolution (#26).
 */
export function resolveInheritedAuth(
  collection: Collection,
  folderId?: string,
  index?: EntityIndex,
): RequestAuth | null {
  if (folderId) {
    const chain = buildAncestorPath(collection.folders, folderId, [], collection, index);
    if (chain) {
      // Walk the chain in reverse (closest folder first)
      for (let i = chain.length - 1; i >= 0; i--) {
        const auth = chain[i].auth;
        if (auth && auth.type !== 'none' && auth.type !== 'inherit') {
          return auth;
        }
      }
    }
  }

  // Fall back to collection-level auth
  if (collection.auth && collection.auth.type !== 'none' && collection.auth.type !== 'inherit') {
    return collection.auth;
  }

  return null;
}
