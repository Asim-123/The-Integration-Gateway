import { NavLink, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import JobDetail from './pages/JobDetail';
import Playground from './pages/Playground';
import WebhookInbox from './pages/WebhookInbox';

const navItems = [
  { to: '/', label: 'Jobs', end: true },
  { to: '/playground', label: 'Playground', end: false },
  { to: '/webhook-inbox', label: 'Webhooks', end: false },
];

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-white">Integration Gateway</h1>
              <p className="text-xs text-zinc-500">Developer Console</p>
            </div>
          </div>

          <nav className="flex items-center gap-1 rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="/webhook-inbox" element={<WebhookInbox />} />
        </Routes>
      </main>

      <footer className="border-t border-zinc-800/60 py-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 text-xs text-zinc-600">
          <span>Partner integration API · v1</span>
          <span className="font-mono">localhost:3000</span>
        </div>
      </footer>
    </div>
  );
}
