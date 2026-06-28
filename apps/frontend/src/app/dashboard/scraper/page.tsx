'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

export default function ScraperMonitorPage() {
  const [health, setHealth] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [triggering, setTriggering] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [h, l] = await Promise.all([
        apiFetch('/scraper-monitor/health'),
        apiFetch<any[]>('/scraper-monitor/logs'),
      ]);
      setHealth(h);
      setLogs(l);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const handleTriggerScrape = async () => {
    setTriggering(true);
    setActionMsg('');
    try {
      const res = await apiFetch('/scraper-monitor/scrape', { method: 'POST' });
      setActionMsg(res.message);
      await fetchData();
    } catch (e: any) {
      setActionMsg('Gagal memicu scraping: ' + e.message);
    }
    setTriggering(false);
  };

  const handleSeedData = async () => {
    setSeeding(true);
    setActionMsg('');
    try {
      const res = await apiFetch('/scraper-monitor/seed', { method: 'POST' });
      setActionMsg(res.message);
      await fetchData();
    } catch (e: any) {
      setActionMsg('Gagal menyemai data seed: ' + e.message);
    }
    setSeeding(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <span className="h-6 w-6 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="p-4 rounded-lg bg-red-950 border border-red-800 text-xs text-red-300">{error}</div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-white gradient-text">Scraper Monitor</h1>
        <p className="text-neutral-400 text-sm">Panel pemantauan status kesehatan, waktu aktif (uptime), dan catatan performa crawler LPSE.</p>
      </div>

      {actionMsg && (
        <div className="p-4 rounded-xl border border-neutral-800 bg-[#0c0c0e] text-xs text-neutral-300">
          {actionMsg}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleTriggerScrape}
          disabled={triggering}
          className="px-4 py-2 bg-white hover:bg-neutral-200 text-neutral-900 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {triggering ? <span className="h-4 w-4 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" /> : '📡 Scrape LPSE Sekarang'}
        </button>
        <button
          onClick={handleSeedData}
          disabled={seeding}
          className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {seeding ? <span className="h-4 w-4 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" /> : '🌱 Semai Data Mock (Seed)'}
        </button>
      </div>

      {health && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {health.crawlers?.map((crawler: any) => (
            <div key={crawler.crawlerName} className="p-5 rounded-xl border border-neutral-800 bg-[#0c0c0e] flex flex-col justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-neutral-500 font-mono">CRAWLER AGENT</span>
                <h3 className="text-sm font-bold text-white truncate">{crawler.crawlerName}</h3>
              </div>
              <div className="my-4 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono tracking-tight text-white">{crawler.uptime}%</span>
                <span className="text-xs text-neutral-400">Uptime</span>
              </div>
              <div className="border-t border-neutral-900 pt-3 space-y-1 text-[11px] text-neutral-500">
                <div className="flex items-center justify-between">
                  <span>Runs: {crawler.totalRuns}</span>
                  <span className={`font-semibold ${crawler.currentStatus === 'SUCCESS' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    ● {crawler.currentStatus}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Success: {crawler.successRuns}</span>
                  <span>Failed: {crawler.failedRuns}</span>
                </div>
                {crawler.lastActive && (
                  <div className="text-[10px] text-neutral-600">
                    Last active: {new Date(crawler.lastActive).toLocaleString('id-ID')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-neutral-800 bg-[#0c0c0e] overflow-hidden">
        <div className="p-4 border-b border-neutral-800 bg-neutral-900/20 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Scraper Execution Logs</h3>
          <button onClick={fetchData} className="text-xs text-neutral-400 hover:text-white transition-colors">↻ Refresh</button>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-neutral-800 text-xs text-neutral-500 uppercase font-semibold">
              <th className="p-4">Crawler</th>
              <th className="p-4">Status</th>
              <th className="p-4">Item Terserap</th>
              <th className="p-4">Tanggal Eksekusi</th>
              <th className="p-4">Catatan Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800 text-xs text-neutral-300">
            {logs.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-neutral-500">Belum ada log scraper.</td></tr>
            ) : (
              logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-neutral-900/10">
                  <td className="p-4 font-mono font-medium text-neutral-200">{log.crawlerName}</td>
                  <td className="p-4">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                      log.status === 'SUCCESS'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : log.status === 'PARTIAL_FAILURE'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-red-950 text-red-300 border border-red-800'
                    }`}>{log.status}</span>
                  </td>
                  <td className="p-4 font-mono font-semibold">{log.itemsCrawled} Tenders</td>
                  <td className="p-4 font-mono text-neutral-400">{new Date(log.startedAt).toLocaleString('id-ID')}</td>
                  <td className="p-4 max-w-xs truncate text-neutral-500 font-mono">{log.errorMessage || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
