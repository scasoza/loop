// OneSignal Push Notification Service
import OneSignal from 'react-onesignal';

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || '';

let initialized = false;

// Initialize OneSignal
export async function initOneSignal(): Promise<void> {
  if (initialized || typeof window === 'undefined' || !ONESIGNAL_APP_ID) {
    return;
  }

  try {
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true // For development
    });

    initialized = true;
    console.log('[OneSignal] Initialized successfully');
  } catch (error) {
    console.error('[OneSignal] Failed to initialize:', error);
  }
}

// Check if OneSignal is available
export function isOneSignalAvailable(): boolean {
  return !!ONESIGNAL_APP_ID && typeof window !== 'undefined';
}

// Request notification permission via OneSignal
export async function requestOneSignalPermission(): Promise<boolean> {
  if (!isOneSignalAvailable()) return false;

  try {
    await OneSignal.Slidedown.promptPush();
    const permission = await OneSignal.Notifications.permission;
    return permission;
  } catch (error) {
    console.error('[OneSignal] Permission request failed:', error);
    return false;
  }
}

// Get current permission status
export async function getOneSignalPermission(): Promise<boolean> {
  if (!isOneSignalAvailable()) return false;

  try {
    return await OneSignal.Notifications.permission;
  } catch {
    return false;
  }
}

// Get the OneSignal Player ID (unique device identifier)
export async function getPlayerId(): Promise<string | null> {
  if (!isOneSignalAvailable()) return null;

  try {
    const userId = await OneSignal.User.PushSubscription.id;
    return userId || null;
  } catch {
    return null;
  }
}

// Set external user ID (link to your session)
export async function setExternalUserId(sessionId: string): Promise<void> {
  if (!isOneSignalAvailable()) return;

  try {
    await OneSignal.login(sessionId);
    console.log('[OneSignal] External user ID set:', sessionId);
  } catch (error) {
    console.error('[OneSignal] Failed to set external user ID:', error);
  }
}

// Add a tag (for targeting notifications)
export async function addTag(key: string, value: string): Promise<void> {
  if (!isOneSignalAvailable()) return;

  try {
    await OneSignal.User.addTag(key, value);
  } catch (error) {
    console.error('[OneSignal] Failed to add tag:', error);
  }
}

// Store habit reminder times as tags for server-side scheduling
export async function syncHabitReminders(
  habits: Array<{ id: string; name: string; reminder_time?: string }>
): Promise<void> {
  if (!isOneSignalAvailable()) return;

  try {
    // Create tags for each habit with a reminder
    const tags: Record<string, string> = {};

    habits.forEach(habit => {
      if (habit.reminder_time) {
        // Store as "reminder_HABITID": "HH:MM|HabitName"
        tags[`reminder_${habit.id}`] = `${habit.reminder_time}|${habit.name}`;
      }
    });

    // Clear old reminder tags and set new ones
    await OneSignal.User.addTags(tags);
    console.log('[OneSignal] Synced habit reminders:', tags);
  } catch (error) {
    console.error('[OneSignal] Failed to sync habit reminders:', error);
  }
}

// Remove a habit reminder tag
export async function removeHabitReminder(habitId: string): Promise<void> {
  if (!isOneSignalAvailable()) return;

  try {
    await OneSignal.User.removeTag(`reminder_${habitId}`);
  } catch (error) {
    console.error('[OneSignal] Failed to remove habit reminder:', error);
  }
}
