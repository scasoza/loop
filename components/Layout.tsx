import { ReactNode, useState, useRef, useEffect } from 'react';
import { Bars3BottomLeftIcon, XMarkIcon, Cog6ToothIcon, CalendarIcon, SparklesIcon, ClipboardDocumentListIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import classNames from 'classnames';
import dayjs from 'dayjs';

const tabs = [
  { id: 'protocol', label: 'Protocol', icon: ClipboardDocumentListIcon },
  { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
  { id: 'system', label: 'System', icon: Cog6ToothIcon },
  { id: 'coach', label: 'Coach', icon: SparklesIcon }
] as const;

export type TabKey = (typeof tabs)[number]['id'];

interface Props {
  children: ReactNode;
  onTabChange?: (tab: TabKey) => void;
  currentTab: TabKey;
  theme?: 'light' | 'dark' | 'system';
  onThemeChange?: (theme: 'light' | 'dark' | 'system') => void;
}

export function Layout({ children, onTabChange, currentTab, theme = 'dark', onThemeChange }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Apply theme to document root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else if (theme === 'dark') {
      root.classList.remove('light');
    } else {
      // System preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.remove('light');
      } else {
        root.classList.add('light');
      }
    }
  }, [theme]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
    onThemeChange?.(next);
  };

  const handleNavClick = (tabId: TabKey) => {
    onTabChange?.(tabId);
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-gray-700/50 bg-surface/50 p-4">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-full bg-accent text-black grid place-items-center font-bold text-lg">Y</div>
          <div>
            <p className="font-semibold text-gray-200">Your Rhythm</p>
            <p className="text-xs text-gray-400">{dayjs().format('dddd, MMM D')}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className={classNames(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium transition-all',
                  {
                    'bg-accent text-black shadow-md': currentTab === tab.id,
                    'text-gray-300 hover:bg-panel hover:text-white': currentTab !== tab.id
                  }
                )}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-gray-700/50">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-300 hover:bg-panel hover:text-white transition"
          >
            {theme === 'light' ? (
              <SunIcon className="h-5 w-5" />
            ) : theme === 'dark' ? (
              <MoonIcon className="h-5 w-5" />
            ) : (
              <Cog6ToothIcon className="h-5 w-5" />
            )}
            Theme: {theme.charAt(0).toUpperCase() + theme.slice(1)}
          </button>
          <p className="px-4 py-2 text-xs text-gray-500">Your Rhythm v1.0</p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between px-4 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-accent text-black grid place-items-center font-bold text-lg">Y</div>
            <div>
              <p className="text-xs text-gray-400">Your Rhythm</p>
              <p className="text-sm font-semibold text-gray-200">{dayjs().format('ddd, MMM D')}</p>
            </div>
          </div>

          {/* Menu Button & Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="h-10 w-10 rounded-full bg-panel grid place-items-center hover:bg-panel/80 transition"
              aria-label="Menu"
            >
              {menuOpen ? (
                <XMarkIcon className="h-6 w-6 text-gray-300" />
              ) : (
                <Bars3BottomLeftIcon className="h-6 w-6 text-gray-300" />
              )}
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
              <div className="absolute right-0 top-12 w-48 bg-surface border border-gray-700 rounded-xl shadow-lg overflow-hidden z-50">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleNavClick(tab.id)}
                      className={classNames(
                        'w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition',
                        {
                          'bg-accent/20 text-accent': currentTab === tab.id,
                          'text-gray-300 hover:bg-panel hover:text-white': currentTab !== tab.id
                        }
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {tab.label}
                    </button>
                  );
                })}
                <div className="border-t border-gray-700">
                  <button
                    onClick={toggleTheme}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-gray-300 hover:bg-panel hover:text-white transition"
                  >
                    {theme === 'light' ? (
                      <SunIcon className="h-5 w-5" />
                    ) : theme === 'dark' ? (
                      <MoonIcon className="h-5 w-5" />
                    ) : (
                      <Cog6ToothIcon className="h-5 w-5" />
                    )}
                    Theme: {theme.charAt(0).toUpperCase() + theme.slice(1)}
                  </button>
                </div>
                <div className="border-t border-gray-700">
                  <div className="px-4 py-2 text-xs text-gray-500">
                    Your Rhythm v1.0
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:flex items-center justify-between px-8 py-6 border-b border-gray-700/30">
          <h1 className="text-2xl font-bold text-gray-100">
            {tabs.find(t => t.id === currentTab)?.label}
          </h1>
          <p className="text-sm text-gray-400">{dayjs().format('dddd, MMMM D, YYYY')}</p>
        </header>

        <main className="flex-1 px-4 pb-24 lg:px-8 lg:py-6 lg:pb-8 max-w-3xl w-full mx-auto">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-40">
          <div className="glow-card flex items-center justify-between px-2 py-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange?.(tab.id)}
                  className={classNames('flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition', {
                    'bg-accent text-black': currentTab === tab.id,
                    'text-gray-400 hover:text-white': currentTab !== tab.id
                  })}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
