'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatRelativeTime, STAGE_COLORS } from '@/lib/constants';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, CartesianGrid } from 'recharts';

const MN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const STAGE_BAR_COLORS: Record<string,string> = {
  'New Lead':'#3b82f6','In Process':'#f59e0b','Meeting Scheduled':'#8b5cf6',
  'Meeting Completed':'#6366f1','Onboarding Started':'#f97316',
  'Onboarding Completed':'#22c55e','Offer Sent / Closed':'#64748b',
};
const BAR_PALETTE = ['#6366f1','#8b5cf6','#a78bfa','#c4b5fd','#818cf8','#6366f1','#8b5cf6'];

const KPI = [
  { key:'totalLeads',        label:'Total Leads',   sub:'All time',         icon:<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>, color:'blue'   },
  { key:'inProcess',         label:'In Process',    sub:'Active now',       icon:<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>, color:'amber'  },
  { key:'meetingsScheduled', label:'Meetings',      sub:'Scheduled',        icon:<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>, color:'violet' },
  { key:'onboardingActive',  label:'Onboarding',    sub:'In progress',      icon:<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>, color:'emerald' },
];

const colorMap: Record<string,{bg:string;icon:string;num:string;border:string}> = {
  blue:    {bg:'bg-blue-50',    icon:'text-blue-500',    num:'text-blue-600',   border:'border-blue-100'},
  amber:   {bg:'bg-amber-50',   icon:'text-amber-500',   num:'text-amber-600',  border:'border-amber-100'},
  violet:  {bg:'bg-violet-50',  icon:'text-violet-500',  num:'text-violet-600', border:'border-violet-100'},
  emerald: {bg:'bg-emerald-50', icon:'text-emerald-500', num:'text-emerald-600',border:'border-emerald-100'},
};

const CustomBarTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white/95 backdrop-blur border border-surface-border rounded-2xl shadow-xl px-4 py-3 text-xs">
      <p className="font-bold text-ink text-sm">{d.full || d.name}</p>
      <div className="flex items-center gap-2 mt-1.5">
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color || '#6366f1' }} />
        <span className="text-ink-secondary">{payload[0].value} leads</span>
        {d.pct != null && <span className="text-ink-muted">({d.pct}%)</span>}
      </div>
    </div>
  );
};

const CustomLineTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur border border-surface-border rounded-2xl shadow-xl px-4 py-3 text-xs">
      <p className="font-bold text-ink text-sm">{label}</p>
      <div className="flex items-center gap-2 mt-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />
        <span className="text-ink-secondary font-semibold">+{payload[0].value} new leads</span>
      </div>
    </div>
  );
};

