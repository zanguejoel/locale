/** Projects repo. */
import { getDb } from './db';
import { newId, now } from '@/lib/cases/util';
import { Project, ProjectStatus } from './types';

interface ProjectRow {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  hourly_rate: number;
  budget: number | null;
  status: string;
  hours_logged: number;
  start_date: string | null;
  end_date: string | null;
  created_at: number;
  updated_at: number;
}

const rowToProject = (r: ProjectRow): Project => ({
  id: r.id,
  clientId: r.client_id,
  title: r.title,
  description: r.description,
  hourlyRate: r.hourly_rate,
  budget: r.budget,
  status: r.status as ProjectStatus,
  hoursLogged: r.hours_logged,
  startDate: r.start_date,
  endDate: r.end_date,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export async function listProjects(clientId?: string): Promise<Project[]> {
  const db = await getDb();
  const rows = clientId
    ? await db.getAllAsync<ProjectRow>('SELECT * FROM projects WHERE client_id = ? ORDER BY updated_at DESC', clientId)
    : await db.getAllAsync<ProjectRow>('SELECT * FROM projects ORDER BY updated_at DESC');
  return rows.map(rowToProject);
}

export async function getProject(id: string): Promise<Project | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ProjectRow>('SELECT * FROM projects WHERE id = ?', id);
  return row ? rowToProject(row) : null;
}

export async function addProject(input: {
  clientId: string;
  title: string;
  description?: string | null;
  hourlyRate?: number;
  budget?: number | null;
  status?: ProjectStatus;
  startDate?: string | null;
  endDate?: string | null;
}): Promise<Project> {
  const db = await getDb();
  const row: ProjectRow = {
    id: newId(),
    client_id: input.clientId,
    title: input.title,
    description: input.description ?? null,
    hourly_rate: input.hourlyRate ?? 0,
    budget: input.budget ?? null,
    status: input.status ?? 'active',
    hours_logged: 0,
    start_date: input.startDate ?? null,
    end_date: input.endDate ?? null,
    created_at: now(),
    updated_at: now(),
  };
  await db.runAsync(
    `INSERT INTO projects (id, client_id, title, description, hourly_rate, budget, status, hours_logged, start_date, end_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    row.id, row.client_id, row.title, row.description, row.hourly_rate, row.budget, row.status,
    row.hours_logged, row.start_date, row.end_date, row.created_at, row.updated_at
  );
  return rowToProject(row);
}

export async function updateProject(id: string, patch: Partial<{
  title: string; description: string | null; hourlyRate: number; budget: number | null;
  status: ProjectStatus; hoursLogged: number; startDate: string | null; endDate: string | null;
}>): Promise<void> {
  const db = await getDb();
  const existing = await getProject(id);
  if (!existing) return;
  const merged = { ...existing, ...patch };
  await db.runAsync(
    `UPDATE projects SET title = ?, description = ?, hourly_rate = ?, budget = ?, status = ?, hours_logged = ?, start_date = ?, end_date = ?, updated_at = ? WHERE id = ?`,
    merged.title, merged.description, merged.hourlyRate, merged.budget, merged.status,
    merged.hoursLogged, merged.startDate, merged.endDate, now(), id
  );
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM projects WHERE id = ?', id);
}
