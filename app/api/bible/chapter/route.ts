import { NextRequest, NextResponse } from 'next/server';
import { BIBLE_BOOKS, BIBLE_VERSIONS } from '@/lib/bible-data';
import { fetchChapterFromUpstream } from '@/lib/bible-chapter-fetch';

const ALLOWED = new Set(BIBLE_VERSIONS.map((v) => v.value).filter((v) => v !== 'asnd'));

export async function GET(req: NextRequest) {
  const book = req.nextUrl.searchParams.get('book')?.trim();
  const chapterStr = req.nextUrl.searchParams.get('chapter');
  const version = (req.nextUrl.searchParams.get('version') || 'kjv').toLowerCase().trim();

  if (!book || !chapterStr) {
    return NextResponse.json({ error: 'Missing book or chapter' }, { status: 400 });
  }

  if (!ALLOWED.has(version)) {
    return NextResponse.json({ error: 'Unsupported version for this route (use /api/bible/scripture for ASND)' }, { status: 400 });
  }

  const chapter = parseInt(chapterStr, 10);
  if (!Number.isFinite(chapter) || chapter < 1) {
    return NextResponse.json({ error: 'Invalid chapter' }, { status: 400 });
  }

  if (!BIBLE_BOOKS.some((b) => b.name === book)) {
    return NextResponse.json({ error: 'Unknown book' }, { status: 400 });
  }

  const data = await fetchChapterFromUpstream(book, chapter, version);
  if (!data) {
    return NextResponse.json({ error: 'Could not load chapter from upstream' }, { status: 502 });
  }

  return NextResponse.json(data);
}
