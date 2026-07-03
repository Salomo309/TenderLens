'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '@/lib/use-debounce';
import { Pagination } from '@/components/ui/pagination';

function useFilterParams() {
  const searchParams = useSearchParams();
  return useMemo(() => ({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || 'ALL',
    stage: searchParams.get('stage') || 'ALL',
    minPagu: searchParams.get('minPagu') || '',
    maxPagu: searchParams.get('maxPagu') || '',
    tab: (searchParams.get('tab') as 'all' | 'saved') || 'all',
  }), [searchParams]);
}

function TendersPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [source, setSource] = useState(searchParams.get('source') || 'ALL');
  const [category, setCategory] = useState(searchParams.get('category') || 'ALL');
  const [stage, setStage] = useState(searchParams.get('stage') || 'ALL');
  const [minPagu, setMinPagu] = useState(searchParams.get('minPagu') || '');
  const [maxPagu, setMaxPagu] = useState(searchParams.get('maxPagu') || '');
  const [tab, setTab] = useState<'all' | 'saved'>(searchParams.get('tab') as 'all' | 'saved' || 'all');

  const debouncedSearch = useDebounce(search, 350);
  const debouncedMinPagu = useDebounce(minPagu, 350);
  const debouncedMaxPagu = useDebounce(maxPagu, 350);

  const [selectedTender, setSelectedTender] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryMap, setSummaryMap] = useState<Record<string, any>>({});

  const categoriesQuery = useQuery({
    queryKey: ['tender-categories'],
    queryFn: () => apiFetch<any[]>('/tenders/categories'),
    staleTime: 300000,
  });

  const sourcesQuery = useQuery({
    queryKey: ['tender-sources'],
    queryFn: () => apiFetch<{ slug: string; name: string }[]>('/tenders/sources'),
    staleTime: 300000,
  });

  const tenderParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('limit', '20');
    if (debouncedSearch) p.set('search', debouncedSearch);
    if (source !== 'ALL') p.set('source', source);
    if (category !== 'ALL') p.set('category', category);
    if (stage !== 'ALL') p.set('stage', stage);
    if (debouncedMinPagu) p.set('minPagu', debouncedMinPagu);
    if (debouncedMaxPagu) p.set('maxPagu', debouncedMaxPagu);
    return p.toString();
  }, [debouncedSearch, source, category, stage, debouncedMinPagu, debouncedMaxPagu, page]);

  const tendersQuery = useQuery({
    queryKey: ['tenders', tenderParams],
    queryFn: () => apiFetch<{ data: any[]; meta: any }>(`/tenders?${tenderParams}`),
    enabled: tab === 'all',
    staleTime: 30000,
  });

  const savedQuery = useQuery({
    queryKey: ['tenders-saved'],
    queryFn: () => apiFetch<any[]>('/tenders/saved'),
    enabled: tab === 'saved',
    staleTime: 30000,
  });

  const savedIdsQuery = useQuery({
    queryKey: ['tenders-saved-ids'],
    queryFn: async () => {
      const data = await apiFetch<any[]>('/tenders/saved');
      return new Set(data.map((s: any) => s.tenderId || s.tender?.id));
    },
    staleTime: 60000,
  });

  const categories = useMemo(
    () => categoriesQuery.data ? [{ value: 'ALL', label: 'Semua Kategori' }, ...categoriesQuery.data] : [],
    [categoriesQuery.data]
  );

  const tenders = useMemo(() => {
    if (tab === 'saved' && savedQuery.data) {
      return savedQuery.data.map((s: any) => ({ ...s.tender, savedByTenants: [s] }));
    }
    return tendersQuery.data?.data || [];
  }, [tab, tendersQuery.data, savedQuery.data]);

  const totalPages = tendersQuery.data?.meta?.totalPages || 1;

  const error = categoriesQuery.error
    ? 'Gagal memuat kategori: ' + categoriesQuery.error.message
    : tendersQuery.error
    ? (tendersQuery.error as any).message || 'Gagal memuat data tender.'
    : savedQuery.error
    ? (savedQuery.error as any).message || 'Gagal memuat data tersimpan.'
    : '';

  const loading = (tab === 'all' && tendersQuery.isLoading) || (tab === 'saved' && savedQuery.isLoading);

  const updateUrl = useCallback((params: Record<string, string>) => {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([k, v]) => {
      if (v && v !== 'ALL' && v !== '1') sp.set(k, v);
      else sp.delete(k);
    });
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  useEffect(() => {
    if (tab === 'all') setPage(1);
  }, [debouncedSearch, source, category, stage, debouncedMinPagu, debouncedMaxPagu, tab]);

  useEffect(() => {
    updateUrl({ search: debouncedSearch, source, category, stage, minPagu: debouncedMinPagu, maxPagu: debouncedMaxPagu, tab });
  }, [debouncedSearch, source, category, stage, debouncedMinPagu, debouncedMaxPagu, tab]);

  const saveMutation = useMutation({
    mutationFn: (id: string) => apiFetch<{ saved: boolean }>(`/tenders/${id}/save`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenders-saved'] });
      queryClient.invalidateQueries({ queryKey: ['tenders-saved-ids'] });
      if (tab === 'all') queryClient.invalidateQueries({ queryKey: ['tenders'] });
    },
  });

  const handleToggleSave = (id: string) => saveMutation.mutate(id);

  const handleAiSummary = async (tender: any) => {
    if (tender.aiSummary) { setSelectedTender(tender); setSummaryLoading(false); return }
    setSummaryLoading(true);
    try {
      const updated = await apiFetch(`/tenders/${tender.id}/summary`, { method: 'POST' });
      setSummaryMap((m) => ({ ...m, [tender.id]: updated.aiSummary }));
      setSelectedTender({ ...tender, aiSummary: updated.aiSummary });
    } catch (e: any) {
      // error shown via query error state
    }
    setSummaryLoading(false);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight gradient-text">Tender LPSE Monitor</h1>
        <p className="text-muted-foreground text-sm">Pantau seluruh pengadaan barang dan jasa dari berbagai instansi di Indonesia.</p>
      </div>

      <div className="flex gap-1 p-1 rounded-lg bg-card border border-border w-fit">
        {([{ key: 'all', label: 'Semua' }, { key: 'saved', label: 'Tersimpan' }] as const).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === t.key ? 'bg-maroon-darker text-white' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'all' && (
        <div className="p-5 rounded-xl border border-border bg-card grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Pencarian</label>
            <input type="text" placeholder="Cari judul, instansi, atau ID..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Sumber LPSE</label>
            <select value={source} onChange={(e) => setSource(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring">
              <option value="ALL">Semua Sumber</option>
              {sourcesQuery.data?.map((s) => (
                <option key={s.slug} value={s.slug}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Kategori</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring">
              {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Tahap</label>
              <select value={stage} onChange={(e) => setStage(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring">
              <option value="ALL">Semua Tahap</option>
              <option value="PENGUMUMAN">Pengumuman</option>
              <option value="KUALIFIKASI">Kualifikasi</option>
              <option value="PROPOSAL_SUBMISSION">Proposal Submission</option>
              <option value="EVALUASI">Evaluasi</option>
              <option value="NEGOSIASI">Negosiasi</option>
              <option value="SELESAI">Selesai</option>
              <option value="BATAL">Batal</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Min. Pagu (IDR)</label>
            <input type="number" placeholder="Contoh: 5000000000" value={minPagu}
              onChange={(e) => setMinPagu(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Maks. Pagu (IDR)</label>
            <input type="number" placeholder="Contoh: 10000000000" value={maxPagu}
              onChange={(e) => setMaxPagu(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring" />
          </div>
          <div className="col-span-full text-xs text-muted-foreground text-right">
            {tendersQuery.data?.meta?.total != null ? `${tenders.length} dari ${tendersQuery.data.meta.total} tender` : 'Memuat...'}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-950 border border-red-800 text-xs text-red-300">{error}</div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-maroon-darker/50 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              <th className="p-4">ID / Instansi</th>
              <th className="p-4">Judul Tender</th>
              <th className="p-4">Pagu / HPS</th>
              <th className="p-4">Lokasi & Tahap</th>
              <th className="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60 text-sm text-foreground">
            {loading ? (
              <tr><td colSpan={5} className="p-12 text-center text-muted-foreground">
                <div className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
                  Memuat data tender...
                </div>
              </td></tr>
            ) : tenders.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">
                {tab === 'saved' ? 'Belum ada tender yang disimpan.' : 'Tidak ada tender yang cocok.'}
              </td></tr>
            ) : (
              tenders.map((tender) => {
                const isSaved = savedIdsQuery.data?.has(tender.id) || tender.savedByTenants?.length > 0;
                return (
                  <tr key={tender.id} className="hover:bg-maroon-darker/30 transition-colors cursor-pointer" onClick={() => setSelectedTender(tender)}>
                    <td className="p-4 whitespace-nowrap">
                      <span className="font-mono text-muted-foreground text-xs block">#{tender.lpseId}</span>
                      <span className="text-xs text-muted-foreground block max-w-[180px] truncate">{tender.agency}</span>
                    </td>
                    <td className="p-4 font-medium text-foreground max-w-sm">{tender.title}</td>
                    <td className="p-4">
                      <span className="block font-semibold text-foreground">{formatCurrency(Number(tender.pagu) || 0)}</span>
                      <span className="block text-[11px] text-muted-foreground">HPS: {tender.hps ? formatCurrency(Number(tender.hps)) : '-'}</span>
                    </td>
                    <td className="p-4">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-maroon-darker text-white mb-1">{tender.location || '-'}</span>
                      <span className="block text-[10px] text-muted-foreground font-mono">{tender.stage || '-'}</span>
                    </td>
                    <td className="p-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleToggleSave(tender.id)}
                        className={`px-2 py-1.5 text-[11px] rounded transition-colors border ${isSaved ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800' : 'bg-maroon-darker hover:bg-maroon-dark text-white border-border'}`}>
                        {isSaved ? '💾 Tersimpan' : '💾 Simpan'}
                      </button>
                      <button onClick={() => handleAiSummary(tender)}
                        disabled={summaryLoading}
                        className="px-2 py-1.5 text-[11px] rounded bg-maroon-darker hover:bg-maroon-dark text-white border border-border transition-colors disabled:opacity-50">
                        {summaryMap[tender.id] || tender.aiSummary ? '✨ Summary' : '🤖 AI Proses'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {tab === 'all' && !loading && (
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        )}
      </div>

      {selectedTender && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end" onClick={() => setSelectedTender(null)}>
          <div className="w-full max-w-xl bg-card border-l border-border h-full p-8 overflow-y-auto space-y-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Detail Tender</span>
                <h2 className="text-xl font-bold text-foreground leading-tight">{selectedTender.title}</h2>
              </div>
              <button onClick={() => setSelectedTender(null)} className="text-muted-foreground hover:text-foreground text-lg font-bold">✕</button>
            </div>
            <hr className="border-border" />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">ID LPSE</span>
                <p className="text-foreground font-mono">#{selectedTender.lpseId || '-'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Instansi</span>
                <p className="text-foreground">{selectedTender.agency || '-'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Pagu Anggaran</span>
                <p className="text-emerald-400 font-semibold font-mono">{formatCurrency(Number(selectedTender.pagu) || 0)}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">HPS</span>
                <p className="text-foreground font-mono">{selectedTender.hps ? formatCurrency(Number(selectedTender.hps)) : '-'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Kategori</span>
                <p className="text-foreground">{selectedTender.category?.replace(/_/g, ' ') || '-'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Tahap</span>
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-maroon-darker text-white">{selectedTender.stage || '-'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Lokasi</span>
                <p className="text-foreground">{selectedTender.location || '-'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Publikasi</span>
                <p className="text-muted-foreground text-xs">{selectedTender.publishedAt ? new Date(selectedTender.publishedAt).toLocaleString('id-ID') : '-'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Deadline</span>
                <p className="text-amber-400 text-xs font-mono">{selectedTender.deadlineAt ? new Date(selectedTender.deadlineAt).toLocaleString('id-ID') : '-'}</p>
              </div>
            </div>

            {selectedTender.aiSummary && (
              <>
                <hr className="border-border" />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Analisis AI</span>
                  <button onClick={() => handleAiSummary(selectedTender)} disabled={summaryLoading}
                    className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">↻ Regenerate</button>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Syarat Kualifikasi & Kelayakan</h4>
                    <ul className="list-disc pl-5 space-y-1.5 text-xs text-foreground">
                      {(selectedTender.aiSummary?.eligibility || []).length > 0
                        ? selectedTender.aiSummary.eligibility.map((item: string, i: number) => <li key={i}>{item}</li>)
                        : <li className="text-muted-foreground">Tidak ada data</li>}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sertifikasi Industri Wajib</h4>
                    <div className="flex flex-wrap gap-2">
                      {(selectedTender.aiSummary?.requiredCertifications || []).length > 0
                        ? selectedTender.aiSummary.requiredCertifications.map((cert: string, i: number) => (
                            <span key={i} className="px-2 py-1 rounded bg-maroon-darker border border-border text-[10px] font-mono text-white">🛡️ {cert}</span>
                          ))
                        : <span className="text-[10px] text-muted-foreground">Tidak ada data</span>}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Spesifikasi Teknis</h4>
                    <ul className="list-disc pl-5 space-y-1.5 text-xs text-foreground">
                      {(selectedTender.aiSummary?.keyTechnicalSpecs || []).length > 0
                        ? selectedTender.aiSummary.keyTechnicalSpecs.map((item: string, i: number) => <li key={i}>{item}</li>)
                        : <li className="text-muted-foreground">Tidak ada data</li>}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Batas Pengumpulan Dokumen</h4>
                    <p className="text-xs font-mono text-emerald-400">
                      {selectedTender.aiSummary?.deadlines?.proposalSubmissionDeadline
                        ? new Date(selectedTender.aiSummary.deadlines.proposalSubmissionDeadline).toLocaleString('id-ID')
                        : 'Tidak tersedia'}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Risiko & Tantangan</h4>
                    <ul className="list-disc pl-5 space-y-1.5 text-xs text-amber-300">
                      {(selectedTender.aiSummary?.risksAndGotchas || []).length > 0
                        ? selectedTender.aiSummary.risksAndGotchas.map((item: string, i: number) => <li key={i}>{item}</li>)
                        : <li className="text-muted-foreground">Tidak ada data</li>}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Estimasi Durasi</h4>
                    <p className="text-xs text-foreground">{selectedTender.aiSummary?.estimatedDurationMonths ? `${selectedTender.aiSummary.estimatedDurationMonths} bulan` : 'Tidak tersedia'}</p>
                  </div>
                </div>
              </>
            )}

            {!selectedTender.aiSummary && (
              <button onClick={() => handleAiSummary(selectedTender)} disabled={summaryLoading}
                className="w-full py-2 bg-maroon hover:bg-maroon-dark text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {summaryLoading ? <span className="h-4 w-4 border-2 border-border border-t-transparent rounded-full animate-spin" /> : '🤖 Generate AI Summary'}
              </button>
            )}
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
