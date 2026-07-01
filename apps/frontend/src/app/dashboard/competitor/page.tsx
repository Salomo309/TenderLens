'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

export default function CompetitorPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAgency, setSelectedAgency] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchData = async () => {
    setError('');
    try {
      const res = await apiFetch('/competitor');
      setData(res);
    } catch (e: any) {
      setError(e.message || 'Gagal memuat data kompetitor.');
      setData(null);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData() }, []);

  const openDetail = async (agency: string) => {
    setSelectedAgency(agency);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await apiFetch(`/competitor/${encodeURIComponent(agency)}`);
      setDetail(res);
    } catch (e: any) {
      setDetail(null);
    }
    setDetailLoading(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <span className="h-6 w-6 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error && !data) return (
    <div className="p-4 rounded-lg bg-red-950 border border-red-800 text-xs text-red-300">{error}</div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-white gradient-text">Analisis Kompetitor</h1>
        <p className="text-muted-foreground text-sm">Pantau histori kemenangan kompetitor di setiap instansi untuk strategi bidding yang lebih cerdas.</p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-950 border border-red-800 text-xs text-red-300">{error}</div>
      )}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl border border-border bg-card">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Kompetitor</span>
            <div className="text-2xl font-bold font-mono text-white mt-2">{data.totalCompetitors}</div>
          </div>
          <div className="p-5 rounded-xl border border-border bg-card">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Tender Dimenangkan</span>
            <div className="text-2xl font-bold font-mono text-white mt-2">{data.totalTendersWon}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border bg-maroon-darker/30">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Daftar Kompetitor</h3>
          </div>
          {data?.competitors?.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border text-[10px] text-muted-foreground uppercase font-semibold">
                  <th className="p-3">Instansi</th>
                  <th className="p-3">Tender Dimenangkan</th>
                  <th className="p-3">Total Nilai Pagu</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 text-xs text-foreground">
                {data.competitors.map((c: any) => (
                  <tr key={c.agency} className="hover:bg-maroon-darker/30">
                    <td className="p-3 font-medium text-foreground">{c.agency}</td>
                    <td className="p-3 font-mono">{c.totalWon}</td>
                    <td className="p-3 font-mono text-emerald-400">{formatCurrency(c.totalPagu)}</td>
                    <td className="p-3 text-right">
                      <button onClick={() => openDetail(c.agency)}
                        className="text-[10px] text-muted-foreground hover:text-white transition-colors">
                        Detail →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-xs text-muted-foreground">Belum ada data kompetitor.</div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border bg-maroon-darker/30">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              {selectedAgency || 'Detail Instansi'}
            </h3>
          </div>
          {detailLoading ? (
            <div className="p-8 text-center">
              <span className="h-4 w-4 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin inline-block" />
            </div>
          ) : detail ? (
            <div className="p-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Total Menang</span>
                  <span className="font-mono font-bold text-white">{detail.totalWon}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Total Pagu</span>
                  <span className="font-mono font-bold text-emerald-400">{formatCurrency(detail.totalPagu)}</span>
                </div>
              </div>
              {detail.categoryBreakdown && Object.keys(detail.categoryBreakdown).length > 0 && (
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-2">Breakdown Kategori</span>
                  <div className="space-y-1">
                    {Object.entries(detail.categoryBreakdown).map(([cat, count]: [string, any]) => (
                      <div key={cat} className="flex justify-between">
                        <span className="text-foreground">{cat.replace(/_/g, ' ')}</span>
                        <span className="font-mono text-muted-foreground">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {detail.tenders?.length > 0 && (
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-2">Tender Terkait</span>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {detail.tenders.map((t: any) => (
                      <div key={t.id} className="text-foreground truncate">{t.title}</div>
                    ))}
                  </div>
                </div>
              )}
              {detail.tenders?.length === 0 && Object.keys(detail.categoryBreakdown || {}).length === 0 && (
                <p className="text-muted-foreground">Belum ada data detail untuk instansi ini.</p>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Pilih kompetitor untuk melihat detail.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
