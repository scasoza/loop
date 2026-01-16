import { useState } from 'react';
import { createProgressionHabit, Habit } from '../lib/data';

interface ProgressionBuilderProps {
  protocolId: string;
  onCreated?: (habit: Habit) => void | Promise<void>;
}

export function ProgressionBuilder({ protocolId, onCreated }: ProgressionBuilderProps) {
  const [showProgressionForm, setShowProgressionForm] = useState(false);
  const [progressionName, setProgressionName] = useState('');
  const [progressionSteps, setProgressionSteps] = useState('5: Do X\n5: Do Y');

  const handleAddProgression = async () => {
    if (!progressionName.trim()) return;
    const steps = progressionSteps
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^(\d+)\s*[:\-]\s*(.+)$/);
        if (match) {
          return { durationDays: Number(match[1]), name: match[2].trim() };
        }
        return { durationDays: 1, name: line };
      })
      .filter((step) => step.name.length > 0 && step.durationDays > 0);

    if (steps.length === 0) return;

    const created = await createProgressionHabit({
      name: progressionName.trim(),
      protocolId,
      steps
    });

    if (created) {
      if (onCreated) {
        await onCreated(created);
      }
      setProgressionName('');
      setProgressionSteps('5: Do X\n5: Do Y');
      setShowProgressionForm(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowProgressionForm((prev) => !prev)}
        className="mt-3 text-xs text-gray-400 hover:text-gray-200"
      >
        {showProgressionForm ? 'Hide progression builder' : 'Add a progression habit'}
      </button>
      {showProgressionForm && (
        <div className="mt-3 space-y-2 rounded-xl border border-gray-700/60 bg-panel/40 p-3">
          <input
            value={progressionName}
            onChange={(e) => setProgressionName(e.target.value)}
            placeholder="Progression name (e.g., Diet reboot)"
            className="w-full bg-panel/60 border border-gray-600/50 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500"
          />
          <textarea
            value={progressionSteps}
            onChange={(e) => setProgressionSteps(e.target.value)}
            rows={4}
            placeholder="5: Eat whole foods\n5: Add protein\n5: Add fiber"
            className="w-full bg-panel/60 border border-gray-600/50 rounded-lg px-3 py-2 text-xs text-gray-100 placeholder-gray-500"
          />
          <p className="text-[11px] text-gray-500">
            Format: one step per line, &quot;days: instruction&quot;. If no days provided, defaults to 1 day.
          </p>
          <div className="flex justify-end">
            <button
              onClick={handleAddProgression}
              disabled={!progressionName.trim()}
              className="bg-amber-400 text-black rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50 hover:bg-amber-300 transition"
            >
              Create progression
            </button>
          </div>
        </div>
      )}
    </>
  );
}
