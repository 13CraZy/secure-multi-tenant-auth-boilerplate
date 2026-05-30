'use client';

import React, { useActionState, useEffect, useRef } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { createResource } from '@/app/dashboard/actions';

interface ResourceFormProps {
  organizationId: string;
}

export default function ResourceForm({ organizationId }: ResourceFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  // React 19 useActionState hook for Server Action state management
  const [state, formAction, isPending] = useActionState(createResource, null);

  // Clear the form fields upon successful resource creation
  useEffect(() => {
    if (state?.success && formRef.current) {
      formRef.current.reset();
    }
  }, [state]);

  return (
    <div className="bg-zinc-950 rounded-2xl border border-zinc-900 p-5 space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-zinc-900">
        <Plus className="h-4 w-4 text-purple-400" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Create Protected Resource
        </h3>
      </div>

      <form ref={formRef} action={formAction} className="space-y-4">
        {/* Hidden Org ID Input */}
        <input type="hidden" name="orgId" value={organizationId} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Resource Name */}
          <div className="space-y-1.5 md:col-span-1">
            <label htmlFor="resName" className="text-[10px] font-bold uppercase text-zinc-500">
              Resource Name
            </label>
            <input
              id="resName"
              name="resName"
              type="text"
              placeholder="Database Instance Alpha"
              required
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl py-2 px-3.5 text-xs text-zinc-200 focus:outline-none focus:border-purple-600 transition-all"
            />
          </div>

          {/* Resource Description */}
          <div className="space-y-1.5 md:col-span-2">
            <label htmlFor="resDesc" className="text-[10px] font-bold uppercase text-zinc-500">
              Description / Notes
            </label>
            <input
              id="resDesc"
              name="resDesc"
              type="text"
              placeholder="Production database replica hosted in US-East-1 AWS datacenter"
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl py-2 px-3.5 text-xs text-zinc-200 focus:outline-none focus:border-purple-600 transition-all"
            />
          </div>
        </div>

        {/* Action Button and Status Displays */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-2">
          {/* Error Message */}
          {state?.error ? (
            <div className="text-[11px] font-mono text-red-400 bg-red-950/15 border border-red-900/20 px-3 py-1.5 rounded-lg w-full md:w-auto">
              {state.error}
            </div>
          ) : (
            <div className="text-[10px] font-mono text-zinc-500">
              * RLS policies will reject inputs if user has insufficient privileges.
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full md:w-auto py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] cursor-pointer shrink-0"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Encrypting Resource...
              </>
            ) : (
              <>Add Secure Resource</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
