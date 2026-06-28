'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [tab, setTab] = useState<'stats' | 'tenants' | 'users'>('stats');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && user.role !== 'SUPERADMIN') {
      router.replace('/dashboard');
      return;
    }

    Promise.all([
      apiFetch('/admin/stats').catch(() => null),
      apiFetch('/admin/tenants').catch(() => null),
      apiFetch('/admin/users').catch(() => null),
    ]).then(([s, t, u]) => {
      setStats(s);
      setTenants(t || []);
      setUsers(u || []);
      if (!s || !t) setError('Gagal memuat beberapa data admin.');
    }).catch((e) => setError(e.message))
    .finally(() => setLoading(false));
  }, [user, router]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <span className="h-6 w-6 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin"></span>
    </div>
  );

  if (error) return (
    <div className="p-4 rounded-lg bg-red-950 border border-red-800 text-xs text-red-300">
      {error}
    </div>
  );

  const tabs = [
    { key: 'stats', label: 'Ringkasan' },
    { key: 'tenants', label: 'Tenants' },
    { key: 'users', label: 'Users' },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-white gradient-text">
          Admin Panel
        </h1>
        <p className="text-neutral-400 text-sm">
          Manajemen platform — lihat seluruh tenant, user, dan statistik sistem.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-[#0c0c0e] border border-neutral-800 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === t.key
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      {tab === 'stats' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Tenant', value: stats.totalTenants, icon: '🏢' },
            { label: 'Total User', value: stats.totalUsers, icon: '👤' },
            { label: 'Total Tender', value: stats.totalTenders, icon: '📋' },
            { label: 'Total Alert', value: stats.totalAlerts, icon: '🔔' },
          ].map((item) => (
            <div key={item.label} className="p-5 rounded-xl border border-neutral-800 bg-[#0c0c0e]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-neutral-500 font-medium uppercase tracking-wider">{item.label}</span>
                <span className="text-lg">{item.icon}</span>
              </div>
              <div className="text-2xl font-bold text-white font-mono">{item.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tenants Table */}
      {tab === 'tenants' && (
        <div className="rounded-xl border border-neutral-800 bg-[#0c0c0e] overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-neutral-800 text-xs text-neutral-500 uppercase font-semibold">
                <th className="p-4">Nama Tenant</th>
                <th className="p-4">Slug</th>
                <th className="p-4">Member</th>
                <th className="p-4">Tender Tersimpan</th>
                <th className="p-4">Alert</th>
                <th className="p-4">Langganan</th>
                <th className="p-4">Dibuat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 text-xs text-neutral-300">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-neutral-900/10">
                  <td className="p-4 font-medium text-neutral-200">{t.name}</td>
                  <td className="p-4 font-mono text-neutral-400">{t.slug}</td>
                  <td className="p-4">{t._count?.members ?? '-'}</td>
                  <td className="p-4">{t._count?.tendersSaved ?? '-'}</td>
                  <td className="p-4">{t._count?.alerts ?? '-'}</td>
                  <td className="p-4">
                    {t.subscription ? (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px]">
                        {t.subscription.tier}
                      </span>
                    ) : (
                      <span className="text-neutral-600">-</span>
                    )}
                  </td>
                  <td className="p-4 text-neutral-500 font-mono">
                    {new Date(t.createdAt).toLocaleDateString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Users Table */}
      {tab === 'users' && (
        <div className="rounded-xl border border-neutral-800 bg-[#0c0c0e] overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-neutral-800 text-xs text-neutral-500 uppercase font-semibold">
                <th className="p-4">Nama</th>
                <th className="p-4">Email</th>
                <th className="p-4">Role</th>
                <th className="p-4">Tenant</th>
                <th className="p-4">Dibuat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 text-xs text-neutral-300">
              {users.map((u) => {
                const member = u.tenantMembers?.[0];
                return (
                  <tr key={u.id} className="hover:bg-neutral-900/10">
                    <td className="p-4 font-medium text-neutral-200">{u.name || '-'}</td>
                    <td className="p-4 font-mono text-neutral-400">{u.email}</td>
                    <td className="p-4">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                        member?.role === 'SUPERADMIN'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : member?.role === 'ADMIN'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : 'bg-neutral-800 text-neutral-300'
                      }`}>
                        {member?.role || 'NONE'}
                      </span>
                    </td>
                    <td className="p-4">{member?.tenant?.name || '-'}</td>
                    <td className="p-4 text-neutral-500 font-mono">
                      {new Date(u.createdAt).toLocaleDateString('id-ID')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
