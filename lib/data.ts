import { supabase } from './supabaseClient';
import { getSessionId } from './session';
import dayjs from 'dayjs';

type ProtocolStatus = 'active' | 'paused' | 'completed';

export type HabitTier = 'base' | 'floor' | 'bonus';

// Habit template - persists across days
export interface Habit {
  id: string;
  name: string;
  tier: HabitTier;
  protocol_id: string;
  created_at?: string;
}

// Daily completion record
export interface HabitCompletion {
  id: string;
  habit_id: string;
  date: string; // YYYY-MM-DD format
  completed: boolean;
}

// Commitment block - time blocks you commit to
export interface CommitmentBlock {
  id: string;
  protocol_id: string;
  name: string;
  start_time: string; // HH:MM format
  end_time: string;
  days: number[]; // 0-6 (Sunday-Saturday)
  honored: boolean; // For today
  created_at?: string;
}

export interface Protocol {
  id: string;
  name: string;
  status: ProtocolStatus;
  day_number: number;
  total_days: number;
  streak: number;
  theme: 'light' | 'dark' | 'system';
}

export interface Summary {
  totalReps: number;
  habitCount: number;
  commitmentScore: number;
  totalCommitments: number;
}

// Combined habit with today's completion status
export interface HabitWithStatus extends Habit {
  completed: boolean;
  completionId?: string;
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
  { id: 'demo-1', name: 'Morning Routine', tier: 'floor', protocol_id: 'demo-protocol' },
  { id: 'demo-2', name: 'Deep Work Block', tier: 'base', protocol_id: 'demo-protocol' },
  { id: 'demo-3', name: 'Exercise', tier: 'base', protocol_id: 'demo-protocol' },
  { id: 'demo-4', name: 'Read 30 mins', tier: 'bonus', protocol_id: 'demo-protocol' }
];

const FALLBACK_COMMITMENTS: CommitmentBlock[] = [
  { id: 'demo-c1', protocol_id: 'demo-protocol', name: 'Morning Focus', start_time: '06:00', end_time: '09:00', days: [1,2,3,4,5], honored: false },
  { id: 'demo-c2', protocol_id: 'demo-protocol', name: 'Deep Work', start_time: '09:00', end_time: '12:00', days: [1,2,3,4,5], honored: false }
];

function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function getToday(): string {
  return dayjs().format('YYYY-MM-DD');
}

export async function fetchProtocol(): Promise<Protocol> {
  const sessionId = getSessionId();
  if (!hasSupabaseEnv() || !sessionId) return FALLBACK_PROTOCOL;

  const { data, error } = await supabase
    .from('protocols')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching protocol', error.message);
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
      .maybeSingle();

    if (insertError || !created) return FALLBACK_PROTOCOL;
    return created as Protocol;
  }

  return data as Protocol;
}

export async function updateProtocol(partial: Partial<Protocol>) {
  const sessionId = getSessionId();
  if (!hasSupabaseEnv() || !sessionId) return;
  const protocol = await fetchProtocol();
  await supabase
    .from('protocols')
    .update({ ...partial })
    .eq('id', protocol.id)
    .eq('session_id', sessionId);
}

// Fetch habits (templates only, not completions)
export async function fetchHabits(protocolId?: string): Promise<Habit[]> {
  const sessionId = getSessionId();
  if (!hasSupabaseEnv() || !sessionId || !protocolId) return FALLBACK_HABITS;

  const { data, error } = await supabase
    .from('habits')
    .select('id, name, tier, protocol_id, created_at')
    .eq('session_id', sessionId)
    .eq('protocol_id', protocolId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching habits', error.message);
    return FALLBACK_HABITS;
  }
  return data as Habit[];
}

// Fetch today's completions for habits
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
    console.error('Error fetching completions', error.message);
    return {};
  }

  const completions: Record<string, HabitCompletion> = {};
  (data || []).forEach((c: HabitCompletion) => {
    completions[c.habit_id] = c;
  });
  return completions;
}

