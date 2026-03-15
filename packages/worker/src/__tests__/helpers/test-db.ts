/**
 * Test helper that creates an in-memory SQLite database
 * via the SqliteD1Database adapter, initialised with the real schema.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { SqliteD1Database } from '../../adapters/sqlite.js';
import { FileSystemStorage } from '../../adapters/storage.js';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';

const schemaPath = join(import.meta.dirname, '../../db/schema.sql');

/** Create a fresh in-memory D1-compatible database with all tables */
export function createTestDb(): SqliteD1Database {
  // better-sqlite3 in-memory via special path
  const db = new SqliteD1Database(':memory:');
  const schema = readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
  return db;
}

/** Create a temp directory-based storage for testing */
export function createTestStorage(): { storage: FileSystemStorage; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'fm-test-'));
  const storage = new FileSystemStorage(dir);
  return {
    storage,
    cleanup: () => { try { rmSync(dir, { recursive: true }); } catch { /* ignore */ } },
  };
}

/** Helper to insert an approved user directly into the DB and return the id */
export async function seedUser(
  db: SqliteD1Database,
  overrides: {
    id?: string;
    username?: string;
    email?: string;
    passwordHash?: string;
    displayName?: string;
    familyRole?: string;
    isAdmin?: boolean;
    status?: string;
  } = {},
): Promise<string> {
  const id = overrides.id ?? crypto.randomUUID().replace(/-/g, '');
  const username = overrides.username ?? `user_${id.slice(0, 8)}`;
  const email = overrides.email ?? `${username}@test.com`;
  const displayName = overrides.displayName ?? username;
  const passwordHash = overrides.passwordHash ?? '100000:dGVzdHNhbHQ=:dGVzdGhhc2g='; // dummy hash
  const familyRole = overrides.familyRole ?? null;
  const isAdmin = overrides.isAdmin ? 1 : 0;
  const status = overrides.status ?? 'approved';

  await db
    .prepare(
      `INSERT INTO users (id, username, email, password_hash, display_name, family_role, is_admin, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(id, username, email, passwordHash, displayName, familyRole, isAdmin, status)
    .run();

  return id;
}

/** Helper to insert an ingredient category */
export async function seedCategory(db: SqliteD1Database, name: string): Promise<string> {
  const id = crypto.randomUUID().replace(/-/g, '');
  await db.prepare('INSERT INTO ingredient_categories (id, name, sort_order) VALUES (?, ?, 0)').bind(id, name).run();
  return id;
}

/** Helper to insert an ingredient */
export async function seedIngredient(db: SqliteD1Database, name: string, categoryId?: string): Promise<string> {
  const id = crypto.randomUUID().replace(/-/g, '');
  await db
    .prepare('INSERT INTO ingredients (id, name, category_id) VALUES (?, ?, ?)')
    .bind(id, name, categoryId ?? null)
    .run();
  return id;
}

/** Helper to insert a cooking method */
export async function seedCookingMethod(db: SqliteD1Database, name: string): Promise<string> {
  const id = crypto.randomUUID().replace(/-/g, '');
  await db.prepare('INSERT INTO cooking_methods (id, name) VALUES (?, ?)').bind(id, name).run();
  return id;
}

/** Helper to insert a tag */
export async function seedTag(db: SqliteD1Database, name: string): Promise<string> {
  const id = crypto.randomUUID().replace(/-/g, '');
  await db.prepare('INSERT INTO tags (id, name) VALUES (?, ?)').bind(id, name).run();
  return id;
}
