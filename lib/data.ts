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
  archived?: boolean;
}

export interface HabitCompletion {
  id: string;
  habit_id: string;
  date: string;
  tier: CompletionTier;
}

export interface HabitStats {
  currentStreak: number;
  longestStreak: number;
  completionRate: number; // 0-100 percentage over last 30 days
  totalCompletions: number;
  lastCompleted?: string; // date string
}

export interface HabitWithCompletion extends Habit {
  todayCompletion?: HabitCompletion;
  stats?: HabitStats;
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
    .select('id, name, protocol_id')
    .eq('session_id', sessionId)
    .eq('protocol_id', protocolId);

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

// Get habits with today's completion status and stats
export async function fetchHabitsWithCompletions(protocolId: string): Promise<HabitWithCompletion[]> {
  const habits = await fetchHabits(protocolId);

  if (habits.length === 0) {
    return [];
  }

  const habitIds = habits.map(h => h.id);
  const [completions, stats] = await Promise.all([
    fetchTodayCompletions(habitIds),
    fetchAllHabitStats(habitIds)
  ]);

  return habits.map(h => ({
    ...h,
    todayCompletion: completions[h.id],
    stats: stats[h.id]
  }));
}

// Fetch completions for a date range (for calendar view)
export interface DayStats {
  date: string;
  totalHabits: number;
  completedCount: number;
  floorCount: number;
  baseCount: number;
  bonusCount: number;
}

export async function fetchCompletionsForDateRange(
  startDate: string,
  endDate: string
): Promise<Record<string, DayStats>> {
  const sessionId = getSessionId();
  if (!isSupabaseConfigured() || !sessionId) {
    return {};
  }

  const protocol = await fetchProtocol();
  if (!protocol) return {};

  const habits = await fetchHabits(protocol.id);
  const totalHabits = habits.length;

  if (totalHabits === 0) return {};

  const { data, error } = await supabase
    .from('habit_completions')
    .select('*')
    .eq('session_id', sessionId)
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) {
    console.error('Error fetching date range completions:', error.message);
    return {};
  }

  // Group by date
  const result: Record<string, DayStats> = {};
  (data || []).forEach((c: HabitCompletion) => {
    if (!result[c.date]) {
      result[c.date] = {
        date: c.date,
        totalHabits,
        completedCount: 0,
        floorCount: 0,
        baseCount: 0,
        bonusCount: 0
      };
    }
    result[c.date].completedCount++;
    if (c.tier === 'floor') result[c.date].floorCount++;
    if (c.tier === 'base') result[c.date].baseCount++;
    if (c.tier === 'bonus') result[c.date].bonusCount++;
  });

  return result;
}

// Calculate stats for a single habit
export async function fetchHabitStats(habitId: string): Promise<HabitStats> {
  const sessionId = getSessionId();
  const defaultStats: HabitStats = {
    currentStreak: 0,
    longestStreak: 0,
    completionRate: 0,
    totalCompletions: 0
  };

  if (!isSupabaseConfigured() || !sessionId) {
    return defaultStats;
  }

  // Get all completions for this habit, ordered by date descending
  const { data, error } = await supabase
    .from('habit_completions')
    .select('date, tier')
    .eq('session_id', sessionId)
    .eq('habit_id', habitId)
    .order('date', { ascending: false });

  if (error || !data || data.length === 0) {
    return defaultStats;
  }

  const completions = data as { date: string; tier: CompletionTier }[];
  const totalCompletions = completions.length;
  const lastCompleted = completions[0]?.date;

  // Calculate current streak (consecutive days ending today or yesterday)
  const today = dayjs();
  const completionDates = new Set(completions.map(c => c.date));

  let currentStreak = 0;
  let checkDate = today;

  // Start from today, go backwards
  // If today isn't completed, start from yesterday
  if (!completionDates.has(today.format('YYYY-MM-DD'))) {
    checkDate = today.subtract(1, 'day');
  }

  while (completionDates.has(checkDate.format('YYYY-MM-DD'))) {
    currentStreak++;
    checkDate = checkDate.subtract(1, 'day');
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 0;

  // Sort dates ascending for longest streak calculation
  const sortedDates = Array.from(completionDates).sort();

  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prevDate = dayjs(sortedDates[i - 1]);
      const currDate = dayjs(sortedDates[i]);
      const diffDays = currDate.diff(prevDate, 'day');

      if (diffDays === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
  }

  // Calculate completion rate (last 30 days)
  const thirtyDaysAgo = today.subtract(30, 'day');
  const recentCompletions = completions.filter(c =>
    dayjs(c.date).isAfter(thirtyDaysAgo) || dayjs(c.date).isSame(thirtyDaysAgo)
  );
  const completionRate = Math.round((recentCompletions.length / 30) * 100);

  return {
    currentStreak,
    longestStreak,
    completionRate,
    totalCompletions,
    lastCompleted
  };
}

// Fetch stats for multiple habits at once (more efficient)
export async function fetchAllHabitStats(habitIds: string[]): Promise<Record<string, HabitStats>> {
  const sessionId = getSessionId();
  const result: Record<string, HabitStats> = {};

  if (!isSupabaseConfigured() || !sessionId || habitIds.length === 0) {
    return result;
  }

  // Get all completions for these habits
  const { data, error } = await supabase
    .from('habit_completions')
    .select('habit_id, date, tier')
    .eq('session_id', sessionId)
    .in('habit_id', habitIds)
    .order('date', { ascending: false });

  if (error || !data) {
    return result;
  }

  // Group completions by habit_id
  const completionsByHabit: Record<string, { date: string; tier: CompletionTier }[]> = {};
  habitIds.forEach(id => { completionsByHabit[id] = []; });

  data.forEach((c: { habit_id: string; date: string; tier: CompletionTier }) => {
    if (!completionsByHabit[c.habit_id]) {
      completionsByHabit[c.habit_id] = [];
    }
    completionsByHabit[c.habit_id].push({ date: c.date, tier: c.tier });
  });

  const today = dayjs();
  const thirtyDaysAgo = today.subtract(30, 'day');

  // Calculate stats for each habit
  for (const habitId of habitIds) {
    const completions = completionsByHabit[habitId];

    if (completions.length === 0) {
      result[habitId] = {
        currentStreak: 0,
        longestStreak: 0,
        completionRate: 0,
        totalCompletions: 0
      };
      continue;
    }

    const completionDates = new Set(completions.map(c => c.date));

    // Current streak
    let currentStreak = 0;
    let checkDate = today;
    if (!completionDates.has(today.format('YYYY-MM-DD'))) {
      checkDate = today.subtract(1, 'day');
    }
    while (completionDates.has(checkDate.format('YYYY-MM-DD'))) {
      currentStreak++;
      checkDate = checkDate.subtract(1, 'day');
    }

    // Longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    const sortedDates = Array.from(completionDates).sort();
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const diffDays = dayjs(sortedDates[i]).diff(dayjs(sortedDates[i - 1]), 'day');
        tempStreak = diffDays === 1 ? tempStreak + 1 : 1;
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    // Completion rate (last 30 days)
    const recentCompletions = completions.filter(c =>
      dayjs(c.date).isAfter(thirtyDaysAgo) || dayjs(c.date).isSame(thirtyDaysAgo)
    );

    result[habitId] = {
      currentStreak,
      longestStreak,
      completionRate: Math.round((recentCompletions.length / 30) * 100),
      totalCompletions: completions.length,
      lastCompleted: completions[0]?.date
    };
  }

  return result;
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

// Delete habit permanently
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
