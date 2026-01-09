import { useEffect, useState } from 'react';
import { PlusCircleIcon, TrashIcon, PencilIcon, XMarkIcon, CheckIcon, ExclamationTriangleIcon, FireIcon, BellIcon, BellSlashIcon, ClockIcon } from '@heroicons/react/24/solid';
import { CheckCircleIcon, BellIcon as BellOutlineIcon } from '@heroicons/react/24/outline';
import {
  CompletionTier,
  completeHabit,
  uncompleteHabit,
  addHabit,
  updateHabit,
  deleteHabit,
  setHabitReminder,
  HabitWithCompletion,
  Summary,
  getFreezeInventory,
  checkAndAwardMilestoneFreeze
} from '../lib/data';
import { useData } from '../lib/DataContext';
import { getSessionId } from '../lib/session';
import { formatReminderTime } from '../lib/notifications';
import {
  isOneSignalAvailable,
  getOneSignalPermission,
  requestOneSignalPermission,
  setExternalUserId,
  syncHabitReminders,
  removeHabitReminder
} from '../lib/onesignal';
import { ProtocolSkeleton } from './Skeleton';

interface Props {
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
  onSummary?: (summary: Summary) => void;
}

const tierConfig: Record<CompletionTier, { label: string; color: string; bgColor: string; borderColor: string; description: string }> = {
  floor: { label: 'Floor', color: 'text-blue-400', bgColor: 'bg-blue-400', borderColor: 'border-blue-400', description: 'Bare minimum' },
  base: { label: 'Base', color: 'text-indigo-400', bgColor: 'bg-indigo-400', borderColor: 'border-indigo-400', description: 'Standard' },
  bonus: { label: 'Bonus', color: 'text-amber-500', bgColor: 'bg-amber-500', borderColor: 'border-amber-500', description: 'Above & beyond' }
};

