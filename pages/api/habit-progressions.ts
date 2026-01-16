import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

type StepInput = { name: string; durationDays: number };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apiKey = process.env.HABIT_API_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.warn('Supabase service role credentials are missing for habit progression API.');
}

const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!apiKey || req.headers['x-api-key'] !== apiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Supabase admin client not configured' });
  }

  const { sessionId, protocolId, name, steps } = req.body as {
    sessionId?: string;
    protocolId?: string;
    name?: string;
    steps?: StepInput[];
  };

  if (!sessionId || !protocolId || !name || !steps || steps.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const { data: progression, error: progressionError } = await supabaseAdmin
    .from('habit_progressions')
    .insert({ session_id: sessionId, name })
    .select()
    .single();

  if (progressionError || !progression) {
    return res.status(500).json({ error: progressionError?.message || 'Failed to create progression' });
  }

  const stepsPayload = steps.map((step, index) => ({
    progression_id: progression.id,
    name: step.name,
    duration_days: step.durationDays,
    step_order: index + 1
  }));

  const { error: stepsError } = await supabaseAdmin
    .from('habit_progression_steps')
    .insert(stepsPayload);

  if (stepsError) {
    return res.status(500).json({ error: stepsError.message });
  }

  const { data: habit, error: habitError } = await supabaseAdmin
    .from('habits')
    .insert({
      session_id: sessionId,
      protocol_id: protocolId,
      name,
      progression_id: progression.id
    })
    .select()
    .single();

  if (habitError || !habit) {
    return res.status(500).json({ error: habitError?.message || 'Failed to create habit' });
  }

  return res.status(200).json({ progression, habit });
}
