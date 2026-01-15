import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  Protocol,
  HabitWithCompletion,
  Summary,
  FreezeInventory,
  fetchProtocol,
  fetchHabitsWithCompletions,
  getFreezeInventory,
  checkAndAutoApplyFreeze,
  computeSummary
} from './data';
import { getSessionId } from './session';

interface DataContextValue {
  // Data
  protocol: Protocol | null;
  habits: HabitWithCompletion[];
  summary: Summary;
  freezeInventory: FreezeInventory | null;
  sessionId: string | null;

  // State
  loading: boolean;
  error: string | null;

  // Actions
  refreshData: () => Promise<void>;
  refreshHabits: () => Promise<void>;
  setHabits: (habits: HabitWithCompletion[] | ((prev: HabitWithCompletion[]) => HabitWithCompletion[])) => void;
  setFreezeInventory: (inventory: FreezeInventory | null) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

const CACHE_KEY = 'loop-data-cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedData {
  protocol: Protocol | null;
  habits: HabitWithCompletion[];
  freezeInventory: FreezeInventory | null;
  timestamp: number;
  sessionId: string | null;
}

function loadCache(): CachedData | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const data = JSON.parse(cached) as CachedData;
    // Check if cache is still valid and for same session
    const currentSession = getSessionId();
    if (Date.now() - data.timestamp > CACHE_TTL || data.sessionId !== currentSession) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function saveCache(data: CachedData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [habits, setHabits] = useState<HabitWithCompletion[]>([]);
  const [freezeInventory, setFreezeInventory] = useState<FreezeInventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const summary = computeSummary(habits);

  const refreshHabits = useCallback(async () => {
    if (!protocol) return;
    const habitsData = await fetchHabitsWithCompletions(protocol.id);
    setHabits(habitsData);

    // Update cache
    const currentSession = getSessionId();
    saveCache({
      protocol,
      habits: habitsData,
      freezeInventory,
      timestamp: Date.now(),
      sessionId: currentSession
    });
  }, [protocol, freezeInventory]);

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const currentSession = getSessionId();
    setSessionId(currentSession);

    if (!currentSession) {
      setError('No session ID available');
      setLoading(false);
      return;
    }

    // Try to load from cache first for instant UI
    const cached = loadCache();
    if (cached) {
      setProtocol(cached.protocol);
      setHabits(cached.habits);
      setFreezeInventory(cached.freezeInventory);
      setLoading(false);
    }

    try {
      const proto = await fetchProtocol();
      if (!proto) {
        setError('Could not connect to database');
        setLoading(false);
        return;
      }
      setProtocol(proto);

      const [habitsData, inventory] = await Promise.all([
        fetchHabitsWithCompletions(proto.id),
        getFreezeInventory()
      ]);

      setHabits(habitsData);
      setFreezeInventory(inventory);

      // Check for auto-apply freeze
      const freezeResult = await checkAndAutoApplyFreeze();
      if (freezeResult.applied) {
        const updatedInventory = await getFreezeInventory();
        setFreezeInventory(updatedInventory);
      }

      // Save to cache
      saveCache({
        protocol: proto,
        habits: habitsData,
        freezeInventory: inventory,
        timestamp: Date.now(),
        sessionId: currentSession
      });

      setError(null);
    } catch (err) {
      setError('Failed to load data');
      console.error('Data load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return (
    <DataContext.Provider
      value={{
        protocol,
        habits,
        summary,
        freezeInventory,
        sessionId,
        loading,
        error,
        refreshData,
        refreshHabits,
        setHabits,
        setFreezeInventory
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
