import { NextRequest, NextResponse } from 'next/server';
import { canonicalEnglishBibleBookName } from '@/lib/bible-api-version';
import { bookNameToUsfm, chapterId } from '@/lib/book-usfm';
import { christSegmentsFromApiBibleHtml } from '@/lib/scripture-html-red-letter';
import type { ChristWordSegment } from '@/lib/bible-red-letter';

export const dynamic = 'force-dynamic';

type ScriptureVerseRow = { verse: number; text: string; christSegments?: ChristWordSegment[] };

const SCRIPTURE_BASE = 'https://api.scripture.api.bible/v1';

let cachedAsndBibleId: string | undefined;

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

function verseNumberFromVerseId(id: string): number | null {
  const parts = id.split('.');
  if (parts.length < 3) return null;
  const last = parts[parts.length - 1];
  if (!/^\d+$/.test(last)) return null;
  const n = parseInt(last, 10);
  return Number.isFinite(n) ? n : null;
}

function verseRowFromSlice(slice: string, verseNum: number): ScriptureVerseRow {
  const christSegments = christSegmentsFromApiBibleHtml(slice) ?? undefined;
  const row: ScriptureVerseRow = { verse: verseNum, text: stripHtml(slice) };
  if (christSegments?.length) row.christSegments = christSegments;
  return row;
}

/** Parse API.Bible chapter HTML into verse segments (best-effort; formats vary). */
function parseVersesFromChapterHtml(html: string): ScriptureVerseRow[] {
  const out: ScriptureVerseRow[] = [];

  // Pattern A: ...3.16 style ids in attributes
  const idRe = /data-id="([A-Z0-9]+)\.(\d+)\.(\d+)"/gi;
  let m: RegExpExecArray | null;
  const markers: { index: number; verse: number }[] = [];
  while ((m = idRe.exec(html)) !== null) {
    const verse = parseInt(m[3], 10);
    if (Number.isFinite(verse)) markers.push({ index: m.index, verse });
  }

  if (markers.length > 0) {
    for (let i = 0; i < markers.length; i++) {
      const start = markers[i].index;
      const end = i + 1 < markers.length ? markers[i + 1].index : html.length;
      const slice = html.slice(start, end);
      out.push(verseRowFromSlice(slice, markers[i].verse));
    }
    return out;
  }

  // Pattern B: verse-num spans
  const numRe = /<span[^>]*class="[^"]*verse-num[^"]*"[^>]*>\s*(\d+)\s*<\/span>/gi;
  const spans: { index: number; verse: number }[] = [];
  while ((m = numRe.exec(html)) !== null) {
    const verse = parseInt(m[1], 10);
    if (Number.isFinite(verse)) spans.push({ index: m.index, verse });
  }
  if (spans.length > 0) {
    for (let i = 0; i < spans.length; i++) {
      const start = spans[i].index;
      const end = i + 1 < spans.length ? spans[i + 1].index : html.length;
      const slice = html.slice(start, end);
      out.push(verseRowFromSlice(slice, spans[i].verse));
    }
    return out;
  }

  // Pattern C: simple <sup>1</sup> markers
  const supRe = /<sup[^>]*>\s*(\d+)\s*<\/sup>/gi;
  const sups: { index: number; verse: number }[] = [];
  while ((m = supRe.exec(html)) !== null) {
    const verse = parseInt(m[1], 10);
    if (Number.isFinite(verse)) sups.push({ index: m.index, verse });
  }
  if (sups.length >= 1) {
    for (let i = 0; i < sups.length; i++) {
      const start = sups[i].index;
      const end = i + 1 < sups.length ? sups[i + 1].index : html.length;
      const slice = html.slice(start, end);
      out.push(verseRowFromSlice(slice, sups[i].verse));
    }
    return out;
  }

  const plain = stripHtml(html);
  if (plain) {
    const christSegments = christSegmentsFromApiBibleHtml(html);
    const row: ScriptureVerseRow = { verse: 1, text: plain };
    if (christSegments?.length) row.christSegments = christSegments;
    out.push(row);
  }
  return out;
}

