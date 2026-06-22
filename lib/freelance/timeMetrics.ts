/**
 * Pure aggregations over TimeEntry[] — no I/O, mirrors the metrics.ts pattern
 * so the timer screen, timesheet, and dashboard share one source of truth.
 * Only completed entries (endTime !== null) contribute to totals; a running
 * timer's live elapsed time is computed in the UI from startTime.
 */
import { TimeEntry } from './types';

const HOUR = 3600;

const completed = (entries: TimeEntry[]) => entries.filter((e) => e.endTime !== null);

export function totalSeconds(entries: TimeEntry[]): number {
  return completed(entries).reduce((sum, e) => sum + e.durationSeconds, 0);
}

export function billableSeconds(entries: TimeEntry[]): number {
  return completed(entries).filter((e) => e.isBillable).reduce((sum, e) => sum + e.durationSeconds, 0);
}

/** Dollar value of billable, not-yet-invoiced time. */
export function unbilledValue(entries: TimeEntry[]): number {
  return completed(entries)
    .filter((e) => e.isBillable && !e.billed)
    .reduce((sum, e) => sum + (e.durationSeconds / HOUR) * e.rateSnapshot, 0);
}

export function unbilledSeconds(entries: TimeEntry[]): number {
  return completed(entries)
    .filter((e) => e.isBillable && !e.billed)
    .reduce((sum, e) => sum + e.durationSeconds, 0);
}

/** Fraction of tracked time that's billable, 0..1 (0 when nothing tracked). */
export function billablePercent(entries: TimeEntry[]): number {
  const total = totalSeconds(entries);
  return total > 0 ? billableSeconds(entries) / total : 0;
}

function startOfWeek(d: Date): number {
  const copy = new Date(d);
  const day = (copy.getDay() + 6) % 7; // Monday = 0
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - day);
  return copy.getTime();
}

/** Seconds tracked since the start of the current (Monday-anchored) week. */
export function thisWeekSeconds(entries: TimeEntry[], reference = new Date()): number {
  const weekStart = startOfWeek(reference);
  return completed(entries)
    .filter((e) => e.startTime >= weekStart)
    .reduce((sum, e) => sum + e.durationSeconds, 0);
}

export interface Aggregate { key: string; seconds: number; value: number }

function groupBy(entries: TimeEntry[], pick: (e: TimeEntry) => string): Aggregate[] {
  const map = new Map<string, Aggregate>();
  for (const e of completed(entries)) {
    const key = pick(e);
    const agg = map.get(key) ?? { key, seconds: 0, value: 0 };
    agg.seconds += e.durationSeconds;
    if (e.isBillable) agg.value += (e.durationSeconds / HOUR) * e.rateSnapshot;
    map.set(key, agg);
  }
  return Array.from(map.values()).sort((a, b) => b.seconds - a.seconds);
}

export const secondsByProject = (entries: TimeEntry[]): Aggregate[] => groupBy(entries, (e) => e.projectId);
export const secondsByClient = (entries: TimeEntry[]): Aggregate[] => groupBy(entries, (e) => e.clientId);

/** Format seconds as `H:MM` (e.g. 9000 → "2:30"). */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / HOUR);
  const m = Math.floor((total % HOUR) / 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

/** Format seconds as a stopwatch `H:MM:SS` for the live timer display. */
export function formatStopwatch(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / HOUR);
  const m = Math.floor((total % HOUR) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Decimal hours rounded to 2dp (e.g. for an invoice line). */
export function toHours(seconds: number): number {
  return Math.round((seconds / HOUR) * 100) / 100;
}
