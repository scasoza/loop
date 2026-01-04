import { useMemo } from 'react';
import dayjs from 'dayjs';
import { Summary } from '../lib/data';

interface Props {
  summary: Summary;
}

function buildMonth(reference = dayjs()) {
  const start = reference.startOf('month');
  const days: { label: string; isToday: boolean }[] = [];
  for (let i = 0; i < reference.daysInMonth(); i += 1) {
    const date = start.add(i, 'day');
    days.push({ label: date.format('D'), isToday: date.isSame(dayjs(), 'day') });
  }
  return days;
}

export function CalendarPanel({ summary }: Props) {
  const days = useMemo(() => buildMonth(), []);
  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="glow-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Calendar</p>
          <p className="text-lg font-semibold">Your Rhythm</p>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs text-gray-400 uppercase">
        {weekdays.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => (
          <div
            key={day.label}
            className={`aspect-square rounded-xl grid place-items-center ${day.isToday ? 'bg-accent text-black font-bold' : 'bg-panel text-gray-200'}`}
          >
            {day.label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-panel rounded-xl p-3 text-center">
          <p className="text-3xl font-bold">{summary.totalReps}</p>
          <p className="text-xs text-gray-400">Total reps</p>
        </div>
        <div className="bg-panel rounded-xl p-3 text-center">
          <p className="text-3xl font-bold">{summary.habitCount}</p>
          <p className="text-xs text-gray-400">Habits</p>
        </div>
      </div>
    </div>
  );
}
