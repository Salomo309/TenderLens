'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

type Tab = 'stats' | 'tenants' | 'users';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  subscription?: { tier: string } | null;
  _count?: { members: number; tendersSaved: number; alerts: number };
}

interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  tenantMembers?: { id: string; role: string; tenant: { id: string; name: string } }[];
}

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tab, setTab] = useState<Tab>('stats');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [modal, setModal] = useState<{ type: 'tenant' | 'user'; mode: 'create' | 'edit'; data?: any } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'tenant' | 'user'; id: string; name: string } | null>(null);

  // Form state
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (user && user.role !== 'SUPERADMIN') {
      router.replace('/dashboard');
      return;
    }
    loadData();
  }, [user, router]);

  const loadData = () => {
    setLoading(true);
    setError('');
    Promise.all([
      apiFetch('/admin/stats').catch(() => null),
      apiFetch('/admin/tenants').catch(() => null),
      apiFetch('/admin/users').catch(() => null),
    ]).then(([s, t, u]) => {
      setStats(s);
      setTenants(t || []);
      setUsers(u || []);
      if (!s) setError('Gagal memuat data admin.');
    }).catch((e) => setError(e.message))
    .finally(() => setLoading(false));
  };

  const openCreate = (type: 'tenant' | 'user') => {
    setForm(type === 'tenant' ? { name: '', slug: '' } : { email: '', password: '', name: '', tenantId: '', role: 'USER' });
    setFormError('');
    setModal({ type, mode: 'create' });
  };

  const openEdit = (type: 'tenant' | 'user', data: any) => {
    if (type === 'tenant') {
      setForm({ name: data.name, slug: data.slug });
    } else {
      const member = data.tenantMembers?.[0];
      setForm({ email: data.email, name: data.name || '', role: member?.role || 'USER', password: '' });
    }
    setFormError('');
    setModal({ type, mode: 'edit', data });
  };

  const closeModal = () => {
    setModal(null);
    setDeleteTarget(null);
    setFormError('');
    setForm({});
  };

  const handleSave = async () => {
    const m = modal;
    if (!m) return;
    setSaving(true);
    setFormError('');
    try {
      if (m.type === 'tenant') {
        if (m.mode === 'create') {
          await apiFetch('/admin/tenants', { method: 'POST', body: JSON.stringify({ name: form.name, slug: form.slug || undefined }) });
        } else {
          await apiFetch(`/admin/tenants/${m.data.id}`, { method: 'PATCH', body: JSON.stringify({ name: form.name, slug: form.slug }) });
        }
      } else {
        if (m.mode === 'create') {
          if (!form.tenantId) { setFormError('Pilih tenant terlebih dahulu.'); setSaving(false); return; }
          if (!form.password || form.password.length < 6) { setFormError('Password minimal 6 karakter.'); setSaving(false); return; }
          await apiFetch('/admin/users', { method: 'POST', body: JSON.stringify({ email: form.email, password: form.password, name: form.name || undefined, tenantId: form.tenantId, role: form.role }) });
        } else {
          const body: Record<string, any> = { email: form.email, name: form.name, role: form.role };
          if (form.password) body.password = form.password;
          await apiFetch(`/admin/users/${m.data.id}`, { method: 'PATCH', body: JSON.stringify(body) });
        }
      }
      closeModal();
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await apiFetch(`/admin/${deleteTarget.type}s/${deleteTarget.id}`, { method: 'DELETE' });
      closeModal();
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menghapus.');
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <span className="h-6 w-6 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: 'stats', label: 'Ringkasan' },
    { key: 'tenants', label: 'Tenants' },
    { key: 'users', label: 'Users' },
  ];

  const roleBadge = (role: string) => {
    const styles: Record<string, string> = {
      SUPERADMIN: 'bg-purple-950 text-purple-300 border border-purple-800',
      ADMIN: 'bg-blue-950 text-blue-300 border border-blue-800',
      USER: 'bg-maroon-darker text-foreground',
    };
    return (
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${styles[role] || styles.USER}`}>
        {role}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-white gradient-text">
            Admin Panel
          </h1>
          <p className="text-muted-foreground text-sm">
            Manajemen platform — lihat, tambah, edit, dan hapus tenant & user.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-card border border-border w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === t.key
                ? 'bg-maroon-darker text-white'
                : 'text-muted-foreground hover:text-white'
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
            <div key={item.label} className="p-5 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{item.label}</span>
                <span className="text-lg">{item.icon}</span>
              </div>
              <div className="text-2xl font-bold text-white font-mono">{item.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tenants Table */}
      {tab === 'tenants' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-muted-foreground">{tenants.length} tenant</span>
            <button onClick={() => openCreate('tenant')} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-maroon hover:bg-maroon-dark text-white transition-colors">
              + Tambah Tenant
            </button>
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase font-semibold">
                  <th className="p-4">Nama</th>
                  <th className="p-4">Slug</th>
                  <th className="p-4">Member</th>
                  <th className="p-4">Tender</th>
                  <th className="p-4">Alert</th>
                  <th className="p-4">Langganan</th>
                  <th className="p-4">Dibuat</th>
                  <th className="p-4">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs text-foreground">
                {tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-maroon-darker/30">
                    <td className="p-4 font-medium">{t.name}</td>
                    <td className="p-4 font-mono text-muted-foreground">{t.slug}</td>
                    <td className="p-4">{t._count?.members ?? '-'}</td>
                    <td className="p-4">{t._count?.tendersSaved ?? '-'}</td>
                    <td className="p-4">{t._count?.alerts ?? '-'}</td>
                    <td className="p-4">
                      {t.subscription ? (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px]">{t.subscription.tier}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground font-mono">{new Date(t.createdAt).toLocaleDateString('id-ID')}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit('tenant', t)} className="text-muted-foreground hover:text-white text-xs underline">Edit</button>
                        <button onClick={() => setDeleteTarget({ type: 'tenant', id: t.id, name: t.name })} className="text-red-400 hover:text-red-300 text-xs underline">Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users Table */}
      {tab === 'users' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-muted-foreground">{users.length} user</span>
            <button onClick={() => openCreate('user')} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-maroon hover:bg-maroon-dark text-white transition-colors">
              + Tambah User
            </button>
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase font-semibold">
                  <th className="p-4">Nama</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Tenant</th>
                  <th className="p-4">Dibuat</th>
                  <th className="p-4">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs text-foreground">
                {users.map((u) => {
                  const member = u.tenantMembers?.[0];
                  return (
                    <tr key={u.id} className="hover:bg-maroon-darker/30">
                      <td className="p-4 font-medium">{u.name || '-'}</td>
                      <td className="p-4 font-mono text-muted-foreground">{u.email}</td>
                      <td className="p-4">{roleBadge(member?.role || 'NONE')}</td>
                      <td className="p-4">{member?.tenant?.name || '-'}</td>
                      <td className="p-4 text-muted-foreground font-mono">{new Date(u.createdAt).toLocaleDateString('id-ID')}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit('user', u)} className="text-muted-foreground hover:text-white text-xs underline">Edit</button>
                          <button onClick={() => setDeleteTarget({ type: 'user', id: u.id, name: u.email })} className="text-red-400 hover:text-red-300 text-xs underline">Hapus</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Modal Create/Edit ─────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {modal.mode === 'create' ? 'Tambah' : 'Edit'} {modal.type === 'tenant' ? 'Tenant' : 'User'}
              </h3>
              <button onClick={closeModal} className="text-muted-foreground hover:text-white text-lg font-bold">✕</button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-red-950 border border-destructive text-xs text-red-300">{formError}</div>
            )}

            <div className="space-y-4">
              {modal.type === 'tenant' ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nama Tenant</label>
                    <input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Slug (opsional)</label>
                    <input value={form.slug || ''} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring" placeholder="auto-generated jika kosong" />
                  </div>
                </>
              ) : (
                <>
                  {modal.mode === 'create' && (
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Tenant</label>
                      <select value={form.tenantId || ''} onChange={(e) => setForm({ ...form, tenantId: e.target.value })} className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring">
                        <option value="">Pilih tenant...</option>
                        {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email</label>
                    <input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nama</label>
                    <input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      Password {modal.mode === 'edit' && '(kosongkan jika tidak diganti)'}
                    </label>
                    <input type="password" value={form.password || ''} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Role</label>
                    <select value={form.role || 'USER'} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring">
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="SUPERADMIN">SUPERADMIN</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={closeModal} className="flex-1 px-4 py-2 bg-maroon-darker hover:bg-maroon-dark border border-border text-muted-foreground text-xs font-semibold rounded-lg transition-colors">Batal</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 bg-maroon hover:bg-maroon-dark text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {modal.mode === 'create' ? 'Simpan' : 'Perbarui'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal Delete Confirmation ────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="text-center space-y-2">
              <div className="text-3xl">⚠️</div>
              <h3 className="text-lg font-bold text-white">Hapus {deleteTarget.type === 'tenant' ? 'Tenant' : 'User'}</h3>
              <p className="text-xs text-muted-foreground">
                Yakin ingin menghapus <strong className="text-white">{deleteTarget.name}</strong>?
                {deleteTarget.type === 'tenant' && ' Semua data terkait (member, tender tersimpan, alert, invoice) akan ikut terhapus.'}
              </p>
            </div>
            {formError && <div className="p-3 rounded-lg bg-red-950 border border-destructive text-xs text-red-300">{formError}</div>}
            <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 px-4 py-2 bg-maroon-darker hover:bg-maroon-dark border border-border text-muted-foreground text-xs font-semibold rounded-lg transition-colors">Batal</button>
              <button onClick={handleDelete} disabled={saving} className="flex-1 px-4 py-2 bg-red-800 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
