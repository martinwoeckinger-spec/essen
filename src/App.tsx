import { useState } from 'react';
import TodayPage from './pages/TodayPage';
import ChatPage from './pages/ChatPage';
import StatsPage from './pages/StatsPage';
import ArchivePage from './pages/ArchivePage';
import ProfilePage from './pages/ProfilePage';
import ImportPanel from './pages/ImportPanel';
import { useStore } from './store/useStore';

type Tab = 'today' | 'stats' | 'archive' | 'chat' | 'profile';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'today', label: 'Heute', icon: '🍽️' },
  { id: 'stats', label: 'Analyse', icon: '📊' },
  { id: 'archive', label: 'Archiv', icon: '🗄️' },
  { id: 'chat', label: 'KI-Chat', icon: '💬' },
  { id: 'profile', label: 'Profil', icon: '⚙️' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('today');
  const importOpen = useStore((s) => s.importOpen);

  return (
    <div className="app">
      <main className="content">
        {tab === 'today' && <TodayPage goToChat={() => setTab('chat')} />}
        {tab === 'stats' && <StatsPage />}
        {tab === 'archive' && <ArchivePage goToToday={() => setTab('today')} />}
        {tab === 'chat' && <ChatPage goToProfile={() => setTab('profile')} />}
        {tab === 'profile' && <ProfilePage />}
      </main>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>

      {importOpen && <ImportPanel />}
    </div>
  );
}
