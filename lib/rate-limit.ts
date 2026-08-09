import type { NextRequest } from 'next/server';

export type RateLimitOptions = {
  /** Namespace for this counter, e.g. `auth` or `global`. */
  keyPrefix: string;
  /** Maximum number of allowed requests inside the window. */
  limit: number;
  /** Window size in milliseconds. */
  windowMs: number;
};

export type RateLimitResult = {
  success: boolean;
  headers: Headers;
};

// In-memory sliding window. Works per edge instance and is cleared on cold
// starts — a best-effort guard. On serverless/multi-region deploys swap this
// for a shared store (Upstash Redis / Supabase) if stricter guarantees are
// needed.
const buckets = new Map<string, number[]>();

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) {
      return first;
    }
  }
  return request.ip ?? 'unknown';
}

export function checkRateLimit(request: NextRequest, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const ip = getClientIp(request);
  const key = `${options.keyPrefix}:${ip}`;

  const cutoff = now - options.windowMs;

  let hits = buckets.get(key);
  if (!hits) {
    hits = [];
    buckets.set(key, hits);
  }

  // Keep only hits inside the current window, then record this request.
  const recent = hits.filter((t) => t > cutoff);
  recent.push(now);
  buckets.set(key, recent);

  // Prevent unbounded growth on a busy instance.
  if (buckets.size > 10_000) {
    buckets.clear();
  }

  const isLimited = recent.length > options.limit;

  const headers = new Headers();
  headers.set('X-RateLimit-Limit', String(options.limit));
  headers.set(
    'X-RateLimit-Remaining',
    String(Math.max(0, options.limit - recent.length)),
  );
  if (isLimited) {
    const firstInWindow = recent[recent.length - options.limit - 1];
    const retryAfterSec = firstInWindow
      ? Math.max(1, Math.ceil((firstInWindow + options.windowMs - now) / 1000))
      : 1;
    headers.set('Retry-After', String(retryAfterSec));
  }

  return { success: !isLimited, headers };
}

export const RATE_LIMITS = {
  /** Global guard for all requests from a single IP. */
  global: { keyPrefix: 'global', limit: 120, windowMs: 60_000 },
  /** Auth callback / token exchange — a sensitive endpoint. */
  authCallback: { keyPrefix: 'auth-callback', limit: 20, windowMs: 60_000 },
} satisfies Record<string, RateLimitOptions>;