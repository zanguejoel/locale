/**
 * Local reminder scheduling for case deadlines. Thin wrapper around the
 * shared `lib/reminders/schedule.ts` scheduler — persists the resulting
 * notification id on the deadline row so it can be cancelled/re-scheduled.
 */
import { CaseDeadline } from './types';
import { setDeadlineReminder } from './deadlines';
import { scheduleLocalReminder, cancelLocalReminder, requestReminderPermission } from '@/lib/reminders/schedule';

const CASE_DEADLINES_CHANNEL = 'case-deadlines';

export { requestReminderPermission };

/**
 * Schedule a local reminder for a deadline, firing at 9am on the due date
 * (or immediately if the due date has already passed today).
 */
export async function scheduleDeadlineReminder(deadline: CaseDeadline, caseTitle: string): Promise<string | null> {
  const fireDate = new Date(`${deadline.dueDate}T09:00:00`);

  const identifier = await scheduleLocalReminder({
    title: `Deadline: ${deadline.label}`,
    body: `${caseTitle} — due ${deadline.dueDate}`,
    fireDate,
    existingReminderId: deadline.reminderId,
    channelId: CASE_DEADLINES_CHANNEL,
    channelName: 'Case deadlines',
  });

  await setDeadlineReminder(deadline.id, identifier);
  return identifier;
}

export async function cancelDeadlineReminder(deadline: CaseDeadline): Promise<void> {
  await cancelLocalReminder(deadline.reminderId);
  await setDeadlineReminder(deadline.id, null);
}
