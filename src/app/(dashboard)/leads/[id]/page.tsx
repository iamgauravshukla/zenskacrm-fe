'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { STAGES, STAGE_COLORS, TAG_COLORS, formatDate, formatRelativeTime } from '@/lib/constants';

// ─── @mention input hook ──────────────────────────────────────────────────────
function useMentionInput(teamMembers: any[]) {
  const [value, setValue] = useState('');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState(0);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);
    const cursor = e.target.selectionStart ?? v.length;
    // Find if cursor is inside an @mention
    const before = v.slice(0, cursor);
    const atIdx = before.lastIndexOf('@');
    if (atIdx !== -1 && !before.slice(atIdx + 1).includes(' ')) {
      const q = before.slice(atIdx + 1).toLowerCase();
      setMentionQuery(q);
      setMentionStart(atIdx);
      setSuggestions(teamMembers.filter(m => m.name.toLowerCase().includes(q)).slice(0, 5));
      setActiveSuggestion(0);
    } else {
      setMentionQuery(null);
      setSuggestions([]);
    }
  };

  const selectSuggestion = (member: any) => {
    const before = value.slice(0, mentionStart);
    const after  = value.slice(inputRef.current?.selectionStart ?? value.length);
    const newVal = `${before}@${member.name} ${after}`;
    setValue(newVal);
    setMentionQuery(null);
    setSuggestions([]);
    setTimeout(() => {
      inputRef.current?.focus();
      const pos = before.length + member.name.length + 2;
      inputRef.current?.setSelectionRange(pos, pos);
    }, 0);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!suggestions.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveSuggestion(i => Math.min(i + 1, suggestions.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveSuggestion(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && mentionQuery !== null) { e.preventDefault(); selectSuggestion(suggestions[activeSuggestion]); }
    if (e.key === 'Escape') { setMentionQuery(null); setSuggestions([]); }
  };

  // Extract mentioned user IDs from the final value
  const extractMentions = () => {
    const mentioned: string[] = [];
    const regex = /@([^\s@]+(?:\s[^\s@]+)*)/g;
    let m;
    while ((m = regex.exec(value)) !== null) {
      const name = m[1];
      const user = teamMembers.find(u => u.name.toLowerCase() === name.toLowerCase());
      if (user && !mentioned.includes(user._id)) mentioned.push(user._id);
    }
    return mentioned;
  };

  return { value, setValue, onChange, onKeyDown, inputRef, suggestions, activeSuggestion, selectSuggestion, mentionQuery, extractMentions };
}

// ─── Highlighted remark content ──────────────────────────────────────────────
function RemarkContent({ content, teamMembers }: { content: string; teamMembers: any[] }) {
  const parts = content.split(/(@\S+(?:\s\S+)?)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('@')) {
          const name = part.slice(1);
          const isUser = teamMembers.some(m => m.name.toLowerCase() === name.toLowerCase());
          if (isUser) return (
            <span key={i} className="inline-flex items-center bg-primary-50 text-primary-700 rounded px-1 font-medium text-xs">{part}</span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LeadDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [stageSaving, setStageSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [schedForm, setSchedForm] = useState({ scheduledAt:'', type:'call', notes:'', agenda:'', meetLink:'', address:'' });
  const [schedError, setSchedError] = useState('');
  const [schedSaving, setSchedSaving] = useState(false);
  const [editingMeetingId, setEditingMeetingId] = useState<string|null>(null);

  const mention = useMentionInput(teamMembers);

  const load = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const [leadRes, teamRes, mtgRes] = await Promise.all([
        api.get(`/leads/${id}`, { signal }),
        api.get('/team', { signal }),
        api.get(`/meetings/${id}`, { signal }),
      ]);
      setData(leadRes.data);
      setForm(leadRes.data.lead);
      setTeamMembers(teamRes.data);
      setMeetings(mtgRes.data || []);
    } catch (err: any) {
      if (err?.name === 'CanceledError' || err?.name === 'AbortError') return;
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [id]);

  // Non-cancellable reload after mutations
  const reload = () => load();

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/leads/${id}`, form);
      toast.success('Lead updated');
      setEditing(false);
      reload();
    } catch { toast.error('Update failed'); }
    finally { setSaving(false); }
  };

  const changeStage = async (stage: string) => {
    // Intercept "Meeting Scheduled" — open the meeting scheduler instead
    if (stage === 'Meeting Scheduled') {
      const existing = meetings.find((m: any) => m.status === 'scheduled');
      if (existing) {
        setSchedForm({
          scheduledAt: existing.scheduledAt ? new Date(existing.scheduledAt).toISOString().slice(0, 16) : '',
          type: existing.type || 'call',
          notes: existing.notes || '',
          agenda: existing.agenda || '',
          meetLink: existing.meetLink || '',
          address: existing.address || '',
        });
        setEditingMeetingId(existing._id);
      } else {
        setSchedForm({ scheduledAt: '', type: 'call', notes: '', agenda: '', meetLink: '', address: '' });
        setEditingMeetingId(null);
      }
      setSchedError('');
      setShowSchedule(true);
      return;
    }
    if (stageSaving) return;
    setStageSaving(true);
    try {
      await api.patch(`/leads/${id}/stage`, { stage });
      toast.success('Stage updated');
      reload();
    } catch { toast.error('Failed to update stage'); }
    finally { setStageSaving(false); }
  };

  const addRemark = async () => {
    if (!mention.value.trim()) return;
    const mentions = mention.extractMentions();
    try {
      await api.post(`/leads/${id}/remarks`, { content: mention.value, mentions });
      mention.setValue('');
      if (mentions.length > 0) toast.success(`Remark added — ${mentions.length} user(s) notified`);
      reload();
    } catch { toast.error('Failed to add remark'); }
  };

  const deleteRemark = async (remarkId: string) => {
    try {
      await api.delete(`/leads/${id}/remarks/${remarkId}`);
      reload();
    } catch { toast.error('Failed to delete remark'); }
  };

  const deleteLead = async () => {
    setDeleting(true);
    try {
      await api.delete(`/leads/${id}`);
      toast.success('Lead deleted');
      router.replace('/leads');
    } catch { toast.error('Failed to delete lead'); setDeleting(false); }
  };

  const scheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedForm.scheduledAt || new Date(schedForm.scheduledAt) < new Date()) {
      setSchedError('Please choose a future date'); return;
    }
    setSchedSaving(true);
    try {
      if (editingMeetingId) {
        await api.put(`/meetings/${editingMeetingId}`, { ...schedForm });
        toast.success('Meeting rescheduled!');
      } else {
        await api.post('/meetings', { leadId: id, ...schedForm });
        toast.success(schedForm.type === 'video' ? 'Meeting scheduled — Calendly link generated!' : 'Meeting scheduled!');
      }
      setShowSchedule(false);
      setSchedForm({ scheduledAt:'', type:'call', notes:'', agenda:'', meetLink:'', address:'' });
      setSchedError('');
      setEditingMeetingId(null);
      reload();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSchedSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-full pt-20"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return (
    <div className="flex flex-col items-center justify-center h-full pt-20 gap-3">
      <p className="text-lg font-semibold text-gray-700">Lead not found</p>
      <button onClick={() => router.push('/leads')} className="btn-secondary text-sm">← Back to Leads</button>
    </div>
  );

  const { lead, remarks, auditLogs } = data;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 flex-shrink-0">←</button>
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: lead.tagColor }} />
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{lead.name}</h1>
          <span className={`badge flex-shrink-0 ${STAGE_COLORS[lead.stage] || 'bg-gray-100'}`}>{lead.stage}</span>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="btn-secondary text-sm">Cancel</button>
              <button onClick={() => setShowDeleteConfirm(true)} className="px-3 py-1.5 rounded-xl text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                🗑 Delete
              </button>
              <button onClick={save} disabled={saving} className="btn-primary text-sm">{saving ? 'Saving…' : 'Save'}</button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="btn-secondary text-sm">✏ Edit</button>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-lg flex-shrink-0">🗑</div>
              <div>
                <h2 className="font-bold text-ink">Delete lead?</h2>
                <p className="text-sm text-ink-muted mt-0.5">This will permanently remove <span className="font-semibold text-ink">{lead?.name}</span> and all associated data.</p>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary flex-1" disabled={deleting}>Cancel</button>
              <button onClick={deleteLead} disabled={deleting}
                className="flex-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                {deleting ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Deleting…</> : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Lead Info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Lead Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Name',  key: 'name',  type: 'text' },
                { label: 'Phone', key: 'phone', type: 'text' },
                { label: 'Email', key: 'email', type: 'email' },
                { label: 'Brand', key: 'brand', type: 'text' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
                  {editing ? (
                    <input type={type} className="input mt-1" value={form[key] || ''} onChange={e => setForm((p: any) => ({ ...p, [key]: e.target.value }))} />
                  ) : (
                    <div className="mt-1 text-sm text-gray-900">{lead[key] || '—'}</div>
                  )}
                </div>
              ))}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Assigned To</label>
                {editing ? (
                  <select className="input mt-1" value={form.assignedTo?._id || form.assignedTo || ''} onChange={e => setForm((p: any) => ({ ...p, assignedTo: e.target.value }))}>
                    <option value="">Unassigned</option>
                    {teamMembers.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                  </select>
                ) : (
                  <div className="mt-1 text-sm text-gray-900">{lead.assignedTo?.name || '—'}</div>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tag Color</label>
                {editing ? (
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {TAG_COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setForm((p: any) => ({ ...p, tagColor: c }))}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${form.tagColor === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                        style={{ background: c }} />
                    ))}
                  </div>
                ) : (
                  <div className="mt-1 flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ background: lead.tagColor }} />
                    <span className="text-sm text-gray-600">{lead.tagColor}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sells on Other Platform</label>
                {editing ? (
                  <input type="text" className="input mt-1" value={form.sellsOnOtherPlatform || ''} onChange={e => setForm((p: any) => ({ ...p, sellsOnOtherPlatform: e.target.value }))} />
                ) : (
                  <div className="mt-1 text-sm text-gray-900">{lead.sellsOnOtherPlatform || '—'}</div>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Authorized Brand</label>
                {editing ? (
                  <input type="text" className="input mt-1" value={form.authorizedBrand || ''} onChange={e => setForm((p: any) => ({ ...p, authorizedBrand: e.target.value }))} />
                ) : (
                  <div className="mt-1 text-sm text-gray-900">{lead.authorizedBrand || '—'}</div>
                )}
              </div>
            </div>
            <div className="mt-4">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Challenges</label>
              {editing ? (
                <textarea className="input mt-1 h-20 resize-none" value={form.challenges || ''} onChange={e => setForm((p: any) => ({ ...p, challenges: e.target.value }))} />
              ) : (
                <div className="mt-1 text-sm text-gray-900">{lead.challenges || '—'}</div>
              )}
            </div>
            {/* Dynamic Custom Fields */}
            {lead.customFields && typeof lead.customFields === 'object' && Object.keys(lead.customFields).length > 0 && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Custom Fields</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(lead.customFields).map(([key, val]: [string, any]) => (
                    <div key={key}>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{key}</label>
                      {editing ? (
                        <input type="text" className="input mt-1" value={(form.customFields && form.customFields[key]) || ''} onChange={e => setForm((p: any) => ({
                          ...p,
                          customFields: { ...(p.customFields || {}), [key]: e.target.value },
                        }))} />
                      ) : (
                        <div className="mt-1 text-sm text-gray-900">{String(val) || '—'}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Pipeline Stage */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Pipeline Stage</h2>
            <div className="flex flex-wrap gap-2">
              {STAGES.map(s => (
                <button key={s} onClick={() => changeStage(s)} disabled={stageSaving}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border disabled:opacity-50 disabled:cursor-wait ${
                    lead.stage === s ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}>
                  {stageSaving && lead.stage === s ? '…' : s}
                </button>
              ))}
            </div>
          </div>

          {/* Remarks with @mention */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-800 mb-1">Remarks & Notes</h2>
            <p className="text-xs text-gray-400 mb-4">
              Type <span className="font-mono bg-gray-100 px-1 rounded">@name</span> to mention a team member — they'll receive a notification.
            </p>

            {/* Mention input */}
            <div className="relative mb-4">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    ref={mention.inputRef}
                    className="input w-full pr-10"
                    placeholder="Add a remark… use @name to mention someone"
                    value={mention.value}
                    onChange={mention.onChange}
                    onKeyDown={(e) => {
                      mention.onKeyDown(e);
                      if (e.key === 'Enter' && mention.mentionQuery === null) addRemark();
                    }}
                  />
                  {mention.value && (
                    <button onClick={() => mention.setValue('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 text-xs">✕</button>
                  )}
                </div>
                <button onClick={addRemark} className="btn-primary text-sm px-4">Add</button>
              </div>

              {/* @mention dropdown */}
              {mention.suggestions.length > 0 && (
                <div className="absolute left-0 right-10 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden">
                  <div className="px-3 py-1.5 text-xs text-gray-400 bg-gray-50 border-b border-gray-100 font-medium">
                    Mention a team member
                  </div>
                  {mention.suggestions.map((m, i) => (
                    <button key={m._id} type="button"
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-primary-50 transition-colors ${i === mention.activeSuggestion ? 'bg-primary-50' : ''}`}
                      onMouseDown={e => { e.preventDefault(); mention.selectSuggestion(m); }}>
                      <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-xs font-bold flex-shrink-0">
                        {m.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-800">{m.name}</div>
                        <div className="text-xs text-gray-400">{m.email}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Remark list */}
            <div className="space-y-3">
              {remarks.length === 0 && <p className="text-sm text-gray-400">No remarks yet</p>}
              {remarks.map((r: any) => (
                <div key={r._id} className="flex items-start justify-between gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="min-w-0">
                    <div className="text-sm text-gray-900 leading-relaxed">
                      <RemarkContent content={r.content} teamMembers={teamMembers} />
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="w-4 h-4 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-xs font-bold flex-shrink-0">
                        {r.createdBy?.name?.[0]?.toUpperCase()}
                      </div>
                      <span className="text-xs text-gray-400">{r.createdBy?.name} · {formatRelativeTime(r.createdAt)}</span>
                      {r.mentions?.length > 0 && (
                        <span className="text-xs text-primary-400">· {r.mentions.length} mentioned</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => deleteRemark(r._id)} className="text-gray-300 hover:text-red-400 text-xs flex-shrink-0 mt-0.5">✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Details</h2>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-gray-400 text-xs">Source</dt><dd className="text-gray-900">{lead.source}</dd></div>
              <div><dt className="text-gray-400 text-xs">Upload Status</dt><dd>
                <span className={`badge ${lead.uploadStatus === 'Verification Complete' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{lead.uploadStatus}</span>
              </dd></div>
              <div><dt className="text-gray-400 text-xs">Created</dt><dd className="text-gray-900">{formatDate(lead.createdAt)}</dd></div>
              <div><dt className="text-gray-400 text-xs">Last Updated</dt><dd className="text-gray-900">{formatRelativeTime(lead.updatedAt)}</dd></div>
              <div><dt className="text-gray-400 text-xs">Updated By</dt><dd className="text-gray-900">{lead.lastUpdatedBy?.name || '—'}</dd></div>
            </dl>
          </div>

          {/* Meetings */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-800">Meetings</h2>
              <button onClick={() => { setEditingMeetingId(null); setSchedForm({ scheduledAt:'', type:'call', notes:'', agenda:'', meetLink:'', address:'' }); setSchedError(''); setShowSchedule(true); }} className="text-xs bg-primary-50 text-primary-600 px-2.5 py-1 rounded-lg font-semibold hover:bg-primary-100 transition-colors">+ Schedule</button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {meetings.length === 0 && <p className="text-xs text-gray-400">No meetings yet</p>}
              {meetings.map((m: any) => (
                <div key={m._id} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600 text-xs font-bold flex-shrink-0">{new Date(m.scheduledAt).getDate()}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-800 capitalize">{m.type === 'video' ? '🎥' : m.type === 'call' ? '📞' : '🤝'} {m.type}</p>
                    <p className="text-[10px] text-gray-400">{new Date(m.scheduledAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})} · {new Date(m.scheduledAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-semibold ${m.status==='scheduled'?'text-blue-600':m.status==='completed'?'text-green-600':'text-red-500'}`}>{m.status}</span>
                      {m.type === 'video' && m.meetLink && (
                        <a href={m.meetLink} target="_blank" rel="noopener noreferrer" className="text-[10px] font-semibold text-primary-600 hover:text-primary-700">Join →</a>
                      )}
                    </div>
                    {m.type === 'in-person' && m.address && (
                      <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">📍 {m.address}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Change History</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {auditLogs.length === 0 && <p className="text-xs text-gray-400">No changes recorded</p>}
              {auditLogs.map((log: any) => (
                <div key={log._id} className="text-xs border-l-2 border-primary-100 pl-2">
                  <div className="text-gray-700 font-medium capitalize">{log.field} changed</div>
                  {log.oldValue && <div className="text-gray-400 line-through truncate">{String(log.oldValue)}</div>}
                  <div className="text-gray-600 truncate">{String(log.newValue)}</div>
                  <div className="text-gray-400">{log.changedBy?.name} · {formatRelativeTime(log.changedAt)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Schedule Meeting Modal */}
      {showSchedule && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{editingMeetingId ? 'Reschedule Meeting' : 'Schedule Meeting'}</h2>
              <button onClick={() => { setShowSchedule(false); setSchedError(''); setEditingMeetingId(null); setSchedForm({ scheduledAt:'', type:'call', notes:'', agenda:'', meetLink:'', address:'' }); }} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={scheduleMeeting} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Date & Time *</label>
                  <input required type="datetime-local"
                    min={new Date(Date.now()+60000).toISOString().slice(0,16)}
                    className={`input ${schedError ? 'border-red-400' : ''}`}
                    value={schedForm.scheduledAt}
                    onChange={e => { setSchedError(''); setSchedForm(p => ({...p, scheduledAt: e.target.value})); }}/>
                  {schedError && <p className="text-xs text-red-500 mt-1">{schedError}</p>}
                </div>
                <div>
                  <label className="label">Type *</label>
                  <select className="input" value={schedForm.type} onChange={e => setSchedForm(p => ({...p, type: e.target.value, meetLink: '', address: ''}))}>
                    <option value="call">📞 Call</option>
                    <option value="video">🎥 Video</option>
                    <option value="in-person">🤝 In-Person</option>
                  </select>
                </div>
              </div>
              {schedForm.type === 'video' && (
                <div>
                  <label className="label">Meeting Link</label>
                  <input className="input" placeholder="Paste Google Meet / Zoom link here…"
                    value={schedForm.meetLink} onChange={e => setSchedForm(p => ({...p, meetLink: e.target.value}))}/>
                  <p className="text-[11px] text-gray-400 mt-1">Create the meeting on Google Calendar or Zoom, then paste the link. It will be shown here and emailed to the lead.</p>
                </div>
              )}
              {schedForm.type === 'in-person' && (
                <div>
                  <label className="label">Address / Location</label>
                  <input className="input" placeholder="e.g. 123 Main St, Mumbai or Coffee at Starbucks Bandra…"
                    value={schedForm.address} onChange={e => setSchedForm(p => ({...p, address: e.target.value}))}/>
                </div>
              )}
              <div>
                <label className="label">Agenda</label>
                <input className="input" placeholder="Brief agenda…" value={schedForm.agenda} onChange={e => setSchedForm(p => ({...p, agenda: e.target.value}))}/>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input resize-none h-16" placeholder="Preparation notes…" value={schedForm.notes} onChange={e => setSchedForm(p => ({...p, notes: e.target.value}))}/>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setShowSchedule(false); setSchedError(''); setEditingMeetingId(null); setSchedForm({ scheduledAt:'', type:'call', notes:'', agenda:'', meetLink:'', address:'' }); }} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={schedSaving} className="btn-primary flex-1">{schedSaving ? (editingMeetingId ? 'Rescheduling…' : 'Scheduling…') : (editingMeetingId ? 'Reschedule →' : 'Schedule →')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
