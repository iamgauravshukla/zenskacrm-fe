'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { formatRelativeTime } from '@/lib/constants';
import toast from 'react-hot-toast';

// Pages that require a workspace to access
const WORKSPACE_REQUIRED = ['/leads', '/pipeline', '/meetings', '/onboarding', '/team'];

const NAV = [
  { href:'/dashboard', label:'Dashboard', wsRequired:false, icon:(a:boolean)=><svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={a?2.5:2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg> },
  { href:'/leads', label:'Leads', wsRequired:true, icon:(a:boolean)=><svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={a?2.5:2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg> },
  { href:'/pipeline', label:'Pipeline', wsRequired:true, icon:(a:boolean)=><svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={a?2.5:2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg> },
  { href:'/meetings', label:'Meetings', wsRequired:true, icon:(a:boolean)=><svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={a?2.5:2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg> },
  { href:'/onboarding', label:'Onboarding', wsRequired:true, icon:(a:boolean)=><svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={a?2.5:2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
  { href:'/team', label:'Team', wsRequired:true, icon:(a:boolean)=><svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={a?2.5:2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg> },
  { href:'/settings', label:'Settings', wsRequired:false, icon:(a:boolean)=><svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={a?2.5:2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg> },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showProfile, setShowProfile]           = useState(false);
  const [sidebarOpen, setSidebarOpen]           = useState(false);
  const [showCreateWsModal, setShowCreateWsModal] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // 🔥 Auth + Workspace Guard
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }

    if (!loading && user) {
      const requiresWorkspace = WORKSPACE_REQUIRED.some(route =>
        pathname.startsWith(route)
      );

      if (requiresWorkspace && !(user as any).workspaceId) {
        toast.error('Please create a workspace first');
        router.replace('/dashboard');
      }
    }
  }, [user, loading, pathname, router]);

  if (loading || !user) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="flex h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-[220px] bg-white border-r flex flex-col
        transform transition-transform duration-200 ease-in-out
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="h-16 px-5 flex items-center justify-between border-b">
          <div>
            <div className="font-bold">Zenska CRM</div>
            <div className="text-xs text-gray-400">
              {(user as any).workspaceId?.name || 'Workspace'}
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* 🔥 Create Workspace Button */}
        {!(user as any).workspaceId && (
          <div className="p-3">
            <button
              onClick={() => { setSidebarOpen(false); router.push('/dashboard'); }}
              className="w-full py-2 text-sm bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold transition-colors"
            >
              + Create Workspace
            </button>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ href, label, icon, wsRequired }) => {
            const active = pathname === href || pathname.startsWith(href);
            const disabled = wsRequired && !(user as any).workspaceId;

            return (
              <Link
                key={href}
                href={disabled ? '#' : href}
                className={`flex items-center gap-2 p-2 rounded ${
                  active ? 'bg-blue-100' : ''
                } ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
              >
                {icon(active)}
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Profile */}
        <div className="p-3 border-t">
          <button onClick={logout} className="text-red-500 text-sm">
            Logout
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between h-14 px-4 border-b bg-white flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600 hover:text-gray-900 p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          <div className="font-bold text-sm">Zenska CRM</div>
          <button onClick={logout} className="text-red-500 text-sm font-medium">Logout</button>
        </div>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}