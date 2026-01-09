import { useState } from 'react';
import { clearData, updateProtocol } from '../lib/data';

const RULES = [
  'Intensity is the teacher. Do not negotiate with your lower self.',
  'Consistency establishes the rhythm. Miss once, it\'s an accident. Miss twice, it\'s a new habit.',
  'The Crucible is a period of heightened focus. Use it to break a pattern or build one.'
];

interface Props {
  theme: 'light' | 'dark' | 'system';
  onThemeChange?: (theme: 'light' | 'dark' | 'system') => void;
}

export function SystemPanel({ theme, onThemeChange }: Props) {
  const [cleared, setCleared] = useState(false);

  const handleTheme = async (value: 'light' | 'dark' | 'system') => {
    onThemeChange?.(value);
    await updateProtocol({ theme: value });
  };

  const hardReset = async () => {
    await clearData();
    setCleared(true);
  };

  return (
    <div className="glow-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-400">System & Rules</p>
          <p className="text-lg font-semibold">Data Security</p>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-gray-300">Theme Preference</p>
        <div className="flex gap-2">
          {(['light', 'dark', 'system'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => handleTheme(mode)}
              className={`tab-button ${theme === mode ? 'active' : 'bg-panel text-gray-300'}`}
            >
              {mode.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-gray-300">Data Management</p>
        <button
          onClick={hardReset}
          className="w-full bg-danger text-white font-semibold py-3 rounded-xl shadow-lg hover:opacity-90"
        >
          Hard Reset All Data
        </button>
        {cleared && <p className="text-xs text-green-400">Data cleared for this session.</p>}
      </div>

      <div className="space-y-3">
        <p className="text-sm text-gray-300">The Code</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
          {RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