async function scriptureFetch(path: string, apiKey: string): Promise<Response> {
  return fetch(`${SCRIPTURE_BASE}${path}`, {
    headers: {
      'api-key': apiKey,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });
}

async function resolveAsndBibleId(apiKey: string): Promise<string | null> {
  const fromEnv = process.env.SCRIPTURE_ASND_BIBLE_ID?.trim();
  if (fromEnv) return fromEnv;

  if (cachedAsndBibleId) return cachedAsndBibleId;

  const matchesAsnd = (b: {
    abbreviation?: string;
    name?: string;
    id?: string;
    language?: { name?: string };
  }) => {
    const abbr = b.abbreviation?.toUpperCase() ?? '';
    const name = b.name ?? '';
    const lang = b.language?.name ?? '';
    return (
      abbr === 'ASND' ||
      /ang\s+salita\s+ng\s+(diyos|dios)/i.test(name) ||
      (/tagalog/i.test(lang) && /salita/i.test(name))
    );
  };

  let pageToken: string | undefined;
  for (let i = 0; i < 30; i++) {
    const path =
      i === 0
        ? '/bibles?abbreviation=ASND'
        : `/bibles?abbreviation=ASND&pageToken=${encodeURIComponent(pageToken!)}`;
    const res = await scriptureFetch(path, apiKey);
    if (!res.ok) break;
    const json = await res.json();
    const rows = Array.isArray(json.data) ? json.data : [];
    const hit = rows.find(matchesAsnd);
    if (hit?.id) {
      cachedAsndBibleId = hit.id;
      return hit.id;
    }
    pageToken = json.meta?.nextPageToken as string | undefined;
    if (!pageToken) break;
  }

  pageToken = undefined;
  for (let i = 0; i < 40; i++) {
    const path =
      i === 0 || !pageToken
        ? '/bibles'
        : `/bibles?pageToken=${encodeURIComponent(pageToken)}`;
    const res = await scriptureFetch(path, apiKey);
    if (!res.ok) break;
    const json = await res.json();
    const rows = Array.isArray(json.data) ? json.data : [];
    const hit = rows.find(matchesAsnd);
    if (hit?.id) {
      cachedAsndBibleId = hit.id;
      return hit.id;
    }
    pageToken = json.meta?.nextPageToken as string | undefined;
    if (!pageToken) break;
  }

  return null;
}

async function fetchVersesFromChapterList(
  bibleId: string,
  cid: string,
  apiKey: string
): Promise<ScriptureVerseRow[] | null> {
  const res = await scriptureFetch(`/bibles/${bibleId}/chapters/${encodeURIComponent(cid)}/verses`, apiKey);
  if (!res.ok) return null;
  const json = await res.json();
  const rows = Array.isArray(json.data) ? json.data : [];
  if (rows.length === 0) return null;

  const parsed: ScriptureVerseRow[] = [];
  for (const row of rows) {
    const id = typeof row.id === 'string' ? row.id : '';
    const vn = verseNumberFromVerseId(id);
    if (vn == null) continue;
    const raw =
      (typeof row.content === 'string' && row.content) ||
      (typeof row.text === 'string' && row.text) ||
      (typeof row.plainText === 'string' && row.plainText) ||
      '';
    if (!raw) {
      parsed.length = 0;
      break;
    }
    const fromWj = christSegmentsFromApiBibleHtml(raw) ?? undefined;
    const rowWithSeg: ScriptureVerseRow =
      fromWj?.length ? { verse: vn, text: stripHtml(raw), christSegments: fromWj }
      : { verse: vn, text: stripHtml(raw) };
    parsed.push(rowWithSeg);
  }
  if (parsed.length === rows.length && parsed.length > 0) return parsed;

  // Per-verse fetch when list has ids only (rare; slower)
  if (rows.length > 0 && rows.every((r: { id?: string }) => typeof r.id === 'string')) {
    const batchSize = 24;
    const acc: ScriptureVerseRow[] = [];
    for (let i = 0; i < rows.length; i += batchSize) {
      const chunk = rows.slice(i, i + batchSize);
      const settled = await Promise.all(
        chunk.map(async (row: { id: string }) => {
          const vr = await scriptureFetch(
            `/bibles/${bibleId}/verses/${encodeURIComponent(row.id)}?include-chapter-numbers=false&include-verse-numbers=false`,
            apiKey
          );
          if (!vr.ok) return null;
          const j = await vr.json();
          const vn = verseNumberFromVerseId(row.id);
          if (vn == null) return null;
          const raw = typeof j.data?.content === 'string' ? j.data.content : '';
          if (!raw) return null;
          const fromWj = christSegmentsFromApiBibleHtml(raw) ?? undefined;
          return (
            fromWj?.length ? { verse: vn, text: stripHtml(raw), christSegments: fromWj }
            : { verse: vn, text: stripHtml(raw) }
          );
        })
      );
      for (const item of settled) {
        if (item && item.text) acc.push(item);
      }
    }
    if (acc.length > 0) return acc.sort((a, b) => a.verse - b.verse);
  }

  return null;
}

async function fetchChapterFromHtml(
  bibleId: string,
  cid: string,
  apiKey: string
): Promise<ScriptureVerseRow[] | null> {
  const res = await scriptureFetch(`/bibles/${bibleId}/chapters/${encodeURIComponent(cid)}`, apiKey);
  if (!res.ok) return null;
  const json = await res.json();
  const html = typeof json.data?.content === 'string' ? json.data.content : '';
  if (!html) return null;
  const verses = parseVersesFromChapterHtml(html);
  return verses.length ? verses : null;
}

function parseReference(reference: string): { book: string; chapter: number; start: number; end: number } | null {
  const match = reference.trim().match(/^(\d?\s*[\w\s]+?)\s+(\d+):(\d+)(?:-(\d+))?$/i);
  if (!match) return null;
  const book = match[1].replace(/\s+/g, ' ').trim();
  const chapter = parseInt(match[2], 10);
  const start = parseInt(match[3], 10);
  const end = match[4] ? parseInt(match[4], 10) : start;
  if (!book || !Number.isFinite(chapter) || !Number.isFinite(start)) return null;
  return { book, chapter, start, end: Number.isFinite(end) ? end : start };
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.SCRIPTURE_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'SCRIPTURE_API_KEY is not set. Add a free key from https://scripture.api.bible/ to your environment to use Ang Salita ng Dios (ASND).',
      },
      { status: 503 }
    );
  }

  const version = req.nextUrl.searchParams.get('version')?.toLowerCase();
  if (version !== 'asnd') {
    return NextResponse.json({ error: 'Unsupported version' }, { status: 400 });
  }

  const bibleId = await resolveAsndBibleId(apiKey);
  if (!bibleId) {
    return NextResponse.json(
      { error: 'Could not resolve ASND Bible id. Set SCRIPTURE_ASND_BIBLE_ID or check API key access.' },
      { status: 502 }
    );
  }

  const reference = req.nextUrl.searchParams.get('reference');
  if (reference) {
    const ref = parseReference(reference);
    if (!ref) {
      return NextResponse.json({ error: 'Invalid reference' }, { status: 400 });
    }
    const usfm = bookNameToUsfm(ref.book);
    if (!usfm) {
      return NextResponse.json({ error: 'Unknown book' }, { status: 400 });
    }
    const parts: string[] = [];
    for (let v = ref.start; v <= ref.end; v++) {
      const verseId = `${usfm}.${ref.chapter}.${v}`;
      const vr = await scriptureFetch(
        `/bibles/${bibleId}/verses/${encodeURIComponent(verseId)}?include-chapter-numbers=false&include-verse-numbers=false`,
        apiKey
      );
      if (!vr.ok) continue;
      const j = await vr.json();
      const t = typeof j.data?.content === 'string' ? stripHtml(j.data.content) : '';
      if (t) parts.push(t);
    }
    if (parts.length === 0) {
      return NextResponse.json({ error: 'Verse not found' }, { status: 404 });
    }
    return NextResponse.json({
      text: parts.join(' '),
      reference: reference.trim(),
    });
  }

  const rawBook = req.nextUrl.searchParams.get('book')?.trim();
  const chapterStr = req.nextUrl.searchParams.get('chapter');
  if (!rawBook || !chapterStr) {
    return NextResponse.json({ error: 'Missing book and chapter (or reference)' }, { status: 400 });
  }
  const chapter = parseInt(chapterStr, 10);
  if (!Number.isFinite(chapter)) {
    return NextResponse.json({ error: 'Invalid chapter' }, { status: 400 });
  }

  const book = canonicalEnglishBibleBookName(rawBook) ?? rawBook;

  const cid = chapterId(book, chapter);
  if (!cid) {
    return NextResponse.json({ error: 'Unknown book' }, { status: 400 });
  }

  let verses =
    (await fetchVersesFromChapterList(bibleId, cid, apiKey)) ??
    (await fetchChapterFromHtml(bibleId, cid, apiKey));

  if (!verses || verses.length === 0) {
    return NextResponse.json({ error: 'Could not load chapter' }, { status: 502 });
  }

  verses = verses
    .filter((v) => v.text.length > 0)
    .sort((a, b) => a.verse - b.verse);

  return NextResponse.json({
    verses,
    reference: `${book} ${chapter}`,
  });
}
