import { useEffect, useMemo, useState } from 'react';
import { PlusCircleIcon, TrashIcon, PencilIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/solid';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import {
  computeSummary,
  fetchHabitsWithStatus,
  fetchProtocol,
  fetchCommitments,
  HabitTier,
  toggleHabitCompletion,
  toggleCommitmentHonored,
  addHabit,
  updateHabit,
  deleteHabit,
  addCommitment,
  deleteCommitment,
  Protocol,
  HabitWithStatus,
  CommitmentBlock,
  Summary
} from '../lib/data';
import dayjs from 'dayjs';

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

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function ProtocolPanel({ onThemeChange, onSummary }: Props) {
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [habits, setHabits] = useState<HabitWithStatus[]>([]);
  const [commitments, setCommitments] = useState<CommitmentBlock[]>([]);
  const [loading, setLoading] = useState(true);

  // Add habit state
  const [newHabit, setNewHabit] = useState('');
  const [newTier, setNewTier] = useState<HabitTier>('base');

  // Edit habit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Add commitment state
  const [showAddCommitment, setShowAddCommitment] = useState(false);
  const [newCommitmentName, setNewCommitmentName] = useState('');
  const [newCommitmentStart, setNewCommitmentStart] = useState('09:00');
  const [newCommitmentEnd, setNewCommitmentEnd] = useState('12:00');
  const [newCommitmentDays, setNewCommitmentDays] = useState<number[]>([1, 2, 3, 4, 5]);

  const today = dayjs().day();

  useEffect(() => {
    const load = async () => {
      const proto = await fetchProtocol();
      setProtocol(proto);
      onThemeChange(proto.theme);
      const [habitsData, commitmentsData] = await Promise.all([
        fetchHabitsWithStatus(proto.id),
        fetchCommitments(proto.id)
      ]);
      setHabits(habitsData);
      setCommitments(commitmentsData);
      setLoading(false);
    };
    load();
  }, [onThemeChange]);

  const summary = useMemo(() => computeSummary(habits, commitments), [habits, commitments]);

  useEffect(() => {
    if (onSummary) {
      onSummary(summary);
    }
  }, [summary, onSummary]);

  const handleToggle = async (habit: HabitWithStatus) => {
    const newCompleted = !habit.completed;
    setHabits((prev) => prev.map((h) => (h.id === habit.id ? { ...h, completed: newCompleted } : h)));
    await toggleHabitCompletion(habit.id, newCompleted);
  };

  const handleCycleTier = async (habit: HabitWithStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTier = cycleTier(habit.tier);
    setHabits((prev) => prev.map((h) => (h.id === habit.id ? { ...h, tier: newTier } : h)));
    await updateHabit(habit.id, { tier: newTier });
  };

  const handleAdd = async () => {
    if (!protocol || !newHabit.trim()) return;
    const created = await addHabit({ name: newHabit.trim(), tier: newTier, protocolId: protocol.id });
    setHabits((prev) => [...prev, { ...created, completed: false }]);
    setNewHabit('');
  };

  const handleStartEdit = (habit: HabitWithStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(habit.id);
    setEditName(habit.name);
  };

  const handleSaveEdit = async (habit: HabitWithStatus) => {
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

  const handleToggleCommitment = async (commitment: CommitmentBlock) => {
    const newHonored = !commitment.honored;
    setCommitments((prev) => prev.map((c) => (c.id === commitment.id ? { ...c, honored: newHonored } : c)));
    await toggleCommitmentHonored(commitment.id, newHonored);
  };

  const handleAddCommitment = async () => {
    if (!protocol || !newCommitmentName.trim()) return;
    const created = await addCommitment({
      name: newCommitmentName.trim(),
      start_time: newCommitmentStart,
      end_time: newCommitmentEnd,
      days: newCommitmentDays,
      protocolId: protocol.id
    });
    setCommitments((prev) => [...prev, created]);
    setNewCommitmentName('');
    setShowAddCommitment(false);
  };

  const handleDeleteCommitment = async (id: string) => {
    setCommitments((prev) => prev.filter((c) => c.id !== id));
    await deleteCommitment(id);
  };

  const toggleCommitmentDay = (day: number) => {
    setNewCommitmentDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  if (loading || !protocol) return <div className="glow-card p-5">Loading protocol...</div>;

  const completion = Math.round((summary.totalReps / Math.max(summary.habitCount, 1)) * 100);
  const todayCommitments = commitments.filter((c) => c.days.includes(today));

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

      {/* Habits Section */}
      <div className="glow-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Habits</h3>
          <span className="text-sm text-gray-300">{completion}% done</span>
        </div>
        <div className="w-full bg-panel h-3 rounded-full overflow-hidden">
          <div className="bg-success h-full transition-all" style={{ width: `${completion}%` }} />
        </div>
        <p className="text-xs text-gray-400">{summary.totalReps}/{summary.habitCount} completed today</p>

        {/* Habit List */}
        <div className="space-y-2">
          {habits.map((habit) => (
            <div
              key={habit.id}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border ${tierColors[habit.tier]} transition`}
            >
              {editingId === habit.id ? (
                // Edit mode
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
                // View mode
                <>
                  <button onClick={() => handleToggle(habit)} className="flex items-center gap-3 flex-1 text-left">
                    <CheckCircleIcon className={`h-6 w-6 ${habit.completed ? 'text-success' : 'text-gray-500'}`} />
                    <div>
                      <p className="font-semibold">{habit.name}</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    {/* Click to cycle tier */}
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
                    {habit.completed && <span className="text-xs bg-success text-black px-2 py-1 rounded-full ml-1">Done</span>}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add Habit */}
        <div className="pt-2 border-t border-gray-800 space-y-2">
          <div className="flex gap-2">
            <input
              value={newHabit}
              onChange={(e) => setNewHabit(e.target.value)}
              placeholder="New habit name"
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
              className="bg-accent text-black rounded-xl px-3 flex items-center gap-1 font-semibold"
            >
              <PlusCircleIcon className="h-5 w-5" />
            </button>
          </div>
          <p className="text-xs text-gray-400">Click tier button to cycle: floor → base → bonus</p>
        </div>
      </div>

      {/* Commitment Blocks Section */}
      <div className="glow-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Commitment Blocks</h3>
          <span className="text-sm text-gray-300">
            {summary.commitmentScore}/{summary.totalCommitments} honored
          </span>
        </div>

        {summary.totalCommitments > 0 && (
          <>
            <div className="w-full bg-panel h-3 rounded-full overflow-hidden">
              <div
                className="bg-accent h-full transition-all"
                style={{ width: `${(summary.commitmentScore / Math.max(summary.totalCommitments, 1)) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">Time blocks you committed to today</p>
          </>
        )}

        {/* Today's Commitments */}
        <div className="space-y-2">
          {todayCommitments.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-2">No commitment blocks for today</p>
          )}
          {todayCommitments.map((commitment) => (
            <div
              key={commitment.id}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                commitment.honored ? 'border-success bg-success/10' : 'border-gray-600 bg-panel/60'
              } transition`}
            >
              <button
                onClick={() => handleToggleCommitment(commitment)}
                className="flex items-center gap-3 flex-1 text-left"
              >
                <CheckCircleIcon className={`h-6 w-6 ${commitment.honored ? 'text-success' : 'text-gray-500'}`} />
                <div>
                  <p className="font-semibold">{commitment.name}</p>
                  <p className="text-xs text-gray-400">
                    {commitment.start_time} - {commitment.end_time}
                  </p>
                </div>
              </button>
              <div className="flex items-center gap-2">
                {commitment.honored && (
                  <span className="text-xs bg-success text-black px-2 py-1 rounded-full">Honored</span>
                )}
                <button
                  onClick={() => handleDeleteCommitment(commitment.id)}
                  className="p-1 text-gray-400 hover:text-danger hover:bg-danger/20 rounded transition"
                  title="Delete commitment"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Commitment */}
        {!showAddCommitment ? (
          <button
            onClick={() => setShowAddCommitment(true)}
            className="w-full py-2 text-sm text-accent border border-accent/30 rounded-xl hover:bg-accent/10 transition flex items-center justify-center gap-2"
          >
            <PlusCircleIcon className="h-5 w-5" />
            Add Commitment Block
          </button>
        ) : (
          <div className="space-y-3 pt-2 border-t border-gray-800">
            <input
              value={newCommitmentName}
              onChange={(e) => setNewCommitmentName(e.target.value)}
              placeholder="Block name (e.g., Deep Work)"
              className="w-full bg-panel/60 border border-gray-700 rounded-xl px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-400 block mb-1">Start</label>
                <input
                  type="time"
                  value={newCommitmentStart}
                  onChange={(e) => setNewCommitmentStart(e.target.value)}
                  className="w-full bg-panel/60 border border-gray-700 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-400 block mb-1">End</label>
                <input
                  type="time"
                  value={newCommitmentEnd}
                  onChange={(e) => setNewCommitmentEnd(e.target.value)}
                  className="w-full bg-panel/60 border border-gray-700 rounded-xl px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Repeat on days</label>
              <div className="flex gap-1">
                {DAY_LABELS.map((label, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleCommitmentDay(idx)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                      newCommitmentDays.includes(idx)
                        ? 'bg-accent text-black'
                        : 'bg-panel text-gray-400 hover:bg-panel/80'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddCommitment}
                className="flex-1 bg-accent text-black py-2 rounded-xl font-semibold"
              >
                Add Block
              </button>
              <button
                onClick={() => setShowAddCommitment(false)}
                className="px-4 py-2 text-gray-400 hover:text-white rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
