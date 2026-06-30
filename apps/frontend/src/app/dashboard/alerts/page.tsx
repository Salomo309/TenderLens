'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [channelOptions, setChannelOptions] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [channels, setChannels] = useState<string[]>(['EMAIL']);
  const [submitting, setSubmitting] = useState(false);
  const [connectedTelegram, setConnectedTelegram] = useState<string | null>(null);
  const [telegramConnected, setTelegramConnected] = useState(false);

  useEffect(() => {
    apiFetch<any[]>('/alerts/channels')
      .then(setChannelOptions)
      .catch(() => setChannelOptions([
        { value: 'EMAIL', label: 'Email' },
        { value: 'TELEGRAM', label: 'Telegram' },
      ]));
    // Fetch connected Telegram account
    apiFetch<any>('/telegram/bot-info')
      .then((res: any) => {
        setTelegramConnected(res.connected);
        setConnectedTelegram(res.telegramChatId);
        if (res.connected) {
          setTelegramChatId(res.telegramChatId);
        }
      })
      .catch(() => {});
  }, []);

  const fetchAlerts = useCallback(async () => {
    setError('');
    try {
      const data = await apiFetch<any[]>('/alerts');
      setAlerts(data);
    } catch (e: any) { setError(e.message || 'Gagal memuat data alert.'); setAlerts([]) }
    finally { setLoading(false) }
  }, []);

  useEffect(() => { fetchAlerts() }, [fetchAlerts]);

  const handleChannelToggle = (ch: string) => {
    setChannels((prev) => prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]);
  };

  const handleAddAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword) return;
    setSubmitting(true);
    setError('');
    try {
      await apiFetch('/alerts', {
        method: 'POST',
        body: JSON.stringify({
          keyword,
          channels,
          telegramChatId: channels.includes('TELEGRAM') ? telegramChatId : undefined,
          emailAddress: channels.includes('EMAIL') ? emailAddress : undefined,
        }),
      });
      setKeyword('');
      setTelegramChatId('');
      setEmailAddress('');
      setChannels(['EMAIL']);
      fetchAlerts();
    } catch (e: any) { setError(e.message || 'Gagal membuat alert.') }
    setSubmitting(false);
  };

  const handleDeleteAlert = async (id: string) => {
    try {
      await apiFetch(`/alerts/${id}`, { method: 'DELETE' });
      fetchAlerts();
    } catch (e: any) {
      setError(e.message || 'Gagal menghapus alert.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-white gradient-text">Pemberitahuan Kata Kunci</h1>
        <p className="text-neutral-400 text-sm">Dapatkan notifikasi instan melalui Telegram dan Email saat tender LPSE baru cocok dengan kata kunci Anda.</p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-950 border border-red-800 text-xs text-red-300">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleAddAlert} className="p-6 rounded-xl border border-neutral-800 bg-[#0c0c0e] space-y-4 h-fit">
          <h3 className="text-sm font-semibold text-white">Buat Pemantauan Baru</h3>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Kata Kunci (Keyword)</label>
            <input type="text" placeholder="Contoh: Cisco, Kubernetes, Asphalt" value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full bg-[#121214] border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-neutral-700" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Saluran Notifikasi</label>
            <div className="flex gap-4">
              {channelOptions.map((ch) => (
                <label key={ch.value} className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                  <input type="checkbox" checked={channels.includes(ch.value)} onChange={() => handleChannelToggle(ch.value)} className="rounded accent-white" />
                  {ch.label}
                </label>
              ))}
            </div>
          </div>
          {channels.includes('EMAIL') && (
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">Alamat Email Pengiriman</label>
              <input type="email" placeholder="ops@perusahaan.co.id" value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                className="w-full bg-[#121214] border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-neutral-700" required />
            </div>
          )}
          {channels.includes('TELEGRAM') && (
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">Chat ID Telegram</label>
              <input type="text" placeholder="@username_atau_chat_id" value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                className="w-full bg-[#121214] border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-neutral-700" required />
              {telegramConnected && connectedTelegram === telegramChatId && (
                <p className="text-[10px] text-emerald-500 mt-1">Terhubung ke akun Telegram Anda</p>
              )}
              {!telegramConnected && (
                <a href="/dashboard/telegram" className="text-[10px] text-neutral-500 hover:text-white mt-1 inline-block">
                  Belum punya Chat ID? Hubungkan Telegram dulu →
                </a>
              )}
            </div>
          )}
          <button type="submit" disabled={submitting}
            className="w-full bg-white hover:bg-neutral-200 text-neutral-900 font-semibold py-2 text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting ? <span className="h-4 w-4 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" /> : 'Aktifkan Alarm Pemantau'}
          </button>
        </form>

        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-neutral-800 bg-[#0c0c0e] overflow-hidden">
            <div className="p-4 border-b border-neutral-800 bg-neutral-900/20">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Keyword Aktif Terdaftar</h3>
            </div>
            {loading ? (
              <div className="p-12 text-center text-neutral-500">
                <div className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
                  Memuat data alert...
                </div>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-neutral-800 text-xs text-neutral-500 uppercase tracking-wider font-semibold">
                    <th className="p-4">Kata Kunci</th>
                    <th className="p-4">Delivery Channel</th>
                    <th className="p-4">Tujuan Pengiriman</th>
                    <th className="p-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 text-xs text-neutral-300">
                  {alerts.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-neutral-500">Belum ada keyword terdaftar.</td></tr>
                  ) : (
                    alerts.map((alert) => (
                      <tr key={alert.id} className="hover:bg-neutral-900/10">
                        <td className="p-4 font-medium text-neutral-200">{alert.keyword}</td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            {alert.channels?.map((ch: string) => (
                              <span key={ch} className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[10px] font-mono">{ch}</span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 font-mono text-[10px] text-neutral-400">
                          {alert.emailAddress && <div>✉️ {alert.emailAddress}</div>}
                          {alert.telegramChatId && <div>✈️ {alert.telegramChatId}</div>}
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => handleDeleteAlert(alert.id)}
                            className="text-red-500 hover:text-red-400 transition-colors text-xs">Matikan</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
