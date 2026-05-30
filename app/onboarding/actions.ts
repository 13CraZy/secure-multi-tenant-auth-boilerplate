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

  // 2. Insert organization
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

  // 3. Create membership (creator is the Owner)
  const { error: memberError } = await supabase.from('organization_members').insert({
    organization_id: org.id,
    profile_id: user.id,
    role: 'owner',
  });

  if (memberError) {
    return { error: `Failed to create organization owner membership: ${memberError.message}` };
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

  // 2. Find the organization matching the invite code
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('invite_code', cleanCode)
    .limit(1)
    .maybeSingle();

  if (orgError || !org) {
    return { error: 'Invalid invite code. Organization not found' };
  }

  // 3. Create member record for the user (role = member)
  const { error: memberError } = await supabase.from('organization_members').insert({
    organization_id: org.id,
    profile_id: user.id,
    role: 'member',
  });

  if (memberError) {
    // If user is already a member, Postgres will return a unique constraint error
    if (memberError.code === '23505') {
      return { error: 'You are already a member of this organization' };
    }
    return { error: `Failed to join organization: ${memberError.message}` };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}
