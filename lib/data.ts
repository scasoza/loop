import { supabase } from './supabaseClient';
import { getSessionId } from './session';
import dayjs from 'dayjs';

type ProtocolStatus = 'active' | 'paused' | 'completed';

// Tier describes how you performed the habit that day
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

// Habit is just the definition - what you want to do
export interface Habit {
  id: string;
  name: string;
  protocol_id: string;
  created_at?: string;
}

// Completion records how you did it on a specific day
export interface HabitCompletion {
  id: string;
  habit_id: string;
  date: string;
  tier: CompletionTier;
}

// Combined view for display
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

const FALLBACK_PROTOCOL: Protocol = {
  id: 'demo-protocol',
  name: '30 Day Intensity',
  status: 'active',
  day_number: 1,
  total_days: 30,
  streak: 1,
  theme: 'system'
};

const FALLBACK_HABITS: Habit[] = [
  { id: 'demo-1', name: 'Morning Routine', protocol_id: 'demo-protocol' },
  { id: 'demo-2', name: 'Deep Work', protocol_id: 'demo-protocol' },
  { id: 'demo-3', name: 'Exercise', protocol_id: 'demo-protocol' },
  { id: 'demo-4', name: 'Read', protocol_id: 'demo-protocol' }
];

function hasSupabaseEnv(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && !url.includes('your-project') && !key.includes('your-anon'));
}

function getToday(): string {
  return dayjs().format('YYYY-MM-DD');
}

export async function fetchProtocol(): Promise<Protocol> {
  const sessionId = getSessionId();
  if (!hasSupabaseEnv() || !sessionId) {
    return FALLBACK_PROTOCOL;
  }

  try {
    const { data, error } = await supabase
      .from('protocols')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching protocol:', error.message);
      return FALLBACK_PROTOCOL;
    }

    if (!data) {
      const { data: created, error: insertError } = await supabase
        .from('protocols')
        .insert({
          session_id: sessionId,
          name: FALLBACK_PROTOCOL.name,
          status: FALLBACK_PROTOCOL.status,
          day_number: FALLBACK_PROTOCOL.day_number,
          total_days: FALLBACK_PROTOCOL.total_days,
          streak: FALLBACK_PROTOCOL.streak,
          theme: FALLBACK_PROTOCOL.theme
        })
        .select()
        .single();

      if (insertError || !created) {
        console.error('Error creating protocol:', insertError?.message);
        return FALLBACK_PROTOCOL;
      }
      return created as Protocol;
    }

    return data as Protocol;
  } catch (err) {
    console.error('Unexpected error fetching protocol:', err);
    return FALLBACK_PROTOCOL;
  }
}

export async function updateProtocol(partial: Partial<Protocol>): Promise<void> {
  const sessionId = getSessionId();
  if (!hasSupabaseEnv() || !sessionId) return;

  const protocol = await fetchProtocol();
  await supabase
    .from('protocols')
    .update(partial)
    .eq('id', protocol.id)
    .eq('session_id', sessionId);
}

// Fetch habit definitions
export async function fetchHabits(protocolId: string): Promise<Habit[]> {
  const sessionId = getSessionId();
  if (!hasSupabaseEnv() || !sessionId) {
    return FALLBACK_HABITS;
  }

  try {
    const { data, error } = await supabase
      .from('habits')
      .select('id, name, protocol_id, created_at')
      .eq('session_id', sessionId)
      .eq('protocol_id', protocolId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching habits:', error.message);
      return FALLBACK_HABITS;
    }

    return (data || []) as Habit[];
  } catch (err) {
    console.error('Unexpected error fetching habits:', err);
    return FALLBACK_HABITS;
  }
}

// Fetch today's completions
export async function fetchTodayCompletions(habitIds: string[]): Promise<Record<string, HabitCompletion>> {
  const sessionId = getSessionId();
  if (!hasSupabaseEnv() || !sessionId || habitIds.length === 0) return {};

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
  const sessionId = getSessionId();

  if (!hasSupabaseEnv() || !sessionId) {
    // Demo mode
    return habits.map((h, i) => ({
      ...h,
      todayCompletion: i === 0 ? { id: 'demo-c1', habit_id: h.id, date: getToday(), tier: 'base' as CompletionTier } : undefined
    }));
  }

  const completions = await fetchTodayCompletions(habits.map(h => h.id));
  return habits.map(h => ({
    ...h,
    todayCompletion: completions[h.id]
  }));
}

// Complete a habit for today with a tier
export async function completeHabit(habitId: string, tier: CompletionTier): Promise<HabitCompletion> {
  const sessionId = getSessionId();
  const today = getToday();

  if (!hasSupabaseEnv() || !sessionId) {
    return { id: `demo-${Date.now()}`, habit_id: habitId, date: today, tier };
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

    if (error) throw new Error(error.message);
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

    if (error) throw new Error(error.message);
    return data as HabitCompletion;
  }
}

// Remove today's completion (uncomplete)
export async function uncompleteHabit(habitId: string): Promise<void> {
  const sessionId = getSessionId();
  if (!hasSupabaseEnv() || !sessionId) return;

  const today = getToday();
  await supabase
    .from('habit_completions')
    .delete()
    .eq('session_id', sessionId)
    .eq('habit_id', habitId)
    .eq('date', today);
}

// Add new habit
export async function addHabit(input: { name: string; protocolId: string }): Promise<Habit> {
  const sessionId = getSessionId();
  if (!hasSupabaseEnv() || !sessionId) {
    return { id: `demo-${Date.now()}`, name: input.name, protocol_id: input.protocolId };
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

  if (error || !data) throw new Error(error?.message ?? 'Unable to add habit');
  return data as Habit;
}

// Update habit name
export async function updateHabit(id: string, updates: { name: string }): Promise<void> {
  const sessionId = getSessionId();
  if (!hasSupabaseEnv() || !sessionId) return;

  await supabase
    .from('habits')
    .update(updates)
    .eq('id', id)
    .eq('session_id', sessionId);
}

// Delete habit
export async function deleteHabit(id: string): Promise<void> {
  const sessionId = getSessionId();
  if (!hasSupabaseEnv() || !sessionId) return;

  await supabase
    .from('habits')
    .delete()
    .eq('id', id)
    .eq('session_id', sessionId);
}

// Clear all data
export async function clearData(): Promise<void> {
  const sessionId = getSessionId();
  if (!hasSupabaseEnv() || !sessionId) return;

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
