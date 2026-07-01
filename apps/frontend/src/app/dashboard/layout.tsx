'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSelectedLayoutSegment } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

const navItems = [
  { href: '/dashboard', segment: null, label: '📊 Dashboard' },
  { href: '/dashboard/tenders', segment: 'tenders', label: '💼 LPSE Tenders' },
  { href: '/dashboard/alerts', segment: 'alerts', label: '🔔 Keyword Alerts' },
  { href: '/dashboard/telegram', segment: 'telegram', label: '✈️ Telegram' },
  { href: '/dashboard/scraper', segment: 'scraper', label: '📡 Scraper Health' },
  { href: '/dashboard/competitor', segment: 'competitor', label: '🏆 Kompetitor' },
  { href: '/dashboard/billing', segment: 'billing', label: '💳 Billing Portal' },
  { href: '/dashboard/settings', segment: 'settings', label: '⚙️ Settings' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const segment = useSelectedLayoutSegment();
  const { user, tenant, logout } = useAuth();
  const isSuperadmin = user?.role === 'SUPERADMIN';
  const [platformStatus, setPlatformStatus] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/dashboard/stats')
      .then((res: any) => {
        setPlatformStatus(res.platformStatus);
        setLastSync(res.lastSync);
      })
      .catch(() => setPlatformStatus('UNKNOWN'));
  }, []);

  const filteredNav = isSuperadmin
    ? [...navItems, { href: '/dashboard/admin', segment: 'admin', label: '🛡️ Admin Panel' }]
    : navItems;

  const getLinkClass = (item: typeof navItems[0]) => {
    const baseClass = "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors";
    const isActive = segment === item.segment;
    return isActive
      ? `${baseClass} bg-maroon-dark text-white border border-maroon`
      : `${baseClass} text-muted-foreground hover:text-white hover:bg-maroon-darker`;
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const initials = tenant?.name
    ?.split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'TL';

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex min-h-screen bg-background text-foreground antialiased selection:bg-accent selection:text-white">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={closeSidebar} />
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-card flex flex-col transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        {/* Brand header - fixed at top */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={closeSidebar}>
            <div className="h-8 w-8 rounded-lg bg-maroon flex items-center justify-center font-bold text-white">
              TL
            </div>
            <span className="text-lg font-bold tracking-tight text-white">TenderLens</span>
          </Link>
          <button onClick={closeSidebar} className="lg:hidden text-muted-foreground hover:text-white text-lg">✕</button>
        </div>

        {/* Nav links - scrollable area */}
        <nav className="flex-1 overflow-y-auto min-h-0 px-6 space-y-1">
          {filteredNav.map((item) => (
            <Link key={item.href} href={item.href} className={getLinkClass(item)} onClick={closeSidebar}>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User Context & Multi-tenant profile toggle - fixed at bottom */}
        <div className="border-t border-border px-6 pt-4 pb-6 flex flex-col gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-maroon-dark flex items-center justify-center text-xs font-semibold text-white">
              {initials}
            </div>
            <div className="truncate">
              <div className="text-xs font-medium text-white truncate">{tenant?.name || 'Loading...'}</div>
              <div className="text-[10px] text-muted-foreground truncate">{user?.email || ''}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="text-center text-xs py-1.5 rounded-md border border-border hover:bg-maroon-darker transition-colors text-muted-foreground hover:text-white"
          >
            Keluar (Logout)
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <main className="flex-1 flex flex-col bg-background min-w-0 lg:pl-64">
        {/* Top Navbar */}
        <header className="h-14 border-b border-border px-4 lg:px-8 flex items-center justify-between bg-background/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground hover:text-white text-lg">
              ☰
            </button>
            <div className="text-xs text-muted-foreground font-mono">
              Platform Status: <span className={`${platformStatus === 'OPERATIONAL' ? 'text-emerald-500' : 'text-amber-500'}`}>{platformStatus}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground truncate max-w-[200px]">{lastSync ? `Last sync: ${new Date(lastSync).toLocaleString('id-ID')}` : 'Sync: unknown'}</span>
          </div>
        </header>

        {/* Children Render */}
        <div className="p-4 lg:p-8 flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
