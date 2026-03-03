/**
 * Data format migration system (#28).
 *
 * Provides a version-aware migration chain for transforming persisted state
 * between schema versions.  Migrations run automatically on load when the
 * stored version doesn't match CURRENT_SCHEMA_VERSION.
 *
 * Each migration is a pure function that receives state at version N and
 * returns state at version N+1.  Migrations are applied sequentially
 * (e.g. 1.0 → 1.1 → 1.2) to reach the current version.
 *
 * Usage:
 *   const migrated = migrateState(loadedState);
 *   // migrated is now at CURRENT_SCHEMA_VERSION
 */

// ─── Version ────────────────────────────────────────────────────────────────

/**
 * Current schema version.  Bump this and add a corresponding migration
 * function whenever the persisted state shape changes.
 */
export const CURRENT_SCHEMA_VERSION = '1.1';

// ─── Migration registry ─────────────────────────────────────────────────────

/** A migration function transforms state from one version to the next. */
export type MigrationFn = (state: any) => any;

/**
 * Ordered array of migrations.  Each entry specifies the source version it
 * accepts and the migration function to apply.
 *
 * Migrations MUST be ordered chronologically and MUST form a contiguous chain
 * from the oldest supported version to `CURRENT_SCHEMA_VERSION`.
 */
const migrations: Array<{ from: string; to: string; migrate: MigrationFn }> = [
  {
    from: '1.0',
    to: '1.1',
    migrate: migrateV1_0_to_V1_1,
  },
  // Future migrations go here:
  // { from: '1.1', to: '1.2', migrate: migrateV1_1_to_V1_2 },
];

// ─── Migration functions ────────────────────────────────────────────────────

/**
 * v1.0 → v1.1
 *
 * Changes:
 *   - Adds `parentId` and `parentType` optional fields to ApiRequest and
 *     RequestFolder entities (runtime-only, not persisted, but new code
 *     expects them to be valid optional properties).
 *   - Ensures every request has `sslVerification` defaulting to `true`.
 *   - Ensures every collection has `auth` defaulting to `{ type: 'none' }`.
 *   - Ensures every folder has `auth` defaulting to undefined (no-op, but validates).
 */
function migrateV1_0_to_V1_1(state: any): any {
  if (!state) return state;

  // Ensure collections have auth
  if (Array.isArray(state.collections)) {
    for (const col of state.collections) {
      if (!col.auth) {
        col.auth = { type: 'none' };
      }
      // Ensure all requests have sslVerification
      ensureRequestDefaults(col.requests);
      migrateFolders(col.folders);
    }
  }

  return state;
}

function ensureRequestDefaults(requests: any[]): void {
  if (!Array.isArray(requests)) return;
  for (const req of requests) {
    if (req.sslVerification === undefined) {
      req.sslVerification = true;
    }
  }
}

function migrateFolders(folders: any[]): void {
  if (!Array.isArray(folders)) return;
  for (const folder of folders) {
    ensureRequestDefaults(folder.requests);
    migrateFolders(folder.folders);
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Detect the schema version of a persisted state object.
 *
 * For the app storage export format (used by exportFullStorage / importFullStorage),
 * the version is in `state.version`.
 *
 * For the internal Zustand state wrapper used by persistence.ts, there's no
 * explicit version — we infer from the shape:
 *   - If `state.collections[0].auth` exists → v1.1+
 *   - Otherwise → v1.0
 */
export function detectVersion(state: any): string {
  // Explicit version field (from AppStorageExport)
  if (typeof state?.version === 'string' && state.version !== '0') {
    return state.version;
  }

  // Heuristic: check if collections have defaults that v1.1 introduces
  // For internal state wrappers { state: { collections: [...] }, version: 0 }
  const inner = state?.state ?? state;
  if (Array.isArray(inner?.collections) && inner.collections.length > 0) {
    const firstCol = inner.collections[0];
    // v1.0 collections may not have .auth at all
    if (firstCol.auth === undefined) return '1.0';
  }

  // Default to current version (no migration needed)
  return CURRENT_SCHEMA_VERSION;
}

/**
 * Run all necessary migrations to bring state from its current version
 * to `CURRENT_SCHEMA_VERSION`.
 *
 * Returns the migrated state.  If no migration is needed, returns the
 * input unchanged.
 */
export function migrateState(state: any): any {
  let version = detectVersion(state);

  if (version === CURRENT_SCHEMA_VERSION) {
    return state;
  }

  // Determine which object to migrate (handle wrapper vs. direct)
  const isWrapper = state?.state !== undefined && typeof state.version !== 'undefined';
  let target = isWrapper ? state.state : state;

  // Apply migrations in sequence
  for (const migration of migrations) {
    if (version === migration.from) {
      console.log(`Migrating state from v${migration.from} → v${migration.to}`);
      target = migration.migrate(target);
      version = migration.to;
    }
  }

  if (version !== CURRENT_SCHEMA_VERSION) {
    console.warn(
      `Migration incomplete: reached v${version} but expected v${CURRENT_SCHEMA_VERSION}. ` +
      `State may be from an unsupported older version.`
    );
  }

  // Re-wrap if the input was wrapped
  if (isWrapper) {
    return { ...state, state: target };
  }

  return target;
}

/**
 * Migrate an AppStorageExport object (used by importFullStorage / exportFullStorage).
 * Updates the version field after migration.
 */
export function migrateExport(data: any): any {
  if (!data) return data;

  let version = data.version || '1.0';

  if (version === CURRENT_SCHEMA_VERSION) {
    return data;
  }

  const migrated = { ...data };

  for (const migration of migrations) {
    if (version === migration.from) {
      console.log(`Migrating export from v${migration.from} → v${migration.to}`);
      // Migrations work on the inner state shape, so we wrap/unwrap
      const inner = {
        collections: migrated.collections,
        environments: migrated.environments,
        history: migrated.history,
      };
      const result = migration.migrate(inner);
      migrated.collections = result.collections;
      migrated.environments = result.environments;
      if (result.history) migrated.history = result.history;
      version = migration.to;
    }
  }

  migrated.version = CURRENT_SCHEMA_VERSION;
  return migrated;
}
