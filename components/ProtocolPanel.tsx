import { useEffect, useMemo, useState } from 'react';
import { PlusCircleIcon, TrashIcon, PencilIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/solid';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import {
  computeSummary,
  fetchHabitsWithCompletions,
  fetchProtocol,
  CompletionTier,
  completeHabit,
  uncompleteHabit,
  addHabit,
  updateHabit,
  deleteHabit,
  Protocol,
  HabitWithCompletion,
  Summary
} from '../lib/data';

interface Props {
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
  onSummary?: (summary: Summary) => void;
}

const tierConfig: Record<CompletionTier, { label: string; color: string; bgColor: string; description: string }> = {
  floor: { label: 'Floor', color: 'text-blue-400', bgColor: 'bg-blue-400', description: 'Bare minimum' },
  base: { label: 'Base', color: 'text-indigo-400', bgColor: 'bg-indigo-400', description: 'Standard' },
  bonus: { label: 'Bonus', color: 'text-amber-500', bgColor: 'bg-amber-500', description: 'Above & beyond' }
};

export function ProtocolPanel({ onThemeChange, onSummary }: Props) {
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [habits, setHabits] = useState<HabitWithCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  // Add habit state
  const [newHabit, setNewHabit] = useState('');

  // Edit habit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Tier selection state
  const [selectingTierId, setSelectingTierId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const proto = await fetchProtocol();
      setProtocol(proto);
      onThemeChange(proto.theme);
      const habitsData = await fetchHabitsWithCompletions(proto.id);
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

  const handleSelectTier = async (habit: HabitWithCompletion, tier: CompletionTier) => {
    const completion = await completeHabit(habit.id, tier);
    setHabits((prev) => prev.map((h) =>
      h.id === habit.id ? { ...h, todayCompletion: completion } : h
    ));
    setSelectingTierId(null);
  };

  const handleUncomplete = async (habit: HabitWithCompletion) => {
    await uncompleteHabit(habit.id);
    setHabits((prev) => prev.map((h) =>
      h.id === habit.id ? { ...h, todayCompletion: undefined } : h
    ));
    setSelectingTierId(null);
  };

  const handleAdd = async () => {
    if (!protocol || !newHabit.trim()) return;
    const created = await addHabit({ name: newHabit.trim(), protocolId: protocol.id });
    setHabits((prev) => [...prev, { ...created, todayCompletion: undefined }]);
    setNewHabit('');
  };

  const handleStartEdit = (habit: HabitWithCompletion, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(habit.id);
    setEditName(habit.name);
    setSelectingTierId(null);
  };

  const handleSaveEdit = async (habit: HabitWithCompletion) => {
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

  const completionPct = Math.round((summary.completedCount / Math.max(summary.habitCount, 1)) * 100);

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
          <h3 className="text-lg font-semibold">Today</h3>
          <span className="text-sm text-gray-300">{summary.completedCount}/{summary.habitCount} done</span>
        </div>
        <div className="w-full bg-panel h-3 rounded-full overflow-hidden">
          <div className="bg-success h-full transition-all" style={{ width: `${completionPct}%` }} />
        </div>

        {/* Tier breakdown */}
        {summary.completedCount > 0 && (
          <div className="flex gap-2 text-xs">
            {summary.floorCount > 0 && (
              <span className="px-2 py-1 bg-blue-400/20 text-blue-400 rounded-full">
                {summary.floorCount} floor
              </span>
            )}
            {summary.baseCount > 0 && (
              <span className="px-2 py-1 bg-indigo-400/20 text-indigo-400 rounded-full">
                {summary.baseCount} base
              </span>
            )}
            {summary.bonusCount > 0 && (
              <span className="px-2 py-1 bg-amber-500/20 text-amber-500 rounded-full">
                {summary.bonusCount} bonus
              </span>
            )}
          </div>
        )}
      </div>

      {/* Habits List */}
      <div className="glow-card p-5 space-y-3">
        <h3 className="font-semibold">Habits</h3>

        {habits.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No habits yet. Add one below.</p>
        ) : (
          <div className="space-y-2">
            {habits.map((habit) => (
              <div key={habit.id} className="space-y-2">
                <div
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition ${
                    habit.todayCompletion
                      ? `border-${habit.todayCompletion.tier === 'floor' ? 'blue-400' : habit.todayCompletion.tier === 'base' ? 'indigo-400' : 'amber-500'} bg-panel/80`
                      : 'border-gray-700 bg-panel/40'
                  }`}
                >
                  {editingId === habit.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 bg-midnight border border-gray-600 rounded-lg px-2 py-1 text-sm"
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
                      <button
                        onClick={() => setSelectingTierId(selectingTierId === habit.id ? null : habit.id)}
                        className="flex items-center gap-3 flex-1 text-left"
                      >
                        {habit.todayCompletion ? (
                          <div className={`h-6 w-6 rounded-full ${tierConfig[habit.todayCompletion.tier].bgColor} flex items-center justify-center`}>
                            <CheckIcon className="h-4 w-4 text-black" />
                          </div>
                        ) : (
                          <CheckCircleIcon className="h-6 w-6 text-gray-500" />
                        )}
                        <div>
                          <span className={`font-medium ${habit.todayCompletion ? 'text-white' : 'text-gray-300'}`}>
                            {habit.name}
                          </span>
                          {habit.todayCompletion && (
                            <span className={`ml-2 text-xs ${tierConfig[habit.todayCompletion.tier].color}`}>
                              {tierConfig[habit.todayCompletion.tier].label}
                            </span>
                          )}
                        </div>
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleStartEdit(habit, e)}
                          className="p-1.5 text-gray-500 hover:text-accent hover:bg-accent/20 rounded transition"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(habit.id, e)}
                          className="p-1.5 text-gray-500 hover:text-danger hover:bg-danger/20 rounded transition"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Tier selection */}
                {selectingTierId === habit.id && editingId !== habit.id && (
                  <div className="flex gap-2 pl-4">
                    {(['floor', 'base', 'bonus'] as CompletionTier[]).map((tier) => (
                      <button
                        key={tier}
                        onClick={() => handleSelectTier(habit, tier)}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                          habit.todayCompletion?.tier === tier
                            ? `${tierConfig[tier].bgColor} text-black`
                            : `bg-panel border border-gray-700 ${tierConfig[tier].color} hover:bg-panel/80`
                        }`}
                      >
                        <div>{tierConfig[tier].label}</div>
                        <div className="text-xs opacity-70">{tierConfig[tier].description}</div>
                      </button>
                    ))}
                    {habit.todayCompletion && (
                      <button
                        onClick={() => handleUncomplete(habit)}
                        className="py-2 px-3 rounded-lg text-sm font-medium bg-panel border border-gray-700 text-gray-400 hover:text-danger hover:border-danger transition"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add Habit */}
        <div className="pt-3 border-t border-gray-800">
          <div className="flex gap-2">
            <input
              value={newHabit}
              onChange={(e) => setNewHabit(e.target.value)}
              placeholder="Add a habit..."
              className="flex-1 bg-panel/60 border border-gray-700 rounded-xl px-3 py-2 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <button
              onClick={handleAdd}
              disabled={!newHabit.trim()}
              className="bg-accent text-black rounded-xl px-4 flex items-center gap-1 font-semibold disabled:opacity-50"
            >
              <PlusCircleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="glow-card p-5 space-y-2">
        <h4 className="font-semibold text-gray-400 text-sm">How tiers work</h4>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center p-2 bg-blue-400/10 rounded-lg">
            <span className="text-blue-400 font-semibold">Floor</span>
            <p className="text-gray-400">Did the minimum</p>
          </div>
          <div className="text-center p-2 bg-indigo-400/10 rounded-lg">
            <span className="text-indigo-400 font-semibold">Base</span>
            <p className="text-gray-400">Standard effort</p>
          </div>
          <div className="text-center p-2 bg-amber-500/10 rounded-lg">
            <span className="text-amber-500 font-semibold">Bonus</span>
            <p className="text-gray-400">Went all out</p>
          </div>
        </div>
      </div>
    </div>
  );
}
