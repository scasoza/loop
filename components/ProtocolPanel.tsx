import { useEffect, useMemo, useState } from 'react';
import { PlusCircleIcon } from '@heroicons/react/24/solid';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import {
  computeSummary,
  fetchHabits,
  fetchProtocol,
  Habit,
  HabitTier,
  toggleHabit,
  addHabit,
  Protocol,
  startTrackingPeriod,
  summarizeHistory
} from '../lib/data';

interface Props {
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
  onSummary?: (summary: ReturnType<typeof computeSummary>) => void;
}

const tierColors: Record<HabitTier, string> = {
  base: 'border-indigo-400',
  floor: 'border-blue-400',
  bonus: 'border-amber-500'
};

export function ProtocolPanel({ onThemeChange, onSummary }: Props) {
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [newHabit, setNewHabit] = useState('');
  const [tier, setTier] = useState<HabitTier>('base');
  const [periodLength, setPeriodLength] = useState(30);
  const [historySummary, setHistorySummary] = useState<{ date: string; count: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      const proto = await fetchProtocol();
      setProtocol(proto);
      onThemeChange(proto.theme);
      const data = await fetchHabits(proto.id);
      setHabits(data);
      setHistorySummary(summarizeHistory(data));
      setLoading(false);
    };
    load();
  }, [onThemeChange]);

  const summary = useMemo(() => computeSummary(habits), [habits]);

  useEffect(() => {
    if (onSummary) {
      onSummary(summary);
    }
  }, [summary, onSummary]);

  const handleToggle = async (habit: Habit) => {
    const nextCompleted = !habit.completedToday;
    const today = new Date().toISOString().slice(0, 10);
    setHabits((prev) => {
      const updated = prev.map((h) =>
        h.id === habit.id
          ? {
              ...h,
              completedToday: nextCompleted,
              history: [
                ...h.history.filter((entry) => entry.entry_date !== today),
                {
                  id: `local-${habit.id}`,
                  habit_id: habit.id,
                  protocol_id: habit.protocol_id,
                  session_id: 'local',
                  entry_date: today,
                  completed: nextCompleted
                }
              ]
            }
          : h
      );
      setHistorySummary(summarizeHistory(updated));
      return updated;
    });
    await toggleHabit({ id: habit.id, protocol_id: habit.protocol_id }, nextCompleted);
  };

  const handleAdd = async () => {
    if (!protocol || !newHabit.trim()) return;
    const created = await addHabit({ name: newHabit.trim(), tier, protocolId: protocol.id });
    setHabits((prev) => [...prev, created]);
    setNewHabit('');
  };

  const handleStartPeriod = async () => {
    if (!protocol) return;
    await startTrackingPeriod(periodLength);
    const refreshed = await fetchProtocol();
    setProtocol(refreshed);
  };

  if (loading || !protocol) return <div className="glow-card p-5">Loading protocol...</div>;

  const completion = Math.round((summary.totalReps / Math.max(summary.habitCount, 1)) * 100);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="glow-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gray-400">{protocol.status.toUpperCase()}</p>
            <h2 className="text-2xl font-bold">{protocol.name}</h2>
          </div>
          <div className="text-right space-y-1">
            <div>
              <p className="text-4xl font-extrabold">{protocol.streak.toString().padStart(2, '0')}</p>
              <p className="text-xs text-gray-400">Day streak</p>
            </div>
            <p className="text-xs text-gray-400">
              {protocol.start_date ? protocol.start_date : 'start unset'} → {protocol.end_date ?? 'open'}
            </p>
          </div>
        </div>
        <div className="w-full bg-panel h-2 rounded-full overflow-hidden">
          <div className="bg-accent h-full" style={{ width: `${(protocol.day_number / protocol.total_days) * 100}%` }} />
        </div>
        <p className="text-xs text-gray-400">Day {protocol.day_number} of {protocol.total_days}</p>
      </div>

      <div className="glow-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Tracking period</p>
            <p className="text-lg font-semibold">Commit to a block</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={periodLength}
              onChange={(e) => setPeriodLength(Number(e.target.value))}
              className="bg-panel/60 border border-gray-700 rounded-xl px-3 text-sm"
            >
              <option value={30}>30 days</option>
              <option value={45}>45 days</option>
              <option value={60}>60 days</option>
            </select>
            <button
              onClick={handleStartPeriod}
              className="bg-accent text-black rounded-xl px-3 py-2 text-sm font-semibold"
            >
              Start / renew
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Use this to begin a new period of focused tracking. Your habits remain, but the day counter resets to reflect the new
          commitment window.
        </p>
      </div>

      <div className="glow-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Day Complete</h3>
          <span className="text-sm text-gray-300">{completion}%</span>
        </div>
        <div className="w-full bg-panel h-3 rounded-full overflow-hidden">
          <div className="bg-success h-full" style={{ width: `${completion}%` }} />
        </div>
        <p className="text-xs text-gray-400">{summary.totalReps}/{summary.habitCount} habits locked</p>

        <div className="space-y-3">
          {habits.map((habit) => (
            <button
              key={habit.id}
              onClick={() => handleToggle(habit)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border ${tierColors[habit.tier]} bg-panel/60 hover:bg-panel transition`}
            >
              <div className="flex items-center gap-3">
                <CheckCircleIcon className={`h-6 w-6 ${habit.completedToday ? 'text-success' : 'text-gray-500'}`} />
                <div>
                  <p className="font-semibold">{habit.name}</p>
                  <p className="text-xs text-gray-400 uppercase">{habit.tier}</p>
                </div>
              </div>
              {habit.completedToday && <span className="text-xs bg-success text-black px-3 py-1 rounded-full">Locked</span>}
            </button>
          ))}
        </div>

        <div className="pt-2 border-t border-gray-800 space-y-2">
          <div className="flex gap-2">
            <input
              value={newHabit}
              onChange={(e) => setNewHabit(e.target.value)}
              placeholder="Add habit"
              className="flex-1 bg-panel/60 border border-gray-700 rounded-xl px-3 py-2 text-sm"
            />
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as HabitTier)}
              className="bg-panel/60 border border-gray-700 rounded-xl px-3 text-sm"
            >
              <option value="base">Base</option>
              <option value="floor">Floor</option>
              <option value="bonus">Bonus</option>
            </select>
            <button
              onClick={handleAdd}
              className="bg-accent text-black rounded-xl px-3 flex items-center gap-1 font-semibold"
            >
              <PlusCircleIcon className="h-5 w-5" />
              Add
            </button>
          </div>
          <p className="text-xs text-gray-400">Habits are saved to Supabase for this session.</p>
        </div>
      </div>

      <div className="glow-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Recent check-ins</h3>
          <span className="text-xs text-gray-400">Showing last two weeks</span>
        </div>
        {historySummary.length === 0 ? (
          <p className="text-sm text-gray-400">No history yet. Mark habits to build your streak.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {historySummary.map((item) => (
              <div key={item.date} className={`border border-gray-800 rounded-lg px-3 py-2 ${item.date === today ? 'bg-accent/20' : 'bg-panel/60'}`}>
                <p className="text-xs text-gray-400">{item.date}</p>
                <p className="text-sm font-semibold">{item.count} habit(s) completed</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
