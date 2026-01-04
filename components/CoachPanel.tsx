import { useState, useEffect } from 'react';
import { SparklesIcon, ArrowPathIcon, ChartBarIcon, FireIcon, LightBulbIcon } from '@heroicons/react/24/solid';
import { fetchProtocol, fetchHabitsWithStatus, fetchCommitments, fetchHistoricalData, HabitTier, HabitWithStatus, CommitmentBlock } from '../lib/data';
import dayjs from 'dayjs';

interface Insight {
  type: 'strength' | 'opportunity' | 'tip';
  message: string;
}

function generateInsights(
  habits: HabitWithStatus[],
  commitments: CommitmentBlock[],
  tierBreakdown: Record<HabitTier, { completed: number; total: number }>,
  streakData: { current: number; longest: number }
): Insight[] {
  const insights: Insight[] = [];
  const today = dayjs().day();
  const todayCommitments = commitments.filter(c => c.days.includes(today));

  const totalHabits = habits.length;
  const completedHabits = habits.filter(h => h.completed).length;
  const completionRate = totalHabits > 0 ? completedHabits / totalHabits : 0;

  const honoredCommitments = todayCommitments.filter(c => c.honored).length;
  const commitmentRate = todayCommitments.length > 0 ? honoredCommitments / todayCommitments.length : 0;

  // Floor habit analysis
  const floorComplete = tierBreakdown.floor.completed === tierBreakdown.floor.total && tierBreakdown.floor.total > 0;
  if (floorComplete) {
    insights.push({
      type: 'strength',
      message: 'Floor habits locked in. Your foundation is solid today.'
    });
  } else if (tierBreakdown.floor.total > 0 && tierBreakdown.floor.completed < tierBreakdown.floor.total) {
    insights.push({
      type: 'opportunity',
      message: `Complete your ${tierBreakdown.floor.total - tierBreakdown.floor.completed} remaining floor habit(s) first. These are non-negotiable.`
    });
  }

  // Base habit analysis
  const baseComplete = tierBreakdown.base.completed === tierBreakdown.base.total && tierBreakdown.base.total > 0;
  if (baseComplete && floorComplete) {
    insights.push({
      type: 'strength',
      message: 'Base layer complete. You\'re executing at standard capacity.'
    });
  } else if (tierBreakdown.base.total > 0 && !baseComplete && floorComplete) {
    insights.push({
      type: 'tip',
      message: `${tierBreakdown.base.total - tierBreakdown.base.completed} base habit(s) remaining. Push through to maintain momentum.`
    });
  }

  // Bonus analysis
  if (tierBreakdown.bonus.completed > 0) {
    insights.push({
      type: 'strength',
      message: `Bonus territory: ${tierBreakdown.bonus.completed} extra habit(s) completed. Operating above baseline.`
    });
  } else if (completionRate >= 1 && tierBreakdown.bonus.total > 0) {
    insights.push({
      type: 'tip',
      message: 'Core habits done. Consider tackling bonus habits to accelerate progress.'
    });
  }

  // Commitment block analysis
  if (commitmentRate >= 1 && todayCommitments.length > 0) {
    insights.push({
      type: 'strength',
      message: 'All commitment blocks honored. Time discipline is strong.'
    });
  } else if (todayCommitments.length > 0 && commitmentRate < 1) {
    const remaining = todayCommitments.length - honoredCommitments;
    insights.push({
      type: 'opportunity',
      message: `${remaining} commitment block(s) not yet honored. Protect your scheduled focus time.`
    });
  }

  // Streak analysis
  if (streakData.current > 0) {
    if (streakData.current >= 7) {
      insights.push({
        type: 'strength',
        message: `${streakData.current}-day streak. Consistency is compounding. Don't break the chain.`
      });
    } else if (streakData.current >= 3) {
      insights.push({
        type: 'tip',
        message: `${streakData.current}-day streak building. Every day strengthens the pattern.`
      });
    }
  }

  // Overall performance
  if (completionRate >= 1 && commitmentRate >= 1) {
    insights.push({
      type: 'strength',
      message: 'Peak performance today. All systems operating at full capacity.'
    });
  } else if (completionRate < 0.5 && totalHabits > 0) {
    insights.push({
      type: 'opportunity',
      message: 'Less than half complete. Focus on floor habits first, then work upward.'
    });
  }

  // Time-based tips
  const hour = dayjs().hour();
  if (hour >= 20 && completionRate < 1 && totalHabits > 0) {
    insights.push({
      type: 'tip',
      message: 'Evening check: Review what\'s left. Some habits can still be completed tonight.'
    });
  } else if (hour < 10 && completionRate < 0.3) {
    insights.push({
      type: 'tip',
      message: 'Morning momentum: Complete one floor habit now to set the tone.'
    });
  }

  // Limit to most relevant insights
  return insights.slice(0, 5);
}

