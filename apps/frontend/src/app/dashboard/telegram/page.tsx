'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

export default function TelegramPage() {
  const [botUsername, setBotUsername] = useState('TenderLensBot');
  const [connected, setConnected] = useState(false);
  const [savedChatId, setSavedChatId] = useState('');
  const [connectedAt, setConnectedAt] = useState<string | null>(null);
  const [inputChatId, setInputChatId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    apiFetch('/telegram/bot-info')
      .then((res: any) => {
        setBotUsername(res.botUsername);
        setConnected(res.connected);
        setSavedChatId(res.telegramChatId || '');
        setConnectedAt(res.connectedAt);
        if (res.connected) setInputChatId(res.telegramChatId || '');
      })
      .catch(() => setMsg('Gagal memuat data koneksi Telegram.'))
      .finally(() => setLoading(false));
  }, []);

  const handleConnect = async () => {
    if (!inputChatId.trim()) {
      setMsgType('error');
      setMsg('Masukkan Chat ID atau @username Telegram Anda.');
      return;
    }

    setSaving(true);
    setMsg('');
    try {
      const res = await apiFetch<any>('/telegram/connect', {
        method: 'POST',
        body: JSON.stringify({ telegramChatId: inputChatId.trim() }),
      });
      if (res.success) {
        setConnected(true);
        setSavedChatId(res.telegramChatId);
        setConnectedAt(new Date().toISOString());
        setMsgType('success');
        setMsg(res.message);
      } else {
        setMsgType('error');
        setMsg(res.message);
      }
    } catch (err: any) {
      setMsgType('error');
      setMsg(err.message || 'Gagal menghubungkan Telegram.');
    }
    setSaving(false);
  };

  const handleDisconnect = async () => {
    if (!confirm('Putuskan koneksi Telegram?')) return;
    setSaving(true);
    try {
      const res = await apiFetch<any>('/telegram/disconnect', { method: 'DELETE' });
      if (res.success) {
        setConnected(false);
        setSavedChatId('');
        setConnectedAt(null);
        setInputChatId('');
        setMsgType('info');
        setMsg('Akun Telegram berhasil diputuskan.');
      }
    } catch (err: any) {
      setMsgType('error');
      setMsg(err.message || 'Gagal memutuskan koneksi.');
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <span className="h-6 w-6 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-white gradient-text">Telegram Settings</h1>
        <p className="text-neutral-400 text-sm">Hubungkan akun Telegram Anda untuk menerima notifikasi tender.</p>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl border text-xs ${
          msgType === 'success' ? 'border-emerald-800 bg-emerald-950/50 text-emerald-300' :
          msgType === 'error' ? 'border-red-800 bg-red-950/50 text-red-300' :
          'border-neutral-800 bg-neutral-900/50 text-neutral-300'
        }`}>
          {msg}
        </div>
      )}

      <div className="rounded-xl border border-neutral-800 bg-[#0c0c0e] overflow-hidden">
        <div className="p-6 space-y-6">
          {/* Connection status */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">Status Koneksi</span>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-neutral-600'}`} />
                <span className="text-sm font-medium text-white">
                  {connected ? 'Terhubung' : 'Belum Terhubung'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-neutral-400">Bot: @{botUsername}</div>
              {connectedAt && (
                <div className="text-[10px] text-neutral-500">
                  Sejak {new Date(connectedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              )}
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Langkah-langkah:</h4>
            <ol className="space-y-2 text-xs text-neutral-300 list-decimal list-inside">
              <li>Buka Telegram dan cari <strong className="text-white">@{botUsername}</strong></li>
              <li>Klik <strong className="text-white">Start</strong> atau kirim pesan <code className="px-1 py-0.5 bg-neutral-900 rounded text-[10px] font-mono">/start</code></li>
              <li>Bot akan membalas dengan <strong className="text-white">Chat ID</strong> Anda (angka, misal: <code className="px-1 py-0.5 bg-neutral-900 rounded text-[10px] font-mono">123456789</code>)</li>
              <li>Salin Chat ID tersebut dan tempel di kolom bawah, lalu klik <strong className="text-white">Hubungkan</strong></li>
            </ol>
          </div>

          {/* Input */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-neutral-400 block">
              {connected ? 'Chat ID / @username saat ini' : 'Chat ID / @username Telegram'}
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={inputChatId}
                onChange={(e) => setInputChatId(e.target.value)}
                placeholder="123456789 atau @username"
                className="flex-1 px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors"
              />
              {connected ? (
                <button
                  onClick={handleDisconnect}
                  disabled={saving}
                  className="px-4 py-2 bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? '...' : 'Putuskan'}
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={saving}
                  className="px-4 py-2 bg-white hover:bg-neutral-200 text-neutral-900 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? 'Mengirim...' : 'Hubungkan'}
                </button>
              )}
            </div>
            {connected && savedChatId && (
              <p className="text-[10px] text-emerald-500">
                Terhubung sebagai: <code className="font-mono">{savedChatId}</code>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="rounded-xl border border-neutral-800 bg-[#0c0c0e] p-5 space-y-3">
        <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">💡 Tips</h4>
        <ul className="space-y-1.5 text-xs text-neutral-400">
          <li>• Untuk grup Telegram, tambahkan bot ke grup dan kirim pesan apa saja, lalu lihat <code className="px-1 bg-neutral-900 rounded font-mono">/getGroupId</code> dari bot.</li>
          <li>• Notifikasi akan dikirim ke akun Telegram yang terhubung saat membuat alert.</li>
          <li>• Satu akun Telegram bisa digunakan untuk semua alert di tenant Anda.</li>
        </ul>
      </div>
    </div>
  );
}
