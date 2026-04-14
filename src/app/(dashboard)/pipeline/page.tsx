'use client';
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { formatDate } from '@/lib/constants';

const OB_STEP: Record<string,number> = {'Onboarding Started':1,'Requirement Discussion':2,'Documents Collected':3,'Offer / Invite Sent':4,'Final Confirmation':5,'Onboarding Completed':6};
const OB_STAGES = Object.keys(OB_STEP);
const CARDS_PER_COL = 20;

const COLS = [
  {key:'New Lead',            label:'New Lead',    accent:'bg-sky-400',    bg:'bg-sky-50',    border:'border-sky-200',    head:'text-sky-700'},
  {key:'In Process',          label:'In Process',  accent:'bg-amber-400',  bg:'bg-amber-50',  border:'border-amber-200',  head:'text-amber-700'},
  {key:'Meeting Scheduled',   label:'Meeting 📅',  accent:'bg-violet-400', bg:'bg-violet-50', border:'border-violet-200', head:'text-violet-700'},
  {key:'Meeting Completed',   label:'Met ✓',       accent:'bg-indigo-400', bg:'bg-indigo-50', border:'border-indigo-200', head:'text-indigo-700'},
  {key:'Onboarding Started',  label:'Onboarding',  accent:'bg-orange-400', bg:'bg-orange-50', border:'border-orange-200', head:'text-orange-700'},
  {key:'Onboarding Completed',label:'OB Done ✅',  accent:'bg-emerald-500',bg:'bg-emerald-50',border:'border-emerald-200',head:'text-emerald-700'},
  {key:'Offer Sent / Closed', label:'Closed 🎉',   accent:'bg-slate-400',  bg:'bg-slate-50',  border:'border-slate-200',  head:'text-slate-600'},
];

const getStageDate = (lead:any, stage:string) => {
  if (!lead.stageHistory?.length) return null;
  const h = [...lead.stageHistory].reverse().find((h:any) => h.stage === stage);
  return h ? new Date(h.enteredAt) : null;
};

const nowMin = () => { const d=new Date(); d.setSeconds(0,0); d.setMinutes(d.getMinutes()+1); return d.toISOString().slice(0,16); };

