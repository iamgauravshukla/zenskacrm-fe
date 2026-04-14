'use client';
import { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err: any) {
      // Show the actual message from the backend (e.g. SMTP not configured)
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Something went wrong. Please try again.';
      toast.error(msg, { duration: 6000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f172a 100%)' }}
    >
      <div className="w-full max-w-sm">
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">Z</span>
            </div>
            <span className="text-white font-semibold">Zenska CRM</span>
          </div>

          {sent ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">📬</div>
              <h2 className="text-xl font-bold text-white mb-2">Check your inbox</h2>
              <p className="text-slate-400 text-sm mb-6">
                If <strong className="text-white">{email}</strong> is registered,
                we've sent reset instructions.
              </p>
              <p className="text-slate-500 text-xs mb-6">
                Don't see it? Check your <strong className="text-slate-400">Spam / Junk</strong> folder.
              </p>
              <Link href="/login" className="text-primary-400 hover:text-primary-300 text-sm font-medium">
                ← Back to Login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-white mb-1">Forgot password?</h2>
              <p className="text-slate-400 text-sm mb-6">
                Enter your email and we'll send you a reset link.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    className="w-full bg-white/10 border border-white/20 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white py-3 rounded-xl font-semibold text-sm transition-all"
                >
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
              <p className="text-center mt-4">
                <Link href="/login" className="text-slate-400 hover:text-slate-200 text-sm">
                  ← Back to Login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
