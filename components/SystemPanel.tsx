import { useState, useEffect } from 'react';
import { ClipboardIcon, CheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { clearData, updateProtocol } from '../lib/data';
import { getSessionId, setSessionId } from '../lib/session';

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
  const [sessionId, setCurrentSessionId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSessionInput, setShowSessionInput] = useState(false);
  const [sessionInput, setSessionInput] = useState('');
  const [sessionUpdated, setSessionUpdated] = useState(false);

  useEffect(() => {
    setCurrentSessionId(getSessionId());
  }, []);

  const handleTheme = async (value: 'light' | 'dark' | 'system') => {
    onThemeChange?.(value);
    await updateProtocol({ theme: value });
  };

  const hardReset = async () => {
    await clearData();
    setCleared(true);
  };

  const copySessionLink = async () => {
    if (!sessionId) return;
    const url = new URL(window.location.href);
    url.searchParams.set('session', sessionId);
    await navigator.clipboard.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRecoverSession = () => {
    const trimmed = sessionInput.trim();
    if (!trimmed) return;
    setSessionId(trimmed);
    setCurrentSessionId(trimmed);
    setSessionInput('');
    setShowSessionInput(false);
    setSessionUpdated(true);
    // Reload to fetch data for the new session
    setTimeout(() => window.location.reload(), 500);
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

      {/* Session Management */}
      <div className="space-y-3 pt-2 border-t border-gray-700">
        <p className="text-sm text-gray-300">Session</p>
        {sessionId && (
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-panel px-3 py-2 rounded-lg text-gray-400 font-mono truncate">
              {sessionId}
            </code>
            <button
              onClick={copySessionLink}
              className="p-2 bg-panel rounded-lg hover:bg-lavender/20 transition"
              title="Copy session link"
            >
              {copied ? (
                <CheckIcon className="h-4 w-4 text-success" />
              ) : (
                <ClipboardIcon className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
        )}
        <p className="text-xs text-gray-500">
          Copy this link to access your habits from another device or browser.
        </p>

        {!showSessionInput ? (
          <button
            onClick={() => setShowSessionInput(true)}
            className="flex items-center gap-2 text-xs text-lavender hover:text-lavender/80 transition"
          >
            <ArrowPathIcon className="h-3.5 w-3.5" />
            Recover different session
          </button>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              value={sessionInput}
              onChange={(e) => setSessionInput(e.target.value)}
              placeholder="Paste session ID..."
              className="w-full text-xs bg-panel border border-gray-700 px-3 py-2 rounded-lg"
            />
            <div className="flex gap-2">
              <button
                onClick={handleRecoverSession}
                disabled={!sessionInput.trim()}
                className="flex-1 text-xs bg-lavender text-white py-2 rounded-lg hover:bg-lavender/80 disabled:opacity-50 transition"
              >
                Switch Session
              </button>
              <button
                onClick={() => { setShowSessionInput(false); setSessionInput(''); }}
                className="text-xs text-gray-400 px-3 py-2 hover:text-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {sessionUpdated && (
          <p className="text-xs text-success">Switching to new session...</p>
        )}
      </div>

      <div className="space-y-3 pt-2 border-t border-gray-700">
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
