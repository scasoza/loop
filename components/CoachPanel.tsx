import { SparklesIcon } from '@heroicons/react/24/solid';

export function CoachPanel() {
  return (
    <div className="glow-card p-6 text-center space-y-4">
      <div className="mx-auto h-16 w-16 rounded-full bg-panel grid place-items-center">
        <SparklesIcon className="h-8 w-8 text-accent" />
      </div>
      <h3 className="text-xl font-bold">Coach Rhythm</h3>
      <p className="text-sm text-gray-300">Neural performance optimization</p>
      <button className="w-full bg-accent text-black font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
        <SparklesIcon className="h-5 w-5" />
        Analyze my rhythm
      </button>
      <p className="text-xs text-gray-400">Future hook for AI suggestions. Connects to Supabase history.</p>
    </div>
  );
}
