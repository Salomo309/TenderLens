'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function SettingsPage() {
  const { user: authUser, tenant } = useAuth();

  // Profile
  const [name, setName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  // Email
  const [newEmail, setNewEmail] = useState('');
  const [verifCode, setVerifCode] = useState('');
  const [showVerifInput, setShowVerifInput] = useState(false);
  const [emailMsg, setEmailMsg] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  // Password
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    if (authUser?.name) setName(authUser.name);
    if (authUser?.email) setNewEmail(authUser.email);
  }, [authUser]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg('');
    try {
      const res = await apiFetch<any>('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      });
      setProfileMsg('Profil berhasil diperbarui.');
    } catch (err: any) {
      setProfileMsg(err.message || 'Gagal menyimpan.');
    }
    setSavingProfile(false);
  };

  const handleRequestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || newEmail === authUser?.email) return;
    setSavingEmail(true);
    setEmailMsg('');
    try {
      const res = await apiFetch<any>('/auth/email/change', {
        method: 'POST',
        body: JSON.stringify({ newEmail }),
      });
      setShowVerifInput(true);
      if (res.devCode) {
        setVerifCode(res.devCode);
        setEmailMsg(`[DEV] Kode verifikasi: ${res.devCode} (otomatis terisi)`);
      } else {
        setEmailMsg(res.message || 'Kode verifikasi telah dikirim.');
      }
    } catch (err: any) {
      setEmailMsg(err.message || 'Gagal mengirim kode verifikasi.');
    }
    setSavingEmail(false);
  };

  const handleVerifyEmail = async () => {
    if (!verifCode) return;
    setSavingEmail(true);
    setEmailMsg('');
    try {
      const res = await apiFetch<any>('/auth/email/verify', {
        method: 'POST',
        body: JSON.stringify({ code: verifCode }),
      });
      setEmailMsg(res.message || 'Email berhasil diperbarui!');
      setShowVerifInput(false);
      setVerifCode('');
    } catch (err: any) {
      setEmailMsg(err.message || 'Kode verifikasi salah.');
    }
    setSavingEmail(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      setPwMsg('Password baru tidak cocok.');
      return;
    }
    setSavingPw(true);
    setPwMsg('');
    try {
      const res = await apiFetch<any>('/auth/password/change', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      setPwMsg(res.message || 'Password berhasil diperbarui.');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err: any) {
      setPwMsg(err.message || 'Gagal mengubah password.');
    }
    setSavingPw(false);
  };

  const inputClass = "w-full bg-[#121214] border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-neutral-700";

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-white gradient-text">Account Settings</h1>
        <p className="text-neutral-400 text-sm">Kelola profil akun, email, dan keamanan Anda.</p>
      </div>

      {/* Profile Section */}
      <div className="rounded-xl border border-neutral-800 bg-[#0c0c0e] overflow-hidden">
        <div className="p-4 border-b border-neutral-800 bg-neutral-900/20">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Profil</h3>
        </div>
        <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Nama</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Email</label>
            <input type="email" value={authUser?.email || ''} disabled className={`${inputClass} opacity-50 cursor-not-allowed`} />
            <p className="text-[10px] text-neutral-500 mt-1">Gunakan form di bawah untuk mengganti email.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Tenant</label>
            <input type="text" value={tenant?.name || ''} disabled className={`${inputClass} opacity-50 cursor-not-allowed`} />
          </div>
          {profileMsg && (
            <div className={`text-xs ${profileMsg.includes('berhasil') ? 'text-emerald-400' : 'text-red-400'}`}>{profileMsg}</div>
          )}
          <button type="submit" disabled={savingProfile}
            className="px-5 py-2 bg-white hover:bg-neutral-200 text-neutral-900 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
            {savingProfile ? 'Menyimpan...' : 'Simpan Profil'}
          </button>
        </form>
      </div>

      {/* Email Section */}
      <div className="rounded-xl border border-neutral-800 bg-[#0c0c0e] overflow-hidden">
        <div className="p-4 border-b border-neutral-800 bg-neutral-900/20">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Ganti Email</h3>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Email Baru</label>
            <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
              className={inputClass} placeholder="email-baru@domain.com" />
          </div>

          {showVerifInput && (
            <div className="p-4 rounded-lg border border-neutral-700 bg-neutral-900/50 space-y-3">
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">Kode Verifikasi</label>
              <p className="text-[10px] text-neutral-500">Cek email Anda saat ini untuk kode verifikasi.</p>
              <div className="flex gap-3">
                <input type="text" value={verifCode} onChange={(e) => setVerifCode(e.target.value)}
                  className={`${inputClass} flex-1 font-mono uppercase tracking-widest`} placeholder="XXXXXX" maxLength={6} />
                <button onClick={handleVerifyEmail} disabled={savingEmail || !verifCode}
                  className="px-4 py-2 bg-white hover:bg-neutral-200 text-neutral-900 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
                  Verifikasi
                </button>
              </div>
            </div>
          )}

          {emailMsg && (
            <div className={`text-xs ${emailMsg.includes('berhasil') ? 'text-emerald-400' : emailMsg.includes('dikirim') ? 'text-blue-400' : 'text-red-400'}`}>
              {emailMsg}
            </div>
          )}

          {!showVerifInput && (
            <button onClick={handleRequestEmailChange} disabled={savingEmail || !newEmail || newEmail === authUser?.email}
              className="px-5 py-2 bg-white hover:bg-neutral-200 text-neutral-900 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
              {savingEmail ? 'Mengirim...' : 'Kirim Kode Verifikasi'}
            </button>
          )}
        </div>
      </div>

      {/* Password Section */}
      <div className="rounded-xl border border-neutral-800 bg-[#0c0c0e] overflow-hidden">
        <div className="p-4 border-b border-neutral-800 bg-neutral-900/20">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Ganti Password</h3>
        </div>
        <form onSubmit={handleChangePassword} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Password Saat Ini</label>
            <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)}
              className={inputClass} placeholder="********" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Password Baru</label>
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
              className={inputClass} placeholder="Minimal 6 karakter" minLength={6} />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Konfirmasi Password Baru</label>
            <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
              className={inputClass} placeholder="Ketik ulang password baru" />
          </div>
          {pwMsg && (
            <div className={`text-xs ${pwMsg.includes('berhasil') ? 'text-emerald-400' : 'text-red-400'}`}>{pwMsg}</div>
          )}
          <button type="submit" disabled={savingPw}
            className="px-5 py-2 bg-white hover:bg-neutral-200 text-neutral-900 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
            {savingPw ? 'Menyimpan...' : 'Ubah Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
