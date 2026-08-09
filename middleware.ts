import { NextRequest, NextResponse } from 'next/server';
import { authkit, handleAuthkitProxy } from '@workos-inc/authkit-nextjs';
import { RATE_LIMITS, checkRateLimit } from '@/lib/rate-limit';

const redirectUri =
  process.env.WORKOS_REDIRECT_URI || 'http://localhost:3000/api/auth/callback';

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Rate limiting — global guard for every request, plus a stricter cap on
  //    the OAuth callback (token exchange), the most abuse-prone endpoint.
  const globalLimit = checkRateLimit(request, RATE_LIMITS.global);
  if (!globalLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: globalLimit.headers },
    );
  }

  if (pathname.startsWith('/api/auth/')) {
    const authLimit = checkRateLimit(request, RATE_LIMITS.authCallback);
    if (!authLimit.success) {
      return NextResponse.json(
        { error: 'Too many authentication attempts. Please try again later.' },
        { status: 429, headers: authLimit.headers },
      );
    }
  }

  // 2. AuthKit session handling (composable middleware).
  const { session, headers, authorizationUrl } = await authkit(request, {
    redirectUri,
  });

  // Never redirect the OAuth callback to the hosted UI — the callback route
  // itself exchanges the code. Everything else redirects unauthenticated users.
  if (!session.user && authorizationUrl && !pathname.startsWith('/api/auth/')) {
    return handleAuthkitProxy(request, headers, { redirect: authorizationUrl });
  }

  return handleAuthkitProxy(request, headers);
}

export const config = {
  matcher: ['/', '/((?!_next|_vercel|.*\\..*).*)'],
};