import { useMemo } from 'react';
import dayjs from 'dayjs';
import { Summary } from '../lib/data';
import { CheckCircleIcon, ClockIcon, FireIcon } from '@heroicons/react/24/solid';

interface Props {
  summary: Summary;
}

function buildMonth(reference = dayjs()) {
  const start = reference.startOf('month');
  const firstDayOfWeek = start.day();
  const days: { label: string; isToday: boolean; isCurrentMonth: boolean }[] = [];

  // Add empty slots for days before the first day of month
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
    ? Math.round((summary.totalReps / summary.habitCount) * 100)
    : 0;

  const commitmentRate = summary.totalCommitments > 0
    ? Math.round((summary.commitmentScore / summary.totalCommitments) * 100)
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
        <h4 className="font-semibold text-gray-300">Today&apos;s Summary</h4>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-panel rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CheckCircleIcon className="h-5 w-5 text-success" />
              <p className="text-2xl font-bold">{summary.totalReps}/{summary.habitCount}</p>
            </div>
            <p className="text-xs text-gray-400">Habits Done</p>
            <div className="mt-2 w-full bg-panel h-2 rounded-full overflow-hidden">
              <div className="bg-success h-full transition-all" style={{ width: `${completionRate}%` }} />
            </div>
          </div>

          <div className="bg-panel rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <ClockIcon className="h-5 w-5 text-accent" />
              <p className="text-2xl font-bold">{summary.commitmentScore}/{summary.totalCommitments}</p>
            </div>
            <p className="text-xs text-gray-400">Blocks Honored</p>
            <div className="mt-2 w-full bg-panel h-2 rounded-full overflow-hidden">
              <div className="bg-accent h-full transition-all" style={{ width: `${commitmentRate}%` }} />
            </div>
          </div>
        </div>

        {/* Combined Score */}
        <div className="bg-panel rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FireIcon className="h-6 w-6 text-orange-500" />
            <div>
              <p className="font-semibold">Day Score</p>
              <p className="text-xs text-gray-400">Habits + Commitments</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-success">
              {completionRate > 0 || commitmentRate > 0
                ? Math.round((completionRate + commitmentRate) / 2)
                : 0}%
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="glow-card p-5 space-y-3">
        <h4 className="font-semibold text-gray-300">Quick Stats</h4>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-blue-400/10 border border-blue-400/30 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-blue-400">{summary.habitCount}</p>
            <p className="text-xs text-gray-400">Total Habits</p>
          </div>
          <div className="bg-success/10 border border-success/30 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-success">{summary.totalReps}</p>
            <p className="text-xs text-gray-400">Completed</p>
          </div>
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-accent">{summary.totalCommitments}</p>
            <p className="text-xs text-gray-400">Time Blocks</p>
          </div>
        </div>
      </div>
    </div>
  );
}
