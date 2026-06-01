import { useState } from 'react';
import TodayPage from './pages/TodayPage';
import ChatPage from './pages/ChatPage';
import StatsPage from './pages/StatsPage';
import ProfilePage from './pages/ProfilePage';

type Tab = 'today' | 'chat' | 'stats' | 'profile';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'today', label: 'Heute', icon: '🍽️' },
  { id: 'chat', label: 'KI-Chat', icon: '💬' },
  { id: 'stats', label: 'Auswertung', icon: '📊' },
  { id: 'profile', label: 'Profil', icon: '⚙️' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('today');

  return (
    <div className="app">
      <main className="content">
        {tab === 'today' && <TodayPage goToChat={() => setTab('chat')} />}
        {tab === 'chat' && <ChatPage goToProfile={() => setTab('profile')} />}
        {tab === 'stats' && <StatsPage />}
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
    </div>
  );
}
