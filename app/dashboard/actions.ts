'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

/**
 * Signs out the current user on the server side and deletes authentication cookies.
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath('/', 'layout');
  redirect('/login');
}

/**
 * Inserts a new resource protected by tenant-specific RLS.
 * If the user's role does not permit inserts for this organization, RLS will abort the operation.
 */
export async function createResource(
  state: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const supabase = await createClient();

  const name = formData.get('resName') as string;
  const description = formData.get('resDesc') as string;
  const organizationId = formData.get('orgId') as string;

  if (!name || !organizationId) {
    return { error: 'Resource name is required' };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Authentication required' };
  }

  // Insert the resource. Supabase RLS policies will automatically check if the
  // user belongs to the target organization and has the required role (owner/admin)
  const { error } = await supabase.from('tenant_resources').insert({
    name,
    description: description || '',
    organization_id: organizationId,
    created_by: user.id,
  });

  if (error) {
    return { error: `Database RLS Blocked Operation: ${error.message} (Check role permission)` };
  }

  revalidatePath('/dashboard');
  return { success: true };
}
