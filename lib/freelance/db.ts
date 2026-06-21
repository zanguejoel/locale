/**
 * Local SQLite database for the Freelancer Hub module.
 *
 * Separate on-device database (`freelancer.db`) from Legal Navigator's
 * `legal.db` — Freelancer Hub has several first-class entities (clients,
 * projects, invoices, payments, expenses, contracts) rather than one
 * repeating "case", so it gets its own schema instead of reusing the case
 * tables. Same versioned-migration pattern as `lib/cases/db.ts`.
 */
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'freelancer.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const MIGRATIONS: string[] = [
  // v1 — initial Freelancer Hub schema
  `
  CREATE TABLE IF NOT EXISTS clients (
    id          TEXT PRIMARY KEY NOT NULL,
    name        TEXT NOT NULL,
    company     TEXT,
    email       TEXT,
    phone       TEXT,
    status      TEXT NOT NULL DEFAULT 'active',
    notes       TEXT,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS clients_updated_idx ON clients (updated_at DESC);

  CREATE TABLE IF NOT EXISTS projects (
    id            TEXT PRIMARY KEY NOT NULL,
    client_id     TEXT NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    description   TEXT,
    hourly_rate   REAL NOT NULL DEFAULT 0,
    budget        REAL,
    status        TEXT NOT NULL DEFAULT 'active',
    hours_logged  REAL NOT NULL DEFAULT 0,
    start_date    TEXT,
    end_date      TEXT,
    created_at    INTEGER NOT NULL,
    updated_at    INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS projects_client_idx ON projects (client_id);

  CREATE TABLE IF NOT EXISTS invoices (
    id              TEXT PRIMARY KEY NOT NULL,
    client_id       TEXT NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
    project_id      TEXT REFERENCES projects (id) ON DELETE SET NULL,
    invoice_number  TEXT NOT NULL,
    issue_date      TEXT NOT NULL,
    due_date        TEXT NOT NULL,
    hours           REAL NOT NULL DEFAULT 0,
    rate            REAL NOT NULL DEFAULT 0,
    subtotal        REAL NOT NULL DEFAULT 0,
    tax_rate        REAL NOT NULL DEFAULT 0,
    tax_amount      REAL NOT NULL DEFAULT 0,
    total           REAL NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'draft',
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS invoices_client_idx ON invoices (client_id);
  CREATE INDEX IF NOT EXISTS invoices_status_due_idx ON invoices (status, due_date);

  CREATE TABLE IF NOT EXISTS invoice_line_items (
    id          TEXT PRIMARY KEY NOT NULL,
    invoice_id  TEXT NOT NULL REFERENCES invoices (id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity    REAL NOT NULL DEFAULT 1,
    rate        REAL NOT NULL DEFAULT 0,
    amount      REAL NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS invoice_line_items_invoice_idx ON invoice_line_items (invoice_id);

  CREATE TABLE IF NOT EXISTS payments (
    id          TEXT PRIMARY KEY NOT NULL,
    invoice_id  TEXT NOT NULL REFERENCES invoices (id) ON DELETE CASCADE,
    amount      REAL NOT NULL DEFAULT 0,
    status      TEXT NOT NULL DEFAULT 'pending',
    due_date    TEXT,
    paid_date   TEXT,
    created_at  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS payments_invoice_idx ON payments (invoice_id);

  CREATE TABLE IF NOT EXISTS expenses (
    id                  TEXT PRIMARY KEY NOT NULL,
    vendor              TEXT NOT NULL,
    amount              REAL NOT NULL DEFAULT 0,
    date                TEXT NOT NULL,
    category            TEXT NOT NULL DEFAULT 'Other',
    source_document_uri TEXT,
    notes               TEXT,
    created_at          INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS expenses_date_idx ON expenses (date);

  CREATE TABLE IF NOT EXISTS contracts (
    id              TEXT PRIMARY KEY NOT NULL,
    client_id       TEXT REFERENCES clients (id) ON DELETE SET NULL,
    project_id      TEXT REFERENCES projects (id) ON DELETE SET NULL,
    name            TEXT NOT NULL,
    type            TEXT NOT NULL DEFAULT 'agreement',
    uri             TEXT,
    extracted_text  TEXT,
    start_date      TEXT,
    end_date        TEXT,
    renewal_date    TEXT,
    payment_terms   TEXT,
    notice_period   TEXT,
    reminder_id     TEXT,
    created_at      INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS contracts_client_idx ON contracts (client_id);

  CREATE TABLE IF NOT EXISTS freelance_chunks (
    id          TEXT PRIMARY KEY NOT NULL,
    scope_type  TEXT NOT NULL,
    scope_id    TEXT,
    source_type TEXT NOT NULL,
    source_id   TEXT,
    text        TEXT NOT NULL,
    embedding   BLOB,
    created_at  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS freelance_chunks_scope_idx ON freelance_chunks (scope_type, scope_id);

  CREATE TABLE IF NOT EXISTS freelance_messages (
    id          TEXT PRIMARY KEY NOT NULL,
    role        TEXT NOT NULL,
    content     TEXT NOT NULL,
    created_at  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS freelance_messages_created_idx ON freelance_messages (created_at);

  CREATE TABLE IF NOT EXISTS freelance_settings (
    key   TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
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
