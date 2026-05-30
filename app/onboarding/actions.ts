'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import crypto from 'crypto';

export async function createOrganization(state: { error?: string } | null, formData: FormData) {
  const supabase = await createClient();

  const name = formData.get('orgName') as string;
  const slug = formData.get('orgSlug') as string;

  if (!name || !slug) {
    return { error: 'Organization name and URL slug are required' };
  }

  // Generate an atomic alphanumeric invite code (8 chars)
  const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();

  // 1. Get authenticated user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Authentication required to create an organization' };
  }

  // 2. Insert organization (the DB trigger automatically creates the owner member record)
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name,
      slug: slug.toLowerCase().trim(),
      invite_code: inviteCode,
    })
    .select('id')
    .single();

  if (orgError) {
    return { error: `Failed to create organization: ${orgError.message}` };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function joinOrganization(state: { error?: string } | null, formData: FormData) {
  const supabase = await createClient();

  const inviteCode = formData.get('inviteCode') as string;

  if (!inviteCode) {
    return { error: 'Invite code is required to join' };
  }

  const cleanCode = inviteCode.toUpperCase().trim();

  // 1. Get authenticated user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Authentication required to join an organization' };
  }

  // 2. Securely join organization via RPC (Stored Procedure) to avoid RLS recursion and leaks
  const { error: joinError } = await supabase.rpc('join_organization', {
    invite_code_param: cleanCode,
  });

  if (joinError) {
    return { error: joinError.message };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}
