import { useEffect, useMemo, useState } from 'react';
import { PlusCircleIcon, TrashIcon, PencilIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/solid';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import {
  computeSummary,
  fetchHabits,
  fetchProtocol,
  HabitTier,
  toggleHabit,
  addHabit,
  updateHabit,
  deleteHabit,
  Protocol,
  Habit,
  Summary
} from '../lib/data';

interface Props {
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
  onSummary?: (summary: Summary) => void;
}

const tiers: HabitTier[] = ['floor', 'base', 'bonus'];

const tierColors: Record<HabitTier, string> = {
  floor: 'border-blue-400 bg-blue-400/10',
  base: 'border-indigo-400 bg-indigo-400/10',
  bonus: 'border-amber-500 bg-amber-500/10'
};

const tierButtonColors: Record<HabitTier, string> = {
  floor: 'bg-blue-400 text-black',
  base: 'bg-indigo-400 text-black',
  bonus: 'bg-amber-500 text-black'
};

function cycleTier(current: HabitTier): HabitTier {
  const idx = tiers.indexOf(current);
  return tiers[(idx + 1) % tiers.length];
}

export function ProtocolPanel({ onThemeChange, onSummary }: Props) {
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  // Add habit state
  const [newHabit, setNewHabit] = useState('');
  const [newTier, setNewTier] = useState<HabitTier>('base');

  // Edit habit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    const load = async () => {
      const proto = await fetchProtocol();
      setProtocol(proto);
      onThemeChange(proto.theme);
      const habitsData = await fetchHabits(proto.id);
      setHabits(habitsData);
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
    const newCompleted = !habit.completed;
    setHabits((prev) => prev.map((h) => (h.id === habit.id ? { ...h, completed: newCompleted } : h)));
    await toggleHabit(habit.id, newCompleted);
  };

  const handleCycleTier = async (habit: Habit, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextTier = cycleTier(habit.tier);
    setHabits((prev) => prev.map((h) => (h.id === habit.id ? { ...h, tier: nextTier } : h)));
    await updateHabit(habit.id, { tier: nextTier });
  };

  const handleAdd = async () => {
    if (!protocol || !newHabit.trim()) return;
    const created = await addHabit({ name: newHabit.trim(), tier: newTier, protocolId: protocol.id });
    setHabits((prev) => [...prev, created]);
    setNewHabit('');
  };

  const handleStartEdit = (habit: Habit, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(habit.id);
    setEditName(habit.name);
  };

  const handleSaveEdit = async (habit: Habit) => {
    if (!editName.trim()) return;
    setHabits((prev) => prev.map((h) => (h.id === habit.id ? { ...h, name: editName.trim() } : h)));
    await updateHabit(habit.id, { name: editName.trim() });
    setEditingId(null);
    setEditName('');
  };

  const handleDelete = async (habitId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
    await deleteHabit(habitId);
  };

  if (loading || !protocol) return <div className="glow-card p-5">Loading protocol...</div>;

  const completion = Math.round((summary.totalReps / Math.max(summary.habitCount, 1)) * 100);

  // Group habits by tier for display
  const floorHabits = habits.filter(h => h.tier === 'floor');
  const baseHabits = habits.filter(h => h.tier === 'base');
  const bonusHabits = habits.filter(h => h.tier === 'bonus');

  const renderHabit = (habit: Habit) => (
    <div
      key={habit.id}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border ${tierColors[habit.tier]} transition`}
    >
      {editingId === habit.id ? (
        <div className="flex-1 flex items-center gap-2">
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="flex-1 bg-panel border border-gray-600 rounded-lg px-2 py-1 text-sm"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(habit)}
          />
          <button onClick={() => handleSaveEdit(habit)} className="p-1 text-success hover:bg-success/20 rounded">
            <CheckIcon className="h-5 w-5" />
          </button>
          <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-600/20 rounded">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <>
          <button onClick={() => handleToggle(habit)} className="flex items-center gap-3 flex-1 text-left">
            <CheckCircleIcon className={`h-6 w-6 ${habit.completed ? 'text-success' : 'text-gray-500'}`} />
            <span className={`font-medium ${habit.completed ? 'line-through text-gray-400' : ''}`}>{habit.name}</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => handleCycleTier(habit, e)}
              className={`text-xs px-3 py-1 rounded-full font-semibold uppercase ${tierButtonColors[habit.tier]} hover:opacity-80 transition`}
              title="Click to change tier"
            >
              {habit.tier}
            </button>
            <button
              onClick={(e) => handleStartEdit(habit, e)}
              className="p-1 text-gray-400 hover:text-accent hover:bg-accent/20 rounded transition"
              title="Edit habit"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => handleDelete(habit.id, e)}
              className="p-1 text-gray-400 hover:text-danger hover:bg-danger/20 rounded transition"
              title="Delete habit"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Protocol Header */}
      <div className="glow-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gray-400">{protocol.status.toUpperCase()}</p>
            <h2 className="text-2xl font-bold">{protocol.name}</h2>
          </div>
          <div className="text-center">
            <p className="text-4xl font-extrabold">{protocol.streak.toString().padStart(2, '0')}</p>
            <p className="text-xs text-gray-400">Day streak</p>
          </div>
        </div>
        <div className="w-full bg-panel h-2 rounded-full overflow-hidden">
          <div className="bg-accent h-full" style={{ width: `${(protocol.day_number / protocol.total_days) * 100}%` }} />
        </div>
        <p className="text-xs text-gray-400">Day {protocol.day_number} of {protocol.total_days}</p>
      </div>

      {/* Daily Progress */}
      <div className="glow-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Daily Progress</h3>
          <span className="text-sm text-gray-300">{completion}%</span>
        </div>
        <div className="w-full bg-panel h-3 rounded-full overflow-hidden">
          <div className="bg-success h-full transition-all" style={{ width: `${completion}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-blue-400/10 border border-blue-400/30 rounded-lg p-2">
            <span className="text-blue-400 font-bold">{summary.floorComplete}/{summary.floorTotal}</span>
            <p className="text-gray-400">Floor</p>
          </div>
          <div className="bg-indigo-400/10 border border-indigo-400/30 rounded-lg p-2">
            <span className="text-indigo-400 font-bold">{summary.baseComplete}/{summary.baseTotal}</span>
            <p className="text-gray-400">Base</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
            <span className="text-amber-500 font-bold">{summary.bonusComplete}/{summary.bonusTotal}</span>
            <p className="text-gray-400">Bonus</p>
          </div>
        </div>
      </div>

      {/* Habits by Tier */}
      {floorHabits.length > 0 && (
        <div className="glow-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-400"></div>
            <h3 className="font-semibold text-blue-400">Floor</h3>
            <span className="text-xs text-gray-400">Non-negotiables</span>
          </div>
          <div className="space-y-2">
            {floorHabits.map(renderHabit)}
          </div>
        </div>
      )}

      {baseHabits.length > 0 && (
        <div className="glow-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-indigo-400"></div>
            <h3 className="font-semibold text-indigo-400">Base</h3>
            <span className="text-xs text-gray-400">Standard daily habits</span>
          </div>
          <div className="space-y-2">
            {baseHabits.map(renderHabit)}
          </div>
        </div>
      )}

      {bonusHabits.length > 0 && (
        <div className="glow-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <h3 className="font-semibold text-amber-500">Bonus</h3>
            <span className="text-xs text-gray-400">Extra credit</span>
          </div>
          <div className="space-y-2">
            {bonusHabits.map(renderHabit)}
          </div>
        </div>
      )}

      {/* Add Habit */}
      <div className="glow-card p-5 space-y-3">
        <h3 className="font-semibold">Add Habit</h3>
        <div className="flex gap-2">
          <input
            value={newHabit}
            onChange={(e) => setNewHabit(e.target.value)}
            placeholder="Habit name"
            className="flex-1 bg-panel/60 border border-gray-700 rounded-xl px-3 py-2 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button
            onClick={() => setNewTier(cycleTier(newTier))}
            className={`text-xs px-3 py-2 rounded-xl font-semibold uppercase ${tierButtonColors[newTier]} hover:opacity-80 transition`}
            title="Click to change tier"
          >
            {newTier}
          </button>
          <button
            onClick={handleAdd}
            className="bg-accent text-black rounded-xl px-4 flex items-center gap-1 font-semibold"
          >
            <PlusCircleIcon className="h-5 w-5" />
          </button>
        </div>
        <p className="text-xs text-gray-400">Click tier to cycle: floor → base → bonus</p>
      </div>
    </div>
  );
}
