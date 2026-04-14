'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try { await login(form.email, form.password); router.push('/dashboard'); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Login failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex overflow-hidden" style={{background:'#0b0f1a'}}>
      {/* ── Left panel ── */}
      <div className="hidden lg:flex w-[55%] relative flex-col justify-between p-14 overflow-hidden">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-20" style={{background:'radial-gradient(circle,#6366f1,transparent 70%)'}}/>
          <div className="absolute top-1/2 -right-20 w-[400px] h-[400px] rounded-full opacity-15" style={{background:'radial-gradient(circle,#a855f7,transparent 70%)'}}/>
          <div className="absolute -bottom-40 left-1/3 w-[450px] h-[450px] rounded-full opacity-10" style={{background:'radial-gradient(circle,#3b82f6,transparent 70%)'}}/>
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage:'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',backgroundSize:'40px 40px'}}/>
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/30">
            <span className="text-white font-black text-lg">Z</span>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Zenska CRM</span>
        </div>

        {/* Hero text */}
        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-1.5 mb-8">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"/>
            <span className="text-xs text-white/70 font-medium">Trusted by growing teams</span>
          </div>
          <h1 className="text-5xl font-black text-white leading-[1.1] mb-5 tracking-tight">
            Close deals.<br/>
            <span style={{background:'linear-gradient(135deg,#818cf8,#c084fc)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
              Grow faster.
            </span>
          </h1>
          <p className="text-white/50 text-lg leading-relaxed max-w-md">
            Pipeline management, onboarding workflows, meeting scheduling — everything your sales team needs in one place.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-10">
            {[['500+','Leads managed','📊'],['98%','Uptime SLA','⚡'],['10x','Faster follow-up','🚀']].map(([n,l,ic])=>(
              <div key={l} className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <div className="text-2xl mb-1">{ic}</div>
                <div className="text-2xl font-black text-white">{n}</div>
                <div className="text-xs text-white/40 mt-0.5">{l}</div>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
            <p className="text-white/70 text-sm leading-relaxed italic">"Zenska CRM transformed how we manage our vendor pipeline. We went from scattered spreadsheets to a unified system in days."</p>
            <div className="flex items-center gap-3 mt-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-violet-500 rounded-full flex items-center justify-center text-white text-xs font-bold">A</div>
              <div><p className="text-white/80 text-xs font-semibold">Anjali S.</p><p className="text-white/40 text-xs">Sales Director</p></div>
              <div className="ml-auto flex gap-0.5">{[...Array(5)].map((_,i)=><span key={i} className="text-amber-400 text-xs">★</span>)}</div>
            </div>
          </div>
        </div>

        <p className="relative text-white/20 text-xs">© 2026 Zenska CRM · All rights reserved</p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center p-8 relative" style={{background:'linear-gradient(180deg,#111827 0%,#0b0f1a 100%)'}}>
        <div className="absolute top-0 left-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent hidden lg:block"/>

        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-violet-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-black">Z</span>
            </div>
            <span className="text-white font-bold text-lg">Zenska CRM</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Welcome back</h2>
            <p className="text-white/40 text-sm">Sign in to continue to your workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">Email address</label>
              <input type="email" required autoComplete="email" suppressHydrationWarning
                className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-primary-500/60 focus:bg-white/8 text-white placeholder-white/20 rounded-xl px-4 py-3.5 text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-primary-500/20"
                value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="you@company.com"/>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-white/50 uppercase tracking-widest">Password</label>
                <Link href="/forgot-password" className="text-xs text-primary-400 hover:text-primary-300 font-medium transition-colors">Forgot password?</Link>
              </div>
              <div className="relative" suppressHydrationWarning>
                <input type={show?'text':'password'} required autoComplete="current-password" suppressHydrationWarning
                  className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-primary-500/60 text-white placeholder-white/20 rounded-xl px-4 py-3.5 text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 pr-12"
                  value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} placeholder="••••••••"/>
                <button type="button" onClick={()=>setShow(s=>!s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                  {show
                    ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  }
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full relative overflow-hidden py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200 disabled:opacity-50 mt-2"
              style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)'}}>
              <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity" style={{background:'linear-gradient(135deg,#4f46e5,#7c3aed)'}}/>
              <span className="relative flex items-center justify-center gap-2">
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Signing in…</>
                  : <>Sign In <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg></>
                }
              </span>
            </button>
          </form>

          <p className="text-center text-sm text-white/30 mt-6">
            Don't have an account?{' '}
            <Link href="/signup" className="text-primary-400 hover:text-primary-300 font-semibold transition-colors">Create one free →</Link>
          </p>

          {/* Security note */}
          <div className="mt-8 flex items-center justify-center gap-4 text-[11px] text-white/20">
            <span className="flex items-center gap-1"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>256-bit SSL</span>
            <span className="w-1 h-1 rounded-full bg-white/20"/>
            <span>SOC 2 Ready</span>
            <span className="w-1 h-1 rounded-full bg-white/20"/>
            <span>GDPR Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
}
