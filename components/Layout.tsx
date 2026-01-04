import { ReactNode, useState } from 'react';
import { Bars3BottomLeftIcon } from '@heroicons/react/24/outline';
import classNames from 'classnames';

const tabs = [
  { id: 'protocol', label: 'Protocol' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'system', label: 'System' },
  { id: 'coach', label: 'Coach' }
] as const;

export type TabKey = (typeof tabs)[number]['id'];

interface Props {
  children: ReactNode;
  onTabChange?: (tab: TabKey) => void;
  currentTab: TabKey;
}

export function Layout({ children, onTabChange, currentTab }: Props) {
  return (
    <div className="min-h-screen bg-midnight text-white flex flex-col max-w-xl mx-auto">
      <header className="flex items-center justify-between px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-accent text-black grid place-items-center font-semibold">Y</div>
          <div>
            <p className="text-xs text-gray-400">Your Rhythm</p>
            <p className="text-sm font-semibold">Sun, Jan 4</p>
          </div>
        </div>
        <Bars3BottomLeftIcon className="h-6 w-6 text-gray-300" />
      </header>
      <main className="flex-1 px-4 pb-20">{children}</main>
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-md px-4">
        <div className="glow-card flex items-center justify-between px-4 py-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              className={classNames('flex-1 text-center text-sm font-semibold transition py-2 rounded-full', {
                'bg-accent text-black': currentTab === tab.id,
                'text-gray-300 hover:text-white': currentTab !== tab.id
              })}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
