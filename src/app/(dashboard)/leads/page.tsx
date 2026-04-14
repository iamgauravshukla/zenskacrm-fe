'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { STAGES, STAGE_COLORS, TAG_COLORS, formatDate, formatRelativeTime, maskPhone } from '@/lib/constants';
import AddLeadModal from '@/components/leads/AddLeadModal';

const SOURCE_STYLE: Record<string,string> = {
  'Meta Ads':      'bg-blue-50 text-blue-700 border-blue-100',
  'CSV':           'bg-slate-50 text-slate-600 border-slate-200',
  'Manual':        'bg-surface-muted text-ink-muted border-surface-border',
  'Web Form':      'bg-teal-50 text-teal-700 border-teal-100',
  'Google Sheets': 'bg-green-50 text-green-700 border-green-100',
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  useEffect(() => { document.title = 'Leads | Zenska CRM'; }, []);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [team, setTeam] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [duplicates, setDuplicates] = useState<{name:string;phone:string;existingId:string}[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [filters, setFilters] = useState({ search:'', stage:'', assignedTo:'', source:'', startDate:'', endDate:'' });
  // Separate debounced search so typing doesn't fire an API call on every keystroke
  const [searchInput, setSearchInput] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback((val: string) => {
    setSearchInput(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setPage(1);
      setFilters(f => ({ ...f, search: val }));
    }, 300);
  }, []);
  const [customFields, setCustomFields] = useState<string[]>([]);
  const [assigningId, setAssigningId] = useState<string|null>(null);

  const handleAssign = async (leadId: string, userId: string) => {
    if (assigningId) return; // prevent duplicate rapid updates
    setAssigningId(leadId);
    const prev = leads.find(l => l._id === leadId);
    // Optimistic update
    setLeads(ls => ls.map(l => l._id === leadId ? { ...l, assignedTo: userId ? team.find(m => m._id === userId) || { _id: userId, name: '...' } : null } : l));
    try {
      const res = await api.patch(`/leads/${leadId}/assign`, { assignedTo: userId || null });
      setLeads(ls => ls.map(l => l._id === leadId ? { ...l, assignedTo: res.data.assignedTo } : l));
      toast.success('Assignee updated');
    } catch {
      // Rollback on error
      setLeads(ls => ls.map(l => l._id === leadId ? { ...l, assignedTo: prev?.assignedTo } : l));
      toast.error('Failed to update assignee');
    } finally {
      setAssigningId(null);
    }
  };

  const fetchCustomFields = async () => {
    try { const r = await api.get('/leads/custom-fields'); setCustomFields(r.data); } catch {}
  };

  const fetchLeads = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      Object.entries(filters).forEach(([k,v]) => { if (v) params[k] = v; });
      const res = await api.get('/leads', { params, signal });
      setLeads(res.data.leads); setTotal(res.data.total);
    } catch (err: any) {
      if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED')
        toast.error('Failed to load leads');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchLeads(controller.signal);
    return () => controller.abort();
  }, [page, filters]);
  useEffect(() => {
    api.get('/team').then(r => setTeam(r.data)).catch(() => {});
    fetchCustomFields();
  }, []);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setImporting(true);
    setDuplicates([]);
    const fd = new FormData(); fd.append('file', file);
    try {
      const r = await api.post('/leads/import/csv', fd);
      toast.success(`${r.data.message} · ${r.data.successCount} added, ${r.data.skippedCount} skipped`);
      if (r.data.newCustomFields?.length) {
        toast.success(`${r.data.newCustomFields.length} custom field(s) detected: ${r.data.newCustomFields.join(', ')}`, { duration: 5000 });
      }
      if (r.data.duplicates?.length) {
        setDuplicates(r.data.duplicates);
        toast.error(`${r.data.duplicates.length} duplicate(s) detected — highlighted below`, { duration: 5000 });
      }
      fetchLeads();
      fetchCustomFields();
    } catch (err:any) { toast.error(err.response?.data?.message||'Import failed'); }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value=''; }
  };

  const del = async (id: string) => {
    if (!confirm('Delete this lead?')) return;
    try { await api.delete(`/leads/${id}`); toast.success('Deleted'); fetchLeads(); }
    catch { toast.error('Failed'); }
  };

  const clearFilters = () => setFilters({ search:'', stage:'', assignedTo:'', source:'', startDate:'', endDate:'' });
  const setF = (k:string) => (e:React.ChangeEvent<any>) => { setPage(1); setFilters(p=>({...p,[k]:e.target.value})); };
  const hasFilters = Object.values(filters).some(Boolean);
  const PAGES = Math.ceil(total/20);

  return (
    <div className="p-4 sm:p-7 space-y-4 sm:space-y-5 bg-mesh min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-xl sm:text-2xl font-bold text-ink">Leads</h1><p className="text-ink-muted text-sm mt-0.5">{total.toLocaleString()} total</p></div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport}/>
          <button onClick={()=>fileRef.current?.click()} disabled={importing} className="btn-secondary text-xs sm:text-sm">
            {importing?<><span className="w-3.5 h-3.5 border-2 border-ink-muted border-t-transparent rounded-full animate-spin"/>Importing…</>:<><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>Import CSV</>}
          </button>
          <button onClick={()=>setShowAdd(true)} className="btn-primary text-xs sm:text-sm">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>Add Lead
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-3 sm:p-4">
        <div className="flex gap-2 sm:gap-3 flex-wrap items-end">
          <div className="flex-1 min-w-[160px] sm:min-w-[200px]">
            <label className="label">Search</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input className="input pl-9" placeholder="Name, phone, email, brand…" value={searchInput} onChange={e => handleSearchChange(e.target.value)}/>
            </div>
          </div>
          <div>
            <label className="label">Stage</label>
            <select className="input min-w-[140px]" value={filters.stage} onChange={setF('stage')}>
              <option value="">All Stages</option>{STAGES.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Source</label>
            <select className="input min-w-[120px]" value={filters.source} onChange={setF('source')}>
              <option value="">All Sources</option>
              {['Meta Ads','CSV','Manual','Web Form','Google Sheets'].map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Assignee</label>
            <select className="input min-w-[130px]" value={filters.assignedTo} onChange={setF('assignedTo')}>
              <option value="">All</option>{team.map(m=><option key={m._id} value={m._id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">From</label>
            <input type="date" className="input" value={filters.startDate} onChange={setF('startDate')}/>
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input" value={filters.endDate} onChange={setF('endDate')}/>
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="btn-ghost btn-sm text-red-400 hover:text-red-600 hover:bg-red-50 mb-0.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>Clear
            </button>
          )}
        </div>
      </div>

      {/* Duplicate alert banner */}
      {duplicates.length > 0 && (
        <div className="card p-4 border-l-4 border-amber-400 bg-amber-50">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-bold text-amber-800 text-sm">⚠️ {duplicates.length} duplicate lead{duplicates.length > 1 ? 's' : ''} detected</p>
              <p className="text-xs text-amber-600 mt-1">These leads already exist in your workspace (matched by phone number) and were skipped:</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {duplicates.map((d, i) => (
                  <span key={i} className="inline-flex items-center gap-1 bg-amber-100 border border-amber-200 text-amber-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                    {d.name} · {d.phone}
                    {d.existingId && <a href={`/leads/${d.existingId}`} className="text-amber-600 hover:underline ml-1">View →</a>}
                  </span>
                ))}
              </div>
            </div>
            <button onClick={() => setDuplicates([])} className="text-amber-400 hover:text-amber-600 flex-shrink-0 text-lg">✕</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full">
            <thead className="bg-surface-subtle border-b border-surface-border">
              <tr>
                {['Date Added','Lead','Phone','WhatsApp',
                  ...customFields.filter(f => f !== 'Lead'),
                  'Assigned','Actions'].map((h, i)=>(
                  <th key={`col-${i}`} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_,i)=>(
                  <tr key={i} className="border-b border-surface-border/60">
                    {[...Array(6 + customFields.filter(f => f !== 'Lead').length)].map((_,j)=><td key={j} className="table-cell"><div className="h-4 skeleton rounded-lg"/></td>)}
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr><td colSpan={6 + customFields.filter(f => f !== 'Lead').length} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 bg-surface-muted rounded-2xl flex items-center justify-center text-3xl">🔍</div>
                    <p className="text-ink-secondary font-semibold">No leads found</p>
                    <p className="text-xs text-ink-muted">{hasFilters?'Try adjusting your filters':'Add your first lead to get started'}</p>
                  </div>
                </td></tr>
              ) : leads.map(lead => (
                <tr key={lead._id} className="table-row group">
                  {/* Date Added */}
                  <td className="table-cell whitespace-nowrap">
                    <p className="text-xs font-semibold text-ink-secondary">{formatDate(lead.createdAt)}</p>
                    <p className="text-[10px] text-ink-muted">{formatRelativeTime(lead.createdAt)}</p>
                  </td>
                  {/* Lead (always shown after Date Added) */}
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm"
                        style={{background:lead.tagColor||'#6366f1'}}>{lead.name?.[0]?.toUpperCase()}</div>
                      <div>
                        <Link href={`/leads/${lead._id}`} className="text-sm font-semibold text-ink hover:text-primary-500 transition-colors">{lead.name || '—'}</Link>
                        {lead.email && <p className="text-[10px] text-ink-muted truncate max-w-[140px]">{lead.email}</p>}
                      </div>
                    </div>
                  </td>
                  {/* Phone */}
                  <td className="table-cell">
                    <button onClick={()=>setRevealed(p=>{const n=new Set(p);n.has(lead._id)?n.delete(lead._id):n.add(lead._id);return n;})}
                      className="font-mono text-xs text-ink-secondary hover:text-primary-500 transition-colors">
                      {revealed.has(lead._id)?lead.phone:maskPhone(lead.phone)}
                    </button>
                  </td>
                  {/* WhatsApp */}
                  <td className="table-cell">
                    <a href={`https://wa.me/${lead.phone.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"
                      className="w-8 h-8 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center transition-colors" title="Open WhatsApp">
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </a>
                  </td>
                  {/* Dynamic custom fields from CSV (excluding Lead which is already shown) */}
                  {customFields.filter(cf => cf !== 'Lead').map(cf => {
                    const val = lead.customFields instanceof Map
                      ? lead.customFields.get(cf)
                      : (lead.customFields && typeof lead.customFields === 'object' ? lead.customFields[cf] : undefined);
                    return (
                      <td key={cf} className="table-cell">
                        <span className="text-xs text-ink-secondary truncate max-w-[180px] block">{val || '—'}</span>
                      </td>
                    );
                  })}

                  {/* Assigned */}
                  <td className="table-cell">
                    <div className="relative flex items-center gap-1.5">
                      {lead.assignedTo && (
                        <div className="w-6 h-6 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600 text-[10px] font-bold flex-shrink-0">
                          {lead.assignedTo.name?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <select
                        value={lead.assignedTo?._id || ''}
                        onChange={(e) => handleAssign(lead._id, e.target.value)}
                        disabled={assigningId === lead._id}
                        className="text-xs bg-transparent border border-transparent hover:border-surface-border focus:border-primary-300 rounded-lg px-1.5 py-1 text-ink-secondary cursor-pointer outline-none transition-colors min-w-[110px] disabled:opacity-50 disabled:cursor-wait appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center' }}
                      >
                        <option value="">Select Assignee</option>
                        {team.map(m => (
                          <option key={m._id} value={m._id}>{m.name}</option>
                        ))}
                      </select>
                      {assigningId === lead._id && (
                        <span className="w-3.5 h-3.5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="table-cell">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/leads/${lead._id}`} className="btn-ghost btn-icon btn-sm text-primary-500">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      </Link>
                      <button onClick={()=>del(lead._id)} className="btn-ghost btn-icon btn-sm text-red-400 hover:text-red-600 hover:bg-red-50">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {PAGES > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-surface-border bg-surface-subtle/50">
            <span className="text-xs text-ink-muted">Page {page} of {PAGES} · {total} leads</span>
            <div className="flex gap-1">
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="btn-secondary btn-sm">← Prev</button>
              <button onClick={()=>setPage(p=>Math.min(PAGES,p+1))} disabled={page===PAGES} className="btn-secondary btn-sm">Next →</button>
            </div>
          </div>
        )}
      </div>
      {showAdd && <AddLeadModal teamMembers={team} onClose={()=>setShowAdd(false)} onSaved={()=>{setShowAdd(false);fetchLeads();}}/>}
    </div>
  );
}
