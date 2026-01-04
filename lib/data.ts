import { supabase } from './supabaseClient';
import { getSessionId } from './session';

type ProtocolStatus = 'active' | 'paused' | 'completed';

export type HabitTier = 'base' | 'floor' | 'bonus';

export interface HabitEntry {
  id: string;
  habit_id: string;
  protocol_id: string;
  session_id: string;
  entry_date: string; // yyyy-mm-dd
  completed: boolean;
}

export interface Habit {
  id: string;
  name: string;
  tier: HabitTier;
  protocol_id: string;
  completedToday: boolean;
  history: HabitEntry[];
}

export interface Protocol {
  id: string;
  name: string;
  status: ProtocolStatus;
  day_number: number;
  total_days: number;
  streak: number;
  theme: 'light' | 'dark' | 'system';
  start_date: string | null;
  end_date: string | null;
}

export interface Summary {
  totalReps: number;
  habitCount: number;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

const addDays = (date: string, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const FALLBACK_PROTOCOL: Protocol = {
  id: 'demo-protocol',
  name: '30 Day Intensity',
  status: 'active',
  day_number: 1,
  total_days: 30,
  streak: 1,
  theme: 'system',
  start_date: todayIso(),
  end_date: addDays(todayIso(), 29)
};

const FALLBACK_HABITS: Habit[] = [
  {
    id: 'demo-1',
    name: 'Mindset',
    tier: 'base',
    protocol_id: 'demo-protocol',
    completedToday: true,
    history: [
      {
        id: 'demo-entry-1',
        habit_id: 'demo-1',
        protocol_id: 'demo-protocol',
        session_id: 'demo',
        entry_date: todayIso(),
        completed: true
      }
    ]
  },
  {
    id: 'demo-2',
    name: 'Hydrate',
    tier: 'floor',
    protocol_id: 'demo-protocol',
    completedToday: true,
    history: [
      {
        id: 'demo-entry-2',
        habit_id: 'demo-2',
        protocol_id: 'demo-protocol',
        session_id: 'demo',
        entry_date: todayIso(),
        completed: true
      }
    ]
  }
];

function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
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
        theme: FALLBACK_PROTOCOL.theme,
        start_date: FALLBACK_PROTOCOL.start_date,
        end_date: FALLBACK_PROTOCOL.end_date
      })
      .select()
      .maybeSingle();

    if (insertError || !created) return FALLBACK_PROTOCOL;
    return created as Protocol;
  }

  const protocol = data as Protocol;
  const start = protocol.start_date;
  if (!start) return protocol;

  const daysPassed = Math.max(
    0,
    Math.floor((new Date(todayIso()).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24))
  );
  const computedDay = Math.min(protocol.total_days, daysPassed + 1);

  if (computedDay !== protocol.day_number) {
    await supabase
      .from('protocols')
      .update({ day_number: computedDay })
      .eq('id', protocol.id)
      .eq('session_id', sessionId);
  }

  return { ...protocol, day_number: computedDay };
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

export async function fetchHabits(protocolId?: string): Promise<Habit[]> {
  const sessionId = getSessionId();
  if (!hasSupabaseEnv() || !sessionId || !protocolId) return FALLBACK_HABITS;

  const sevenDaysAgo = addDays(todayIso(), -13);

  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('session_id', sessionId)
    .eq('protocol_id', protocolId);

  if (error) {
    console.error('Error fetching habits', error.message);
    return FALLBACK_HABITS;
  }
  const { data: entries, error: entryError } = await supabase
    .from('habit_entries')
    .select('*')
    .eq('session_id', sessionId)
    .eq('protocol_id', protocolId)
    .gte('entry_date', sevenDaysAgo);

  if (entryError) {
    console.error('Error fetching habit entries', entryError.message);
  }

  const historyByHabit = (entries ?? []).reduce<Record<string, HabitEntry[]>>((acc, entry) => {
    acc[entry.habit_id] = acc[entry.habit_id] || [];
    acc[entry.habit_id].push(entry as HabitEntry);
    return acc;
  }, {});

  return (data as Habit[]).map((habit) => {
    const history = historyByHabit[habit.id] || [];
    const completedToday = history.some((h) => h.entry_date === todayIso() && h.completed);
    return { ...habit, completedToday, history } as Habit;
  });
}

export async function toggleHabit(habit: { id: string; protocol_id: string }, completed: boolean) {
  const sessionId = getSessionId();
  if (!hasSupabaseEnv() || !sessionId) return;
  await supabase
    .from('habit_entries')
    .upsert({
      session_id: sessionId,
      protocol_id: habit.protocol_id,
      habit_id: habit.id,
      entry_date: todayIso(),
      completed
    });
}

export async function addHabit(input: { name: string; tier: HabitTier; protocolId: string }) {
  const sessionId = getSessionId();
  if (!hasSupabaseEnv() || !sessionId) return FALLBACK_HABITS[0];
  const { data, error } = await supabase
    .from('habits')
    .insert({
      session_id: sessionId,
      protocol_id: input.protocolId,
      name: input.name,
      tier: input.tier,
      completed: false
    })
    .select()
    .maybeSingle();
  if (error || !data) throw new Error(error?.message ?? 'Unable to add habit');
  return { ...(data as Habit), completedToday: false, history: [] };
}

export async function clearData() {
  const sessionId = getSessionId();
  if (!hasSupabaseEnv() || !sessionId) return;
  await supabase.from('habit_entries').delete().eq('session_id', sessionId);
  await supabase.from('habits').delete().eq('session_id', sessionId);
  await supabase.from('protocols').delete().eq('session_id', sessionId);
}

export function computeSummary(habits: Habit[]): Summary {
  return {
    totalReps: habits.filter((h) => h.completedToday).length,
    habitCount: habits.length
  };
}

export async function startTrackingPeriod(lengthDays: number) {
  const sessionId = getSessionId();
  if (!hasSupabaseEnv() || !sessionId) return;
  const protocol = await fetchProtocol();
  const start = todayIso();
  const end = addDays(start, lengthDays - 1);

  await supabase
    .from('protocols')
    .update({
      start_date: start,
      end_date: end,
      day_number: 1,
      total_days: lengthDays,
      streak: protocol.streak > 0 ? protocol.streak : 1,
      status: 'active'
    })
    .eq('id', protocol.id)
    .eq('session_id', sessionId);
}

export function summarizeHistory(habits: Habit[]) {
  const historyMap = new Map<string, number>();
  habits.forEach((habit) => {
    habit.history.forEach((entry) => {
      if (!entry.completed) return;
      historyMap.set(entry.entry_date, (historyMap.get(entry.entry_date) ?? 0) + 1);
    });
  });

  return Array.from(historyMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}
