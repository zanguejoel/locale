/** Single-row-per-key settings store (tax rate, invoice numbering counters). */
import { getDb } from './db';

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM freelance_settings WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO freelance_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key, value
  );
}

const TAX_RATE_KEY = 'tax_rate';

/** Effective tax rate as a decimal (e.g. 0.25 for 25%). Defaults to 0 (no estimate) until set. */
export async function getTaxRate(): Promise<number> {
  const raw = await getSetting(TAX_RATE_KEY);
  return raw ? parseFloat(raw) : 0;
}

export async function setTaxRate(rate: number): Promise<void> {
  await setSetting(TAX_RATE_KEY, String(rate));
}
