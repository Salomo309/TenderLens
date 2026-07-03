'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

const TIER_ORDER = ['FREE_TRIAL', 'STARTER', 'PRO', 'ENTERPRISE'];

interface Plan {
  label: string;
  price: number;
  features: string[];
  maxKeywords: number;
  maxSavedTenders: number;
  maxAiSummariesPerMonth: number;
  notificationDelayMinutes: number;
  telegramGroupAllowed: boolean;
  competitorHistory: boolean;
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [allPlans, setAllPlans] = useState<Record<string, Plan>>({});
  const [loading, setLoading] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [selectedTier, setSelectedTier] = useState('PRO');
  const [selectedPayment, setSelectedPayment] = useState('');
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState('');

  const paymentMethods = [
    { value: '', label: 'Semua Metode', icon: '💳' },
    { value: 'bni', label: 'BNI Virtual Account', icon: '🏦' },
    { value: 'mandiri', label: 'Mandiri Bill Payment', icon: '🏦' },
    { value: 'cimb', label: 'CIMB Virtual Account', icon: '🏦' },
    { value: 'gopay', label: 'GoPay', icon: '📱' },
    { value: 'qris', label: 'QRIS', icon: '📱' },
  ];

  useEffect(() => {
    const midtransScriptUrl = 'https://app.sandbox.midtrans.com/snap/snap.js';
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || 'Mid-client-gq97DEqLomjtxj5G';

    let script = document.querySelector(`script[src="${midtransScriptUrl}"]`) as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.src = midtransScriptUrl;
      script.setAttribute('data-client-key', clientKey);
      document.body.appendChild(script);
    }

    apiFetch('/billing/subscription')
      .then((res: any) => {
        setSubscription(res.subscription);
        setInvoices(res.invoices || []);
        setPlan(res.plan);
        setAllPlans(res.allPlans || {});
      })
      .catch(() => setUpgradeMsg('Gagal memuat data langganan. Pastikan server backend berjalan.'))
      .finally(() => setLoading(false));
  }, []);

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      const res = await apiFetch<any>('/billing/upgrade', {
        method: 'POST',
        body: JSON.stringify({ tier: selectedTier, paymentMethod: selectedPayment || undefined }),
      });
      setShowUpgrade(false);

      if (res.snapToken) {
        if (res.snapToken.startsWith('mock-')) {
          setUpgradeMsg('Mode pengembangan: mensimulasikan pembayaran berhasil...');
          await apiFetch('/billing/webhook', {
            method: 'POST',
            body: JSON.stringify({
              order_id: res.invoice?.midtransOrderId,
              transaction_status: 'settlement',
              status_code: '200',
              gross_amount: String(allPlans[selectedTier]?.price || 0),
              signature_key: 'mock',
              transaction_time: new Date().toISOString(),
              transaction_id: 'mock-trx-' + Date.now(),
              status_message: 'Mock settlement',
              payment_type: 'mock',
            }),
          });
          setUpgradeMsg(`Pembayaran berhasil! Lisensi ${allPlans[selectedTier]?.label} Anda sudah aktif.`);
          const sub = await apiFetch('/billing/subscription');
          setSubscription(sub.subscription);
          setInvoices(sub.invoices || []);
          setPlan(sub.plan);
          return;
        }
        if ((window as any).snap) {
          const invoiceId = res.invoice?.midtransOrderId;
          (window as any).snap.pay(res.snapToken, {
            onSuccess: async () => {
              setUpgradeMsg('Pembayaran berhasil! Sistem sedang memproses lisensi Anda...');
              // Sandbox: trigger webhook manually since Midtrans can't reach localhost
              if (invoiceId) {
                try {
                  await apiFetch('/billing/webhook', {
                    method: 'POST',
                    body: JSON.stringify({
                      order_id: invoiceId,
                      transaction_status: 'settlement',
                      status_code: '200',
                      gross_amount: String(allPlans[selectedTier]?.price || 0),
                      signature_key: 'sandbox-skip',
                      transaction_time: new Date().toISOString(),
                      transaction_id: 'sandbox-' + Date.now(),
                      status_message: 'Settlement',
                      payment_type: selectedPayment || 'bank_transfer',
                    }),
                  });
                } catch {}
              }
              // Tunggu webhook selesai, baru refresh data
              await new Promise((r) => setTimeout(r, 500));
              const fresh = await apiFetch<any>('/billing/subscription');
              setSubscription(fresh.subscription);
              setInvoices(fresh.invoices || []);
              setPlan(fresh.plan);
              setUpgradeMsg(`Pembayaran berhasil! Lisensi ${allPlans[selectedTier]?.label} Anda sudah aktif.`);
            },
            onPending: () => setUpgradeMsg('Pembayaran pending. Silakan selesaikan pembayaran Anda.'),
            onError: () => setUpgradeMsg('Pembayaran gagal. Silakan coba kembali.'),
            onClose: () => setUpgradeMsg('Checkout dibatalkan.'),
          });
        } else {
          setUpgradeMsg('Midtrans Snap SDK gagal dimuat. Token: ' + res.snapToken);
        }
      } else {
        setUpgradeMsg(res.message || 'Berhasil.');
        // Refresh data
        const sub = await apiFetch('/billing/subscription');
        setSubscription(sub.subscription);
        setInvoices(sub.invoices || []);
        setPlan(sub.plan);
      }
    } catch (err: any) {
      setUpgradeMsg(err.message || 'Gagal memulai proses checkout.');
    }
    setUpgrading(false);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <span className="h-6 w-6 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const currentTier = subscription?.tier || 'FREE_TRIAL';
  const status = subscription?.status || 'ACTIVE';
  const expiresAt = subscription?.expiresAt ? new Date(subscription.expiresAt) : null;
  const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  // Determine which tiers are upgrades from current
  const currentIdx = TIER_ORDER.indexOf(currentTier);
  const upgradeTiers = TIER_ORDER.filter((t, i) => i > currentIdx && allPlans[t] && t !== 'FREE_TRIAL');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight gradient-text">Billing Portal</h1>
        <p className="text-muted-foreground text-sm">Kelola langganan, lihat riwayat pembayaran, dan tingkatkan paket lisensi Anda.</p>
      </div>

      {upgradeMsg && (
        <div className="p-4 rounded-xl border border-emerald-800 bg-emerald-950/50 text-xs text-emerald-300">
          {upgradeMsg}
        </div>
      )}

      {invoices.some((inv: any) => inv.status === 'PENDING') && (
        <div className="p-3 rounded-xl border border-amber-800 bg-amber-950/60 text-xs text-amber-300 flex items-center gap-2">
          <span>⏳</span>
          <span>Anda memiliki invoice <strong>PENDING</strong>. Invoice ini akan otomatis <strong>KADALUARSA</strong> saat Anda memulai upgrade baru.</span>
        </div>
      )}

      {/* Current Plan Card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Paket Saat Ini</span>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-foreground">{plan?.label || currentTier} LICENSE</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  status === 'ACTIVE' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}>
                  {status === 'ACTIVE' ? 'Aktif' : status}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-foreground font-mono">
                {plan?.price ? formatCurrency(plan.price) : 'Rp 0'}
              </div>
              <div className="text-[10px] text-muted-foreground">{currentTier === 'FREE_TRIAL' ? 'Free Trial' : 'per bulan'}</div>
            </div>
          </div>

          {daysLeft !== null && (
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>Sisa masa aktif: {daysLeft} hari</span>
                <span>Berakhir: {expiresAt?.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
              <div className="w-full h-1.5 bg-maroon-darker rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all" style={{ width: `${Math.max(5, Math.min(100, daysLeft > 0 ? (daysLeft / 90) * 100 : 0))}%` }} />
              </div>
            </div>
          )}

          {plan?.features && (
            <div className="space-y-2 mb-6">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Fitur Termasuk:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {plan.features.map((f: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-foreground">
                    <span className="text-emerald-400">✓</span>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {upgradeTiers.length > 0 && (
              <button
                onClick={() => { setSelectedTier(upgradeTiers[0]); setSelectedPayment(''); setShowUpgrade(true); }}
                className="px-5 py-2 bg-maroon hover:bg-maroon-dark text-white text-xs font-semibold rounded-lg transition-colors">
                Tingkatkan Lisensi
              </button>
            )}
            <button className="px-5 py-2 bg-maroon-darker hover:bg-maroon-dark border border-border text-white text-xs font-semibold rounded-lg transition-colors">
              Perbarui Pembayaran
            </button>
          </div>
        </div>
      </div>

      {/* All Plans Comparison */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border bg-maroon-darker/30">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Bandingkan Paket</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6">
          {TIER_ORDER.filter(t => allPlans[t]).map((tierKey) => {
            const p = allPlans[tierKey];
            const isCurrent = tierKey === currentTier;
            const isEnterprise = tierKey === 'ENTERPRISE';
            return (
              <div key={tierKey} className={`p-5 rounded-xl border flex flex-col justify-between space-y-4 ${
                isCurrent ? 'border-white/30 bg-[#0e0e11]' : 'border-border bg-card/50'
              }`}>
                <div className="space-y-3">
                  <span className={`text-[10px] font-semibold uppercase tracking-widest block ${isCurrent ? 'text-white' : 'text-muted-foreground'}`}>
                    {p.label} {isCurrent && '(Aktif)'}
                  </span>
                  <div className={`text-2xl font-extrabold ${isCurrent ? 'text-white' : 'text-foreground'}`}>
                    {formatCurrency(p.price)} <span className={`text-[10px] font-normal ${isCurrent ? 'text-white/50' : 'text-muted-foreground'}`}>/ bln</span>
                  </div>
                  <ul className={`space-y-1.5 text-xs ${isCurrent ? 'text-white/80' : 'text-foreground'} pt-1`}>
                    <li>✓ {p.maxKeywords >= 9999 ? 'Unlimited' : p.maxKeywords} kata kunci</li>
                    <li>✓ {p.maxSavedTenders >= 9999 ? 'Unlimited' : p.maxSavedTenders} tender tersimpan</li>
                    <li>✓ {p.maxAiSummariesPerMonth >= 9999 ? 'Unlimited' : p.maxAiSummariesPerMonth} AI Summary / bln</li>
                    <li>✓ {p.notificationDelayMinutes > 0 ? `Delay ${p.notificationDelayMinutes} menit` : 'Notifikasi real-time'}</li>
                    <li>✓ {p.telegramGroupAllowed ? 'Grup Telegram' : 'Personal Telegram'}</li>
                    <li>✓ {p.competitorHistory ? 'Histori kompetitor' : '-'}</li>
                  </ul>
                </div>
                {!isCurrent && !isEnterprise && (
                  <button
                    onClick={() => { setSelectedTier(tierKey); setSelectedPayment(''); setShowUpgrade(true); }}
                    className="w-full px-4 py-1.5 bg-maroon-darker hover:bg-maroon-dark border border-border rounded text-xs font-semibold text-white transition-colors"
                  >
                    Pilih {p.label}
                  </button>
                )}
                {isEnterprise && !isCurrent && (
                  <button className="w-full px-4 py-1.5 bg-maroon-darker hover:bg-maroon-dark border border-border rounded text-xs font-semibold text-white transition-colors">
                    Hubungi Tim
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoice History */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border bg-maroon-darker/30">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Riwayat Pembayaran</h3>
        </div>
        {invoices.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Belum ada invoice.</div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground uppercase font-semibold">
                <th className="p-4">Invoice</th>
                <th className="p-4">Jumlah</th>
                <th className="p-4">Status</th>
                <th className="p-4">Tanggal Bayar</th>
                <th className="p-4 text-right">Midtrans ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 text-xs text-foreground">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-maroon-darker/30">
                  <td className="p-4 font-mono font-medium text-foreground">{inv.id}</td>
                  <td className="p-4 font-mono">{formatCurrency(Number(inv.amount))}</td>
                  <td className="p-4">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                      inv.status === 'PAID' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                      inv.status === 'PENDING' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                      'bg-red-950 text-red-300 border border-red-800'
                    }`}>{inv.status}</span>
                  </td>
                  <td className="p-4 font-mono text-muted-foreground">
                    {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                  </td>
                  <td className="p-4 text-right font-mono text-[10px] text-muted-foreground">{inv.midtransOrderId || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Upgrade Modal */}
      {showUpgrade && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Konfirmasi Upgrade</h3>
              <button onClick={() => setShowUpgrade(false)} className="text-muted-foreground hover:text-foreground text-lg font-bold">✕</button>
            </div>
            <p className="text-xs text-muted-foreground">
              Anda akan meningkatkan ke <strong className="text-foreground">{allPlans[selectedTier]?.label}</strong> sebesar
              {' '}<strong className="text-foreground font-mono">{formatCurrency(allPlans[selectedTier]?.price || 0)}/bulan</strong>.
            </p>
            <p className="text-xs text-amber-400/80 bg-amber-950/30 border border-amber-800/40 rounded-lg p-3">
              Jika Anda menutup popup pembayaran, invoice akan tersimpan sebagai <strong>PENDING</strong>.
              Saat membuka upgrade baru, invoice PENDING sebelumnya akan otomatis <strong>KADALUARSA</strong>.
            </p>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">Metode Pembayaran</label>
              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.map((pm) => (
                  <button
                    key={pm.value}
                    type="button"
                    onClick={() => setSelectedPayment(pm.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      selectedPayment === pm.value
                        ? 'border-white bg-maroon-darker text-white'
                        : 'border-border bg-input text-muted-foreground hover:border-ring'
                    }`}
                  >
                    <span>{pm.icon}</span>
                    <span>{pm.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                className="flex-1 px-4 py-2 bg-maroon hover:bg-maroon-dark text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {upgrading ? <span className="h-4 w-4 border-2 border-border border-t-transparent rounded-full animate-spin" /> : 'Lanjutkan Pembayaran'}
              </button>
              <button onClick={() => { setShowUpgrade(false); setSelectedPayment(''); }} className="flex-1 px-4 py-2 bg-maroon-darker hover:bg-maroon-dark border border-border text-white text-xs font-semibold rounded-lg transition-colors">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
