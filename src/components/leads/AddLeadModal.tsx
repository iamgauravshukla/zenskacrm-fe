'use client';
import { useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { TAG_COLORS } from '@/lib/constants';

export default function AddLeadModal({ teamMembers, onClose, onSaved }: { teamMembers: any[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', brand: '', tagColor: '#6366f1',
    sellsOnOtherPlatform: '', authorizedBrand: '', challenges: '', assignedTo: '', source: 'Manual',
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/leads', form);
      toast.success('Lead added');
      onSaved();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add lead');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-lg">Add New Lead</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input required className="input" value={form.name} onChange={set('name')} placeholder="Full name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <input required className="input" value={form.phone} onChange={set('phone')} placeholder="+91 XXXXX XXXXX" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" className="input" value={form.email} onChange={set('email')} placeholder="email@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <input className="input" value={form.brand} onChange={set('brand')} placeholder="Brand name or No Brand" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
              <select className="input" value={form.assignedTo} onChange={set('assignedTo')}>
                <option value="">Unassigned</option>
                {teamMembers.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tag Color</label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {TAG_COLORS.map(c => (
                  <button type="button" key={c} onClick={() => setForm(p => ({ ...p, tagColor: c }))}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${form.tagColor === c ? 'border-gray-800 scale-125' : 'border-transparent'}`}
                    style={{ background: c }} />
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sells on Other Platform</label>
              <input className="input" value={form.sellsOnOtherPlatform} onChange={set('sellsOnOtherPlatform')} placeholder="e.g. yes, on Shopee" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Authorized Brand</label>
              <input className="input" value={form.authorizedBrand} onChange={set('authorizedBrand')} placeholder="Brand name(s)" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Challenges</label>
            <textarea className="input h-20 resize-none" value={form.challenges} onChange={set('challenges')} placeholder="Key challenges or pain points..." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Adding...' : 'Add Lead'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
