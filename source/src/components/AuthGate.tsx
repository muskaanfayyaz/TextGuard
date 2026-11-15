import { useState } from 'react';
import { auth } from '@appdeploy/client';
import { ShieldCheck, Mail, ArrowRight, LockKeyhole, AlertCircle, LoaderCircle } from 'lucide-react';

export function AuthGate() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function continueSignIn() {
    setBusy(true);
    setError('');
    try {
      await auth.signInWithRedirect({ scope: 'openid email profile offline_access' });
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : 'Authentication could not be started.';
      setError(code.includes('auth/storage-unavailable')
        ? 'Your browser is blocking secure session storage. Enable site storage and try again.'
        : code.includes('auth/navigation-timeout')
          ? 'The sign-in page did not open. Please try again.'
          : 'Sign-in could not be started. Please try again.');
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4F2F2] px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-[#1D2128]/10 bg-white shadow-2xl shadow-[#1D2128]/10 md:grid-cols-[1fr_0.9fr]">
        <section className="relative hidden min-h-[620px] flex-col justify-between overflow-hidden bg-[#1D2128] p-10 text-white md:flex">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#FF9E20]/15 blur-2xl" />
          <div className="absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-[#215E61]/60 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FF9E20] text-[#1D2128]"><ShieldCheck size={23} /></span>
            <span><b className="block text-lg tracking-tight">TextGuard</b><small className="text-[9px] font-semibold tracking-[.2em] text-white/50">DOCUMENT INTELLIGENCE</small></span>
          </div>
          <div className="relative max-w-sm">
            <span className="inline-flex rounded-full border border-[#FF9E20]/30 bg-[#FF9E20]/10 px-3 py-1.5 text-[10px] font-bold tracking-widest text-[#FFB653]">ORIGINALITY, MADE EXPLAINABLE</span>
            <h1 className="mt-6 text-4xl font-bold leading-tight">Protect the integrity of every document.</h1>
            <p className="mt-5 text-sm leading-7 text-white/65">Compare documents with transparent, classical algorithms and inspect verified matching passages.</p>
          </div>
          <p className="relative text-[11px] text-white/40">Secure sign-in · Private workspace · Explainable results</p>
        </section>

        <section className="flex min-h-[620px] flex-col justify-center px-6 py-10 sm:px-10 lg:px-12">
          <div className="mb-8 flex items-center gap-3 md:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF9E20] text-[#1D2128]"><ShieldCheck size={21} /></span>
            <b className="text-lg text-[#1D2128]">TextGuard</b>
          </div>
          <div className="mb-7 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF2F1] text-[#215E61]"><LockKeyhole size={22} /></div>
          <p className="text-[10px] font-bold tracking-[.2em] text-[#215E61]">YOUR PRIVATE WORKSPACE</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#1D2128]">Welcome Back.</h2>
          <p className="mt-3 text-sm leading-6 text-[#687176]">Sign in to continue protecting your document originality.</p>

          {error && <div role="alert" className="mt-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700"><AlertCircle size={16} className="mt-0.5 shrink-0" />{error}</div>}

          <button type="button" onClick={continueSignIn} disabled={busy} className="mt-8 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FF9E20] px-5 py-3 text-sm font-bold text-[#1D2128] shadow-lg shadow-[#FF9E20]/20 transition hover:-translate-y-0.5 hover:bg-[#F29A20] active:translate-y-0 disabled:opacity-60">
            {busy ? <LoaderCircle size={17} className="animate-spin" /> : <Mail size={17} />}
            Continue with secure sign-in
            {!busy && <ArrowRight size={16} />}
          </button>
          <p className="mt-4 text-center text-xs leading-5 text-[#687176]">Choose email sign-in or another enabled identity provider on the secure AppDeploy sign-in screen.</p>
          <div className="my-7 flex items-center gap-3"><span className="h-px flex-1 bg-[#E3E5E5]" /><span className="text-[10px] font-semibold uppercase tracking-wider text-[#929A9D]">New to TextGuard?</span><span className="h-px flex-1 bg-[#E3E5E5]" /></div>
          <button type="button" onClick={continueSignIn} disabled={busy} className="min-h-11 w-full rounded-xl border border-[#215E61] px-4 py-2.5 text-sm font-semibold text-[#215E61] transition hover:bg-[#EAF2F1] disabled:opacity-60">Create an account</button>
          <p className="mt-7 text-center text-[10px] leading-5 text-[#929A9D]">By continuing, you agree to the Terms of Service and Privacy Policy. Authentication and account recovery are handled by the configured identity provider.</p>
        </section>
      </div>
    </main>
  );
}
