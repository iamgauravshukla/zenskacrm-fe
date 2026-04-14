'use client';
import { useEffect, useState, useCallback, useRef, memo } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { ONBOARDING_STAGES, formatRelativeTime } from '@/lib/constants';

const STEP: Record<string, number> = {
  'Onboarding Started': 1, 'Requirement Discussion': 2, 'Documents Collected': 3,
  'Offer / Invite Sent': 4, 'Final Confirmation': 5, 'Onboarding Completed': 6,
};

const STYLE: Record<string, { dot: string; bg: string; border: string; text: string; bar: string; light: string }> = {
  'Onboarding Started':    { dot:'bg-orange-400',  bg:'bg-orange-50',  border:'border-orange-200',  text:'text-orange-700',  bar:'bg-orange-400',  light:'bg-orange-100' },
  'Requirement Discussion':{ dot:'bg-yellow-400',  bg:'bg-yellow-50',  border:'border-yellow-200',  text:'text-yellow-700',  bar:'bg-yellow-400',  light:'bg-yellow-100' },
  'Documents Collected':   { dot:'bg-blue-400',    bg:'bg-blue-50',    border:'border-blue-200',    text:'text-blue-700',    bar:'bg-blue-400',    light:'bg-blue-100'   },
  'Offer / Invite Sent':   { dot:'bg-violet-400',  bg:'bg-violet-50',  border:'border-violet-200',  text:'text-violet-700',  bar:'bg-violet-400',  light:'bg-violet-100' },
  'Final Confirmation':    { dot:'bg-indigo-400',  bg:'bg-indigo-50',  border:'border-indigo-200',  text:'text-indigo-700',  bar:'bg-indigo-400',  light:'bg-indigo-100' },
  'Onboarding Completed':  { dot:'bg-emerald-500', bg:'bg-emerald-50', border:'border-emerald-200', text:'text-emerald-700', bar:'bg-emerald-500', light:'bg-emerald-100'},
};

