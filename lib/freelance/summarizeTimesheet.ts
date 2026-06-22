/**
 * Generate a short narrative timesheet summary from tracked entries — the same
 * draft-from-context pattern as generateDocument.ts / followup.ts. Numbers come
 * from the (deterministic) aggregates passed in; the LLM only writes prose, so
 * it can't fabricate hours.
 */
import { LlmHandle } from '@/lib/llm/generate';
import { TimeEntry } from './types';
import { formatDuration, toHours } from './timeMetrics';

export interface TimesheetSummaryInput {
  entries: TimeEntry[];
  projectNames: Record<string, string>; // projectId -> title
  periodLabel: string; // e.g. "this week"
}

export async function summarizeTimesheet(input: TimesheetSummaryInput, llm: LlmHandle): Promise<string> {
  const { entries, projectNames, periodLabel } = input;
  const completed = entries.filter((e) => e.endTime !== null);
  if (completed.length === 0) return `No time tracked ${periodLabel}.`;

  const byProject = new Map<string, number>();
  for (const e of completed) byProject.set(e.projectId, (byProject.get(e.projectId) ?? 0) + e.durationSeconds);

  const lines = Array.from(byProject.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([pid, secs]) => `- ${projectNames[pid] ?? 'Unknown project'}: ${formatDuration(secs)} (${toHours(secs)}h)`);

  const totalSecs = completed.reduce((sum, e) => sum + e.durationSeconds, 0);

  const prompt =
    `Write a brief, professional timesheet summary for ${periodLabel}. 2-4 ` +
    'sentences, plain text, no markdown headings. Use ONLY these figures — do ' +
    'not invent any numbers:\n\n' +
    `Total tracked: ${formatDuration(totalSecs)} (${toHours(totalSecs)} hours)\n` +
    'By project:\n' +
    lines.join('\n');

  try {
    await llm.generate([{ role: 'user', content: prompt }]);
    return (llm.response || '').trim() || lines.join('\n');
  } catch (error) {
    console.error('[Freelancer] Timesheet summary failed:', error);
    return lines.join('\n');
  }
}
