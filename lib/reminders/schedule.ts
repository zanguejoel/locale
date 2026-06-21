/**
 * Generic local-notification scheduling (expo-notifications), shared by every
 * navigator module that needs a "remind me about this date" feature (Legal
 * Navigator's case deadlines, Freelancer Hub's invoice due dates / contract
 * expirations). Callers own persisting the returned identifier on their own
 * row — this module only talks to the OS notification scheduler.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const readyChannels = new Set<string>();

async function ensureAndroidChannel(channelId: string, name: string): Promise<void> {
  if (Platform.OS !== 'android' || readyChannels.has(channelId)) return;
  await Notifications.setNotificationChannelAsync(channelId, {
    name,
    importance: Notifications.AndroidImportance.HIGH,
  });
  readyChannels.add(channelId);
}

export async function requestReminderPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const result = await Notifications.requestPermissionsAsync();
  return result.granted;
}

export interface ScheduleReminderInput {
  title: string;
  body: string;
  /** Date the notification should fire. If already in the past, fires almost immediately. */
  fireDate: Date;
  /** Cancel this existing notification id first (re-scheduling case). */
  existingReminderId?: string | null;
  /** Android notification channel id + display name. */
  channelId?: string;
  channelName?: string;
}

/**
 * Schedule a local reminder, cancelling any existing one passed in first so
 * re-scheduling never leaves a stale notification behind. Returns null if
 * notification permission isn't granted.
 */
export async function scheduleLocalReminder(input: ScheduleReminderInput): Promise<string | null> {
  const granted = await requestReminderPermission();
  if (!granted) return null;

  const channelId = input.channelId ?? 'default-reminders';
  await ensureAndroidChannel(channelId, input.channelName ?? 'Reminders');

  if (input.existingReminderId) {
    await Notifications.cancelScheduledNotificationAsync(input.existingReminderId).catch(() => {});
  }

  const fireDate = input.fireDate.getTime() > Date.now() ? input.fireDate : new Date(Date.now() + 5000);

  return Notifications.scheduleNotificationAsync({
    content: { title: input.title, body: input.body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireDate,
      channelId: Platform.OS === 'android' ? channelId : undefined,
    },
  });
}

export async function cancelLocalReminder(reminderId: string | null | undefined): Promise<void> {
  if (!reminderId) return;
  await Notifications.cancelScheduledNotificationAsync(reminderId).catch(() => {});
}
