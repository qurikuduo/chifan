/**
 * D1Database-compatible wrapper around better-sqlite3.
 * Provides the same API as Cloudflare D1 so that service code needs no changes.
 */
import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

interface D1Result<T = unknown> {
  results?: T[];
  meta: { duration: number; changes: number; last_row_id: number };
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(column?: string): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}

export class SqliteD1Database {
  private db: Database.Database;

  constructor(dbPath: string) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  prepare(sql: string): D1PreparedStatement {
    return new SqlitePreparedStatement(this.db, sql);
  }

  async batch(statements: D1PreparedStatement[]): Promise<D1Result[]> {
    const results: D1Result[] = [];
    const transaction = this.db.transaction(() => {
      for (const stmt of statements) {
        // Each statement has already been prepared+bound; we just need to execute
        results.push((stmt as SqlitePreparedStatement).executeRun());
      }
    });
    transaction();
    return results;
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  close(): void {
    this.db.close();
  }
}

class SqlitePreparedStatement implements D1PreparedStatement {
  private params: unknown[] = [];

  constructor(
    private db: Database.Database,
    private sql: string,
  ) {}

  bind(...values: unknown[]): D1PreparedStatement {
    const clone = new SqlitePreparedStatement(this.db, this.sql);
    clone.params = values;
    return clone;
  }

  async first<T = unknown>(column?: string): Promise<T | null> {
    const stmt = this.db.prepare(this.sql);
    const row = stmt.get(...this.params) as Record<string, unknown> | undefined;
    if (!row) return null;
    if (column) return (row[column] as T) ?? null;
    return row as T;
  }

  async all<T = unknown>(): Promise<D1Result<T>> {
    const stmt = this.db.prepare(this.sql);
    const rows = stmt.all(...this.params) as T[];
    return {
      results: rows,
      meta: { duration: 0, changes: 0, last_row_id: 0 },
    };
  }

  async run(): Promise<D1Result> {
    return this.executeRun();
  }

  /** Synchronous run used by batch() */
  executeRun(): D1Result {
    const stmt = this.db.prepare(this.sql);
    const info = stmt.run(...this.params);
    return {
      meta: {
        duration: 0,
        changes: info.changes,
        last_row_id: Number(info.lastInsertRowid),
      },
    };
  }
}
