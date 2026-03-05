/**
 * Tests for the data format migration system (dataMigration.ts — #28).
 */
import { describe, it, expect } from 'vitest';
import {
  CURRENT_SCHEMA_VERSION,
  detectVersion,
  migrateState,
  migrateExport,
} from '../src/store/dataMigration';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeV1_0Collection(overrides: Record<string, any> = {}) {
  return {
    id: 'col-1',
    name: 'Test Collection',
    requests: [
      { id: 'req-1', name: 'Get Users', method: 'GET', url: 'https://api.example.com/users' },
      { id: 'req-2', name: 'Create User', method: 'POST', url: 'https://api.example.com/users' },
    ],
    folders: [
      {
        id: 'folder-1',
        name: 'Auth',
        requests: [
          { id: 'req-3', name: 'Login', method: 'POST', url: 'https://api.example.com/login' },
        ],
        folders: [],
      },
    ],
    variables: [],
    ...overrides,
  };
}

function makeV1_0Export(overrides: Record<string, any> = {}) {
  return {
    version: '1.0',
    exportedAt: '2025-01-01T00:00:00.000Z',
    collections: [makeV1_0Collection()],
    environments: [
      {
        id: 'env-1',
        name: 'Local',
        variables: [{ id: 'v1', key: 'BASE_URL', value: 'http://localhost:3000' }],
      },
    ],
    activeEnvironmentId: 'env-1',
    ...overrides,
  };
}

function makeStateWrapper(state: any, version = 0) {
  return { state, version };
}

// ---------------------------------------------------------------------------
// detectVersion
// ---------------------------------------------------------------------------

