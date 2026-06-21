/**
 * Local SQLite database for the Navigator case-management layer.
 *
 * One on-device database (`legal.db`) holds all case data. It is intentionally
 * separate from the Supabase-backed normal chat: case data never leaves the
 * device and is never written to `conversations`/`messages`.
 *
 * Schema changes go through the versioned migration runner (PRAGMA user_version)
 * so existing installs upgrade cleanly. Repos in this folder are the only code
 * that should touch the tables directly.
 */
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'legal.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Ordered list of migrations. Each entry's index+1 is its target user_version.
 * Never edit a shipped migration — append a new one instead.
 */
const MIGRATIONS: string[] = [
  // v1 — initial Navigator case schema
  `
  CREATE TABLE IF NOT EXISTS cases (
    id          TEXT PRIMARY KEY NOT NULL,
    module_id   TEXT NOT NULL,
    title       TEXT NOT NULL,
    category    TEXT NOT NULL,
    jurisdiction TEXT,
    status      TEXT NOT NULL DEFAULT 'Open',
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS cases_module_updated_idx ON cases (module_id, updated_at DESC);

  CREATE TABLE IF NOT EXISTS case_facts (
    id          TEXT PRIMARY KEY NOT NULL,
    case_id     TEXT NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    text        TEXT NOT NULL,
    is_assumption INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS case_facts_case_idx ON case_facts (case_id);

  CREATE TABLE IF NOT EXISTS case_documents (
    id          TEXT PRIMARY KEY NOT NULL,
    case_id     TEXT NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    type        TEXT NOT NULL,
    uri         TEXT,
    extracted_text TEXT,
    summary_json TEXT,
    risk        TEXT NOT NULL DEFAULT 'Unknown',
    created_at  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS case_documents_case_idx ON case_documents (case_id);

  CREATE TABLE IF NOT EXISTS case_events (
    id          TEXT PRIMARY KEY NOT NULL,
    case_id     TEXT NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    date        TEXT NOT NULL,
    label       TEXT NOT NULL,
    source      TEXT NOT NULL DEFAULT 'chat',
    created_at  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS case_events_case_idx ON case_events (case_id);

  CREATE TABLE IF NOT EXISTS case_deadlines (
    id          TEXT PRIMARY KEY NOT NULL,
    case_id     TEXT NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    due_date    TEXT NOT NULL,
    label       TEXT NOT NULL,
    kind        TEXT NOT NULL DEFAULT 'other',
    reminder_id TEXT,
    created_at  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS case_deadlines_case_idx ON case_deadlines (case_id);

  CREATE TABLE IF NOT EXISTS case_letters (
    id          TEXT PRIMARY KEY NOT NULL,
    case_id     TEXT NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    kind        TEXT NOT NULL,
    tone        TEXT NOT NULL,
    content     TEXT NOT NULL,
    created_at  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS case_letters_case_idx ON case_letters (case_id);

  CREATE TABLE IF NOT EXISTS case_notes (
    id          TEXT PRIMARY KEY NOT NULL,
    case_id     TEXT NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    text        TEXT NOT NULL,
    created_at  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS case_notes_case_idx ON case_notes (case_id);

  CREATE TABLE IF NOT EXISTS case_messages (
    id          TEXT PRIMARY KEY NOT NULL,
    case_id     TEXT NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    role        TEXT NOT NULL,
    content     TEXT NOT NULL,
    created_at  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS case_messages_case_idx ON case_messages (case_id, created_at);

  CREATE TABLE IF NOT EXISTS case_chunks (
    id          TEXT PRIMARY KEY NOT NULL,
    case_id     TEXT NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    source_type TEXT NOT NULL,
    source_id   TEXT,
    text        TEXT NOT NULL,
    embedding   BLOB,
    created_at  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS case_chunks_case_idx ON case_chunks (case_id);
  `,
];

async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const current = row?.user_version ?? 0;

  for (let version = current; version < MIGRATIONS.length; version++) {
    const sql = MIGRATIONS[version];
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
    });
    // PRAGMA user_version doesn't accept bind params — interpolate the integer.
    await db.execAsync(`PRAGMA user_version = ${version + 1};`);
  }
}

/** Get the shared database handle, opening + migrating it on first use. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await runMigrations(db);
      return db;
    })();
  }
  return dbPromise;
}