// Get habits with their today's status
export async function fetchHabitsWithStatus(protocolId?: string): Promise<HabitWithStatus[]> {
  const habits = await fetchHabits(protocolId);
  const sessionId = getSessionId();

  if (!hasSupabaseEnv() || !sessionId) {
    // Demo mode - return habits with demo completion status
    return habits.map((h, i) => ({ ...h, completed: i < 1 }));
  }

  const completions = await fetchTodayCompletions(habits.map(h => h.id));

  return habits.map(h => ({
    ...h,
    completed: completions[h.id]?.completed || false,
    completionId: completions[h.id]?.id
  }));
}

// Toggle habit completion for today
export async function toggleHabitCompletion(habitId: string, completed: boolean): Promise<void> {
  const sessionId = getSessionId();
  if (!hasSupabaseEnv() || !sessionId) return;

  const today = getToday();

  // Check if completion record exists
  const { data: existing } = await supabase
    .from('habit_completions')
    .select('id')
    .eq('session_id', sessionId)
    .eq('habit_id', habitId)
    .eq('date', today)
    .maybeSingle();

  if (existing) {
    // Update existing
    await supabase
      .from('habit_completions')
      .update({ completed })
      .eq('id', existing.id);
  } else {
    // Create new
    await supabase
      .from('habit_completions')
      .insert({
        session_id: sessionId,
        habit_id: habitId,
        date: today,
        completed
      });
  }
}

// Add new habit
export async function addHabit(input: { name: string; tier: HabitTier; protocolId: string }): Promise<Habit> {
  const sessionId = getSessionId();
  if (!hasSupabaseEnv() || !sessionId) {
    return { id: `demo-${Date.now()}`, ...input, protocol_id: input.protocolId };
  }

  const { data, error } = await supabase
    .from('habits')
    .insert({
      session_id: sessionId,
      protocol_id: input.protocolId,
      name: input.name,
      tier: input.tier
    })
    .select()
    .maybeSingle();

  if (error || !data) throw new Error(error?.message ?? 'Unable to add habit');
  return data as Habit;
}

// Update habit (name or tier)
export async function updateHabit(id: string, updates: { name?: string; tier?: HabitTier }): Promise<void> {
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

  // Delete completions first
  await supabase
    .from('habit_completions')
    .delete()
    .eq('habit_id', id)
    .eq('session_id', sessionId);

  // Delete habit
  await supabase
    .from('habits')
    .delete()
    .eq('id', id)
    .eq('session_id', sessionId);
}

// Commitment blocks
export async function fetchCommitments(protocolId?: string): Promise<CommitmentBlock[]> {
  const sessionId = getSessionId();
  if (!hasSupabaseEnv() || !sessionId || !protocolId) return FALLBACK_COMMITMENTS;

  const { data, error } = await supabase
    .from('commitment_blocks')
    .select('*')
    .eq('session_id', sessionId)
    .eq('protocol_id', protocolId)
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching commitments', error.message);
    return FALLBACK_COMMITMENTS;
  }
  return data as CommitmentBlock[];
}

export async function addCommitment(input: {
  name: string;
  start_time: string;
  end_time: string;
  days: number[];
  protocolId: string;
}): Promise<CommitmentBlock> {
  const sessionId = getSessionId();
  if (!hasSupabaseEnv() || !sessionId) {
    return {
      id: `demo-c${Date.now()}`,
      protocol_id: input.protocolId,
      name: input.name,
      start_time: input.start_time,
      end_time: input.end_time,
      days: input.days,
      honored: false
    };
  }

  const { data, error } = await supabase
    .from('commitment_blocks')
    .insert({
      session_id: sessionId,
      protocol_id: input.protocolId,
      name: input.name,
      start_time: input.start_time,
      end_time: input.end_time,
      days: input.days,
      honored: false
    })
    .select()
    .maybeSingle();

  if (error || !data) throw new Error(error?.message ?? 'Unable to add commitment');
  return data as CommitmentBlock;
}

