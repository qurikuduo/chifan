import { vi } from 'vitest';
import type { D1Database, R2Bucket } from '../../env.js';

/**
 * Create a mock D1Database for unit testing.
 * Chain: db.prepare(sql).bind(...params).first() / .all() / .run()
 */
export function createMockD1() {
  const results = new Map<string, unknown>();
  let callIndex = 0;

  const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 1 } });
  const mockFirst = vi.fn().mockResolvedValue(null);
  const mockAll = vi.fn().mockResolvedValue({ results: [] });

  const mockBind = vi.fn().mockReturnValue({
    first: mockFirst,
    all: mockAll,
    run: mockRun,
  });

  const mockPrepare = vi.fn().mockReturnValue({
    bind: mockBind,
    first: mockFirst,
    all: mockAll,
    run: mockRun,
  });

  const mockBatch = vi.fn().mockResolvedValue([]);

  const db = {
    prepare: mockPrepare,
    batch: mockBatch,
    exec: vi.fn(),
  } as unknown as D1Database;

  return {
    db,
    mockPrepare,
    mockBind,
    mockFirst,
    mockAll,
    mockRun,
    mockBatch,
    /** Reset all mocks */
    reset() {
      mockPrepare.mockClear();
      mockBind.mockClear();
      mockFirst.mockClear();
      mockAll.mockClear();
      mockRun.mockClear();
      mockBatch.mockClear();
    },
  };
}

/** Create a mock R2Bucket */
export function createMockR2() {
  return {
    put: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue({ objects: [] }),
    head: vi.fn().mockResolvedValue(null),
  } as unknown as R2Bucket;
}
