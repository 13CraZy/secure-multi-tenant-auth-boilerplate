'use client';

import React, { useState, useActionState } from 'react';
import { Shield, KeyRound, Mail, User, ArrowRight, Loader2 } from 'lucide-react';
import { login, signup } from './actions';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);

  // React 19 standard useActionState hook for Server Actions state management
  const [loginState, loginAction, isLoginPending] = useActionState(login, null);
  const [signupState, signupAction, isSignupPending] = useActionState(signup, null);

  const activeState = isSignUp ? signupState : loginState;
  const isPending = isSignUp ? isSignupPending : isLoginPending;
  const activeAction = isSignUp ? signupAction : loginAction;

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex items-center justify-center font-sans p-4 relative selection:bg-purple-900 selection:text-purple-200">
      {/* Background radial highlight */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-purple-950/15 via-zinc-950/0 to-transparent pointer-events-none" />

      {/* Login Container */}
      <div className="w-full max-w-[420px] bg-zinc-950/70 backdrop-blur-md rounded-3xl border border-zinc-900/80 p-8 shadow-2xl shadow-purple-950/5 relative overflow-hidden transition-all duration-300">
        {/* Decorative Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-[1px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />

        {/* Brand / Title Header */}
        <div className="flex flex-col items-center text-center space-y-3 mb-8">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/10">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              {isSignUp ? 'Create your account' : 'Sign in to Console'}
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-1">Multi-Tenant Secure Cloud Engine</p>
          </div>
        </div>

        {/* Form */}
        <form action={activeAction} className="space-y-4">
          {/* Full Name (Sign Up Only) */}
          {isSignUp && (
            <div className="space-y-1.5 animate-fadeIn">
              <label htmlFor="fullName" className="text-xs font-semibold text-zinc-400">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="Felix Iniguez"
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition-all font-sans"
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-semibold text-zinc-400">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@domain.com"
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition-all font-sans"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label htmlFor="password" className="text-xs font-semibold text-zinc-400">
                Password
              </label>
            </div>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition-all font-sans"
              />
            </div>
          </div>

          {/* Error Message */}
          {activeState?.error && (
            <div className="p-3 bg-red-950/15 border border-red-900/30 text-red-400 text-xs rounded-xl text-center leading-normal animate-shake">
              {activeState.error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] shadow-md shadow-purple-900/10 mt-6 cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                Processing request...
              </>
            ) : (
              <>
                {isSignUp ? 'Create enterprise workspace' : 'Authenticate credentials'}
                <ArrowRight className="h-4 w-4 text-purple-300" />
              </>
            )}
          </button>
        </form>

        {/* Footer switcher */}
        <div className="mt-8 pt-6 border-t border-zinc-900 text-center">
          <p className="text-xs text-zinc-500">
            {isSignUp ? 'Already have an active console?' : 'Need a new tenant workspace?'}
          </p>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
            }}
            className="mt-2 text-xs font-bold text-purple-400 hover:text-purple-300 underline underline-offset-4 cursor-pointer focus:outline-none"
          >
            {isSignUp
              ? 'Use existing account credentials'
              : 'Create a new multi-tenant organization'}
          </button>
        </div>
      </div>
    </div>
  );
}