export async function updateCommitment(id: string, updates: Partial<CommitmentBlock>): Promise<void> {
  const sessionId = getSessionId();
  if (!hasSupabaseEnv() || !sessionId) return;

  await supabase
    .from('commitment_blocks')
    .update(updates)
    .eq('id', id)
    .eq('session_id', sessionId);
}

export async function deleteCommitment(id: string): Promise<void> {
  const sessionId = getSessionId();
  if (!hasSupabaseEnv() || !sessionId) return;

  await supabase
    .from('commitment_blocks')
    .delete()
    .eq('id', id)
    .eq('session_id', sessionId);
}

export async function toggleCommitmentHonored(id: string, honored: boolean): Promise<void> {
  const sessionId = getSessionId();
  if (!hasSupabaseEnv() || !sessionId) return;

  await supabase
    .from('commitment_blocks')
    .update({ honored })
    .eq('id', id)
    .eq('session_id', sessionId);
}

export async function clearData() {
  const sessionId = getSessionId();
  if (!hasSupabaseEnv() || !sessionId) return;
  await supabase.from('habit_completions').delete().eq('session_id', sessionId);
  await supabase.from('habits').delete().eq('session_id', sessionId);
  await supabase.from('commitment_blocks').delete().eq('session_id', sessionId);
  await supabase.from('protocols').delete().eq('session_id', sessionId);
}

export function computeSummary(habits: HabitWithStatus[], commitments: CommitmentBlock[]): Summary {
  const today = dayjs().day(); // 0-6
  const todayCommitments = commitments.filter(c => c.days.includes(today));

  return {
    totalReps: habits.filter((h) => h.completed).length,
    habitCount: habits.length,
    commitmentScore: todayCommitments.filter(c => c.honored).length,
    totalCommitments: todayCommitments.length
  };
}

// Get historical data for AI analysis
export async function fetchHistoricalData(protocolId: string, days: number = 7): Promise<{
  habitHistory: { date: string; completed: number; total: number }[];
  streakData: { current: number; longest: number };
  tierBreakdown: Record<HabitTier, { completed: number; total: number }>;
}> {
  const sessionId = getSessionId();
  const habits = await fetchHabits(protocolId);

  if (!hasSupabaseEnv() || !sessionId || habits.length === 0) {
    return {
      habitHistory: [],
      streakData: { current: 1, longest: 1 },
      tierBreakdown: {
        floor: { completed: 0, total: 0 },
        base: { completed: 0, total: 0 },
        bonus: { completed: 0, total: 0 }
      }
    };
  }

  const startDate = dayjs().subtract(days, 'day').format('YYYY-MM-DD');

  const { data: completions } = await supabase
    .from('habit_completions')
    .select('*')
    .eq('session_id', sessionId)
    .gte('date', startDate)
    .in('habit_id', habits.map(h => h.id));

  // Build history by date
  const historyByDate: Record<string, { completed: number; total: number }> = {};
  for (let i = 0; i < days; i++) {
    const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
    historyByDate[date] = { completed: 0, total: habits.length };
  }

  (completions || []).forEach((c: HabitCompletion) => {
    if (historyByDate[c.date] && c.completed) {
      historyByDate[c.date].completed++;
    }
  });

  // Calculate streak
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  for (let i = 0; i < days; i++) {
    const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
    const dayData = historyByDate[date];
    if (dayData && dayData.completed === dayData.total && dayData.total > 0) {
      tempStreak++;
      if (i === 0 || currentStreak > 0) currentStreak = tempStreak;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  // Tier breakdown for today
  const todayCompletions = await fetchTodayCompletions(habits.map(h => h.id));
  const tierBreakdown: Record<HabitTier, { completed: number; total: number }> = {
    floor: { completed: 0, total: 0 },
    base: { completed: 0, total: 0 },
    bonus: { completed: 0, total: 0 }
  };

  habits.forEach(h => {
    tierBreakdown[h.tier].total++;
    if (todayCompletions[h.id]?.completed) {
      tierBreakdown[h.tier].completed++;
    }
  });

  return {
    habitHistory: Object.entries(historyByDate)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    streakData: { current: currentStreak, longest: longestStreak },
    tierBreakdown
  };
}
