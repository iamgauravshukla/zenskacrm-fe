'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/constants';
import Link from 'next/link';

const STATUS_STYLE: Record<string,string> = {
  scheduled: 'bg-blue-50 text-blue-700 border-blue-100',
  'no-show': 'bg-red-50 text-red-600 border-red-100',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

const nowMin = () => { const d=new Date(); d.setSeconds(0,0); d.setMinutes(d.getMinutes()+1); return d.toISOString().slice(0,16); };

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { document.title = 'Meetings | Zenska CRM'; }, []);
  const [filter, setFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [team, setTeam] = useState<any[]>([]);
  const [form, setForm] = useState({ leadId:'', scheduledAt:'', type:'call', notes:'', agenda:'', assignedTo:'', meetLink:'', address:'' });
  const [dateError, setDateError] = useState('');
  const [saving, setSaving] = useState(false);

  // Lead search combobox state
  const [leadSearch, setLeadSearch]   = useState('');
  const [leadOptions, setLeadOptions] = useState<any[]>([]);
  const [leadLoading, setLeadLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showLeadDrop, setShowLeadDrop] = useState(false);
  const leadDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leadBoxRef = useRef<HTMLDivElement>(null);

  const searchLeads = useCallback((q: string) => {
    if (leadDebounceRef.current) clearTimeout(leadDebounceRef.current);
    leadDebounceRef.current = setTimeout(async () => {
      if (!q.trim()) { setLeadOptions([]); return; }
      setLeadLoading(true);
      try {
        const r = await api.get('/leads', { params: { search: q, limit: 10 } });
        setLeadOptions(r.data.leads || []);
        setShowLeadDrop(true);
      } catch {} finally { setLeadLoading(false); }
    }, 300);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (leadBoxRef.current && !leadBoxRef.current.contains(e.target as Node))
        setShowLeadDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/meetings', { params: filter ? { status: filter } : {} });
      setMeetings(r.data);
    } catch {
      toast.error('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [filter]);
  useEffect(() => {
    api.get('/team').then(r => setTeam(r.data)).catch(() => {});
  }, []);

  const setF = (k:string) => (e:React.ChangeEvent<any>) => {
    const v = e.target.value;
    if (k==='scheduledAt') setDateError(v&&new Date(v)<new Date()?'Cannot schedule in the past':'');
    setForm(p=>({...p,[k]:v}));
  };

  const schedule = async (e:React.FormEvent) => {
    e.preventDefault();
    if (!form.scheduledAt||new Date(form.scheduledAt)<new Date()) { setDateError('Choose a future date'); return; }
    setSaving(true);
    try {
      await api.post('/meetings', form);
      toast.success(form.type==='video'?'Meeting scheduled — Calendly link generated!':'Meeting scheduled');
      setShowModal(false);
      setForm({leadId:'',scheduledAt:'',type:'call',notes:'',agenda:'',assignedTo:'',meetLink:'',address:''});
      setLeadSearch(''); setSelectedLead(null); setLeadOptions([]);
      load();
    } catch (err:any) { toast.error(err.response?.data?.message||'Failed to schedule meeting'); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id:string, status:string) => {
    try { await api.patch(`/meetings/${id}/status`,{status}); toast.success('Updated'); load(); }
    catch { toast.error('Failed'); }
  };

  const stats = { total: meetings.length, scheduled: meetings.filter(m=>m.status==='scheduled').length, completed: meetings.filter(m=>m.status==='completed').length, noShow: meetings.filter(m=>m.status==='no-show').length };

  return (
    <div className="p-4 sm:p-7 space-y-4 sm:space-y-6 bg-mesh min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-xl sm:text-2xl font-bold text-ink">Meetings</h1><p className="text-ink-muted text-sm mt-0.5">{meetings.length} total meetings</p></div>
              <button onClick={()=>setShowModal(true)} className="btn-primary text-sm">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          Schedule Meeting
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[['Total',stats.total,'bg-slate-100 text-slate-600'],['Scheduled',stats.scheduled,'bg-blue-100 text-blue-700'],['Completed',stats.completed,'bg-emerald-100 text-emerald-700'],['No Show',stats.noShow,'bg-red-100 text-red-600']].map(([l,v,c])=>(
          <div key={l as string} className="card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold ${c}`}>{v}</div>
            <p className="text-sm font-semibold text-ink-secondary">{l}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[['','All'],['scheduled','Scheduled'],['completed','Completed'],['no-show','No Show']].map(([v,l])=>(
          <button key={v} onClick={()=>setFilter(v)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${filter===v?'bg-primary-500 text-white border-primary-500 shadow-sm':'bg-white text-ink-secondary border-surface-border hover:border-ink-subtle hover:bg-surface-subtle'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full">
            <thead className="bg-surface-subtle border-b border-surface-border">
              <tr>{['Lead','Type','Scheduled','Status','Calendly Link','Assigned','Actions'].map(h=><th key={h} className="table-header">{h}</th>)}</tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_,i)=><tr key={i} className="border-b border-surface-border">{[...Array(7)].map((_,j)=><td key={j} className="table-cell"><div className="h-4 skeleton rounded-lg"/></td>)}</tr>)
              ) : meetings.length===0 ? (
                <tr><td colSpan={7} className="py-16 text-center"><div className="flex flex-col items-center gap-3"><div className="w-12 h-12 bg-surface-muted rounded-2xl flex items-center justify-center text-2xl">📅</div><p className="text-ink-secondary font-semibold">No meetings found</p></div></td></tr>
              ) : meetings.map(m=>(
                <tr key={m._id} className="table-row group">
                  <td className="table-cell">
                    <Link href={`/leads/${m.leadId?._id}`} className="font-semibold text-ink hover:text-primary-500 text-sm transition-colors">{m.leadId?.name}</Link>
                    <p className="text-[10px] text-ink-muted">{m.leadId?.brand}</p>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm capitalize text-ink-secondary">
                      {m.type==='video'?'🎥':m.type==='call'?'📞':'🤝'} {m.type}
                    </span>
                  </td>
                  <td className="table-cell whitespace-nowrap">
                    <p className="text-sm font-medium text-ink-secondary">{formatDate(m.scheduledAt)}</p>
                    <p className="text-[10px] text-ink-muted">{new Date(m.scheduledAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</p>
                  </td>
                  <td className="table-cell"><span className={`badge border ${STATUS_STYLE[m.status]||'bg-surface-muted text-ink-secondary border-surface-border'}`}>{m.status}</span></td>
                  <td className="table-cell">
                    {m.type === 'video' && m.meetLink ? (
                      <div className="flex items-center gap-1.5">
                        <a href={m.meetLink} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] bg-primary-50 hover:bg-primary-100 text-primary-700 border border-primary-100 px-2.5 py-1.5 rounded-xl font-semibold transition-colors">
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                          Join
                        </a>
                        <button onClick={()=>{navigator.clipboard.writeText(m.meetLink);toast.success('Copied!');}} className="btn-ghost btn-icon btn-sm text-ink-muted">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                        </button>
                      </div>
                    ) : m.type === 'in-person' && m.address ? (
                      <span className="text-xs text-ink-secondary">📍 {m.address}</span>
                    ) : (
                      <span className="text-xs text-ink-muted">—</span>
                    )}
                  </td>
                  <td className="table-cell text-xs text-ink-secondary">{m.assignedTo?.name||'—'}</td>
                  <td className="table-cell">
                    {m.status==='scheduled' && (
                      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={()=>updateStatus(m._id,'completed')} className="text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1.5 rounded-xl font-semibold transition-colors border border-emerald-100">✓ Done</button>
                        <button onClick={()=>updateStatus(m._id,'no-show')} className="text-[11px] bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1.5 rounded-xl font-semibold transition-colors border border-red-100">✗ No Show</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule modal */}
      {showModal && (
        <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto scrollbar-none animate-slide-up">
            <div className="sticky top-0 bg-white rounded-t-3xl flex items-center justify-between px-6 py-4 border-b border-surface-border z-10">
              <h2 className="font-bold text-ink text-lg">Schedule Meeting</h2>
              <button onClick={()=>{setShowModal(false);setDateError('');setLeadSearch('');setSelectedLead(null);setLeadOptions([]);}} className="btn-ghost btn-icon text-ink-muted"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
            <form onSubmit={schedule} className="p-6 space-y-4">
              <div>
                <label className="label">Lead *</label>
                <div ref={leadBoxRef} className="relative">
                  <input
                    className="input pr-8"
                    placeholder="Search lead by name, phone, brand…"
                    value={leadSearch}
                    onChange={e => { setLeadSearch(e.target.value); searchLeads(e.target.value); if (!e.target.value) { setSelectedLead(null); setForm(p=>({...p,leadId:''})); } }}
                    onFocus={() => leadOptions.length && setShowLeadDrop(true)}
                    autoComplete="off"
                    required={!form.leadId}
                  />
                  {leadLoading && <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin"/>}
                  {showLeadDrop && leadOptions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-surface-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {leadOptions.map(l => (
                        <button key={l._id} type="button"
                          className="w-full text-left px-3 py-2.5 hover:bg-surface-subtle text-sm transition-colors"
                          onMouseDown={() => {
                            setSelectedLead(l);
                            setForm(p => ({ ...p, leadId: l._id }));
                            setLeadSearch(`${l.name}${l.brand && l.brand !== 'No Brand' ? ` — ${l.brand}` : ''}`);
                            setShowLeadDrop(false);
                          }}>
                          <p className="font-medium text-ink">{l.name}</p>
                          <p className="text-[11px] text-ink-muted">{l.brand} · {l.phone}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {leadSearch && !selectedLead && leadOptions.length === 0 && !leadLoading && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-surface-border rounded-xl shadow-lg px-3 py-3 text-sm text-ink-muted">No leads found</div>
                  )}
                </div>
                {/* Hidden validation anchor */}
                <input type="text" className="sr-only" value={form.leadId} required readOnly tabIndex={-1}/>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Date & Time *</label>
                  <input required type="datetime-local" min={nowMin()} className={`input ${dateError?'border-red-400 ring-red-400/20':''}`} value={form.scheduledAt} onChange={setF('scheduledAt')}/>
                  {dateError && <p className="text-xs text-red-500 mt-1">{dateError}</p>}
                </div>
                <div>
                  <label className="label">Type *</label>
                  <select required className="input" value={form.type} onChange={setF('type')}>
                    <option value="call">📞 Call</option>
                    <option value="video">🎥 Video (Calendly)</option>
                    <option value="in-person">🤝 In-Person</option>
                  </select>
                </div>
              </div>
              {form.type==='video' && (
                <div className="space-y-1.5">
                  <label className="label">Meeting Link</label>
                  <input className="input" placeholder="Paste Google Meet / Zoom link here…" value={form.meetLink} onChange={setF('meetLink')}/>
                  <p className="text-[11px] text-ink-muted">Create the meeting on Google Calendar or Zoom, then paste the link above. It will be shown on the lead's detail page and emailed to the lead.</p>
                </div>
              )}
              {form.type==='in-person' && (
                <div className="space-y-1.5">
                  <label className="label">Address / Location</label>
                  <input className="input" placeholder="e.g. 123 Main St, Mumbai or Coffee at Starbucks Bandra…" value={form.address} onChange={setF('address')}/>
                </div>
              )}
              <div>
                <label className="label">Assigned To</label>
                <select className="input" value={form.assignedTo} onChange={setF('assignedTo')}>
                  <option value="">Default (lead assignee)</option>
                  {team.map(m=><option key={m._id} value={m._id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Agenda</label>
                <input className="input" value={form.agenda} onChange={setF('agenda')} placeholder="Brief agenda for this meeting…"/>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input resize-none h-20" value={form.notes} onChange={setF('notes')} placeholder="Any preparation notes…"/>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={()=>{setShowModal(false);setDateError('');setLeadSearch('');setSelectedLead(null);setLeadOptions([]);}} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving || !!dateError} className="btn-primary flex-1">
                  {saving ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Scheduling…</> : 'Schedule →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
