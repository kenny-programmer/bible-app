import { NextRequest, NextResponse } from 'next/server';
import { handleAuth } from '@workos-inc/authkit-nextjs';
import { RATE_LIMITS, checkRateLimit } from '@/lib/rate-limit';

const authHandler = handleAuth();

export async function GET(request: NextRequest) {
  const limit = checkRateLimit(request, RATE_LIMITS.authCallback);
  if (!limit.success) {
    return NextResponse.json(
      { error: 'Too many authentication attempts. Please try again later.' },
      { status: 429, headers: limit.headers },
    );
  }
  return authHandler(request);
}