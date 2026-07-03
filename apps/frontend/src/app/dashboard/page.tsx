'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/dashboard/stats')
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <span className="h-6 w-6 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!stats) return (
    <div className="text-center py-20 text-muted-foreground text-sm">Gagal memuat data dashboard.</div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Dashboard Overview</h1>
        <p className="text-muted-foreground text-sm">Ringkasan aktivitas tender, pemantau kata kunci, dan kesehatan crawler LPSE.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Tender', value: stats.totalTenders.toLocaleString('id-ID'), sub: `+${stats.newToday} baru hari ini`, icon: '📋' },
          { label: 'Alert Terpantau', value: stats.activeAlerts, sub: `${stats.alertsTriggered} notifikasi terkirim`, icon: '🔔' },
          { label: 'Scraper Uptime', value: `${stats.scraperUptime}%`, sub: `${stats.activeCrawlers} crawler aktif`, icon: '📡' },
          { label: 'Status Platform', value: stats.platformStatus, sub: stats.lastSync ? `Last sync: ${new Date(stats.lastSync).toLocaleString('id-ID')}` : 'No sync data', icon: '⚡', green: stats.platformStatus === 'OPERATIONAL' },
        ].map((item) => (
          <div key={item.label} className="p-5 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{item.label}</span>
              <span className="text-lg">{item.icon}</span>
            </div>
            <div className={`text-2xl font-bold font-mono ${item.green ? 'text-emerald-500 flex items-center gap-2' : 'text-foreground'}`}>
              {item.green && <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />}
              {item.value}
            </div>
            <div className={`text-[11px] mt-1 ${item.green ? 'text-muted-foreground' : 'text-emerald-400'}`}>{item.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border bg-gradient-to-r from-teal-50 to-cyan-50 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Tender Terbaru</h3>
          </div>
          {stats.recentTenders?.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border text-[10px] text-muted-foreground uppercase font-semibold">
                  <th className="p-3">Instansi</th>
                  <th className="p-3">Judul</th>
                  <th className="p-3">Pagu</th>
                  <th className="p-3">Tahap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs text-foreground">
                {stats.recentTenders.map((t: any) => (
                  <tr key={t.id} className="hover:bg-teal-50">
                    <td className="p-3 text-muted-foreground max-w-[120px] truncate">{t.agency}</td>
                    <td className="p-3 font-medium text-foreground max-w-[200px] truncate">{t.title}</td>
                    <td className="p-3 font-mono text-foreground">{formatCurrency(Number(t.pagu))}</td>
                    <td className="p-3">
                      <span className="px-1.5 py-0.5 rounded bg-teal-100 text-[10px] font-mono text-teal-700">{t.stage}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-xs text-muted-foreground">Belum ada tender.</div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border bg-gradient-to-r from-sky-50 to-teal-50">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Aktivitas Keyword</h3>
          </div>
          {stats.keywordActivity?.length > 0 ? (
            <div className="divide-y divide-border">
              {stats.keywordActivity.map((k: any, i: number) => (
                <div key={i} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">{k.keyword}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{k.count} cocok</span>
                  </div>
                  <div className="flex gap-1.5">
                    {k.channels?.map((ch: string) => (
                      <span key={ch} className="px-1.5 py-0.5 rounded bg-teal-100 text-[9px] font-mono text-teal-700">{ch}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-muted-foreground">Belum ada aktivitas keyword.</div>
          )}
        </div>
      </div>
    </div>
  );
}