describe('detectVersion', () => {
  it('reads explicit version string', () => {
    expect(detectVersion({ version: '1.0' })).toBe('1.0');
  });

  it('reads explicit version from export data', () => {
    expect(detectVersion({ version: '1.1', collections: [] })).toBe('1.1');
  });

  it('returns current version when no collections', () => {
    expect(detectVersion({})).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('returns current version for null/undefined', () => {
    expect(detectVersion(null)).toBe(CURRENT_SCHEMA_VERSION);
    expect(detectVersion(undefined)).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('detects v1.0 from collection without auth', () => {
    const wrapper = makeStateWrapper({
      collections: [{ id: 'c1', name: 'Test' }],
    });
    // wrapper has { state: { collections: [...] }, version: 0 }
    // version is 0 (number), not a valid string — should do heuristic check
    expect(detectVersion(wrapper)).toBe('1.0');
  });

  it('detects current version when collection has auth', () => {
    const wrapper = makeStateWrapper({
      collections: [{ id: 'c1', name: 'Test', auth: { type: 'none' } }],
    });
    expect(detectVersion(wrapper)).toBe(CURRENT_SCHEMA_VERSION);
  });
});

// ---------------------------------------------------------------------------
// migrateState  (Zustand state wrapper format)
// ---------------------------------------------------------------------------

describe('migrateState', () => {
  it('no-ops when already at current version', () => {
    const wrapper = makeStateWrapper({
      collections: [makeV1_0Collection({ auth: { type: 'none' } })],
    });
    const result = migrateState(wrapper);
    expect(result).toBe(wrapper); // identity — no migration needed
  });

  it('migrates v1.0 wrapper to current version', () => {
    const col = makeV1_0Collection(); // no auth
    const wrapper = makeStateWrapper({ collections: [col] });

    const result = migrateState(wrapper);
    const innerState = result.state;

    // Collection should have auth after migration
    expect(innerState.collections[0].auth).toEqual({ type: 'none' });
  });

  it('adds sslVerification to requests missing it', () => {
    const col = makeV1_0Collection(); // requests don't have sslVerification
    const wrapper = makeStateWrapper({ collections: [col] });

    const result = migrateState(wrapper);
    const reqs = result.state.collections[0].requests;

    for (const req of reqs) {
      expect(req.sslVerification).toBe(true);
    }
  });

  it('preserves existing sslVerification = false', () => {
    const col = makeV1_0Collection({
      requests: [
        { id: 'req-1', name: 'Test', method: 'GET', url: 'https://example.com', sslVerification: false },
      ],
    });
    const wrapper = makeStateWrapper({ collections: [col] });

    const result = migrateState(wrapper);
    expect(result.state.collections[0].requests[0].sslVerification).toBe(false);
  });

  it('adds sslVerification to nested folder requests', () => {
    const col = makeV1_0Collection();
    const wrapper = makeStateWrapper({ collections: [col] });

    const result = migrateState(wrapper);
    const folderReqs = result.state.collections[0].folders[0].requests;

    for (const req of folderReqs) {
      expect(req.sslVerification).toBe(true);
    }
  });

  it('handles empty collections array', () => {
    const wrapper = makeStateWrapper({ collections: [] });
    // Empty array — no auth on any collection to detect as v1.0
    // detectVersion returns CURRENT (no migration needed)
    const result = migrateState(wrapper);
    expect(result.state.collections).toEqual([]);
  });

  it('handles null state gracefully', () => {
    const result = migrateState(null);
    expect(result).toBeNull();
  });

  it('handles undefined state gracefully', () => {
    const result = migrateState(undefined);
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// migrateExport  (AppStorageExport format)
// ---------------------------------------------------------------------------

describe('migrateExport', () => {
  it('no-ops when already at current version', () => {
    const data = {
      ...makeV1_0Export(),
      version: CURRENT_SCHEMA_VERSION,
      collections: [makeV1_0Collection({ auth: { type: 'none' } })],
    };
    const result = migrateExport(data);
    expect(result).toBe(data); // identity
  });

  it('migrates v1.0 export to current version', () => {
    const data = makeV1_0Export();

    const result = migrateExport(data);

    expect(result.version).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.collections[0].auth).toEqual({ type: 'none' });
  });

  it('updates version field after migration', () => {
    const data = makeV1_0Export();

    const result = migrateExport(data);
    expect(result.version).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('preserves exportedAt and other metadata', () => {
    const data = makeV1_0Export();
    const result = migrateExport(data);

    expect(result.exportedAt).toBe('2025-01-01T00:00:00.000Z');
    expect(result.activeEnvironmentId).toBe('env-1');
    expect(result.environments).toHaveLength(1);
  });

  it('adds sslVerification to all requests', () => {
    const data = makeV1_0Export();
    const result = migrateExport(data);

    for (const col of result.collections) {
      for (const req of col.requests) {
        expect(req.sslVerification).toBe(true);
      }
      for (const folder of col.folders) {
        for (const req of folder.requests) {
          expect(req.sslVerification).toBe(true);
        }
      }
    }
  });

  it('handles null data', () => {
    expect(migrateExport(null)).toBeNull();
  });

  it('handles data without version (defaults to 1.0)', () => {
    const data = makeV1_0Export();
    delete (data as any).version;

    const result = migrateExport(data);
    expect(result.version).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.collections[0].auth).toEqual({ type: 'none' });
  });

  it('handles empty collections', () => {
    const data = { ...makeV1_0Export(), collections: [] };
    const result = migrateExport(data);
    expect(result.version).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.collections).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// CURRENT_SCHEMA_VERSION
// ---------------------------------------------------------------------------

describe('CURRENT_SCHEMA_VERSION', () => {
  it('is a valid semver-ish version string', () => {
    expect(CURRENT_SCHEMA_VERSION).toMatch(/^\d+\.\d+$/);
  });

  it('matches the latest migration target', () => {
    // The current version should be reachable from v1.0 through migrations
    expect(CURRENT_SCHEMA_VERSION).toBe('1.1');
  });
});

// ---------------------------------------------------------------------------
// Migration chain integrity
// ---------------------------------------------------------------------------

describe('migration chain', () => {
  it('migrates data through multiple versions when chain grows', () => {
    // Currently only 1.0 → 1.1. This test ensures the chain mechanism works
    // by verifying a v1.0 state reaches CURRENT_SCHEMA_VERSION
    const data = makeV1_0Export();
    const result = migrateExport(data);
    expect(result.version).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('deeply nested folders are migrated', () => {
    const col = {
      id: 'col-deep',
      name: 'Deep',
      requests: [],
      folders: [
        {
          id: 'f1',
          name: 'Level 1',
          requests: [{ id: 'r1', name: 'R1', method: 'GET', url: '/a' }],
          folders: [
            {
              id: 'f2',
              name: 'Level 2',
              requests: [{ id: 'r2', name: 'R2', method: 'POST', url: '/b' }],
              folders: [
                {
                  id: 'f3',
                  name: 'Level 3',
                  requests: [{ id: 'r3', name: 'R3', method: 'PUT', url: '/c' }],
                  folders: [],
                },
              ],
            },
          ],
        },
      ],
      variables: [],
    };

    const data = { ...makeV1_0Export(), collections: [col] };
    const result = migrateExport(data);

    // Check every level
    const f1 = result.collections[0].folders[0];
    expect(f1.requests[0].sslVerification).toBe(true);
    const f2 = f1.folders[0];
    expect(f2.requests[0].sslVerification).toBe(true);
    const f3 = f2.folders[0];
    expect(f3.requests[0].sslVerification).toBe(true);
  });

  it('preserves existing auth when already present', () => {
    const col = makeV1_0Collection({
      auth: { type: 'bearer', token: 'abc123' },
    });
    // Even though it has auth, version is explicitly 1.0
    const data = { ...makeV1_0Export(), collections: [col] };
    const result = migrateExport(data);

    // Should NOT overwrite existing auth
    expect(result.collections[0].auth).toEqual({ type: 'bearer', token: 'abc123' });
  });
});
