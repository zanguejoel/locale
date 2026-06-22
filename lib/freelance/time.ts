/**
 * Time-tracking repo — the Toggl-style "Work Log". Exactly one entry may be
 * running at a time (`end_time IS NULL`); elapsed time is recomputed from
 * `start_time` so a running timer survives app restarts. Stopping an entry
 * stamps its duration and rolls the hours into the project's `hours_logged`.
 *
 * Billing context is snapshotted at start: the entry captures the project's
 * governing contract (if any) and the rate to bill at, resolved
 * Contract → Project → 0. Contracts in this schema don't carry a numeric rate,
 * so the contract link is recorded for traceability / retainer insights while
 * the project's `hourlyRate` supplies the snapshot — later edits to either
 * won't rewrite already-tracked history.
 */
import { getDb } from './db';
import { newId, now } from '@/lib/cases/util';
import { TimeEntry } from './types';
import { getProject, updateProject } from './projects';
import { listContractsByProject } from './contracts';

interface TimeEntryRow {
  id: string;
  project_id: string;
  client_id: string;
  contract_id: string | null;
  description: string | null;
  start_time: number;
  end_time: number | null;
  duration_seconds: number;
  is_billable: number;
  billed: number;
  invoice_id: string | null;
  rate_snapshot: number;
  tags: string | null;
  created_at: number;
  updated_at: number;
}

const rowToEntry = (r: TimeEntryRow): TimeEntry => ({
  id: r.id,
  projectId: r.project_id,
  clientId: r.client_id,
  contractId: r.contract_id,
  description: r.description,
  startTime: r.start_time,
  endTime: r.end_time,
  durationSeconds: r.duration_seconds,
  isBillable: r.is_billable === 1,
  billed: r.billed === 1,
  invoiceId: r.invoice_id,
  rateSnapshot: r.rate_snapshot,
  tags: r.tags ? r.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export interface TimeEntryContext {
  clientId: string;
  contractId: string | null;
  rate: number;
}

/**
 * Resolve the billing context for a project: its client, governing contract
 * (first contract linked to the project, if any), and the rate to snapshot
 * (Contract → Project → 0). Throws if the project doesn't exist.
 */
export async function resolveEntryContext(projectId: string): Promise<TimeEntryContext> {
  const project = await getProject(projectId);
  if (!project) throw new Error(`Project ${projectId} not found`);
  const contracts = await listContractsByProject(projectId);
  return {
    clientId: project.clientId,
    contractId: contracts[0]?.id ?? null,
    rate: project.hourlyRate ?? 0,
  };
}

export interface TimeEntryFilter {
  projectId?: string;
  clientId?: string;
  /** Only billable entries not yet attached to an invoice. */
  unbilledOnly?: boolean;
  /** Exclude the running (open) entry. */
  completedOnly?: boolean;
}

export async function listTimeEntries(filter: TimeEntryFilter = {}): Promise<TimeEntry[]> {
  const db = await getDb();
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (filter.projectId) { where.push('project_id = ?'); args.push(filter.projectId); }
  if (filter.clientId) { where.push('client_id = ?'); args.push(filter.clientId); }
  if (filter.unbilledOnly) where.push('is_billable = 1 AND billed = 0');
  if (filter.completedOnly || filter.unbilledOnly) where.push('end_time IS NOT NULL');
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = await db.getAllAsync<TimeEntryRow>(
    `SELECT * FROM time_entries ${clause} ORDER BY start_time DESC`,
    ...args
  );
  return rows.map(rowToEntry);
}

export async function getTimeEntry(id: string): Promise<TimeEntry | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<TimeEntryRow>('SELECT * FROM time_entries WHERE id = ?', id);
  return row ? rowToEntry(row) : null;
}

/** The single currently-running entry, or null. */
export async function getRunningEntry(): Promise<TimeEntry | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<TimeEntryRow>('SELECT * FROM time_entries WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1');
  return row ? rowToEntry(row) : null;
}

async function insertEntry(row: TimeEntryRow): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO time_entries (id, project_id, client_id, contract_id, description, start_time, end_time, duration_seconds, is_billable, billed, invoice_id, rate_snapshot, tags, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    row.id, row.project_id, row.client_id, row.contract_id, row.description, row.start_time, row.end_time,
    row.duration_seconds, row.is_billable, row.billed, row.invoice_id, row.rate_snapshot, row.tags,
    row.created_at, row.updated_at
  );
}

