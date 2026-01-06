import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Summary, DayStats, fetchCompletionsForDateRange } from '../lib/data';
import { CheckCircleIcon, FireIcon } from '@heroicons/react/24/solid';

interface Props {
  summary: Summary;
}

interface DayInfo {
  label: string;
  dateStr: string;
  isToday: boolean;
  isCurrentMonth: boolean;
  stats?: DayStats;
}

function buildMonth(reference = dayjs(), stats: Record<string, DayStats> = {}): DayInfo[] {
  const start = reference.startOf('month');
  const firstDayOfWeek = start.day();
  const days: DayInfo[] = [];

  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push({ label: '', dateStr: '', isToday: false, isCurrentMonth: false });
  }

  for (let i = 0; i < reference.daysInMonth(); i += 1) {
    const date = start.add(i, 'day');
    const dateStr = date.format('YYYY-MM-DD');
    days.push({
      label: date.format('D'),
      dateStr,
      isToday: date.isSame(dayjs(), 'day'),
      isCurrentMonth: true,
      stats: stats[dateStr]
    });
  }
  return days;
}

function getCompletionColor(stats?: DayStats): string {
  if (!stats || stats.completedCount === 0) return '';

  const rate = stats.completedCount / stats.totalHabits;

  // Check if mostly bonus
  if (stats.bonusCount > stats.completedCount / 2) {
    return 'bg-amber-500/30 border border-amber-500/50';
  }
  // Check if mostly base
  if (stats.baseCount > stats.completedCount / 2) {
    return 'bg-indigo-400/30 border border-indigo-400/50';
  }
  // Check if mostly floor
  if (stats.floorCount > stats.completedCount / 2) {
    return 'bg-blue-400/30 border border-blue-400/50';
  }

  // Mixed - use completion rate for intensity
  if (rate >= 0.8) return 'bg-success/40 border border-success/60';
  if (rate >= 0.5) return 'bg-success/25 border border-success/40';
  return 'bg-success/15 border border-success/25';
}

export function CalendarPanel({ summary }: Props) {
  const [monthStats, setMonthStats] = useState<Record<string, DayStats>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD');
      const endOfMonth = dayjs().endOf('month').format('YYYY-MM-DD');
      const stats = await fetchCompletionsForDateRange(startOfMonth, endOfMonth);
      setMonthStats(stats);
      setLoading(false);
    };
    loadStats();
  }, []);

  const days = useMemo(() => buildMonth(dayjs(), monthStats), [monthStats]);
  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const completionRate = summary.habitCount > 0
    ? Math.round((summary.completedCount / summary.habitCount) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div className="glow-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Calendar</p>
            <p className="text-lg font-semibold">{dayjs().format('MMMM YYYY')}</p>
          </div>
          {loading && <span className="text-xs text-gray-500">Loading...</span>}
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 uppercase">
          {weekdays.map((day, idx) => (
            <span key={idx} className="py-1">{day}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, idx) => {
            const completionRate = day.stats
              ? Math.round((day.stats.completedCount / day.stats.totalHabits) * 100)
              : 0;

            return (
              <div
                key={idx}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm relative overflow-hidden ${
                  day.isToday
                    ? 'bg-accent text-black font-bold'
                    : day.isCurrentMonth
                    ? `bg-panel text-gray-200 ${getCompletionColor(day.stats)}`
                    : 'bg-transparent'
                }`}
                title={day.stats ? `${day.stats.completedCount}/${day.stats.totalHabits} completed (${completionRate}%)` : ''}
              >
                <span>{day.label}</span>
                {/* Progress bar at bottom */}
                {day.isCurrentMonth && day.stats && day.stats.completedCount > 0 && !day.isToday && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                    <div
                      className="h-full bg-success transition-all"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                )}
                {/* Show fraction for days with data */}
                {day.stats && day.stats.completedCount > 0 && !day.isToday && (
                  <span className="text-[8px] text-gray-400 -mt-0.5">
                    {day.stats.completedCount}/{day.stats.totalHabits}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-3 text-xs text-gray-400 pt-2">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-400/30 border border-blue-400/50" />
            <span>Floor</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-indigo-400/30 border border-indigo-400/50" />
            <span>Base</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500/50" />
            <span>Bonus</span>
          </div>
        </div>
      </div>

      {/* Today's Summary */}
      <div className="glow-card p-5 space-y-3">
        <h4 className="font-semibold text-gray-300">Today&apos;s Progress</h4>

        <div className="bg-panel rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5 text-success" />
              <span className="font-medium">Habits Complete</span>
            </div>
            <span className="text-2xl font-bold">{summary.completedCount}/{summary.habitCount}</span>
          </div>
          <div className="w-full bg-midnight h-2 rounded-full overflow-hidden">
            <div className="bg-success h-full transition-all" style={{ width: `${completionRate}%` }} />
          </div>
        </div>

        {/* Tier Breakdown */}
        {summary.completedCount > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-blue-400/10 border border-blue-400/30 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-blue-400">{summary.floorCount}</p>
              <p className="text-xs text-gray-400">Floor</p>
            </div>
            <div className="bg-indigo-400/10 border border-indigo-400/30 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-indigo-400">{summary.baseCount}</p>
              <p className="text-xs text-gray-400">Base</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-amber-500">{summary.bonusCount}</p>
              <p className="text-xs text-gray-400">Bonus</p>
            </div>
          </div>
        )}

        {/* Day Score */}
        <div className="bg-panel rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FireIcon className="h-6 w-6 text-orange-500" />
            <div>
              <p className="font-semibold">Day Score</p>
              <p className="text-xs text-gray-400">Overall completion</p>
            </div>
          </div>
          <p className="text-3xl font-bold text-success">{completionRate}%</p>
        </div>
      </div>
    </div>
  );
}
