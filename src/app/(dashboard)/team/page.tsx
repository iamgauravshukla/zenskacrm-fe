'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/constants';

export default function TeamPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { document.title = 'Team | Zenska CRM'; }, []);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name:'', email:'', role:'member', password:'' });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => { setLoading(true); api.get('/team').then(r=>setMembers(r.data)).finally(()=>setLoading(false)); };
  useEffect(() => { load(); }, []);

  const addMember = async (e:React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setSaving(true);
    try {
      await api.post('/team/member', form);
      toast.success(`${form.name} added successfully!`);
      setForm({ name:'', email:'', role:'member', password:'' });
      setShowAdd(false);
      load();
    }
    catch (err:any) { toast.error(err.response?.data?.message || 'Failed to add member'); }
    finally { setSaving(false); }
  };

  const changeRole = async (id:string, role:string) => {
    try { await api.patch(`/team/${id}/role`,{role}); toast.success('Role updated'); load(); }
    catch { toast.error('Failed'); }
  };

  const remove = async (id:string, name:string) => {
    if (!confirm(`Remove ${name}?`)) return;
    try { await api.delete(`/team/${id}`); toast.success('Removed'); load(); }
    catch { toast.error('Failed'); }
  };

  const isAdmin = user?.role==='admin';

  return (
    <div className="p-4 sm:p-7 space-y-4 sm:space-y-6 bg-mesh min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-xl sm:text-2xl font-bold text-ink">Team</h1><p className="text-ink-muted text-sm mt-0.5">{members.length} members in this workspace</p></div>
        {isAdmin && <button onClick={()=>setShowAdd(true)} className="btn-primary text-sm"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>Add Member</button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? [...Array(3)].map((_,i)=>(
          <div key={i} className="card p-5 animate-pulse"><div className="flex gap-3 mb-4"><div className="w-12 h-12 skeleton rounded-2xl"/><div className="flex-1 space-y-2"><div className="h-4 skeleton rounded w-2/3"/><div className="h-3 skeleton rounded w-1/2"/></div></div></div>
        )) : members.map(m=>(
          <div key={m._id} className="card p-5 hover:shadow-lg transition-all duration-200 group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-violet-500 rounded-2xl flex items-center justify-center text-white text-lg font-bold shadow-md flex-shrink-0">
                  {m.name[0].toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-bold text-ink">{m.name}</p>
                    {m._id===user?._id && <span className="chip bg-primary-50 text-primary-600 text-[10px]">You</span>}
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5">{m.email}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              {isAdmin && m._id!==user?._id ? (
                <select value={m.role} onChange={e=>changeRole(m._id,e.target.value)}
                  className="text-xs border border-surface-border rounded-xl px-3 py-1.5 bg-white text-ink-secondary font-medium focus:outline-none focus:ring-2 focus:ring-primary-400/30">
                  <option value="admin">Admin</option><option value="member">Member</option>
                </select>
              ) : (
                <span className={`badge ${m.role==='admin'?'bg-violet-100 text-violet-700':'bg-surface-muted text-ink-secondary'}`}>{m.role}</span>
              )}
              {isAdmin && m._id!==user?._id && (
                <button onClick={()=>remove(m._id,m.name)} className="btn-ghost btn-icon btn-sm text-ink-muted hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-surface-border flex justify-between text-[11px] text-ink-muted">
              <span>Joined {formatDate(m.createdAt)}</span>
              {m.lastLogin && <span>Last seen {formatDate(m.lastLogin)}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Add Member modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="bg-gradient-to-br from-primary-500 to-violet-600 p-6">
              <h2 className="text-xl font-bold text-white">Add Team Member</h2>
              <p className="text-primary-200 text-sm mt-1">Create an account — they can log in immediately</p>
            </div>
            <form onSubmit={addMember} className="p-6 space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input required className="input" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="Jane Doe"/>
              </div>
              <div>
                <label className="label">Email Address *</label>
                <input required type="email" className="input" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="jane@company.com"/>
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))}>
                  <option value="member">Member — view &amp; edit leads</option>
                  <option value="admin">Admin — full access</option>
                </select>
              </div>
              <div>
                <label className="label">Password *</label>
                <div className="relative">
                  <input required type={showPw ? 'text' : 'password'} className="input pr-10" minLength={8}
                    value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} placeholder="Min. 8 characters"/>
                  <button type="button" onClick={()=>setShowPw(v=>!v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink transition-colors p-1">
                    {showPw
                      ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/></svg>
                      : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>}
                  </button>
                </div>
                <p className="text-[11px] text-ink-muted mt-1">Share this password with the team member so they can log in.</p>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={()=>{setShowAdd(false);setForm({name:'',email:'',role:'member',password:''}); setShowPw(false);}} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Creating…</> : '+ Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
