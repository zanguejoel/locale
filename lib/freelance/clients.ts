/** Clients repo. */
import { getDb } from './db';
import { newId, now } from '@/lib/cases/util';
import { Client, ClientStatus } from './types';

interface ClientRow {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

const rowToClient = (r: ClientRow): Client => ({
  id: r.id,
  name: r.name,
  company: r.company,
  email: r.email,
  phone: r.phone,
  status: r.status as ClientStatus,
  notes: r.notes,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export async function listClients(): Promise<Client[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ClientRow>('SELECT * FROM clients ORDER BY updated_at DESC');
  return rows.map(rowToClient);
}

export async function getClient(id: string): Promise<Client | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ClientRow>('SELECT * FROM clients WHERE id = ?', id);
  return row ? rowToClient(row) : null;
}

/** Fuzzy lookup by name/company, used by the natural-language invoice generator. */
export async function findClientByName(query: string): Promise<Client | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ClientRow>(
    'SELECT * FROM clients WHERE lower(name) LIKE lower(?) OR lower(company) LIKE lower(?) LIMIT 1',
    `%${query}%`, `%${query}%`
  );
  return row ? rowToClient(row) : null;
}

export async function addClient(input: {
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: ClientStatus;
  notes?: string | null;
}): Promise<Client> {
  const db = await getDb();
  const row: ClientRow = {
    id: newId(),
    name: input.name,
    company: input.company ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    status: input.status ?? 'active',
    notes: input.notes ?? null,
    created_at: now(),
    updated_at: now(),
  };
  await db.runAsync(
    'INSERT INTO clients (id, name, company, email, phone, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    row.id, row.name, row.company, row.email, row.phone, row.status, row.notes, row.created_at, row.updated_at
  );
  return rowToClient(row);
}

export async function updateClient(id: string, patch: Partial<{
  name: string; company: string | null; email: string | null; phone: string | null;
  status: ClientStatus; notes: string | null;
}>): Promise<void> {
  const db = await getDb();
  const existing = await getClient(id);
  if (!existing) return;
  const merged = { ...existing, ...patch };
  await db.runAsync(
    'UPDATE clients SET name = ?, company = ?, email = ?, phone = ?, status = ?, notes = ?, updated_at = ? WHERE id = ?',
    merged.name, merged.company, merged.email, merged.phone, merged.status, merged.notes, now(), id
  );
}

export async function deleteClient(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM clients WHERE id = ?', id);
}
