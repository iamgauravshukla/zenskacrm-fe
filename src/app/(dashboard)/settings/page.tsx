'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  useEffect(() => { document.title = 'Settings | Zenska CRM'; }, []);
  const isAdmin   = (user as any)?.role === 'admin';
  const hasWs     = !!(user as any)?.workspaceId;
  const wsName    = (user as any)?.workspaceId?.name || '';

  // ── Workspace name ──────────────────────────────────────────────────────────
  const [wsInput,   setWsInput]   = useState(wsName);
  const [wsSaving,  setWsSaving]  = useState(false);

  // Keep input in sync if user object is updated from elsewhere (e.g. after save)
  useEffect(() => { setWsInput(wsName); }, [wsName]);

  const saveWorkspaceName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsInput.trim()) { toast.error('Name cannot be empty'); return; }
    if (wsInput.trim() === wsName) { toast('No change'); return; }
    setWsSaving(true);
    try {
      const res = await api.patch('/auth/workspace', { name: wsInput.trim() });
      setUser(res.data.user);
      toast.success('Workspace renamed');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to rename workspace');
    } finally { setWsSaving(false); }
  };

  // ── Change password ─────────────────────────────────────────────────────────
  const [pwForm,   setPwForm]   = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.next.length < 8)  { toast.error('New password must be at least 8 characters'); return; }
    if (pwForm.next !== pwForm.confirm) { toast.error('Passwords do not match'); return; }
    setPwSaving(true);
    try {
      await api.patch('/auth/me', { currentPassword: pwForm.current, newPassword: pwForm.next });
      setPwForm({ current: '', next: '', confirm: '' });
      toast.success('Password updated');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally { setPwSaving(false); }
  };

  // ── Delete all leads ────────────────────────────────────────────────────────
  const [confirmDelete, setConfirmDelete] = useState('');
  const [deleting,      setDeleting]      = useState(false);
  const DELETE_PHRASE = 'delete all leads';

  const deleteAllLeads = async () => {
    if (confirmDelete.toLowerCase() !== DELETE_PHRASE) {
      toast.error(`Type "${DELETE_PHRASE}" to confirm`); return;
    }
    setDeleting(true);
    try {
      const res = await api.delete('/leads/all');
      setConfirmDelete('');
      toast.success(res.data.message || 'All leads deleted');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete leads');
    } finally { setDeleting(false); }
  };

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-ink">Settings</h1>
        <p className="text-sm text-ink-muted mt-0.5">Manage your workspace and account preferences</p>
      </div>

      {/* ── Workspace Name ──────────────────────────────────────────────────── */}
      {isAdmin && hasWs && (
        <section className="bg-white rounded-2xl border border-surface-border p-5 sm:p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-ink">Workspace Name</h2>
            <p className="text-xs text-ink-muted mt-0.5">Rename your workspace. Only the workspace owner can do this.</p>
          </div>
          <form onSubmit={saveWorkspaceName} className="flex gap-2">
            <input
              className="input flex-1"
              value={wsInput}
              onChange={e => setWsInput(e.target.value)}
              placeholder="Workspace name"
              maxLength={80}
            />
            <button type="submit" disabled={wsSaving} className="btn-primary whitespace-nowrap">
              {wsSaving
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>
                : 'Save'}
            </button>
          </form>
        </section>
      )}

      {/* ── Change Password ─────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-surface-border p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-ink">Change Password</h2>
          <p className="text-xs text-ink-muted mt-0.5">Choose a strong password of at least 8 characters.</p>
        </div>
        <form onSubmit={changePassword} className="space-y-3">
          <div>
            <label className="label">Current Password</label>
            <input
              type="password"
              className="input"
              value={pwForm.current}
              onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
              required
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="label">New Password</label>
            <input
              type="password"
              className="input"
              value={pwForm.next}
              onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input
              type="password"
              className="input"
              value={pwForm.confirm}
              onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
              required
              autoComplete="new-password"
            />
          </div>
          <button type="submit" disabled={pwSaving} className="btn-primary w-full sm:w-auto">
            {pwSaving
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block mr-1"/>Updating…</>
              : 'Update Password'}
          </button>
        </form>
      </section>

      {/* ── Danger Zone ─────────────────────────────────────────────────────── */}
      {isAdmin && hasWs && (
        <section className="bg-white rounded-2xl border-2 border-red-200 p-5 sm:p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-red-600">Danger Zone</h2>
            <p className="text-xs text-ink-muted mt-0.5">These actions are permanent and cannot be undone.</p>
          </div>

          <div className="border border-red-100 rounded-xl p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-ink">Delete All Leads</p>
              <p className="text-xs text-ink-muted mt-0.5">
                Permanently soft-deletes every lead in this workspace. They will no longer appear anywhere.
              </p>
            </div>
            <p className="text-xs text-red-500 font-medium">
              Type <span className="font-mono bg-red-50 px-1 py-0.5 rounded">{DELETE_PHRASE}</span> to confirm
            </p>
            <div className="flex gap-2">
              <input
                className="input flex-1 border-red-200 focus:ring-red-400/20 focus:border-red-400"
                value={confirmDelete}
                onChange={e => setConfirmDelete(e.target.value)}
                placeholder={DELETE_PHRASE}
              />
              <button
                onClick={deleteAllLeads}
                disabled={deleting || confirmDelete.toLowerCase() !== DELETE_PHRASE}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {deleting
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>
                  : 'Delete All'}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
