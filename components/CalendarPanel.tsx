import { useMemo } from 'react';
import dayjs from 'dayjs';
import { Summary } from '../lib/data';
import { CheckCircleIcon, FireIcon } from '@heroicons/react/24/solid';

interface Props {
  summary: Summary;
}

function buildMonth(reference = dayjs()) {
  const start = reference.startOf('month');
  const firstDayOfWeek = start.day();
  const days: { label: string; isToday: boolean; isCurrentMonth: boolean }[] = [];

  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push({ label: '', isToday: false, isCurrentMonth: false });
  }

  for (let i = 0; i < reference.daysInMonth(); i += 1) {
    const date = start.add(i, 'day');
    days.push({ label: date.format('D'), isToday: date.isSame(dayjs(), 'day'), isCurrentMonth: true });
  }
  return days;
}

export function CalendarPanel({ summary }: Props) {
  const days = useMemo(() => buildMonth(), []);
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
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 uppercase">
          {weekdays.map((day, idx) => (
            <span key={idx} className="py-1">{day}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, idx) => (
            <div
              key={idx}
              className={`aspect-square rounded-lg grid place-items-center text-sm ${
                day.isToday
                  ? 'bg-accent text-black font-bold'
                  : day.isCurrentMonth
                  ? 'bg-panel text-gray-200'
                  : 'bg-transparent'
              }`}
            >
              {day.label}
            </div>
          ))}
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
