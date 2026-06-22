/**
 * Local SQLite database for normal chat (conversations + messages).
 *
 * Replaces the Supabase-backed `conversations`/`messages` tables — chat now
 * lives entirely on-device, same as the Procedure Hub's `legal.db`. Kept as
 * its own file/database (`chat.db`) rather than merged into `legal.db` so the
 * two domains stay independently migratable.
 */
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'chat.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const MIGRATIONS: string[] = [
  // v1 — initial chat schema
  `
  CREATE TABLE IF NOT EXISTS conversations (
    id          TEXT PRIMARY KEY NOT NULL,
    title       TEXT,
    model_type  TEXT,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS conversations_updated_idx ON conversations (updated_at DESC);

  CREATE TABLE IF NOT EXISTS messages (
    id              TEXT PRIMARY KEY NOT NULL,
    conversation_id TEXT NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
    role            INTEGER NOT NULL,
    content         TEXT NOT NULL,
    metadata        TEXT,
    created_at      INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages (conversation_id, created_at);
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