// ── Kanban card — module-level component so it never unmounts mid-drag ────────
// Note input is local state so keystrokes don't cause parent re-renders.
const Card = memo(function Card({
  rec, isDragging, isSaving, onDragStart, onDragEnd, onNoteAdd,
}: {
  rec: any;
  isDragging: boolean;
  isSaving: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onNoteAdd: (id: string, content: string) => Promise<void>;
}) {
  const [note, setNote] = useState('');
  const st = STYLE[rec.stage] || STYLE['Onboarding Started'];
  const progress = Math.round(((STEP[rec.stage] || 1) / 6) * 100);

  const submitNote = async () => {
    const trimmed = note.trim();
    if (!trimmed) return;
    await onNoteAdd(rec._id, trimmed);
    setNote('');
  };

  return (
    <div
      draggable={!isSaving}
      onDragStart={e => {
        e.dataTransfer.setData('recId', rec._id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(rec._id);
      }}
      onDragEnd={onDragEnd}
      className={`bg-white rounded-2xl border border-surface-border shadow-xs hover:shadow-md
        transition-shadow select-none
        ${isDragging ? 'opacity-40 scale-95 rotate-1' : ''}
        ${isSaving ? 'opacity-60 cursor-wait' : 'cursor-grab active:cursor-grabbing'}`}>
      <div className="p-4">
        <div className="flex items-start gap-2 mb-2">
          <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: rec.leadId?.tagColor || '#6366f1' }}/>
          <Link
            href={`/leads/${rec.leadId?._id}`}
            onClick={e => e.stopPropagation()}
            className="text-sm font-semibold text-ink hover:text-primary-500 leading-snug line-clamp-2 transition-colors">
            {rec.leadId?.name || '—'}
          </Link>
        </div>
        <p className="text-[11px] text-ink-muted ml-3.5 mb-3">{rec.leadId?.brand || 'No Brand'}</p>

        <div className="mb-3">
          <div className="flex justify-between text-[10px] mb-1.5">
            <span className="text-ink-muted font-medium">Step {STEP[rec.stage] || 1} of 6</span>
            <span className="font-bold text-ink-secondary">{progress}%</span>
          </div>
          <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${st.bar}`} style={{ width: `${progress}%` }}/>
          </div>
        </div>

        {rec.assignedTo && (
          <div className="flex items-center gap-1.5 mb-3">
            <div className="w-5 h-5 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-[9px] font-bold">
              {rec.assignedTo.name?.[0]?.toUpperCase()}
            </div>
            <span className="text-[10px] text-ink-muted">{rec.assignedTo.name}</span>
          </div>
        )}

        <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
          <input
            className="flex-1 text-[11px] bg-surface-subtle border border-surface-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-400 focus:border-primary-400 transition-all"
            placeholder="Add note…"
            value={note}
            onChange={e => setNote(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitNote(); } }}
          />
          <button onClick={submitNote}
            className="text-[10px] bg-primary-50 hover:bg-primary-100 text-primary-600 px-2 rounded-lg font-bold transition-colors">
            +
          </button>
        </div>

        {rec.notes?.length > 0 && (
          <p className="mt-1.5 text-[10px] text-ink-muted bg-surface-subtle rounded-lg px-2 py-1 line-clamp-2">
            💬 {rec.notes[rec.notes.length - 1].content}
          </p>
        )}
      </div>
    </div>
  );
});

// ── Column wrapper — uses an enter-counter to avoid false dragLeave on children
function KanbanColumn({ stage, col, isDragOver, onDragOver, onDragLeave, onDrop }: {
  stage: string; col: any[]; isDragOver: boolean;
  onDragOver: () => void; onDragLeave: () => void; onDrop: (stage: string) => void;
}) {
  const st = STYLE[stage];
  const enterCount = useRef(0);
  return (
    <div className="flex-shrink-0 w-[200px] sm:w-[230px]"
      onDragEnter={e => { e.preventDefault(); enterCount.current++; onDragOver(); }}
      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
      onDragLeave={() => { enterCount.current--; if (enterCount.current === 0) onDragLeave(); }}
      onDrop={e => { e.preventDefault(); enterCount.current = 0; onDrop(stage); }}>
      <div className={`rounded-2xl border-2 p-3 flex flex-col gap-2.5 transition-colors
        ${isDragOver ? 'border-primary-400 bg-primary-50/30 shadow-glow' : `${st.border} ${st.bg}`}`}>
        <div className="flex items-center justify-between px-0.5 pb-1 border-b border-black/5">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${st.dot}`}/>
            <p className={`text-xs font-bold ${st.text} leading-tight`}>
              {stage.replace('Onboarding ', '').replace('Offer / ', '').replace(' Sent', '')}
            </p>
          </div>
          <span className={`${st.light} ${st.text} text-[10px] font-black min-w-[20px] h-5 rounded-full flex items-center justify-center px-1.5`}>
            {col.length}
          </span>
        </div>

        {col.length === 0 && (
          <div className={`h-16 rounded-xl border-2 border-dashed flex items-center justify-center text-[10px] font-semibold transition-all
            ${isDragOver ? 'border-primary-400 text-primary-400 bg-primary-50' : 'border-surface-border text-ink-muted'}`}>
            Drop here
          </div>
        )}
        {col}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const [all, setAll] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { document.title = 'Onboarding | Zenska CRM'; }, []);
  const [stageFilter, setStageFilter] = useState('');
  const [view, setView] = useState<'board' | 'list'>('board');
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/onboarding');
      setAll(res.data);
    } catch { toast.error('Failed to load onboarding records'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const byStage = (s: string) => all.filter(r => r.stage === s);
  const displayed = stageFilter ? all.filter(r => r.stage === stageFilter) : all;

  const updateStage = useCallback(async (id: string, stage: string) => {
    setSavingId(id);
    setAll(prev => prev.map(r => r._id === id ? { ...r, stage } : r));
    try {
      await api.patch(`/onboarding/${id}/stage`, { stage });
      toast.success(`Stage → ${stage.replace('Onboarding ', '').replace(' Sent', '')}`, { duration: 2000 });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update stage');
      load();
    } finally { setSavingId(null); }
  }, [load]);

  const addNote = useCallback(async (id: string, content: string) => {
    try {
      const res = await api.post(`/onboarding/${id}/notes`, { content });
      setAll(prev => prev.map(r => r._id === id ? { ...r, notes: res.data.notes } : r));
      toast.success('Note added');
    } catch { toast.error('Failed to add note'); }
  }, []);

  const handleDrop = useCallback((stage: string) => {
    const id = draggingId;
    setDraggingId(null);
    setDragOver(null);
    if (id) updateStage(id, stage);
  }, [draggingId, updateStage]);

  const boardCols = ONBOARDING_STAGES.map(stage => (
    <KanbanColumn key={stage} stage={stage}
      col={all.filter(r => r.stage === stage).map(rec => (
        <Card key={rec._id} rec={rec}
          isDragging={draggingId === rec._id}
          isSaving={savingId === rec._id}
          onDragStart={id => setDraggingId(id)}
          onDragEnd={() => setDraggingId(null)}
          onNoteAdd={addNote}
        />
      ))}
      isDragOver={dragOver === stage}
      onDragOver={() => setDragOver(stage)}
      onDragLeave={() => setDragOver(null)}
      onDrop={handleDrop}
    />
  ));

  // ── List view ───────────────────────────────────────────────────────────────
  const ListView = () => (
    <div className="space-y-3">
      {displayed.length === 0 && (
        <div className="card p-16 text-center">
          <div className="text-5xl mb-3">✅</div>
          <p className="text-ink-secondary font-semibold text-lg">No onboarding records</p>
          <p className="text-xs text-ink-muted mt-1">Leads appear here after their meeting is marked completed</p>
        </div>
      )}
      {displayed.map(rec => {
        const st = STYLE[rec.stage] || STYLE['Onboarding Started'];
        const progress = Math.round(((STEP[rec.stage] || 1) / 6) * 100);
        return (
          <div key={rec._id} className="card p-5 hover:shadow-md transition-all duration-200">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow-sm"
                  style={{ background: rec.leadId?.tagColor || '#6366f1' }}>
                  {rec.leadId?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <Link href={`/leads/${rec.leadId?._id}`} className="font-bold text-ink hover:text-primary-500 transition-colors">{rec.leadId?.name}</Link>
                  <p className="text-xs text-ink-muted">{rec.leadId?.brand || 'No Brand'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`badge ${st.bg} ${st.text} ${st.border} border`}>{rec.stage}</span>
                {rec.assignedTo && <span className="text-xs text-ink-muted">{rec.assignedTo.name}</span>}
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-ink-muted">Step {STEP[rec.stage] || 1} of 6</span>
                <span className="font-bold text-ink-secondary">{progress}%</span>
              </div>
              <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${st.bar}`} style={{ width: `${progress}%` }}/>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-4">
              {ONBOARDING_STAGES.map(s => {
                const done = (STEP[s] || 0) < (STEP[rec.stage] || 1);
                const active = rec.stage === s;
                return (
                  <button key={s} onClick={() => updateStage(rec._id, s)}
                    disabled={savingId === rec._id}
                    className={`text-xs px-2.5 py-1.5 rounded-xl border font-semibold transition-all
                      ${active ? 'bg-primary-500 text-white border-primary-500 shadow-sm' :
                        done ? 'bg-primary-50 text-primary-600 border-primary-100 hover:bg-primary-100' :
                          'bg-white text-ink-muted border-surface-border hover:border-ink-subtle hover:text-ink-secondary'}`}>
                    {done ? '✓ ' : ''}{s.replace('Onboarding ', '').replace(' Sent', '').replace('Offer / ', '')}
                  </button>
                );
              })}
            </div>
            {rec.notes?.length > 0 && (
              <div className="mt-3 space-y-1.5 max-h-28 overflow-y-auto scrollbar-none">
                {rec.notes.slice(-3).map((n: any) => (
                  <div key={n._id} className="text-xs bg-surface-subtle rounded-xl px-3 py-2 flex items-start gap-2">
                    <span className="text-ink-muted flex-shrink-0">💬</span>
                    <span className="text-ink-secondary flex-1">{n.content}</span>
                    <span className="text-ink-muted ml-auto flex-shrink-0 whitespace-nowrap">
                      {n.createdBy?.name} · {formatRelativeTime(n.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <ListNoteInput onAdd={content => addNote(rec._id, content)} />
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="p-4 sm:p-7 space-y-4 sm:space-y-5 min-h-full" style={{background:'radial-gradient(ellipse at top left,rgba(99,102,241,0.04) 0%,transparent 60%)'}}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-ink tracking-tight">Onboarding</h1>
          <p className="text-ink-muted text-xs sm:text-sm mt-0.5">{all.length} active · drag cards between columns to update stage</p>
        </div>
        <div className="bg-white border border-surface-border rounded-xl p-1 flex gap-1 shadow-xs">
          {([['board','Board'], ['list','List']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setView(v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                ${view === v ? 'bg-primary-500 text-white shadow-sm' : 'text-ink-secondary hover:bg-surface-muted'}`}>
              {v === 'board'
                ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10"/></svg>
                : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>}
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setStageFilter('')}
          className={`chip font-semibold transition-all ${stageFilter === '' ? 'bg-primary-500 text-white' : 'bg-white border border-surface-border text-ink-secondary hover:bg-surface-subtle'}`}>
          All <span className={`font-black text-[10px] ml-0.5 ${stageFilter === '' ? 'text-white/70' : 'text-ink-muted'}`}>{all.length}</span>
        </button>
        {ONBOARDING_STAGES.map(s => {
          const st = STYLE[s];
          const cnt = byStage(s).length;
          return (
            <button key={s} onClick={() => setStageFilter(stageFilter === s ? '' : s)}
              className={`chip font-semibold transition-all ${stageFilter === s ? 'bg-primary-500 text-white' : `bg-white border border-surface-border ${st.text} hover:bg-surface-subtle`}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${stageFilter === s ? 'bg-white/60' : st.dot}`}/>
              {s.replace('Onboarding ', '').replace(' Sent', '').replace('Offer / ', '')}
              <span className={`font-black text-[10px] ml-0.5 ${stageFilter === s ? 'text-white/70' : 'text-ink-muted'}`}>{cnt}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"/>
            <p className="text-sm text-ink-muted">Loading onboarding records…</p>
          </div>
        </div>
      ) : view === 'board' ? (
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-none -mx-4 sm:mx-0 px-4 sm:px-0" style={{ minHeight: 'calc(100vh - 280px)' }}>
          {boardCols}
        </div>
      ) : <ListView />}
    </div>
  );
}

// Local note input for list view — isolated state so typing doesn't affect the board
function ListNoteInput({ onAdd }: { onAdd: (content: string) => void }) {
  const [val, setVal] = useState('');
  return (
    <div className="flex gap-2 mt-3">
      <input className="input-sm flex-1" placeholder="Add a note and press Enter…"
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAdd(val.trim()); setVal(''); } }}/>
      <button onClick={() => { onAdd(val.trim()); setVal(''); }} className="btn-secondary btn-sm">Add</button>
    </div>
  );
}