export function ProtocolPanel({ onSummary }: Props) {
  // Use shared data context - no more re-fetching on tab switch!
  const { protocol, habits, summary, freezeInventory, loading, error, setHabits, setFreezeInventory, sessionId } = useData();

  const [newHabit, setNewHabit] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [selectingTierId, setSelectingTierId] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [freezeNotification, setFreezeNotification] = useState<string | null>(null);
  const [newFreezeAwarded, setNewFreezeAwarded] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [settingReminderId, setSettingReminderId] = useState<string | null>(null);
  const [reminderTimeInput, setReminderTimeInput] = useState('');

  // Initialize notification permission check
  useEffect(() => {
    const checkNotifications = async () => {
      if (isOneSignalAvailable()) {
        const sid = getSessionId();
        if (sid) {
          await setExternalUserId(sid);
        }
        const permission = await getOneSignalPermission();
        setNotificationPermission(permission ? 'granted' : 'default');
        if (permission && habits.length > 0) {
          await syncHabitReminders(habits);
        }
      } else {
        setNotificationPermission('unsupported');
      }
    };
    if (!loading) {
      checkNotifications();
    }
  }, [loading, habits]);

  useEffect(() => {
    if (onSummary) {
      onSummary(summary);
    }
  }, [summary, onSummary]);

  const handleSelectTier = async (habit: HabitWithCompletion, tier: CompletionTier) => {
    const completion = await completeHabit(habit.id, tier);
    if (completion) {
      setHabits((prev) => prev.map((h) =>
        h.id === habit.id ? { ...h, todayCompletion: completion } : h
      ));

      // Check if this completion triggers a milestone freeze award
      if (habit.stats) {
        const newStreak = habit.stats.currentStreak + (habit.todayCompletion ? 0 : 1);
        const awarded = await checkAndAwardMilestoneFreeze(newStreak);
        if (awarded) {
          setNewFreezeAwarded(awarded.milestone);
          const updatedInventory = await getFreezeInventory();
          setFreezeInventory(updatedInventory);
          setTimeout(() => setNewFreezeAwarded(null), 5000);
        }
      }
    }
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
    if (created) {
      setHabits((prev) => [...prev, { ...created, todayCompletion: undefined }]);
      setNewHabit('');
    }
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

  const handleRequestNotificationPermission = async () => {
    const granted = await requestOneSignalPermission();
    setNotificationPermission(granted ? 'granted' : 'denied');
    if (granted) {
      const sid = getSessionId();
      if (sid) {
        await setExternalUserId(sid);
      }
      await syncHabitReminders(habits);
    }
  };

  const handleStartSetReminder = (habit: HabitWithCompletion, e: React.MouseEvent) => {
    e.stopPropagation();
    setSettingReminderId(habit.id);
    setReminderTimeInput(habit.reminder_time || '');
    setSelectingTierId(null);
    setEditingId(null);
  };

  const handleSaveReminder = async (habit: HabitWithCompletion) => {
    const time = reminderTimeInput.trim() || null;
    const updatedHabits = habits.map(h =>
      h.id === habit.id ? { ...h, reminder_time: time || undefined } : h
    );
    setHabits(updatedHabits);
    await setHabitReminder(habit.id, time);
    setSettingReminderId(null);
    setReminderTimeInput('');

    if (notificationPermission === 'granted') {
      await syncHabitReminders(updatedHabits);
    }
  };

  const handleClearReminder = async (habit: HabitWithCompletion, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedHabits = habits.map(h =>
      h.id === habit.id ? { ...h, reminder_time: undefined } : h
    );
    setHabits(updatedHabits);
    await setHabitReminder(habit.id, null);

    if (notificationPermission === 'granted') {
      await removeHabitReminder(habit.id);
    }
  };

  if (loading) {
    return <ProtocolSkeleton />;
  }

  if (error) {
    return (
      <div className="glow-card p-5 space-y-3">
        <div className="flex items-center gap-2 text-amber-400">
          <ExclamationTriangleIcon className="h-6 w-6" />
          <span className="font-semibold">Connection Error</span>
        </div>
        <p className="text-sm text-gray-400">{error}</p>
        <p className="text-xs text-gray-500">
          Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set,
          and that RLS policies allow access.
        </p>
      </div>
    );
  }

  if (!protocol) {
    return <div className="glow-card p-5 text-center text-gray-400">No protocol found</div>;
  }

  const completionPct = Math.round((summary.completedCount / Math.max(summary.habitCount, 1)) * 100);

  return (
    <div className="space-y-4">
      {/* Protocol Header */}
      <div className="glow-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-400 font-medium">{protocol.status.toUpperCase()}</p>
            <h2 className="text-2xl font-bold text-gray-100">{protocol.name}</h2>
          </div>
          <div className="text-center">
            <p className="text-4xl font-extrabold text-gray-100">{protocol.streak.toString().padStart(2, '0')}</p>
            <p className="text-xs text-gray-400 font-medium">Day streak</p>
          </div>
        </div>
        <div className="w-full bg-gray-700/50 h-2.5 rounded-full overflow-hidden">
          <div className="bg-accent h-full rounded-full transition-all" style={{ width: `${(protocol.day_number / protocol.total_days) * 100}%` }} />
        </div>
        <p className="text-sm text-gray-400">Day {protocol.day_number} of {protocol.total_days}</p>

        {/* Freeze Inventory */}
        {freezeInventory && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">Streak Freezes</span>
              <div className="flex gap-1">
                {Array.from({ length: freezeInventory.maxFreezes }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                      i < freezeInventory.available
                        ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400'
                        : 'bg-gray-700/50 text-gray-500 border border-gray-600'
                    }`}
                  >
                    ❄
                  </div>
                ))}
              </div>
            </div>
            <span className="text-xs text-gray-500">
              Earn at 7, 14, 21, 30d streaks
            </span>
          </div>
        )}
      </div>

      {/* Freeze Notification */}
      {freezeNotification && (
        <div className="glow-card p-4 bg-cyan-500/10 border border-cyan-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">❄️</span>
              <span className="text-sm text-cyan-300 font-medium">{freezeNotification}</span>
            </div>
            <button onClick={() => setFreezeNotification(null)} className="text-gray-400 hover:text-white">
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* New Freeze Awarded */}
      {newFreezeAwarded && (
        <div className="glow-card p-4 bg-success/10 border border-success/30">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎉</span>
            <span className="text-sm text-success font-medium">Streak freeze earned for {newFreezeAwarded}!</span>
          </div>
        </div>
      )}

      {/* Notification Permission Banner */}
      {notificationPermission === 'default' && (
        <div className="glow-card p-4 bg-lavender/10 border border-lavender/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BellOutlineIcon className="h-5 w-5 text-lavender" />
              <span className="text-sm text-gray-200">Enable reminders for your habits?</span>
            </div>
            <button
              onClick={handleRequestNotificationPermission}
              className="px-3 py-1.5 bg-lavender text-white text-sm font-medium rounded-lg hover:bg-lavender/80 transition"
            >
              Enable
            </button>
          </div>
        </div>
      )}

      {/* Daily Progress */}
      <div className="glow-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-100">Today</h3>
          <span className="text-sm font-medium text-gray-300">{summary.completedCount}/{summary.habitCount} done</span>
        </div>
        {summary.habitCount > 0 && (
          <div className="w-full bg-gray-700/50 h-3 rounded-full overflow-hidden">
            <div className="bg-success h-full rounded-full transition-all" style={{ width: `${completionPct}%` }} />
          </div>
        )}

        {summary.completedCount > 0 && (
          <div className="flex gap-2 text-xs">
            {summary.floorCount > 0 && (
              <span className="px-2.5 py-1 bg-blue-400/20 text-blue-300 rounded-full font-medium">
                {summary.floorCount} floor
              </span>
            )}
            {summary.baseCount > 0 && (
              <span className="px-2.5 py-1 bg-indigo-400/20 text-indigo-300 rounded-full font-medium">
                {summary.baseCount} base
              </span>
            )}
            {summary.bonusCount > 0 && (
              <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 rounded-full font-medium">
                {summary.bonusCount} bonus
              </span>
            )}
          </div>
        )}
      </div>

      {/* Habits List */}
      <div className="glow-card p-5 space-y-3">
        <h3 className="font-semibold text-gray-100">Habits</h3>

        {habits.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            No habits yet. Add your first habit below.
          </p>
        ) : (
          <div className="space-y-2">
            {habits.map((habit) => (
              <div key={habit.id} className="space-y-2">
                <div
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition ${
                    habit.todayCompletion
                      ? `${tierConfig[habit.todayCompletion.tier].borderColor} bg-panel/80`
                      : 'border-gray-600/50 bg-panel/40 hover:border-gray-500/50'
                  }`}
                >
                  {editingId === habit.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 bg-midnight border border-gray-500 rounded-lg px-3 py-1.5 text-sm text-gray-100"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(habit)}
                      />
                      <button onClick={() => handleSaveEdit(habit)} className="p-1.5 text-success hover:bg-success/20 rounded">
                        <CheckIcon className="h-5 w-5" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-600/20 rounded">
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
                          <div className={`h-6 w-6 rounded-full ${tierConfig[habit.todayCompletion.tier].bgColor} flex items-center justify-center flex-shrink-0`}>
                            <CheckIcon className="h-4 w-4 text-black" />
                          </div>
                        ) : (
                          <CheckCircleIcon className="h-6 w-6 text-gray-500 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${habit.todayCompletion ? 'text-gray-100' : 'text-gray-200'}`}>
                              {habit.name}
                            </span>
                            {habit.todayCompletion && (
                              <span className={`text-xs font-medium ${tierConfig[habit.todayCompletion.tier].color}`}>
                                {tierConfig[habit.todayCompletion.tier].label}
                              </span>
                            )}
                          </div>
                          {/* Stats row */}
                          {habit.stats && (habit.stats.currentStreak > 0 || habit.stats.totalCompletions > 0) && (
                            <div className="flex items-center gap-3 mt-1">
                              {habit.stats.currentStreak > 0 && (
                                <div className="flex items-center gap-1">
                                  <FireIcon className={`h-3.5 w-3.5 ${habit.stats.currentStreak >= 7 ? 'text-orange-400' : 'text-gray-500'}`} />
                                  <span className={`text-xs font-medium ${habit.stats.currentStreak >= 7 ? 'text-orange-400' : 'text-gray-500'}`}>
                                    {habit.stats.currentStreak}d
                                  </span>
                                </div>
                              )}
                              {habit.stats.totalCompletions > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <div className="w-12 h-2 bg-gray-600/50 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${
                                        habit.stats.completionRate >= 80 ? 'bg-success' :
                                        habit.stats.completionRate >= 50 ? 'bg-amber-500' : 'bg-gray-500'
                                      }`}
                                      style={{ width: `${habit.stats.completionRate}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-gray-400 font-medium">{habit.stats.completionRate}%</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                      <div className="flex items-center gap-1">
                        {notificationPermission === 'granted' && (
                          <button
                            onClick={(e) => handleStartSetReminder(habit, e)}
                            className={`p-1.5 rounded transition ${
                              habit.reminder_time
                                ? 'text-lavender hover:bg-lavender/20'
                                : 'text-gray-500 hover:text-lavender hover:bg-lavender/20'
                            }`}
                            title={habit.reminder_time ? formatReminderTime(habit.reminder_time) : 'Set reminder'}
                          >
                            {habit.reminder_time ? (
                              <BellIcon className="h-4 w-4" />
                            ) : (
                              <BellOutlineIcon className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={(e) => handleStartEdit(habit, e)}
                          className="p-1.5 text-gray-500 hover:text-accent hover:bg-accent/20 rounded transition"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(habit.id, e)}
                          className="p-1.5 text-gray-500 hover:text-coral hover:bg-coral/20 rounded transition"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {selectingTierId === habit.id && editingId !== habit.id && (
                  <div className="flex gap-2 pl-4">
                    {(['floor', 'base', 'bonus'] as CompletionTier[]).map((tier) => (
                      <button
                        key={tier}
                        onClick={() => handleSelectTier(habit, tier)}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                          habit.todayCompletion?.tier === tier
                            ? `${tierConfig[tier].bgColor} text-black`
                            : `bg-panel border border-gray-600 ${tierConfig[tier].color} hover:bg-panel/80`
                        }`}
                      >
                        <div>{tierConfig[tier].label}</div>
                        <div className="text-xs opacity-70">{tierConfig[tier].description}</div>
                      </button>
                    ))}
                    {habit.todayCompletion && (
                      <button
                        onClick={() => handleUncomplete(habit)}
                        className="py-2 px-3 rounded-lg text-sm font-medium bg-panel border border-gray-600 text-gray-400 hover:text-coral hover:border-coral transition"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}

                {/* Reminder Time Setting */}
                {settingReminderId === habit.id && (
                  <div className="flex items-center gap-2 pl-4 py-2 bg-lavender/10 rounded-lg">
                    <ClockIcon className="h-4 w-4 text-lavender" />
                    <input
                      type="time"
                      value={reminderTimeInput}
                      onChange={(e) => setReminderTimeInput(e.target.value)}
                      className="bg-midnight border border-lavender/30 rounded-lg px-2 py-1 text-sm text-gray-100"
                      autoFocus
                    />
                    <button onClick={() => handleSaveReminder(habit)} className="p-1.5 text-success hover:bg-success/20 rounded">
                      <CheckIcon className="h-5 w-5" />
                    </button>
                    {habit.reminder_time && (
                      <button
                        onClick={(e) => handleClearReminder(habit, e)}
                        className="p-1.5 text-gray-400 hover:text-coral hover:bg-coral/20 rounded"
                        title="Remove reminder"
                      >
                        <BellSlashIcon className="h-5 w-5" />
                      </button>
                    )}
                    <button onClick={() => setSettingReminderId(null)} className="p-1.5 text-gray-400 hover:bg-gray-600/20 rounded">
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add Habit */}
        <div className="pt-3 border-t border-gray-700/50">
          <div className="flex gap-2">
            <input
              value={newHabit}
              onChange={(e) => setNewHabit(e.target.value)}
              placeholder="Add a habit..."
              className="flex-1 bg-panel/60 border border-gray-600/50 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <button
              onClick={handleAdd}
              disabled={!newHabit.trim()}
              className="bg-accent text-black rounded-xl px-4 flex items-center gap-1 font-semibold disabled:opacity-50 hover:bg-accent/90 transition"
            >
              <PlusCircleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="glow-card p-5 space-y-2">
        <h4 className="font-semibold text-gray-300 text-sm">How tiers work</h4>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center p-3 bg-blue-400/10 rounded-lg border border-blue-400/20">
            <span className="text-blue-300 font-semibold">Floor</span>
            <p className="text-gray-400 mt-0.5">Did the minimum</p>
          </div>
          <div className="text-center p-3 bg-indigo-400/10 rounded-lg border border-indigo-400/20">
            <span className="text-indigo-300 font-semibold">Base</span>
            <p className="text-gray-400 mt-0.5">Standard effort</p>
          </div>
          <div className="text-center p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <span className="text-amber-400 font-semibold">Bonus</span>
            <p className="text-gray-400 mt-0.5">Went all out</p>
          </div>
        </div>
      </div>

      {/* Debug Panel */}
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="w-full text-center text-xs text-gray-500 py-2 hover:text-gray-400"
      >
        {showDebug ? 'Hide Debug Info' : 'Show Debug Info'}
      </button>

      {showDebug && (
        <div className="glow-card p-4 space-y-2 text-xs font-mono bg-surface border border-gray-700">
          <h4 className="font-bold text-amber-400">Debug Info</h4>
          <div className="space-y-1 text-gray-300">
            <p><span className="text-gray-500">Session:</span> {sessionId || 'null'}</p>
            <p><span className="text-gray-500">Protocol:</span> {protocol?.id || 'null'}</p>
            <p><span className="text-gray-500">Habit Count:</span> {habits.length}</p>
            <p><span className="text-gray-500">Habits:</span> {habits.length > 0 ? habits.map(h => h.name).join(', ') : '(none)'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