export function CoachPanel() {
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [habits, setHabits] = useState<HabitWithStatus[]>([]);
  const [commitments, setCommitments] = useState<CommitmentBlock[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [tierBreakdown, setTierBreakdown] = useState<Record<HabitTier, { completed: number; total: number }>>({
    floor: { completed: 0, total: 0 },
    base: { completed: 0, total: 0 },
    bonus: { completed: 0, total: 0 }
  });
  const [streakData, setStreakData] = useState({ current: 0, longest: 0 });

  const loadData = async () => {
    setAnalyzing(true);
    const proto = await fetchProtocol();
    const [habitsData, commitmentsData, historicalData] = await Promise.all([
      fetchHabitsWithStatus(proto.id),
      fetchCommitments(proto.id),
      fetchHistoricalData(proto.id, 14)
    ]);

    setHabits(habitsData);
    setCommitments(commitmentsData);
    setTierBreakdown(historicalData.tierBreakdown);
    setStreakData(historicalData.streakData);

    const newInsights = generateInsights(
      habitsData,
      commitmentsData,
      historicalData.tierBreakdown,
      historicalData.streakData
    );
    setInsights(newInsights);
    setLoading(false);
    setAnalyzing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const completedToday = habits.filter(h => h.completed).length;
  const totalToday = habits.length;
  const completionPct = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

  const today = dayjs().day();
  const todayCommitments = commitments.filter(c => c.days.includes(today));
  const honoredToday = todayCommitments.filter(c => c.honored).length;

  if (loading) {
    return (
      <div className="glow-card p-6 text-center space-y-4">
        <div className="mx-auto h-16 w-16 rounded-full bg-panel grid place-items-center animate-pulse">
          <SparklesIcon className="h-8 w-8 text-accent" />
        </div>
        <p className="text-sm text-gray-300">Analyzing your rhythm...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Coach Header */}
      <div className="glow-card p-6 text-center space-y-4">
        <div className="mx-auto h-16 w-16 rounded-full bg-panel grid place-items-center">
          <SparklesIcon className="h-8 w-8 text-accent" />
        </div>
        <h3 className="text-xl font-bold">Coach Rhythm</h3>
        <p className="text-sm text-gray-300">Performance analysis & optimization</p>
        <button
          onClick={loadData}
          disabled={analyzing}
          className="w-full bg-accent text-black font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50"
        >
          {analyzing ? (
            <ArrowPathIcon className="h-5 w-5 animate-spin" />
          ) : (
            <SparklesIcon className="h-5 w-5" />
          )}
          {analyzing ? 'Analyzing...' : 'Refresh Analysis'}
        </button>
      </div>

      {/* Today's Stats */}
      <div className="glow-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <ChartBarIcon className="h-5 w-5 text-accent" />
          <h4 className="font-semibold">Today&apos;s Performance</h4>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-panel rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-success">{completionPct}%</p>
            <p className="text-xs text-gray-400">Habits Done</p>
            <p className="text-xs text-gray-500">{completedToday}/{totalToday}</p>
          </div>
          <div className="bg-panel rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-accent">{honoredToday}/{todayCommitments.length}</p>
            <p className="text-xs text-gray-400">Blocks Honored</p>
          </div>
        </div>

        {/* Tier Breakdown */}
        <div className="space-y-2">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Tier Breakdown</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-blue-400/10 border border-blue-400/30 rounded-lg p-2 text-center">
              <p className="text-sm font-bold text-blue-400">{tierBreakdown.floor.completed}/{tierBreakdown.floor.total}</p>
              <p className="text-xs text-gray-400">Floor</p>
            </div>
            <div className="bg-indigo-400/10 border border-indigo-400/30 rounded-lg p-2 text-center">
              <p className="text-sm font-bold text-indigo-400">{tierBreakdown.base.completed}/{tierBreakdown.base.total}</p>
              <p className="text-xs text-gray-400">Base</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 text-center">
              <p className="text-sm font-bold text-amber-500">{tierBreakdown.bonus.completed}/{tierBreakdown.bonus.total}</p>
              <p className="text-xs text-gray-400">Bonus</p>
            </div>
          </div>
        </div>

        {/* Streak */}
        <div className="flex items-center justify-between bg-panel rounded-xl p-3">
          <div className="flex items-center gap-2">
            <FireIcon className="h-5 w-5 text-orange-500" />
            <span className="text-sm">Current Streak</span>
          </div>
          <span className="text-xl font-bold">{streakData.current} days</span>
        </div>
      </div>

      {/* AI Insights */}
      <div className="glow-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <LightBulbIcon className="h-5 w-5 text-amber-400" />
          <h4 className="font-semibold">Insights</h4>
        </div>
        {insights.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            Add some habits and commitment blocks to get personalized insights.
          </p>
        ) : (
          <div className="space-y-2">
            {insights.map((insight, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl text-sm ${
                  insight.type === 'strength'
                    ? 'bg-success/10 border border-success/30 text-success'
                    : insight.type === 'opportunity'
                    ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                    : 'bg-accent/10 border border-accent/30 text-accent'
                }`}
              >
                <span className="font-semibold uppercase text-xs mr-2">
                  {insight.type === 'strength' ? 'Strength' : insight.type === 'opportunity' ? 'Focus' : 'Tip'}:
                </span>
                {insight.message}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* The Philosophy */}
      <div className="glow-card p-5 space-y-3">
        <h4 className="font-semibold text-gray-300">The Tier System</h4>
        <div className="space-y-2 text-sm text-gray-400">
          <p><span className="text-blue-400 font-semibold">Floor:</span> Non-negotiables. These happen no matter what.</p>
          <p><span className="text-indigo-400 font-semibold">Base:</span> Standard operating habits. Your daily baseline.</p>
          <p><span className="text-amber-500 font-semibold">Bonus:</span> Extra credit. Push beyond when you have capacity.</p>
        </div>
      </div>
    </div>
  );
}
