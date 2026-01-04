import { useState, useEffect } from 'react';
import { SparklesIcon, ArrowPathIcon, ChartBarIcon, LightBulbIcon } from '@heroicons/react/24/solid';
import { fetchProtocol, fetchHabitsWithCompletions, computeSummary, HabitWithCompletion, Summary } from '../lib/data';

interface Insight {
  type: 'strength' | 'focus' | 'tip';
  message: string;
}

function generateInsights(habits: HabitWithCompletion[], summary: Summary): Insight[] {
  const insights: Insight[] = [];

  if (summary.habitCount === 0) {
    insights.push({
      type: 'tip',
      message: 'Add some habits to start tracking your rhythm.'
    });
    return insights;
  }

  const completionRate = summary.completedCount / summary.habitCount;

  // Completion analysis
  if (completionRate >= 1) {
    insights.push({
      type: 'strength',
      message: 'All habits complete. Solid day.'
    });
  } else if (completionRate >= 0.5) {
    insights.push({
      type: 'tip',
      message: `${summary.habitCount - summary.completedCount} habits remaining. Keep pushing.`
    });
  } else if (summary.completedCount > 0) {
    insights.push({
      type: 'focus',
      message: 'Less than half done. Pick one habit to complete next.'
    });
  } else {
    insights.push({
      type: 'focus',
      message: 'No habits logged yet today. Start with something easy.'
    });
  }

  // Tier analysis
  if (summary.bonusCount > 0) {
    insights.push({
      type: 'strength',
      message: `${summary.bonusCount} bonus-level performance${summary.bonusCount > 1 ? 's' : ''}. Operating above baseline.`
    });
  }

  if (summary.floorCount > 0 && summary.baseCount === 0 && summary.bonusCount === 0) {
    insights.push({
      type: 'tip',
      message: 'All completions at floor level. Consider pushing for base on your next habit.'
    });
  }

  if (summary.baseCount > summary.floorCount && summary.baseCount > summary.bonusCount) {
    insights.push({
      type: 'strength',
      message: 'Consistent base-level execution. Solid foundation.'
    });
  }

  return insights.slice(0, 4);
}

export function CoachPanel() {
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [habits, setHabits] = useState<HabitWithCompletion[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);

  const loadData = async () => {
    setAnalyzing(true);
    const proto = await fetchProtocol();
    const habitsData = await fetchHabitsWithCompletions(proto.id);
    const summaryData = computeSummary(habitsData);

    setHabits(habitsData);
    setSummary(summaryData);
    setInsights(generateInsights(habitsData, summaryData));
    setLoading(false);
    setAnalyzing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading || !summary) {
    return (
      <div className="glow-card p-6 text-center space-y-4">
        <div className="mx-auto h-16 w-16 rounded-full bg-panel grid place-items-center animate-pulse">
          <SparklesIcon className="h-8 w-8 text-accent" />
        </div>
        <p className="text-sm text-gray-300">Analyzing your rhythm...</p>
      </div>
    );
  }

  const completionPct = summary.habitCount > 0
    ? Math.round((summary.completedCount / summary.habitCount) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Coach Header */}
      <div className="glow-card p-6 text-center space-y-4">
        <div className="mx-auto h-16 w-16 rounded-full bg-panel grid place-items-center">
          <SparklesIcon className="h-8 w-8 text-accent" />
        </div>
        <h3 className="text-xl font-bold">Coach Rhythm</h3>
        <p className="text-sm text-gray-300">Performance analysis</p>
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

        <div className="bg-panel rounded-xl p-4 text-center">
          <p className="text-4xl font-bold text-success">{completionPct}%</p>
          <p className="text-sm text-gray-400">{summary.completedCount}/{summary.habitCount} habits complete</p>
        </div>

        {/* Tier Breakdown */}
        {summary.completedCount > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-blue-400/10 border border-blue-400/30 rounded-lg p-2 text-center">
              <p className="text-sm font-bold text-blue-400">{summary.floorCount}</p>
              <p className="text-xs text-gray-400">Floor</p>
            </div>
            <div className="bg-indigo-400/10 border border-indigo-400/30 rounded-lg p-2 text-center">
              <p className="text-sm font-bold text-indigo-400">{summary.baseCount}</p>
              <p className="text-xs text-gray-400">Base</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 text-center">
              <p className="text-sm font-bold text-amber-500">{summary.bonusCount}</p>
              <p className="text-xs text-gray-400">Bonus</p>
            </div>
          </div>
        )}
      </div>

      {/* Insights */}
      <div className="glow-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <LightBulbIcon className="h-5 w-5 text-amber-400" />
          <h4 className="font-semibold">Insights</h4>
        </div>
        <div className="space-y-2">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl text-sm ${
                insight.type === 'strength'
                  ? 'bg-success/10 border border-success/30 text-success'
                  : insight.type === 'focus'
                  ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                  : 'bg-accent/10 border border-accent/30 text-accent'
              }`}
            >
              <span className="font-semibold uppercase text-xs mr-2">
                {insight.type === 'strength' ? 'Strength' : insight.type === 'focus' ? 'Focus' : 'Tip'}:
              </span>
              {insight.message}
            </div>
          ))}
        </div>
      </div>

      {/* The Tier System */}
      <div className="glow-card p-5 space-y-3">
        <h4 className="font-semibold text-gray-300">Understanding Tiers</h4>
        <div className="space-y-2 text-sm text-gray-400">
          <p><span className="text-blue-400 font-semibold">Floor:</span> You did it, but bare minimum. Still counts.</p>
          <p><span className="text-indigo-400 font-semibold">Base:</span> Standard execution. Your normal effort.</p>
          <p><span className="text-amber-500 font-semibold">Bonus:</span> You went above and beyond today.</p>
        </div>
      </div>
    </div>
  );
}
