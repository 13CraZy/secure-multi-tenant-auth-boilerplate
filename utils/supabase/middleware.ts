import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Validates and refreshes the Supabase user session using cookie headers.
 * Applies application-level route protection (login, onboarding, dashboard).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Always use getUser() instead of getSession() to guarantee secure server-side JWT verification
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isDashboardRoute = pathname.startsWith('/dashboard');
  const isOnboardingRoute = pathname.startsWith('/onboarding');
  const isLoginRoute = pathname.startsWith('/login');
  const isRootRoute = pathname === '/';

  if (user) {
    // Check if the user is associated with any organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('profile_id', user.id)
      .limit(1)
      .maybeSingle();

    if (!membership) {
      // User is logged in but has no active tenant (organization) -> restrict to /onboarding
      if (isDashboardRoute || isRootRoute || isLoginRoute) {
        const url = request.nextUrl.clone();
        url.pathname = '/onboarding';
        return NextResponse.redirect(url);
      }
    } else {
      // User is logged in and has an active tenant -> restrict from login/onboarding
      if (isLoginRoute || isOnboardingRoute || isRootRoute) {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
      }
    }
  } else {
    // User is not logged in -> restrict protected areas to /login
    if (isDashboardRoute || isOnboardingRoute || isRootRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
