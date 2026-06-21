/** Local reminders for invoice due dates and contract expirations. */
import { scheduleLocalReminder, cancelLocalReminder } from '@/lib/reminders/schedule';
import { setContractReminder } from './contracts';
import { Contract } from './types';

const FREELANCE_CHANNEL = 'freelance-reminders';

export async function scheduleContractExpiryReminder(contract: Contract): Promise<string | null> {
  const expiry = contract.renewalDate ?? contract.endDate;
  if (!expiry) return null;

  const identifier = await scheduleLocalReminder({
    title: `Contract expiring: ${contract.name}`,
    body: `Renewal/end date ${expiry}`,
    fireDate: new Date(`${expiry}T09:00:00`),
    existingReminderId: contract.reminderId,
    channelId: FREELANCE_CHANNEL,
    channelName: 'Freelancer Hub reminders',
  });

  await setContractReminder(contract.id, identifier);
  return identifier;
}

export async function cancelContractExpiryReminder(contract: Contract): Promise<void> {
  await cancelLocalReminder(contract.reminderId);
  await setContractReminder(contract.id, null);
}
