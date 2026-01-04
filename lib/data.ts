import { supabase } from './supabaseClient';
import { getSessionId } from './session';

type ProtocolStatus = 'active' | 'paused' | 'completed';

export type HabitTier = 'base' | 'floor' | 'bonus';

export interface Habit {
  id: string;
  name: string;
  tier: HabitTier;
  completed: boolean;
  protocol_id: string;
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
  { id: 'demo-1', name: 'Mindset', tier: 'base', completed: true, protocol_id: 'demo-protocol' },
  { id: 'demo-2', name: 'Hydrate', tier: 'floor', completed: true, protocol_id: 'demo-protocol' }
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

export async function fetchHabits(protocolId?: string): Promise<Habit[]> {
  const sessionId = getSessionId();
  if (!hasSupabaseEnv() || !sessionId || !protocolId) return FALLBACK_HABITS;
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('session_id', sessionId)
    .eq('protocol_id', protocolId);

  if (error) {
    console.error('Error fetching habits', error.message);
    return FALLBACK_HABITS;
  }
  return data as Habit[];
}

export async function toggleHabit(id: string, completed: boolean) {
  const sessionId = getSessionId();
  if (!hasSupabaseEnv() || !sessionId) return;
  await supabase.from('habits').update({ completed }).eq('id', id).eq('session_id', sessionId);
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
  return data as Habit;
}

export async function clearData() {
  const sessionId = getSessionId();
  if (!hasSupabaseEnv() || !sessionId) return;
  await supabase.from('habits').delete().eq('session_id', sessionId);
  await supabase.from('protocols').delete().eq('session_id', sessionId);
}

export function computeSummary(habits: Habit[]): Summary {
  return {
    totalReps: habits.filter((h) => h.completed).length,
    habitCount: habits.length
  };
}
