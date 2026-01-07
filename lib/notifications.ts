// Notification utilities for habit reminders

export interface ScheduledReminder {
  habitId: string;
  habitName: string;
  time: string; // HH:MM
  timeoutId?: ReturnType<typeof setTimeout>;
}

// Store active reminders
const activeReminders: Map<string, ScheduledReminder> = new Map();

// Check if notifications are supported
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

// Check current permission status
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';

  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';

  const permission = await Notification.requestPermission();
  return permission;
}

// Show a notification
export function showNotification(title: string, options?: NotificationOptions): Notification | null {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return null;
  }

  return new Notification(title, {
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    ...options
  });
}

// Calculate milliseconds until a specific time today (or tomorrow if time has passed)
function msUntilTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const now = new Date();
  const target = new Date();

  target.setHours(hours, minutes, 0, 0);

  // If the time has already passed today, schedule for tomorrow
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  return target.getTime() - now.getTime();
}

// Schedule a reminder notification
export function scheduleReminder(habitId: string, habitName: string, time: string): void {
  // Cancel existing reminder for this habit if any
  cancelReminder(habitId);

  if (!time || !isNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  const msUntil = msUntilTime(time);

  const timeoutId = setTimeout(() => {
    showNotification(`Time for: ${habitName}`, {
      body: 'Tap to log your habit',
      tag: `habit-${habitId}`,
      requireInteraction: true
    });

    // Reschedule for the next day
    scheduleReminder(habitId, habitName, time);
  }, msUntil);

  activeReminders.set(habitId, {
    habitId,
    habitName,
    time,
    timeoutId
  });
}

// Cancel a scheduled reminder
export function cancelReminder(habitId: string): void {
  const reminder = activeReminders.get(habitId);
  if (reminder?.timeoutId) {
    clearTimeout(reminder.timeoutId);
  }
  activeReminders.delete(habitId);
}

// Cancel all reminders
export function cancelAllReminders(): void {
  activeReminders.forEach((reminder) => {
    if (reminder.timeoutId) {
      clearTimeout(reminder.timeoutId);
    }
  });
  activeReminders.clear();
}

// Schedule reminders for multiple habits
export function scheduleAllReminders(habits: Array<{ id: string; name: string; reminder_time?: string }>): void {
  // Cancel all existing reminders
  cancelAllReminders();

  // Schedule new reminders for habits that have a reminder time
  habits.forEach(habit => {
    if (habit.reminder_time) {
      scheduleReminder(habit.id, habit.name, habit.reminder_time);
    }
  });
}

// Get formatted time string for display
export function formatReminderTime(time: string | null | undefined): string {
  if (!time) return 'No reminder';

  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Parse time input to HH:MM format
export function parseTimeInput(input: string): string | null {
  // Accept various formats: 9:00, 09:00, 9:00 AM, etc.
  const match = input.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3]?.toUpperCase();

  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
