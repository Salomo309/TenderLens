'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

function TendersPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [tenders, setTenders] = useState<any[]>([]);
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'ALL');
  const [minPagu, setMinPagu] = useState(searchParams.get('minPagu') || '');
  const [tab, setTab] = useState<'all' | 'saved'>(searchParams.get('tab') as 'all' | 'saved' || 'all');
  const [selectedTender, setSelectedTender] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryMap, setSummaryMap] = useState<Record<string, any>>({});
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    apiFetch<any[]>('/tenders/categories')
      .then((data) => setCategories([{ value: 'ALL', label: 'Semua Kategori' }, ...data]))
      .catch((e) => setError('Gagal memuat kategori: ' + (e.message || 'Unknown')));
  }, []);

  useEffect(() => {
    apiFetch<any[]>('/tenders/saved')
      .then((data) => setSavedIds(new Set(data.map((s: any) => s.tenderId || s.tender?.id))))
      .catch(() => {});
  }, []);

  const updateUrl = useCallback((params: Record<string, string>) => {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([k, v]) => {
      if (v && v !== 'ALL' && v !== '1') sp.set(k, v);
      else sp.delete(k);
    });
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const fetchTenders = useCallback(async (pageNum: number, append: boolean) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(pageNum));
      if (search) params.set('search', search);
      if (category !== 'ALL') params.set('category', category);
      if (minPagu) params.set('minPagu', minPagu);
      const res = await apiFetch<{ data: any[]; meta: any }>(`/tenders?${params}`);
      if (append) {
        setTenders((prev) => [...prev, ...res.data]);
      } else {
        setTenders(res.data);
      }
      setTotalPages(res.meta.totalPages);
      setPage(pageNum);
    } catch (e: any) {
      setError(e.message || 'Gagal memuat data tender.');
      if (!append) setTenders([]);
    }
    finally { setLoading(false); setLoadingMore(false) }
  }, [search, category, minPagu]);

  const fetchSaved = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<any[]>('/tenders/saved');
      setTenders(res.map((s: any) => ({ ...s.tender, savedByTenants: [s] })));
      setPage(1);
      setTotalPages(1);
    } catch (e: any) {
      setError(e.message || 'Gagal memuat tender tersimpan.');
      setTenders([]);
    }
    finally { setLoading(false) }
  }, []);

  useEffect(() => {
    updateUrl({ search, category, minPagu, tab });
    if (tab === 'saved') fetchSaved();
    else fetchTenders(1, false);
  }, [search, category, minPagu, tab]);

  const handleLoadMore = () => {
    if (page < totalPages) fetchTenders(page + 1, true);
  };

  const handleToggleSave = async (id: string) => {
    try {
      const res = await apiFetch<{ saved: boolean }>(`/tenders/${id}/save`, { method: 'POST' });
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (res.saved) next.add(id); else next.delete(id);
        return next;
      });
      if (tab === 'saved') fetchSaved();
      else fetchTenders(page, false);
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan tender.');
    }
  };

  const handleAiSummary = async (tender: any) => {
    if (tender.aiSummary) { setSelectedTender(tender); setSummaryLoading(false); return }
    setSummaryLoading(true);
    try {
      const updated = await apiFetch(`/tenders/${tender.id}/summary`, { method: 'POST' });
      setSummaryMap((m) => ({ ...m, [tender.id]: updated.aiSummary }));
      setSelectedTender({ ...tender, aiSummary: updated.aiSummary });
    } catch (e: any) {
      setError(e.message || 'Gagal memuat ringkasan AI.');
    }
    setSummaryLoading(false);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-white gradient-text">Tender LPSE Monitor</h1>
        <p className="text-neutral-400 text-sm">Pantau seluruh pengadaan barang dan jasa dari berbagai instansi di Indonesia.</p>
      </div>

      <div className="flex gap-1 p-1 rounded-lg bg-[#0c0c0e] border border-neutral-800 w-fit">
        {([{ key: 'all', label: 'Semua' }, { key: 'saved', label: 'Tersimpan' }] as const).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === t.key ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'all' && (
        <div className="p-5 rounded-xl border border-neutral-800 bg-[#0c0c0e] grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Pencarian</label>
            <input type="text" placeholder="Cari judul tender, instansi, atau ID..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#121214] border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-neutral-700" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Kategori</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#121214] border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-neutral-700">
              {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Minimal Pagu (IDR)</label>
            <input type="number" placeholder="Contoh: 5000000000" value={minPagu}
              onChange={(e) => setMinPagu(e.target.value)}
              className="w-full bg-[#121214] border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-neutral-700" />
          </div>
          <div className="flex items-end">
            <span className="text-xs text-neutral-500">Total: {totalPages > 0 ? `${tenders.length} tender` : 'Memuat...'}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-950 border border-red-800 text-xs text-red-300">{error}</div>
      )}

      <div className="rounded-xl border border-neutral-800 bg-[#0c0c0e] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-900/40 text-neutral-400 text-xs font-semibold uppercase tracking-wider">
              <th className="p-4">ID / Instansi</th>
              <th className="p-4">Judul Tender</th>
              <th className="p-4">Pagu / HPS</th>
              <th className="p-4">Lokasi & Tahap</th>
              <th className="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60 text-sm text-neutral-300">
            {loading ? (
              <tr><td colSpan={5} className="p-12 text-center text-neutral-500">
                <div className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
                  Memuat data tender...
                </div>
              </td></tr>
            ) : tenders.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-neutral-500">
                {tab === 'saved' ? 'Belum ada tender yang disimpan.' : 'Tidak ada tender yang cocok.'}
              </td></tr>
            ) : (
              tenders.map((tender) => {
                const isSaved = savedIds.has(tender.id) || tender.savedByTenants?.length > 0;
                return (
                  <tr key={tender.id} className="hover:bg-neutral-900/20 transition-colors">
                    <td className="p-4 whitespace-nowrap">
                      <span className="font-mono text-neutral-500 text-xs block">#{tender.lpseId}</span>
                      <span className="text-xs text-neutral-400 block max-w-[180px] truncate">{tender.agency}</span>
                    </td>
                    <td className="p-4 font-medium text-neutral-200 max-w-sm">{tender.title}</td>
                    <td className="p-4">
                      <span className="block font-semibold text-neutral-200">{formatCurrency(Number(tender.pagu) || 0)}</span>
                      <span className="block text-[11px] text-neutral-500">HPS: {tender.hps ? formatCurrency(Number(tender.hps)) : '-'}</span>
                    </td>
                    <td className="p-4">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-800 text-neutral-300 mb-1">{tender.location || '-'}</span>
                      <span className="block text-[10px] text-neutral-400 font-mono">{tender.stage || '-'}</span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button onClick={() => handleToggleSave(tender.id)}
                        className={`px-2 py-1.5 text-[11px] rounded transition-colors border ${isSaved ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800' : 'bg-neutral-850 hover:bg-neutral-800 text-neutral-300 border-neutral-700'}`}>
                        {isSaved ? '💾 Tersimpan' : '💾 Simpan'}
                      </button>
                      <button onClick={() => handleAiSummary(tender)}
                        disabled={summaryLoading}
                        className="px-2 py-1.5 text-[11px] rounded bg-neutral-850 hover:bg-neutral-800 text-white border border-neutral-700 transition-colors disabled:opacity-50">
                        {summaryMap[tender.id] || tender.aiSummary ? '✨ Summary' : '🤖 AI Proses'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {tab === 'all' && page < totalPages && !loading && (
          <div className="p-4 border-t border-neutral-800 text-center">
            <button onClick={handleLoadMore} disabled={loadingMore}
              className="px-6 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto">
              {loadingMore ? <span className="h-4 w-4 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" /> : null}
              Muat Lainnya ({totalPages - page} halaman lagi)
            </button>
          </div>
        )}
      </div>

      {selectedTender && selectedTender.aiSummary && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-xl bg-[#0c0c0e] border-l border-neutral-800 h-full p-8 overflow-y-auto space-y-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">Analisis Dokumen</span>
                <h2 className="text-xl font-bold text-white leading-tight">{selectedTender.title}</h2>
              </div>
              <button onClick={() => setSelectedTender(null)} className="text-neutral-500 hover:text-white text-lg font-bold">✕</button>
            </div>
            <hr className="border-neutral-800" />
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Syarat Kualifikasi & Kelayakan</h4>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-neutral-300">
                  {(selectedTender.aiSummary?.eligibility || []).length > 0
                    ? selectedTender.aiSummary.eligibility.map((item: string, i: number) => <li key={i}>{item}</li>)
                    : <li className="text-neutral-500">Tidak ada data</li>}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Sertifikasi Industri Wajib</h4>
                <div className="flex flex-wrap gap-2">
                  {(selectedTender.aiSummary?.requiredCertifications || []).length > 0
                    ? selectedTender.aiSummary.requiredCertifications.map((cert: string, i: number) => (
                        <span key={i} className="px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-[10px] font-mono text-neutral-300">🛡️ {cert}</span>
                      ))
                    : <span className="text-[10px] text-neutral-500">Tidak ada data</span>}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Batas Pengumpulan Dokumen</h4>
                <p className="text-xs font-mono text-emerald-400">
                  {selectedTender.aiSummary?.deadlines?.proposalSubmissionDeadline
                    ? new Date(selectedTender.aiSummary.deadlines.proposalSubmissionDeadline).toLocaleString('id-ID')
                    : 'Tidak tersedia'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TendersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><span className="h-6 w-6 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" /></div>}>
      <TendersPageInner />
    </Suspense>
  );
}
