export const STAGES = [
  'New Lead',
  'In Process',
  'Meeting Scheduled',
  'Meeting Completed',
  'Onboarding Started',
  'Onboarding Completed',
  'Offer Sent / Closed',
] as const;

export const ONBOARDING_STAGES = [
  'Onboarding Started',
  'Requirement Discussion',
  'Documents Collected',
  'Offer / Invite Sent',
  'Final Confirmation',
  'Onboarding Completed',
] as const;

export const STAGE_COLORS: Record<string, string> = {
  'New Lead': 'bg-blue-100 text-blue-700',
  'In Process': 'bg-yellow-100 text-yellow-700',
  'Meeting Scheduled': 'bg-purple-100 text-purple-700',
  'Meeting Completed': 'bg-indigo-100 text-indigo-700',
  'Onboarding Started': 'bg-orange-100 text-orange-700',
  'Onboarding Completed': 'bg-green-100 text-green-700',
  'Offer Sent / Closed': 'bg-gray-100 text-gray-700',
};

export const TAG_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
];

export const formatDate = (date: string | Date) => {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatRelativeTime = (date: string | Date) => {
  if (!date) return '—';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
};

export const maskPhone = (phone: string) => {
  if (!phone) return '—';
  return phone.slice(0, 3) + '****' + phone.slice(-3);
};
