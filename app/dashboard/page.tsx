import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import ResourceForm from '@/components/ResourceForm';
import { ShieldCheck, Database, Calendar, User, ShieldAlert } from 'lucide-react';

export default async function DashboardPage() {
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
    .select('role, organization_id, organizations(name)')
    .eq('profile_id', user.id)
    .single();

  if (!membership || !membership.organizations) {
    redirect('/onboarding');
  }

  const organization = membership.organizations as unknown as { name: string };
  const organizationId = membership.organization_id;
  const userRole = membership.role;
  const canManage = userRole === 'owner' || userRole === 'admin';

  // 3. Fetch resources belonging to this organization
  // Supabase RLS will automatically ensure the user cannot query resources from other tenants
  const { data: resources, error: resourcesError } = await supabase
    .from('tenant_resources')
    .select('*, profiles:created_by(full_name, email)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Enterprise Resources Console
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Tenant Isolation: Active // Connected to Postgres RLS Engine
          </p>
        </div>

        {/* Security Engine State Badge */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold font-mono">
            <ShieldCheck className="h-3.5 w-3.5" />
            RLS Enforcement: ON
          </span>
        </div>
      </div>

      {/* Role and Privileges Banner */}
      <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs leading-normal">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
          <p className="text-zinc-400">
            Workspace: <strong className="text-zinc-200">{organization.name}</strong> | Signed in
            as:{' '}
            <span className="font-mono text-purple-400 font-bold">{userRole.toUpperCase()}</span>
          </p>
        </div>
        {!canManage && (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-500 bg-amber-500/5 border border-amber-500/10 px-2 py-0.5 rounded">
            <ShieldAlert className="h-3 w-3" />
            READ-ONLY PRIVILEGES
          </span>
        )}
      </div>

      {/* Resource Creator Form (Conditional on role RBAC) */}
      {canManage ? (
        <ResourceForm organizationId={organizationId} />
      ) : (
        <div className="p-4 rounded-xl bg-amber-950/10 border border-amber-900/20 flex gap-3 text-xs text-amber-400 leading-relaxed">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-bold">Creation Blocked in Client Router</p>
            <p className="text-[11px] text-amber-500/90 mt-0.5">
              Only workspace Owners and Admins are permitted to append new records. Standard Members
              are restricted to read-only views via Postgres RLS.
            </p>
          </div>
        </div>
      )}

      {/* Resources Display Section */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 font-mono">
          Protected Resources Log
        </h2>

        {resourcesError ? (
          <div className="p-4 bg-red-950/15 border border-red-900/30 rounded-xl text-center text-xs text-red-400">
            Failed to load resources: {resourcesError.message}
          </div>
        ) : !resources || resources.length === 0 ? (
          <div className="h-48 border border-dashed border-zinc-900 rounded-2xl flex flex-col items-center justify-center text-center p-6 bg-zinc-950/20">
            <Database className="h-8 w-8 text-zinc-700 mb-2" />
            <p className="text-xs font-semibold text-zinc-400">
              No resources found inside this workspace
            </p>
            <p className="text-[10px] text-zinc-600 mt-1 max-w-xs leading-normal">
              {canManage
                ? 'Create a secure record using the form above to check RLS isolation policies.'
                : 'Ask your organization Owner or Admin to append resource records.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resources.map((resource) => {
              const creator =
                (resource.profiles as unknown as { full_name: string; email: string }) || {};
              const createdDate = new Date(resource.created_at).toLocaleDateString([], {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={resource.id}
                  className="bg-zinc-950/60 hover:bg-zinc-950 rounded-2xl border border-zinc-900/80 hover:border-zinc-850 p-5 flex flex-col justify-between gap-4 transition-all duration-300 group hover:shadow-lg hover:shadow-purple-950/5 relative overflow-hidden"
                >
                  <div className="space-y-2 relative z-10">
                    <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-850">
                      UUID: {resource.id}
                    </span>
                    <h3 className="text-sm font-bold text-white tracking-wide mt-1.5 group-hover:text-purple-400 transition-colors">
                      {resource.name}
                    </h3>
                    <p className="text-xs text-zinc-400 leading-normal">
                      {resource.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-zinc-900/60 font-mono text-[9px] text-zinc-500 relative z-10">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3 text-zinc-650" />
                      {creator.full_name || 'System'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-zinc-650" />
                      {createdDate}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
