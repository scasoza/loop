import { supabase } from './supabaseClient';
import { getSessionId } from './session';

type ProtocolStatus = 'active' | 'paused' | 'completed';

export type HabitTier = 'floor' | 'base' | 'bonus';

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
  tier: HabitTier;
  completed: boolean;
  protocol_id: string;
  created_at?: string;
}

export interface Summary {
  totalReps: number;
  habitCount: number;
  floorComplete: number;
  floorTotal: number;
  baseComplete: number;
  baseTotal: number;
  bonusComplete: number;
  bonusTotal: number;
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
  { id: 'demo-1', name: 'Morning Routine', tier: 'floor', completed: false, protocol_id: 'demo-protocol' },
  { id: 'demo-2', name: 'Deep Work Block', tier: 'base', completed: false, protocol_id: 'demo-protocol' },
  { id: 'demo-3', name: 'Exercise', tier: 'base', completed: false, protocol_id: 'demo-protocol' },
  { id: 'demo-4', name: 'Read 30 mins', tier: 'bonus', completed: false, protocol_id: 'demo-protocol' }
];

function hasSupabaseEnv(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Check that they're set and not placeholder values
  return Boolean(url && key && !url.includes('your-project') && !key.includes('your-anon'));
}

export async function fetchProtocol(): Promise<Protocol> {
  const sessionId = getSessionId();
  if (!hasSupabaseEnv() || !sessionId) {
    console.log('Using fallback: no Supabase env or session');
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
      // Create a new protocol for this session
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

export async function fetchHabits(protocolId: string): Promise<Habit[]> {
  const sessionId = getSessionId();
  if (!hasSupabaseEnv() || !sessionId) {
    console.log('Using fallback habits: no Supabase env or session');
    return FALLBACK_HABITS;
  }

  try {
    const { data, error } = await supabase
      .from('habits')
      .select('*')
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

export async function addHabit(input: { name: string; tier: HabitTier; protocolId: string }): Promise<Habit> {
  const sessionId = getSessionId();
  if (!hasSupabaseEnv() || !sessionId) {
    return {
      id: `demo-${Date.now()}`,
      name: input.name,
      tier: input.tier,
      completed: false,
      protocol_id: input.protocolId
    };
  }

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
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to add habit');
  }
  return data as Habit;
}

export async function updateHabit(id: string, updates: Partial<Habit>): Promise<void> {
  const sessionId = getSessionId();
  if (!hasSupabaseEnv() || !sessionId) return;

  await supabase
    .from('habits')
    .update(updates)
    .eq('id', id)
    .eq('session_id', sessionId);
}

export async function toggleHabit(id: string, completed: boolean): Promise<void> {
  const sessionId = getSessionId();
  if (!hasSupabaseEnv() || !sessionId) return;

  await supabase
    .from('habits')
    .update({ completed })
    .eq('id', id)
    .eq('session_id', sessionId);
}

export async function deleteHabit(id: string): Promise<void> {
  const sessionId = getSessionId();
  if (!hasSupabaseEnv() || !sessionId) return;

  await supabase
    .from('habits')
    .delete()
    .eq('id', id)
    .eq('session_id', sessionId);
}

export async function clearData(): Promise<void> {
  const sessionId = getSessionId();
  if (!hasSupabaseEnv() || !sessionId) return;

  // Habits will cascade delete when protocol is deleted
  await supabase.from('protocols').delete().eq('session_id', sessionId);
}

export function computeSummary(habits: Habit[]): Summary {
  const floor = habits.filter(h => h.tier === 'floor');
  const base = habits.filter(h => h.tier === 'base');
  const bonus = habits.filter(h => h.tier === 'bonus');

  return {
    totalReps: habits.filter(h => h.completed).length,
    habitCount: habits.length,
    floorComplete: floor.filter(h => h.completed).length,
    floorTotal: floor.length,
    baseComplete: base.filter(h => h.completed).length,
    baseTotal: base.length,
    bonusComplete: bonus.filter(h => h.completed).length,
    bonusTotal: bonus.length
  };
}
