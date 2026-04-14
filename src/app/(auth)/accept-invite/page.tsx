'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

function AcceptInviteForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';
  const { setUser } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      const res = await api.post('/team/accept-invite', { token, password });
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      toast.success('Account activated! Welcome 🎉');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid or expired invite');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{background:'linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f172a 100%)'}}>
      <div className="w-full max-w-sm">
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="text-white font-bold text-2xl">Z</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Accept Invitation</h2>
            <p className="text-slate-400 text-sm">Set your password to activate your account</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">New Password</label>
              <input type="password" required minLength={8}
                className="w-full bg-white/10 border border-white/20 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm Password</label>
              <input type="password" required
                className="w-full bg-white/10 border border-white/20 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold text-sm">
              {loading ? 'Activating…' : 'Activate Account →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return <Suspense><AcceptInviteForm /></Suspense>;
}
