import { NextRequest, NextResponse } from 'next/server';
import { BIBLE_VERSIONS } from '@/lib/bible-data';
import { fetchVerseFromUpstream } from '@/lib/bible-chapter-fetch';

export const dynamic = 'force-dynamic';

const ALLOWED = new Set(BIBLE_VERSIONS.map((v) => v.value).filter((v) => v !== 'asnd' && v !== 'tagalog'));

export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get('reference')?.trim();
  const version = (req.nextUrl.searchParams.get('version') || 'kjv').toLowerCase().trim();

  if (!reference) {
    return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
  }

  if (!ALLOWED.has(version)) {
    return NextResponse.json(
      { error: 'Use client-side fetch for tagalog; /api/bible/scripture for ASND' },
      { status: 400 }
    );
  }

  const data = await fetchVerseFromUpstream(reference, version);
  if (!data) {
    return NextResponse.json({ error: 'Could not load verse from upstream' }, { status: 502 });
  }

  return NextResponse.json(data);
}