/**
 * Start a timer for a project. Enforces a single running entry: any existing
 * running timer is stopped first (Toggl-style). Returns the new running entry.
 */
export async function startTimer(input: { projectId: string; description?: string | null; isBillable?: boolean }): Promise<TimeEntry> {
  const running = await getRunningEntry();
  if (running) await stopTimer(running.id);

  const ctx = await resolveEntryContext(input.projectId);
  const ts = now();
  const row: TimeEntryRow = {
    id: newId(),
    project_id: input.projectId,
    client_id: ctx.clientId,
    contract_id: ctx.contractId,
    description: input.description?.trim() || null,
    start_time: ts,
    end_time: null,
    duration_seconds: 0,
    is_billable: (input.isBillable ?? true) ? 1 : 0,
    billed: 0,
    invoice_id: null,
    rate_snapshot: ctx.rate,
    tags: null,
    created_at: ts,
    updated_at: ts,
  };
  await insertEntry(row);
  return rowToEntry(row);
}

/** Stop a running entry, stamping duration and rolling hours into the project. */
export async function stopTimer(id: string): Promise<TimeEntry | null> {
  const db = await getDb();
  const entry = await getTimeEntry(id);
  if (!entry || entry.endTime !== null) return entry;
  const end = now();
  const duration = Math.max(0, Math.round((end - entry.startTime) / 1000));
  await db.runAsync(
    'UPDATE time_entries SET end_time = ?, duration_seconds = ?, updated_at = ? WHERE id = ?',
    end, duration, end, id
  );
  await rollHoursIntoProject(entry.projectId, duration / 3600);
  return getTimeEntry(id);
}

/** Add a completed entry manually (no live timer), e.g. from natural-language. */
export async function addManualEntry(input: {
  projectId: string;
  description?: string | null;
  startTime: number;
  durationSeconds: number;
  isBillable?: boolean;
}): Promise<TimeEntry> {
  const ctx = await resolveEntryContext(input.projectId);
  const ts = now();
  const duration = Math.max(0, Math.round(input.durationSeconds));
  const row: TimeEntryRow = {
    id: newId(),
    project_id: input.projectId,
    client_id: ctx.clientId,
    contract_id: ctx.contractId,
    description: input.description?.trim() || null,
    start_time: input.startTime,
    end_time: input.startTime + duration * 1000,
    duration_seconds: duration,
    is_billable: (input.isBillable ?? true) ? 1 : 0,
    billed: 0,
    invoice_id: null,
    rate_snapshot: ctx.rate,
    tags: null,
    created_at: ts,
    updated_at: ts,
  };
  await insertEntry(row);
  await rollHoursIntoProject(input.projectId, duration / 3600);
  return rowToEntry(row);
}

export async function updateTimeEntry(id: string, patch: Partial<{
  description: string | null; isBillable: boolean;
}>): Promise<void> {
  const db = await getDb();
  const existing = await getTimeEntry(id);
  if (!existing) return;
  const description = patch.description !== undefined ? patch.description : existing.description;
  const isBillable = patch.isBillable !== undefined ? patch.isBillable : existing.isBillable;
  await db.runAsync(
    'UPDATE time_entries SET description = ?, is_billable = ?, updated_at = ? WHERE id = ?',
    description, isBillable ? 1 : 0, now(), id
  );
}

export async function deleteTimeEntry(id: string): Promise<void> {
  const db = await getDb();
  const entry = await getTimeEntry(id);
  await db.runAsync('DELETE FROM time_entries WHERE id = ?', id);
  if (entry && entry.endTime !== null) {
    await rollHoursIntoProject(entry.projectId, -(entry.durationSeconds / 3600));
  }
}

/** Mark a set of entries as billed and attach them to an invoice. */
export async function markEntriesBilled(ids: string[], invoiceId: string): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  const placeholders = ids.map(() => '?').join(', ');
  await db.runAsync(
    `UPDATE time_entries SET billed = 1, invoice_id = ?, updated_at = ? WHERE id IN (${placeholders})`,
    invoiceId, now(), ...ids
  );
}

async function rollHoursIntoProject(projectId: string, deltaHours: number): Promise<void> {
  if (!deltaHours) return;
  const project = await getProject(projectId);
  if (!project) return;
  const next = Math.max(0, Math.round((project.hoursLogged + deltaHours) * 100) / 100);
  await updateProject(projectId, { hoursLogged: next });
}
