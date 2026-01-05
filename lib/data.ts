import { supabase } from './supabaseClient';
import { getSessionId } from './session';
import dayjs from 'dayjs';

type ProtocolStatus = 'active' | 'paused' | 'completed';

export type CompletionTier = 'floor' | 'base' | 'bonus';

export interface Protocol {
  id: string;
  name: string;
  status: ProtocolStatus;
  day_number: number;
  total_days: number;
  streak: number;
  theme: 'light' | 'dark' | 'system';
  created_at?: string;
}

export interface Habit {
  id: string;
  name: string;
  protocol_id: string;
  created_at?: string;
}

export interface HabitCompletion {
  id: string;
  habit_id: string;
  date: string;
  tier: CompletionTier;
}

export interface HabitWithCompletion extends Habit {
  todayCompletion?: HabitCompletion;
}

export interface Summary {
  habitCount: number;
  completedCount: number;
  floorCount: number;
  baseCount: number;
  bonusCount: number;
}

function getToday(): string {
  return dayjs().format('YYYY-MM-DD');
}

// Check if we can use Supabase
function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn('Supabase not configured: missing env vars');
    return false;
  }

  // Check for obvious placeholder values
  if (url.includes('example.supabase.co') || url === 'your-project-url') {
    console.warn('Supabase not configured: placeholder URL');
    return false;
  }

  return true;
}

export async function fetchProtocol(): Promise<Protocol | null> {
  const sessionId = getSessionId();

  console.log('[Loop Debug] fetchProtocol called, sessionId:', sessionId);

  if (!isSupabaseConfigured()) {
    console.log('[Loop Debug] Supabase not configured');
    return null;
  }

  if (!sessionId) {
    console.log('[Loop Debug] No session ID available');
    return null;
  }

  // Try to get existing protocol
  const { data, error } = await supabase
    .from('protocols')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log('[Loop Debug] Protocol query result:', { data, error: error?.message });

  if (error) {
    console.error('[Loop Debug] Error fetching protocol:', error.message);
    return null;
  }

  if (data) {
    console.log('[Loop Debug] Found existing protocol:', data.id);
    return data as Protocol;
  }

  // No protocol exists, create one
  console.log('[Loop Debug] No protocol found, creating new one');
  const { data: created, error: insertError } = await supabase
    .from('protocols')
    .insert({
      session_id: sessionId,
      name: '30 Day Intensity',
      status: 'active',
      day_number: 1,
      total_days: 30,
      streak: 1,
      theme: 'system'
    })
    .select()
    .single();

  if (insertError) {
    console.error('[Loop Debug] Error creating protocol:', insertError.message);
    return null;
  }

  console.log('[Loop Debug] Created new protocol:', created?.id);
  return created as Protocol;
}

export async function updateProtocol(partial: Partial<Protocol>): Promise<void> {
  const sessionId = getSessionId();
  if (!isSupabaseConfigured() || !sessionId) return;

  const protocol = await fetchProtocol();
  if (!protocol) return;

  await supabase
    .from('protocols')
    .update(partial)
    .eq('id', protocol.id)
    .eq('session_id', sessionId);
}

// Fetch all habits for this protocol (these persist forever until deleted)
export async function fetchHabits(protocolId: string): Promise<Habit[]> {
  const sessionId = getSessionId();

  console.log('[Loop Debug] fetchHabits called, protocolId:', protocolId, 'sessionId:', sessionId);

  if (!isSupabaseConfigured() || !sessionId) {
    console.log('[Loop Debug] fetchHabits: not configured or no session');
    return [];
  }

  const { data, error } = await supabase
    .from('habits')
    .select('id, name, protocol_id, created_at')
    .eq('session_id', sessionId)
    .eq('protocol_id', protocolId)
    .order('created_at', { ascending: true });

  console.log('[Loop Debug] fetchHabits result:', { count: data?.length, habits: data?.map(h => h.name), error: error?.message });

  if (error) {
    console.error('[Loop Debug] Error fetching habits:', error.message);
    return [];
  }

  return (data || []) as Habit[];
}