export default function PipelinePage() {
  // Per-column lead arrays, counts, pages, loading flags
  const [colLeads,   setColLeads]   = useState<Record<string, any[]>>({});
  const [colCounts,  setColCounts]  = useState<Record<string, number>>({});
  const [colPages,   setColPages]   = useState<Record<string, number>>({});
  const [colLoading, setColLoading] = useState<Record<string, boolean>>({});
  const [loading,    setLoading]    = useState(true);
  useEffect(() => { document.title = 'Pipeline | Zenska CRM'; }, []);

  const [dragging,    setDragging]    = useState<string|null>(null);
  const [dragOver,    setDragOver]    = useState<string|null>(null);
  const [expandedOB,  setExpandedOB]  = useState<string|null>(null);
  const [obRecords,   setObRecords]   = useState<Record<string,string>>({});
  const [team,        setTeam]        = useState<any[]>([]);

  const [meetingModal, setMeetingModal] = useState<{leadId:string;leadName:string}|null>(null);
  const [meetForm,     setMeetForm]     = useState({ scheduledAt:'', type:'call', agenda:'', notes:'', assignedTo:'', meetLink:'', address:'' });
  const [meetError,    setMeetError]    = useState('');
  const [meetSaving,   setMeetSaving]   = useState(false);

  // ── Fetch one column (page 1 = replace, page 2+ = append) ──────────────────
  const fetchCol = useCallback(async (stage: string, page = 1, append = false) => {
    setColLoading(p => ({ ...p, [stage]: true }));
    try {
      const res = await api.get('/leads', {
        params: { stage, page, limit: CARDS_PER_COL, withOnboarding: 'true' },
      });
      const newLeads: any[] = res.data.leads || [];
      setColLeads(p => ({
        ...p,
        [stage]: append ? [...(p[stage] || []), ...newLeads] : newLeads,
      }));
      setColPages(p => ({ ...p, [stage]: page }));
    } catch {
      if (!append) toast.error(`Failed to load ${stage}`);
    } finally {
      setColLoading(p => ({ ...p, [stage]: false }));
    }
  }, []);

  // ── Refresh counts only (cheap aggregation) ────────────────────────────────
  const refreshCounts = useCallback(() =>
    api.get('/leads/stage-counts').then(r => setColCounts(r.data)).catch(() => {}),
  []);

  // ── Initial load: counts + page 1 of all columns in parallel ───────────────
  const init = useCallback(async () => {
    setLoading(true);
    try {
      const [countsRes, obRes] = await Promise.all([
        api.get('/leads/stage-counts'),
        api.get('/onboarding'),
      ]);
      setColCounts(countsRes.data);
      const map: Record<string,string> = {};
      obRes.data.forEach((r:any) => { const lid = r.leadId?._id || r.leadId; if (lid) map[lid] = r._id; });
      setObRecords(map);
      // 7 columns in parallel
      await Promise.all(COLS.map(c => fetchCol(c.key, 1, false)));
    } catch {
      toast.error('Failed to load pipeline');
    } finally {
      setLoading(false);
    }
  }, [fetchCol]);

  useEffect(() => { init(); }, [init]);
  useEffect(() => { api.get('/team').then(r => setTeam(r.data)).catch(() => {}); }, []);

  // ── Load next page for a column ────────────────────────────────────────────
  const loadMore = (stage: string) => fetchCol(stage, (colPages[stage] || 1) + 1, true);
  const hasMore  = (stage: string) => (colLeads[stage]?.length || 0) < (colCounts[stage] || 0);

  // ── Drag & drop ────────────────────────────────────────────────────────────
  const onDrop = async (e: React.DragEvent, toStage: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('leadId');
    setDragging(null); setDragOver(null);

    let lead: any = null;
    let fromStage = '';
    for (const [s, arr] of Object.entries(colLeads)) {
      const found = arr.find(l => l._id === id);
      if (found) { lead = found; fromStage = s; break; }
    }
    if (!lead || fromStage === toStage) return;

    if (toStage === 'Meeting Scheduled') {
      setMeetingModal({ leadId: lead._id, leadName: lead.name });
      setMeetForm({ scheduledAt:'', type:'call', agenda:'', notes:'', assignedTo:'', meetLink:'', address:'' });
      setMeetError('');
      return;
    }

    // Optimistic: move card immediately
    setColLeads(p => ({
      ...p,
      [fromStage]: (p[fromStage] || []).filter(l => l._id !== id),
      [toStage]:   [{ ...lead, stage: toStage }, ...(p[toStage] || [])],
    }));
    setColCounts(p => ({
      ...p,
      [fromStage]: Math.max(0, (p[fromStage] || 1) - 1),
      [toStage]:   (p[toStage] || 0) + 1,
    }));

    try {
      await api.patch(`/leads/${id}/stage`, { stage: toStage });
      toast.success(`→ ${toStage}`);
      // Refresh only the two affected columns (re-sort by updatedAt)
      fetchCol(fromStage, 1, false);
      fetchCol(toStage,   1, false);
    } catch {
      toast.error('Failed to move lead');
      fetchCol(fromStage, 1, false);
      fetchCol(toStage,   1, false);
      refreshCounts();
    }
  };

  // ── Schedule meeting ───────────────────────────────────────────────────────
  const scheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetForm.scheduledAt || new Date(meetForm.scheduledAt) < new Date()) {
      setMeetError('Choose a future date and time'); return;
    }
    if (!meetingModal) return;
    setMeetSaving(true);
    try {
      await api.post('/meetings', {
        leadId:      meetingModal.leadId,
        scheduledAt: meetForm.scheduledAt,
        type:        meetForm.type,
        agenda:      meetForm.agenda,
        notes:       meetForm.notes,
        assignedTo:  meetForm.assignedTo || undefined,
        meetLink:    meetForm.type === 'video'     ? meetForm.meetLink  : undefined,
        address:     meetForm.type === 'in-person' ? meetForm.address   : undefined,
      });
      toast.success('Meeting scheduled & pipeline updated!');
      setMeetingModal(null);
      // createMeeting API auto-moves lead → Meeting Scheduled; refresh that col + counts
      fetchCol('Meeting Scheduled', 1, false);
      refreshCounts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to schedule meeting');
    } finally { setMeetSaving(false); }
  };

  // ── Onboarding sub-stage ───────────────────────────────────────────────────
  const updateOBStage = async (leadId: string, stage: string) => {
    const recId = obRecords[leadId];
    if (!recId) { toast.error('Onboarding record not found'); return; }
    try {
      await api.patch(`/onboarding/${recId}/stage`, { stage });
      setColLeads(p => {
        const updated = { ...p };
        for (const colStage of Object.keys(updated)) {
          updated[colStage] = updated[colStage].map(l =>
            l._id === leadId ? { ...l, onboardingStage: stage } : l
          );
        }
        return updated;
      });
      toast.success(`Onboarding → ${stage.replace('Onboarding ','').replace(' Sent','')}`);
    } catch { toast.error('Failed'); }
  };

  const totalLeads = Object.values(colCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="p-4 sm:p-7 h-full flex flex-col bg-mesh">
      <div className="mb-4 sm:mb-6 flex items-center justify-between">
        <div><h1 className="text-xl sm:text-2xl font-bold text-ink">Pipeline</h1><p className="text-ink-muted text-xs sm:text-sm mt-0.5">Drag and drop leads across stages · {totalLeads} total</p></div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="flex flex-col items-center gap-3"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"/><p className="text-sm text-ink-muted">Loading pipeline…</p></div>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4 flex-1 scrollbar-none items-start -mx-4 sm:mx-0 px-4 sm:px-0">
          {COLS.map(({key,label,accent,bg,border,head}) => {
            const col          = colLeads[key] || [];
            const count        = colCounts[key] || 0;
            const isOB         = key==='Onboarding Started'||key==='Onboarding Completed';
            const isTarget     = dragOver===key;
            const isLoadingMore = colLoading[key] && col.length > 0;
            const isColLoading  = colLoading[key] && col.length === 0;
            const moreAvailable = hasMore(key);
            return (
              <div key={key} className="flex-shrink-0 w-[210px]"
                onDragOver={e=>{e.preventDefault();setDragOver(key);}}
                onDragLeave={()=>setDragOver(null)}
                onDrop={e=>onDrop(e,key)}>
                <div className={`rounded-2xl border-2 p-3 flex flex-col gap-2 transition-all duration-200 min-h-[200px] ${isTarget?'border-primary-400 bg-primary-50/40 shadow-glow':`${border} ${bg}`}`}>
                  {/* Header */}
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${accent}`}/>
                      <span className={`text-xs font-bold ${isTarget?'text-primary-600':head}`}>{label}</span>
                    </div>
                    <span className="bg-white text-ink-secondary text-[10px] font-bold min-w-[20px] h-5 rounded-full flex items-center justify-center shadow-xs border border-surface-border px-1">
                      {count}
                    </span>
                  </div>

                  {/* Initial column loading skeleton */}
                  {isColLoading && (
                    [...Array(3)].map((_,i) => (
                      <div key={i} className="bg-white rounded-xl border border-surface-border p-3 animate-pulse">
                        <div className="h-3 skeleton rounded w-3/4 mb-2"/>
                        <div className="h-2 skeleton rounded w-1/2"/>
                      </div>
                    ))
                  )}

                  {!isColLoading && col.length===0 && (
                    <div className={`h-16 rounded-xl border-2 border-dashed flex items-center justify-center text-[10px] font-medium transition-colors ${isTarget?'border-primary-400 text-primary-400 bg-primary-50':'border-surface-border text-ink-muted'}`}>
                      Drop here
                    </div>
                  )}

                  {col.map(lead => {
                    const sd = getStageDate(lead, key);
                    const isExp = expandedOB===lead._id;
                    return (
                      <div key={lead._id} draggable
                        onDragStart={e=>{e.dataTransfer.setData('leadId',lead._id);setDragging(lead._id);}}
                        onDragEnd={()=>setDragging(null)}
                        className={`bg-white rounded-xl border border-surface-border shadow-xs hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing select-none ${dragging===lead._id?'opacity-40 scale-90 rotate-1':''}`}>
                        <div className="p-3">
                          <div className="flex items-start gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{background:lead.tagColor||'#6366f1'}}/>
                            <Link href={`/leads/${lead._id}`} onClick={e=>e.stopPropagation()}
                              className="text-xs font-semibold text-ink hover:text-primary-500 leading-snug transition-colors line-clamp-2">
                              {lead.name}
                            </Link>
                          </div>
                          <p className="text-[10px] text-ink-muted ml-3.5 truncate">{lead.brand||'No Brand'}</p>

                          {sd && (
                            <div className="ml-3.5 mt-1.5 flex items-center gap-1 text-[9px] text-ink-muted">
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                              {formatDate(sd)}
                            </div>
                          )}

                          {lead.source==='Meta Ads' && <span className="ml-3.5 mt-1 inline-block text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md font-semibold">📘 Meta</span>}

                          {isOB && lead.onboardingStage && (
                            <div className="mt-2 ml-3.5">
                              <button onClick={()=>setExpandedOB(isExp?null:lead._id)} className="w-full text-left">
                                <div className="flex items-center justify-between text-[9px] text-orange-600 mb-1">
                                  <span className="font-semibold truncate max-w-[90px]">{lead.onboardingStage.replace('Onboarding ','').replace(' Sent','')}</span>
                                  <span className="text-ink-muted">{OB_STEP[lead.onboardingStage]||1}/6</span>
                                </div>
                                <div className="h-1 bg-orange-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-orange-400 rounded-full transition-all" style={{width:`${((OB_STEP[lead.onboardingStage]||1)/6)*100}%`}}/>
                                </div>
                              </button>
                              {isExp && (
                                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto scrollbar-none">
                                  {OB_STAGES.map(s=>(
                                    <button key={s} onClick={()=>updateOBStage(lead._id,s)}
                                      className={`w-full text-left text-[9px] px-2 py-1.5 rounded-lg transition-colors font-medium ${
                                        lead.onboardingStage===s?'bg-primary-500 text-white':
                                        (OB_STEP[s]||0)<(OB_STEP[lead.onboardingStage]||0)?'bg-primary-50 text-primary-600':'text-ink-muted hover:bg-surface-subtle'
                                      }`}>{(OB_STEP[s]||0)<(OB_STEP[lead.onboardingStage]||0)?'✓ ':''}{s.replace('Onboarding ','').replace(' Sent','').replace('Offer / ','')}</button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {lead.assignedTo && (
                            <div className="mt-2 flex items-center gap-1 ml-3.5">
                              <div className="w-4 h-4 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-[8px] font-bold">{lead.assignedTo.name?.[0]?.toUpperCase()}</div>
                              <span className="text-[9px] text-ink-muted truncate">{lead.assignedTo.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Load more button */}
                  {moreAvailable && (
                    <button
                      onClick={() => loadMore(key)}
                      disabled={isLoadingMore}
                      className="w-full text-center text-[10px] font-semibold text-ink-muted hover:text-primary-500 py-2 rounded-xl hover:bg-white/70 border border-dashed border-surface-border hover:border-primary-300 transition-all disabled:opacity-50">
                      {isLoadingMore
                        ? <span className="inline-block w-3 h-3 border-2 border-ink-muted border-t-transparent rounded-full animate-spin"/>
                        : `+${count - col.length} more`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Meeting Scheduling Modal */}
      {meetingModal && (
        <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto scrollbar-none animate-slide-up">
            <div className="sticky top-0 bg-white rounded-t-3xl sm:rounded-t-3xl z-10">
              <div className="bg-gradient-to-r from-violet-500 to-primary-600 rounded-t-3xl px-6 py-5">
                <h2 className="font-bold text-white text-lg">Schedule Meeting</h2>
                <p className="text-violet-200 text-sm mt-0.5">for <strong className="text-white">{meetingModal.leadName}</strong></p>
              </div>
            </div>
            <form onSubmit={scheduleMeeting} className="p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Date & Time *</label>
                  <input required type="datetime-local" min={nowMin()}
                    className={`input ${meetError?'border-red-400 ring-red-400/20':''}`}
                    value={meetForm.scheduledAt}
                    onChange={e=>{setMeetError('');setMeetForm(p=>({...p,scheduledAt:e.target.value}));}}/>
                  {meetError && <p className="text-xs text-red-500 mt-1">{meetError}</p>}
                </div>
                <div>
                  <label className="label">Meeting Type *</label>
                  <select required className="input" value={meetForm.type}
                    onChange={e=>setMeetForm(p=>({...p,type:e.target.value,meetLink:'',address:''}))}
                  >
                    <option value="call">📞 Phone Call</option>
                    <option value="video">🎥 Video Call</option>
                    <option value="in-person">🤝 In-Person</option>
                  </select>
                </div>
              </div>
              {meetForm.type==='video' && (
                <div className="space-y-1.5">
                  <label className="label">Meeting Link</label>
                  <input className="input" placeholder="Paste Google Meet / Zoom link here…"
                    value={meetForm.meetLink}
                    onChange={e=>setMeetForm(p=>({...p,meetLink:e.target.value}))}/>
                  <p className="text-[11px] text-ink-muted">Create the meeting on Google Calendar or Zoom, then paste the link above.</p>
                </div>
              )}
              {meetForm.type==='in-person' && (
                <div>
                  <label className="label">Address / Location</label>
                  <input className="input" placeholder="e.g. 123 Main St, Mumbai or Coffee at Starbucks Bandra…"
                    value={meetForm.address}
                    onChange={e=>setMeetForm(p=>({...p,address:e.target.value}))}/>
                </div>
              )}
              <div>
                <label className="label">Assigned To</label>
                <select className="input" value={meetForm.assignedTo}
                  onChange={e=>setMeetForm(p=>({...p,assignedTo:e.target.value}))}>
                  <option value="">Default (lead assignee)</option>
                  {team.map(m=><option key={m._id} value={m._id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Agenda</label>
                <input className="input" value={meetForm.agenda}
                  onChange={e=>setMeetForm(p=>({...p,agenda:e.target.value}))}
                  placeholder="Brief agenda for this meeting…"/>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input resize-none h-20" value={meetForm.notes}
                  onChange={e=>setMeetForm(p=>({...p,notes:e.target.value}))}
                  placeholder="Any preparation notes…"/>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={()=>setMeetingModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={meetSaving} className="btn-primary flex-1">
                  {meetSaving
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Scheduling…</>
                    : '📅 Schedule & Move →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

