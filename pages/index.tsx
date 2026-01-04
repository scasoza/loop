import { useMemo, useState } from 'react';
import { Layout, TabKey } from '../components/Layout';
import { ProtocolPanel } from '../components/ProtocolPanel';
import { SystemPanel } from '../components/SystemPanel';
import { CalendarPanel } from '../components/CalendarPanel';
import { CoachPanel } from '../components/CoachPanel';
import { Summary } from '../lib/data';

export default function Home() {
  const [tab, setTab] = useState<TabKey>('protocol');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [summary, setSummary] = useState<Summary>({
    habitCount: 0,
    totalReps: 0,
    commitmentScore: 0,
    totalCommitments: 0
  });

  const content = useMemo(() => {
    switch (tab) {
      case 'system':
        return <SystemPanel theme={theme} />;
      case 'calendar':
        return <CalendarPanel summary={summary} />;
      case 'coach':
        return <CoachPanel />;
      case 'protocol':
      default:
        return <ProtocolPanel onThemeChange={setTheme} onSummary={setSummary} />;
    }
  }, [tab, theme, summary]);

  return (
    <Layout currentTab={tab} onTabChange={setTab}>
      {content}
    </Layout>
  );
}