// Fetch today's completions for given habits
export async function fetchTodayCompletions(habitIds: string[]): Promise<Record<string, HabitCompletion>> {
  const sessionId = getSessionId();
  if (!isSupabaseConfigured() || !sessionId || habitIds.length === 0) {
    return {};
  }

  const today = getToday();
  const { data, error } = await supabase
    .from('habit_completions')
    .select('*')
    .eq('session_id', sessionId)
    .eq('date', today)
    .in('habit_id', habitIds);

  if (error) {
    console.error('Error fetching completions:', error.message);
    return {};
  }

  const result: Record<string, HabitCompletion> = {};
  (data || []).forEach((c: HabitCompletion) => {
    result[c.habit_id] = c;
  });
  return result;
}

// Get habits with today's completion status
export async function fetchHabitsWithCompletions(protocolId: string): Promise<HabitWithCompletion[]> {
  const habits = await fetchHabits(protocolId);

  if (habits.length === 0) {
    return [];
  }

  const completions = await fetchTodayCompletions(habits.map(h => h.id));

  return habits.map(h => ({
    ...h,
    todayCompletion: completions[h.id]
  }));
}

// Complete a habit for today with a tier
export async function completeHabit(habitId: string, tier: CompletionTier): Promise<HabitCompletion | null> {
  const sessionId = getSessionId();
  const today = getToday();

  if (!isSupabaseConfigured() || !sessionId) {
    return null;
  }

  // Check if completion exists
  const { data: existing } = await supabase
    .from('habit_completions')
    .select('id')
    .eq('session_id', sessionId)
    .eq('habit_id', habitId)
    .eq('date', today)
    .maybeSingle();

  if (existing) {
    // Update tier
    const { data, error } = await supabase
      .from('habit_completions')
      .update({ tier })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating completion:', error.message);
      return null;
    }
    return data as HabitCompletion;
  } else {
    // Create new
    const { data, error } = await supabase
      .from('habit_completions')
      .insert({
        session_id: sessionId,
        habit_id: habitId,
        date: today,
        tier
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating completion:', error.message);
      return null;
    }
    return data as HabitCompletion;
  }
}

// Remove today's completion
export async function uncompleteHabit(habitId: string): Promise<void> {
  const sessionId = getSessionId();
  if (!isSupabaseConfigured() || !sessionId) return;

  const today = getToday();
  await supabase
    .from('habit_completions')
    .delete()
    .eq('session_id', sessionId)
    .eq('habit_id', habitId)
    .eq('date', today);
}

// Add new habit (persists until deleted)
export async function addHabit(input: { name: string; protocolId: string }): Promise<Habit | null> {
  const sessionId = getSessionId();
  if (!isSupabaseConfigured() || !sessionId) {
    return null;
  }

  const { data, error } = await supabase
    .from('habits')
    .insert({
      session_id: sessionId,
      protocol_id: input.protocolId,
      name: input.name
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding habit:', error.message);
    return null;
  }
  return data as Habit;
}

// Update habit name
export async function updateHabit(id: string, updates: { name: string }): Promise<void> {
  const sessionId = getSessionId();
  if (!isSupabaseConfigured() || !sessionId) return;

  await supabase
    .from('habits')
    .update(updates)
    .eq('id', id)
    .eq('session_id', sessionId);
}

// Delete habit (removes it permanently)
export async function deleteHabit(id: string): Promise<void> {
  const sessionId = getSessionId();
  console.log('[Loop Debug] deleteHabit called, habitId:', id, 'sessionId:', sessionId);

  if (!isSupabaseConfigured() || !sessionId) {
    console.log('[Loop Debug] deleteHabit: not configured or no session');
    return;
  }

  const { error } = await supabase
    .from('habits')
    .delete()
    .eq('id', id)
    .eq('session_id', sessionId);

  console.log('[Loop Debug] deleteHabit result:', { error: error?.message });
}

// Clear all data
export async function clearData(): Promise<void> {
  const sessionId = getSessionId();
  if (!isSupabaseConfigured() || !sessionId) return;

  await supabase.from('habit_completions').delete().eq('session_id', sessionId);
  await supabase.from('protocols').delete().eq('session_id', sessionId);
}

// Compute summary for today
export function computeSummary(habits: HabitWithCompletion[]): Summary {
  const completed = habits.filter(h => h.todayCompletion);
  return {
    habitCount: habits.length,
    completedCount: completed.length,
    floorCount: completed.filter(h => h.todayCompletion?.tier === 'floor').length,
    baseCount: completed.filter(h => h.todayCompletion?.tier === 'base').length,
    bonusCount: completed.filter(h => h.todayCompletion?.tier === 'bonus').length
  };
}