function CreateWorkspaceModal({ show, onClose, onSubmit, wsName, setWsName, wsCreating }: {
  show: boolean; onClose: () => void; onSubmit: (e: React.FormEvent) => void;
  wsName: string; setWsName: (v: string) => void; wsCreating: boolean;
}) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-ink mb-1">Create Your Workspace</h2>
        <p className="text-sm text-ink-muted mb-4">Give your workspace a name to get started.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <input autoFocus className="input w-full" placeholder="e.g. Zenska CRM" value={wsName} onChange={e => setWsName(e.target.value)} required />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={wsCreating} className="btn-primary">{wsCreating ? 'Creating…' : 'Create Workspace'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, setUser } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateWs, setShowCreateWs] = useState(false);
  const [wsName, setWsName] = useState('');
  const [wsCreating, setWsCreating] = useState(false);

  useEffect(() => { document.title = 'Dashboard | Zenska CRM'; }, []);

  useEffect(() => {
    if (!(user as any)?.workspaceId) { setLoading(false); return; }
    api.get('/dashboard/summary')
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, [user]);

  const createWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsName.trim()) return;
    setWsCreating(true);
    try {
      const res = await api.post('/auth/workspace', { name: wsName.trim() });
      setUser(res.data.user);
      toast.success(`Workspace "${res.data.workspace.name}" created!`);
      setShowCreateWs(false);
      setWsName('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create workspace');
    } finally {
      setWsCreating(false);
    }
  };

  if (loading) return (
    <div className="p-4 sm:p-7 space-y-4 sm:space-y-6">
      <div className="h-8 skeleton w-64 rounded-xl"/>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">{[...Array(4)].map((_,i) => <div key={i} className="h-28 skeleton rounded-2xl"/>)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5"><div className="lg:col-span-2 h-64 skeleton rounded-2xl"/><div className="h-64 skeleton rounded-2xl"/></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5"><div className="lg:col-span-2 h-48 skeleton rounded-2xl"/><div className="h-48 skeleton rounded-2xl"/></div>
    </div>
  );
  if (!data && !(user as any)?.workspaceId) return (
    <div className="p-4 sm:p-7">
      <div className="card p-5 border-l-4 border-amber-400 bg-amber-50 flex items-center justify-between gap-4">
        <div>
          <p className="font-bold text-amber-800 text-sm">No workspace yet</p>
          <p className="text-xs text-amber-600 mt-0.5">Create a workspace to start managing leads, meetings, and inviting your team.</p>
        </div>
        <button onClick={() => setShowCreateWs(true)} className="btn-primary text-sm flex-shrink-0">
          Create Workspace
        </button>
      </div>
      <CreateWorkspaceModal show={showCreateWs} onClose={() => setShowCreateWs(false)} onSubmit={createWorkspace} wsName={wsName} setWsName={setWsName} wsCreating={wsCreating} />
    </div>
  );
  if (!data) return null;

  const stageData = Object.entries(data.stageDistribution || {})
    .map(([name, count]) => ({
      name: name.replace('Onboarding ','OB ').replace('Meeting ','Mtg ').replace(' / Closed',''),
      count, full: name,
      color: STAGE_BAR_COLORS[name] || '#6366f1',
      pct: data.totalLeads > 0 ? Math.round(((count as number) / data.totalLeads) * 100) : 0,
    }))
    .sort((a: any, b: any) => (b.count as number) - (a.count as number));

  const trendData = (data.monthlyTrend || []).map((t: any) => ({
    name: MN[t._id.month - 1],
    leads: t.count,
  }));

  const closedRate = data.totalLeads > 0 ? Math.round(((data.stageDistribution?.['Offer Sent / Closed'] || 0) / data.totalLeads) * 100) : 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="p-4 sm:p-7 space-y-4 sm:space-y-6 min-h-full" style={{background:'radial-gradient(ellipse at top left,rgba(99,102,241,0.04) 0%,transparent 60%)'}}>

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal show={showCreateWs} onClose={() => setShowCreateWs(false)} onSubmit={createWorkspace} wsName={wsName} setWsName={setWsName} wsCreating={wsCreating} />

      {/* No-workspace banner */}
      {!user?.workspaceId && (
        <div className="card p-5 border-l-4 border-amber-400 bg-amber-50 flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-amber-800 text-sm">No workspace yet</p>
            <p className="text-xs text-amber-600 mt-0.5">Create a workspace to start managing leads, meetings, and inviting your team.</p>
          </div>
          <button onClick={() => setShowCreateWs(true)} className="btn-primary text-sm flex-shrink-0">
            Create Workspace
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-ink tracking-tight truncate">{greeting}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-ink-muted text-xs sm:text-sm mt-1">Here's an overview of your sales pipeline</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-full px-3 py-1.5 text-xs font-semibold flex-shrink-0">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"/>Live
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {KPI.map(({ key, label, sub, icon, color }) => {
          const c = colorMap[color];
          return (
            <div key={key} className={`card p-3 sm:p-5 hover:shadow-lg transition-all duration-200 border-l-4 ${c.border}`}>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 ${c.bg} rounded-xl flex items-center justify-center ${c.icon} flex-shrink-0`}>{icon}</div>
                <div className={`text-[10px] sm:text-xs font-semibold ${c.icon} ${c.bg} px-1.5 sm:px-2 py-0.5 rounded-full hidden sm:block`}>{sub}</div>
              </div>
              <div className={`text-2xl sm:text-3xl font-black ${c.num} tracking-tight`}>{(data[key] ?? 0).toLocaleString()}</div>
              <div className="text-xs sm:text-sm font-semibold text-ink-secondary mt-0.5">{label}</div>
            </div>
          );
        })}
      </div>

      {/* Conversion Hero */}
      <div className="card overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-surface-border">
          <div className="p-5 lg:col-span-2 bg-gradient-to-r from-primary-600 to-violet-600 text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{backgroundImage:'radial-gradient(circle at 80%,white,transparent 60%)'}}/>
            <p className="text-primary-200 text-xs font-bold uppercase tracking-widest relative">Conversion Rate</p>
            <div className="text-5xl font-black mt-1 relative">{closedRate}%</div>
            <p className="text-primary-200 text-xs mt-1.5 relative">New Lead → Offer Sent / Closed</p>
            <div className="flex items-center gap-4 sm:gap-6 mt-4 relative flex-wrap">
              <div><div className="text-lg sm:text-xl font-bold">{data.totalLeads}</div><div className="text-xs text-primary-200">Total Leads</div></div>
              <div className="w-px h-10 bg-white/20 hidden sm:block"/>
              <div><div className="text-lg sm:text-xl font-bold">{data.stageDistribution?.['Offer Sent / Closed'] || 0}</div><div className="text-xs text-primary-200">Closed</div></div>
              <div className="w-px h-10 bg-white/20 hidden sm:block"/>
              <div><div className="text-lg sm:text-xl font-bold">{data.meetingsScheduled || 0}</div><div className="text-xs text-primary-200">Meetings</div></div>
            </div>
          </div>
          <div className="p-5 flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-3">Quick Actions</p>
              <div className="space-y-2">
                <Link href="/leads" className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-surface-subtle transition-colors group">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-500 flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                  </div>
                  <span className="text-sm font-medium text-ink-secondary group-hover:text-ink">Add Lead</span>
                </Link>
                <Link href="/meetings" className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-surface-subtle transition-colors group">
                  <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center text-violet-500 flex-shrink-0 group-hover:bg-violet-100 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  </div>
                  <span className="text-sm font-medium text-ink-secondary group-hover:text-ink">Schedule Meeting</span>
                </Link>
                <Link href="/pipeline" className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-surface-subtle transition-colors group">
                  <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-500 flex-shrink-0 group-hover:bg-emerald-100 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                  </div>
                  <span className="text-sm font-medium text-ink-secondary group-hover:text-ink">View Pipeline</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts + Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        <div className="lg:col-span-2 card p-4 sm:p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-5">
            <div><h2 className="section-title">Pipeline Breakdown</h2><p className="text-xs text-ink-muted mt-0.5">Leads per stage</p></div>
            <span className="chip bg-surface-muted text-ink-secondary">{data.totalLeads} total</span>
          </div>
          {stageData.length === 0 ? (
            <div className="flex items-center justify-center h-56 text-ink-muted text-sm flex-col gap-3">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-50 to-violet-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner">📊</div>
              <p className="font-semibold text-ink-secondary">No pipeline data yet</p>
              <p className="text-xs text-ink-muted">Add leads to see your breakdown</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Horizontal bar breakdown */}
              <div className="flex h-4 rounded-full overflow-hidden bg-surface-subtle border border-surface-border">
                {stageData.map((s: any) => (
                  <div key={s.full} className="h-full transition-all duration-700 first:rounded-l-full last:rounded-r-full relative group"
                    style={{ width: `${Math.max(s.pct, 2)}%`, background: s.color }}>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white border border-surface-border rounded-xl shadow-lg px-3 py-1.5 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      <span className="font-bold text-ink">{s.full}</span>
                      <span className="text-ink-muted ml-1.5">{s.count} ({s.pct}%)</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bar chart */}
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={stageData} margin={{left:-16,bottom:0}} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                  <XAxis dataKey="name" tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false} allowDecimals={false}/>
                  <Tooltip content={<CustomBarTooltip/>} cursor={{fill:'rgba(99,102,241,0.04)',radius:4}}/>
                  <Bar dataKey="count" radius={[8,8,0,0]} maxBarSize={48}>
                    {stageData.map((s:any,i:number) => <Cell key={i} fill={s.color}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
                {stageData.map((s: any) => (
                  <div key={s.full} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    <span className="text-[11px] text-ink-secondary font-medium">{s.full}</span>
                    <span className="text-[11px] text-ink-muted font-bold">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card p-4 sm:p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title text-base sm:text-lg">Upcoming Meetings</h2>
            <Link href="/meetings" className="text-xs text-primary-500 font-semibold hover:text-primary-600">View all →</Link>
          </div>
          {!data.upcomingMeetings?.length ? (
            <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
              <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center text-2xl mb-3">📅</div>
              <p className="text-sm font-semibold text-ink-secondary">No upcoming meetings</p>
              <Link href="/meetings" className="text-xs text-primary-500 mt-2 hover:underline">Schedule one →</Link>
            </div>
          ) : (
            <div className="flex-1 space-y-2 overflow-y-auto scrollbar-none">
              {data.upcomingMeetings.map((m: any) => (
                <div key={m._id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-subtle transition-colors group">
                  <div className="w-10 h-10 bg-primary-50 group-hover:bg-primary-100 transition-colors rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-primary-600 text-sm font-black leading-none">{new Date(m.scheduledAt).getDate()}</span>
                    <span className="text-primary-400 text-[9px] font-semibold">{MN[new Date(m.scheduledAt).getMonth()]}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">{m.leadId?.name}</p>
                    <p className="text-xs text-ink-muted capitalize">{m.type} · {new Date(m.scheduledAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Trend + Recent Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Monthly Trend — redesigned */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="p-6 pb-0">
            <div className="flex items-center justify-between mb-5">
              <div><h2 className="section-title">Monthly Lead Trend</h2><p className="text-xs text-ink-muted mt-0.5">New leads over the last 6 months</p></div>
              {trendData.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-1 font-semibold">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                  {trendData.reduce((a: number, t: any) => a + t.leads, 0)} total
                </div>
              )}
            </div>
          </div>
          {trendData.length === 0 ? (
            <div className="flex items-center justify-center h-56 flex-col gap-3 text-ink-muted px-6 pb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-50 to-blue-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner">📈</div>
              <p className="font-semibold text-ink-secondary">No trend data yet</p>
              <p className="text-xs text-ink-muted">Add leads to see your monthly trend</p>
            </div>
          ) : (
            <>
              {/* Mini stat cards */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 px-4 sm:px-6 mb-4">
                {(() => {
                  const last3 = trendData.slice(-3);
                  const colors = ['from-blue-500 to-blue-600','from-violet-500 to-violet-600','from-primary-500 to-primary-600'];
                  return last3.map((t: any, i: number) => {
                    const prev = trendData[trendData.indexOf(t) - 1];
                    const diff = prev ? t.leads - prev.leads : 0;
                    return (
                      <div key={t.name} className={`bg-gradient-to-br ${colors[i % 3]} rounded-2xl p-4 text-white relative overflow-hidden`}>
                        <div className="absolute inset-0 opacity-10" style={{backgroundImage:'radial-gradient(circle at top right,white,transparent 60%)'}}/>
                        <div className="relative">
                          <div className="text-2xl font-black">{t.leads}</div>
                          <div className="text-white/70 text-xs font-semibold mt-0.5">{t.name}</div>
                          {diff !== 0 && (
                            <div className={`text-[10px] font-bold mt-1.5 flex items-center gap-0.5 ${diff > 0 ? 'text-emerald-200' : 'text-red-200'}`}>
                              {diff > 0 ? '↑' : '↓'} {Math.abs(diff)} vs prev
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
              <div className="px-6 pb-1">
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={trendData} margin={{left:-16,top:4,right:8}}>
                    <defs>
                      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2}/>
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                    <XAxis dataKey="name" tick={{fontSize:11,fill:'#94a3b8',fontWeight:600}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} allowDecimals={false}/>
                    <Tooltip content={<CustomLineTooltip/>}/>
                    <Area type="monotone" dataKey="leads" stroke="#6366f1" strokeWidth={2.5}
                      fill="url(#trendFill)"
                      dot={{fill:'#6366f1',r:5,strokeWidth:3,stroke:'#fff'}}
                      activeDot={{r:7,fill:'#6366f1',stroke:'#fff',strokeWidth:3}}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>

        <div className="card p-4 sm:p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title text-base sm:text-lg">Recent Leads</h2>
            <Link href="/leads" className="text-xs text-primary-500 font-semibold hover:text-primary-600">View all →</Link>
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto scrollbar-none">
            {!data.recentLeads?.length ? (
              <div className="flex items-center justify-center h-32 text-ink-muted text-sm flex-col gap-2"><div className="text-3xl">👥</div>No leads yet</div>
            ) : data.recentLeads.slice(0, 7).map((l: any) => (
              <Link href={`/leads/${l._id}`} key={l._id}
                className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-surface-subtle transition-colors group">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 shadow-sm"
                  style={{background: l.tagColor || '#6366f1'}}>{l.name?.[0]?.toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink group-hover:text-primary-600 truncate transition-colors">{l.name}</p>
                  <p className="text-[10px] text-ink-muted">{formatRelativeTime(l.createdAt)}</p>
                </div>
                <span className={`badge text-[10px] ${STAGE_COLORS[l.stage] || 'bg-surface-muted text-ink-secondary'}`}>{l.stage?.split(' ')[0]}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
