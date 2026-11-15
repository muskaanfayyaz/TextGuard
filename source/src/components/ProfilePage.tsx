import { useEffect, useState } from 'react';
import { api } from '@appdeploy/client';
import { UserRound, Mail, CalendarDays, Save, LogOut, ShieldCheck, AlertCircle, LoaderCircle } from 'lucide-react';

type Profile = { userId: string; name: string; email: string; createdAt: string };

export function ProfilePage({ onLogout }: { onLogout: () => Promise<void> }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/api/profile').then(({ data }) => {
      if (!active) return;
      const item = data as Profile;
      setProfile(item);
      setName(item.name || '');
    }).catch(() => { if (active) setError('Your profile could not be loaded. Please refresh and try again.'); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, []);

  async function save() {
    if (name.trim().length < 2 || name.trim().length > 80) {
      setError('Enter a name between 2 and 80 characters.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const { data } = await api.put('/api/profile', { name: name.trim() });
      setProfile(data as Profile);
      setMessage('Profile updated successfully.');
    } catch {
      setError('Your profile could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (busy) return <div className="surface-card flex min-h-64 items-center justify-center gap-3 text-sm text-[#687176]"><LoaderCircle className="animate-spin" size={18} /> Loading secure profile…</div>;

  return (
    <div className="max-w-3xl space-y-5">
      <section className="surface-card p-6 sm:p-8">
        <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF2F1] text-[#215E61]"><UserRound size={21} /></span><div><h2 className="font-display text-lg font-bold text-[#1D2128]">Account profile</h2><p className="text-xs text-[#687176]">Your identity and account details</p></div></div>
        {error && <div role="alert" className="mt-5 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"><AlertCircle size={15} />{error}</div>}
        {message && <div role="status" className="mt-5 rounded-lg border border-[#B0D0CD] bg-[#EAF2F1] p-3 text-xs text-[#215E61]">{message}</div>}
        <label className="mt-6 block text-xs font-semibold text-[#1D2128]">Full name</label>
        <input value={name} onChange={e => setName(e.target.value)} maxLength={80} className="mt-2 h-11 w-full rounded-xl border border-[#D8DEDD] bg-white px-3 text-sm text-[#1D2128] outline-none focus:border-[#215E61] focus:ring-2 focus:ring-[#FF9E20]/30" />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-[#F4F2F2] p-4"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#687176]"><Mail size={13} /> Email address</div><p className="mt-2 break-all text-sm font-semibold text-[#1D2128]">{profile?.email || 'Not provided by sign-in provider'}</p></div>
          <div className="rounded-xl bg-[#F4F2F2] p-4"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#687176]"><CalendarDays size={13} /> Account first seen</div><p className="mt-2 text-sm font-semibold text-[#1D2128]">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '—'}</p><p className="mt-1 text-[10px] text-[#929A9D]">Date TextGuard first created your profile</p></div>
        </div>
        <button type="button" onClick={save} disabled={saving} className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#215E61] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#194B4E] disabled:opacity-60">{saving ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />} Save profile</button>
      </section>
      <section className="surface-card p-6">
        <div className="flex items-start gap-3"><ShieldCheck size={19} className="mt-0.5 text-[#215E61]" /><div><h3 className="text-sm font-bold text-[#1D2128]">Sign-in security</h3><p className="mt-1 text-xs leading-5 text-[#687176]">Your account credentials and recovery are managed by AppDeploy's identity provider. TextGuard does not store or handle passwords. For password-based providers, change your password through that provider. Passwordless email sign-in has no account password to change.</p></div></div>
        <button type="button" onClick={onLogout} className="mt-6 inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"><LogOut size={15} /> Sign out</button>
      </section>
    </div>
  );
}
