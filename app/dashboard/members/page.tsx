import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Users, Key, Calendar, ShieldCheck, Mail } from 'lucide-react';

interface OrganizationInfo {
  name: string;
  invite_code: string;
}

export default async function MembersPage() {
  const supabase = await createClient();

  // 1. Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 2. Fetch user's organization membership and role
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role, organization_id, organizations(name, invite_code)')
    .eq('profile_id', user.id)
    .single();

  if (!membership || !membership.organizations) {
    redirect('/onboarding');
  }

  const organization = membership.organizations as unknown as OrganizationInfo;
  const organizationId = membership.organization_id;

  // 3. Fetch all members in this organization
  // Join organization_members with profiles to get details
  const { data: members, error: membersError } = await supabase
    .from('organization_members')
    .select('id, role, created_at, profiles(full_name, email)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true });

  const roleColors: { [key: string]: string } = {
    owner: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    admin: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    member: 'text-zinc-400 bg-zinc-900 border-zinc-800',
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Workspace Members & Access Control
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            RBAC Hierarchy: Active // Enforced via PostgreSQL Constraints
          </p>
        </div>

        {/* Security Engine State Badge */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold font-mono">
            <ShieldCheck className="h-3.5 w-3.5" />
            RBAC Enforcement: ON
          </span>
        </div>
      </div>

      {/* Invite Code Panel */}
      <div className="bg-zinc-950/80 rounded-2xl border border-zinc-900 p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        {/* Subtle glow border */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />

        <div className="space-y-2 text-center md:text-left">
          <h3 className="text-sm font-bold text-white flex items-center justify-center md:justify-start gap-2">
            <Key className="h-4.5 w-4.5 text-purple-400" />
            Workspace Invite Credentials
          </h3>
          <p className="text-xs text-zinc-400 leading-normal max-w-md">
            Share this secret code with members you wish to enroll. They can paste this key during
            onboarding to connect directly to this tenant.
          </p>
        </div>

        {/* Invite Code Display Container */}
        <div className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 shrink-0">
          <div className="space-y-0.5">
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">
              Secret Invite Code
            </span>
            <span className="text-lg font-mono font-bold text-white tracking-widest">
              {organization.invite_code}
            </span>
          </div>
        </div>
      </div>

      {/* Members Grid / List */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-4.5 w-4.5 text-zinc-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 font-mono">
            Active Members ({members?.length || 0})
          </h2>
        </div>

        {membersError ? (
          <div className="p-4 bg-red-950/15 border border-red-900/30 rounded-xl text-center text-xs text-red-400">
            Failed to load workspace members: {membersError.message}
          </div>
        ) : (
          <div className="bg-zinc-950 rounded-2xl border border-zinc-900 overflow-hidden">
            <div className="divide-y divide-zinc-900">
              {members.map((member) => {
                const profile =
                  (member.profiles as unknown as { full_name: string; email: string }) || {};
                const joinedDate = new Date(member.created_at).toLocaleDateString([], {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <div
                    key={member.id}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-950/40 transition-colors"
                  >
                    {/* User Details */}
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-zinc-900 border border-zinc-850 flex items-center justify-center font-bold text-xs text-purple-400 uppercase">
                        {(profile.full_name || 'U').substring(0, 2)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          {profile.full_name || 'Anonymous Profile'}
                          {profile.email === user.email && (
                            <span className="text-[9px] font-mono text-purple-500 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded ml-2 font-bold uppercase">
                              You
                            </span>
                          )}
                        </h4>
                        <span className="text-xs text-zinc-500 font-mono flex items-center gap-1.5 mt-0.5">
                          <Mail className="h-3.5 w-3.5 text-zinc-650" />
                          {profile.email}
                        </span>
                      </div>
                    </div>

                    {/* Member Stats and Roles */}
                    <div className="flex items-center justify-between sm:justify-end gap-6 font-mono text-xs">
                      {/* Joined Date */}
                      <span className="text-zinc-500 flex items-center gap-1 text-[10px]">
                        <Calendar className="h-3.5 w-3.5 text-zinc-650" />
                        Joined {joinedDate}
                      </span>

                      {/* Member Role Badge */}
                      <span
                        className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${roleColors[member.role] || roleColors.member}`}
                      >
                        {member.role}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
