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
  { href: '/dashboard/scraper', segment: 'scraper', label: '📡 Scraper Health' },
  { href: '/dashboard/billing', segment: 'billing', label: '💳 Billing Portal' },
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
    ? [...navItems, { href: '/dashboard/admin', segment: 'admin', label: '⚙️ Admin Panel' }]
    : navItems;

  const getLinkClass = (item: typeof navItems[0]) => {
    const baseClass = "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors";
    const isActive = segment === item.segment;
    return isActive
      ? `${baseClass} bg-neutral-900 text-white border border-neutral-800`
      : `${baseClass} text-neutral-400 hover:text-white hover:bg-neutral-900/50`;
  };

  const initials = tenant?.name
    ?.split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'TL';

  return (
    <div className="flex min-h-screen bg-[#09090b] text-neutral-100 antialiased selection:bg-neutral-800 selection:text-white">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-neutral-800 bg-[#0c0c0e] p-6 flex flex-col justify-between">
        <div>
          {/* Brand header */}
          <div className="flex items-center gap-3 mb-8">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center font-bold text-[#09090b]">
                TL
              </div>
              <span className="text-lg font-bold tracking-tight text-white">TenderLens</span>
            </Link>
          </div>

          {/* Nav links */}
          <nav className="space-y-1">
            {filteredNav.map((item) => (
              <Link key={item.href} href={item.href} className={getLinkClass(item)}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* User Context & Multi-tenant profile toggle */}
        <div className="border-t border-neutral-800 pt-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-semibold text-neutral-300">
              {initials}
            </div>
            <div className="truncate">
              <div className="text-xs font-medium text-white truncate">{tenant?.name || 'Loading...'}</div>
              <div className="text-[10px] text-neutral-500 truncate">{user?.email || ''}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="text-center text-xs py-1.5 rounded-md border border-neutral-800 hover:bg-neutral-900 transition-colors text-neutral-400 hover:text-white"
          >
            Keluar (Logout)
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <main className="flex-1 flex flex-col bg-[#09090b]">
        {/* Top Navbar */}
        <header className="h-14 border-b border-neutral-800 px-8 flex items-center justify-between bg-[#09090b]/80 backdrop-blur-md">
          <div className="text-xs text-neutral-500 font-mono">
            Platform Status: <span className={`${platformStatus === 'OPERATIONAL' ? 'text-emerald-500' : 'text-amber-500'}`}>{platformStatus}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-neutral-400">{lastSync ? `Last sync: ${new Date(lastSync).toLocaleString('id-ID')}` : 'Sync: unknown'}</span>
          </div>
        </header>

        {/* Children Render */}
        <div className="p-8 flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
