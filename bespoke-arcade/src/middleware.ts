import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Auth gate: signing in with a @bespokelabs.ai Google account is
 * compulsory for every page and API route.
 *
 * Exceptions:
 * - /login and /auth/* (the sign-in flow itself)
 * - everything, when Supabase isn't configured — OAuth is impossible
 *   without it, so the app falls back to open demo mode.
 */

const ALLOWED_DOMAIN = 'bespokelabs.ai';
const PUBLIC_PATHS = ['/login', '/auth'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    // Demo mode — no Supabase project yet, nothing to authenticate against
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email?.toLowerCase();
  const allowed = !!email && email.endsWith(`@${ALLOWED_DOMAIN}`);

  if (allowed) return response;

  // Signed in with the wrong domain → drop the session
  if (user && !allowed) {
    await supabase.auth.signOut();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: `Sign in with your @${ALLOWED_DOMAIN} Google account` },
      { status: 401 }
    );
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = user && !allowed ? '?error=domain' : '';
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Everything except Next.js internals and static assets
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
