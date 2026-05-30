import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { signOut } from './actions';
import { Building2, Database, Users, LogOut, User as UserIcon } from 'lucide-react';

interface OrganizationInfo {
  id: string;
  name: string;
  slug: string;
  invite_code: string;
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  // 1. Validate user session on server
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 2. Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single();

  // 3. Fetch user organization and membership role
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role, organizations(id, name, slug, invite_code)')
    .eq('profile_id', user.id)
    .single();

  if (!membership || !membership.organizations) {
    redirect('/onboarding');
  }

  const organization = membership.organizations as unknown as OrganizationInfo;
  const userRole = membership.role;

  // Role Badge Styling mapping
  const roleStyles: { [key: string]: string } = {
    owner: 'bg-purple-950/30 text-purple-400 border-purple-800/30',
    admin: 'bg-blue-950/30 text-blue-400 border-blue-800/30',
    member: 'bg-zinc-900 text-zinc-400 border-zinc-800',
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex font-sans selection:bg-purple-900 selection:text-purple-200">
      {/* Sidebar - Desktop */}
      <aside className="w-64 border-r border-zinc-900 bg-zinc-950/80 backdrop-blur-md flex flex-col justify-between hidden md:flex shrink-0">
        {/* Top Section */}
        <div className="p-6 space-y-8">
          {/* Org Selector Display */}
          <div className="flex items-center gap-3 border-b border-zinc-900 pb-5">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/10">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div className="truncate">
              <h2 className="text-sm font-bold text-white tracking-wide truncate">
                {organization.name}
              </h2>
              <span className="text-[10px] font-mono text-zinc-500 truncate block">
                /{organization.slug}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-850 transition-all duration-200"
            >
              <Database className="h-4 w-4 text-purple-400" />
              Tenant Resources
            </Link>

            <Link
              href="/dashboard/members"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-850 transition-all duration-200"
            >
              <Users className="h-4 w-4 text-purple-400" />
              Members & Invites
            </Link>
          </nav>
        </div>

        {/* Bottom Profile Section */}
        <div className="p-6 border-t border-zinc-900 space-y-4">
          {/* User Details */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
              <UserIcon className="h-4 w-4" />
            </div>
            <div className="truncate text-left">
              <h4 className="text-xs font-bold text-white truncate">
                {profile?.full_name || 'Guest User'}
              </h4>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`px-1.5 py-0.5 rounded border text-[9px] font-mono uppercase tracking-wider font-bold ${roleStyles[userRole] || roleStyles.member}`}
                >
                  {userRole}
                </span>
              </div>
            </div>
          </div>

          {/* Logout Action */}
          <form action={signOut}>
            <button
              type="submit"
              className="w-full py-2 px-3 rounded-xl bg-zinc-900 hover:bg-red-950/20 border border-zinc-850 hover:border-red-900/30 text-xs font-semibold text-zinc-400 hover:text-red-400 flex items-center justify-center gap-2 transition-all active:scale-[0.97] cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Terminate Session
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Navigation Header */}
        <header className="h-14 border-b border-zinc-900 bg-zinc-950/60 backdrop-blur-md px-4 flex items-center justify-between md:hidden">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-purple-400" />
            <span className="text-xs font-bold text-white truncate">{organization.name}</span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-1.5 text-zinc-400 hover:text-white">
              <Database className="h-4 w-4" />
            </Link>
            <Link href="/dashboard/members" className="p-1.5 text-zinc-400 hover:text-white">
              <Users className="h-4 w-4" />
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="p-1.5 text-zinc-400 hover:text-red-400 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </header>

        {/* Dynamic page contents render */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative z-10">{children}</main>
      </div>
    </div>
  );
}
