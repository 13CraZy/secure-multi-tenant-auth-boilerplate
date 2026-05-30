'use client';

import React, { useState, useActionState } from 'react';
import { Building2, Key, Users, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { createOrganization, joinOrganization } from './actions';

export default function OnboardingPage() {
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [orgName, setOrgName] = useState('');
  const [slugSuggestion, setSlugSuggestion] = useState('');

  // Hook states for React 19 Server Actions integration
  const [createState, createAction, isCreatePending] = useActionState(createOrganization, null);
  const [joinState, joinAction, isJoinPending] = useActionState(joinOrganization, null);

  // Handle organization name changes and synchronously generate recommended slug URL
  const handleOrgNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setOrgName(name);

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // remove special chars
      .replace(/[\s_-]+/g, '-') // replace spaces/underscores with single hyphens
      .replace(/^-+|-+$/g, ''); // remove leading/trailing hyphens
    setSlugSuggestion(slug);
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex items-center justify-center font-sans p-4 relative selection:bg-purple-900 selection:text-purple-200">
      {/* Background radial highlight */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-purple-950/15 via-zinc-950/0 to-transparent pointer-events-none" />

      {/* Onboarding Container */}
      <div className="w-full max-w-[480px] bg-zinc-950/70 backdrop-blur-md rounded-3xl border border-zinc-900/80 p-8 shadow-2xl shadow-purple-950/5 relative overflow-hidden transition-all duration-300">
        {/* Decorative Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-[1px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />

        {/* Brand / Header */}
        <div className="flex flex-col items-center text-center space-y-3 mb-8">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/10">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              {mode === 'select' && 'Welcome to Console'}
              {mode === 'create' && 'Create your organization'}
              {mode === 'join' && 'Join existing workspace'}
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-1">
              {mode === 'select' && 'Select your onboarding path to get started'}
              {mode === 'create' && 'Establish a new secure multi-tenant sandbox'}
              {mode === 'join' && 'Enter the invitation credentials to connect'}
            </p>
          </div>
        </div>

        {/* Option Selection State */}
        {mode === 'select' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Create organization option */}
            <button
              onClick={() => setMode('create')}
              className="w-full text-left p-5 rounded-2xl bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800/80 hover:border-purple-600/50 flex items-start gap-4 transition-all duration-200 cursor-pointer group hover:shadow-lg hover:shadow-purple-950/5"
            >
              <div className="h-10 w-10 rounded-xl bg-purple-950/30 border border-purple-800/20 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:border-purple-500 transition-all duration-200">
                <Sparkles className="h-5 w-5 text-purple-400 group-hover:text-white" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  Create a new organization
                  <ArrowRight className="h-3.5 w-3.5 text-zinc-500 group-hover:text-purple-400 transition-all transform group-hover:translate-x-0.5" />
                </h3>
                <p className="text-xs text-zinc-400 leading-normal">
                  Configure a clean corporate workspace, generate unique invite codes, and become
                  the tenant Owner.
                </p>
              </div>
            </button>

            {/* Join organization option */}
            <button
              onClick={() => setMode('join')}
              className="w-full text-left p-5 rounded-2xl bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800/80 hover:border-purple-600/50 flex items-start gap-4 transition-all duration-200 cursor-pointer group hover:shadow-lg hover:shadow-purple-950/5"
            >
              <div className="h-10 w-10 rounded-xl bg-purple-950/30 border border-purple-800/20 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:border-purple-500 transition-all duration-200">
                <Users className="h-5 w-5 text-purple-400 group-hover:text-white" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  Join with an invite code
                  <ArrowRight className="h-3.5 w-3.5 text-zinc-500 group-hover:text-purple-400 transition-all transform group-hover:translate-x-0.5" />
                </h3>
                <p className="text-xs text-zinc-400 leading-normal">
                  Connect to an existing workspace set up by your administrator using an 8-character
                  invitation key.
                </p>
              </div>
            </button>
          </div>
        )}

        {/* Create Organization Form */}
        {mode === 'create' && (
          <form action={createAction} className="space-y-4 animate-fadeIn">
            {/* Org Name */}
            <div className="space-y-1.5">
              <label htmlFor="orgName" className="text-xs font-semibold text-zinc-400">
                Organization Name
              </label>
              <input
                id="orgName"
                name="orgName"
                type="text"
                placeholder="Acme Corporation"
                required
                value={orgName}
                onChange={handleOrgNameChange}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition-all"
              />
            </div>

            {/* Org Slug */}
            <div className="space-y-1.5">
              <label htmlFor="orgSlug" className="text-xs font-semibold text-zinc-400">
                Workspace Domain URL Slug
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-xs font-mono text-zinc-500 select-none">
                  console.com/
                </span>
                <input
                  id="orgSlug"
                  name="orgSlug"
                  type="text"
                  placeholder="acme-corp"
                  required
                  value={slugSuggestion}
                  onChange={(e) => setSlugSuggestion(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-28 pr-4 text-sm font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition-all"
                />
              </div>
              <p className="text-[10px] text-zinc-500 leading-normal">
                Lower-case alphanumeric identifier for clean route parameters.
              </p>
            </div>

            {/* Error Message */}
            {createState?.error && (
              <div className="p-3 bg-red-950/15 border border-red-900/30 text-red-400 text-xs rounded-xl text-center leading-normal">
                {createState.error}
              </div>
            )}

            {/* Actions Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setMode('select');
                  setOrgName('');
                }}
                className="w-1/3 py-2.5 px-4 rounded-xl border border-zinc-850 bg-zinc-950 text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-all active:scale-[0.97] cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isCreatePending}
                className="flex-1 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] cursor-pointer"
              >
                {isCreatePending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Initializing tenant...
                  </>
                ) : (
                  <>
                    Launch Workspace
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Join Organization Form */}
        {mode === 'join' && (
          <form action={joinAction} className="space-y-4 animate-fadeIn">
            {/* Invite Code */}
            <div className="space-y-1.5">
              <label htmlFor="inviteCode" className="text-xs font-semibold text-zinc-400">
                Workspace Invite Code
              </label>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  id="inviteCode"
                  name="inviteCode"
                  type="text"
                  placeholder="A8B9C2D5"
                  required
                  maxLength={8}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition-all uppercase"
                />
              </div>
              <p className="text-[10px] text-zinc-500 leading-normal">
                Ask your organization Owner for their 8-character workspace key.
              </p>
            </div>

            {/* Error Message */}
            {joinState?.error && (
              <div className="p-3 bg-red-950/15 border border-red-900/30 text-red-400 text-xs rounded-xl text-center leading-normal">
                {joinState.error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setMode('select')}
                className="w-1/3 py-2.5 px-4 rounded-xl border border-zinc-850 bg-zinc-950 text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-all active:scale-[0.97] cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isJoinPending}
                className="flex-1 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] cursor-pointer"
              >
                {isJoinPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    Connect Workspace
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
