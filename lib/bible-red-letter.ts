/**
 * Words-of-Christ (“red letter”) using KJV annotations from bible-data
 * (MIT-style bundle; see https://github.com/jburson/bible-data — words marked *r per README).
 *
 * - For translations backed by the same bible-api.com KJV mapping, we render word-accurate red using those markers.
 * - Other translations: whole verse turns red if the parallel KJV verse contains any Christ-marked word (approximate).
 */

import { getVersionForBibleAPI } from '@/lib/bible-api-version';

export type ChristWordSegment = {
  text: string;
  /** True when this run is marked as spoken by Christ in the annotated KJV source. */
  wordsOfChrist: boolean;
};

/** Books where bible-data ships per-chapter JSON with red-letter codes. */
export const RED_LETTER_BOOK_NAMES = new Set([
  'Matthew',
  'Mark',
  'Luke',
  'John',
  'Acts',
  'Revelation',
]);

const chapterCache = new Map<
  string,
  { segmentsByVerse: Map<number, ChristWordSegment[]>; versesWithChristWords: Set<number> }
>();

function parseAnnotatedTokens(t: string): ChristWordSegment[] {
  const trimmed = t.replace(/\s+/g, ' ').trim();
  if (!trimmed) return [];

  const tokens = trimmed.split(/\s+/);
  const pieces: { word: string; christ: boolean }[] = [];

  for (const tok of tokens) {
    const i = tok.indexOf('*');
    if (i === -1) {
      if (tok) pieces.push({ word: tok, christ: false });
      continue;
    }
    const word = tok.slice(0, i);
    const codes = tok.slice(i + 1);
    const christ = codes.includes('r');
    if (word) pieces.push({ word, christ });
  }

  const merged: ChristWordSegment[] = [];
  for (const p of pieces) {
    const prev = merged[merged.length - 1];
    if (prev && prev.wordsOfChrist === p.christ) {
      prev.text += ` ${p.word}`;
    } else {
      merged.push({ text: p.word, wordsOfChrist: p.christ });
    }
  }
  return merged;
}

function verseNumberFromRef(r: string): number | null {
  const m = r.match(/:(\d+)$/);
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function usesKjvRedLetterAccuracy(bibleVersionKey: string): boolean {
  const v = bibleVersionKey.toLowerCase().trim();
  if (v === 'tagalog' || v === 'asnd') return false;
  return getVersionForBibleAPI(v) === 'kjv';
}

/**
 * Fetch annotated KJV chapter from bible-data GitHub; returns per-verse segments + set of verses that include any Christ words.
 */
/**
 * Uses paired curly quotes (“…” ) or ASCII double quotes (" ") to redden quoted speech while
 * keeping framing narration black — useful for bible-api translations (WEB, ASV, etc.) where only
 * KJV-side Christ markers exist and whole-verse coloring would wrongly include narration.
 */
export function christSegmentsFromDialogueQuotes(plainText: string): ChristWordSegment[] | null {
  const s = plainText.replace(/\r\n/g, '\n').replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!s || s.length < 3) return null;

  const spans: Array<{ open: number; close: number }> = [];
  let pos = 0;
  while (pos < s.length) {
    const idxCurlyOpen = s.indexOf('\u201c', pos);
    const idxAsciiOpen = s.indexOf('"', pos);

    let openIdx = -1;
    let closeChar: '"' | '\u201d' = '"';

    if (idxCurlyOpen === -1 && idxAsciiOpen === -1) break;

    if (idxCurlyOpen !== -1 && (idxAsciiOpen === -1 || idxCurlyOpen <= idxAsciiOpen)) {
      openIdx = idxCurlyOpen;
      closeChar = '\u201d';
    } else {
      openIdx = idxAsciiOpen;
      closeChar = '"';
    }

    const closeIdx = s.indexOf(closeChar, openIdx + 1);
    if (closeIdx === -1) break;

    const inner = s.slice(openIdx + 1, closeIdx).trim();
    if (inner.length >= 1) spans.push({ open: openIdx, close: closeIdx });
    pos = closeIdx + 1;
  }

  if (!spans.length) return null;

  spans.sort((a, b) => a.open - b.open || a.close - b.close);

  /** Drop overlapping tails (translator typos): keep earlier span shorter path */
  const nonOverlap: typeof spans = [];
  let lastClose = -1;
  for (const sp of spans) {
    if (sp.open < lastClose) continue;
    nonOverlap.push(sp);
    lastClose = sp.close;
  }
  if (!nonOverlap.length) return null;

  const chunks: ChristWordSegment[] = [];
  let cursor = 0;

  const pushMerged = (text: string, christ: boolean) => {
    const t = text.replace(/\s+/g, ' ').trim();
    if (!t) return;
    const prev = chunks[chunks.length - 1];
    if (prev && prev.wordsOfChrist === christ) prev.text += ` ${t}`;
    else chunks.push({ text: t, wordsOfChrist: christ });
  };

  for (const sp of nonOverlap) {
    if (sp.open > cursor) pushMerged(s.slice(cursor, sp.open), false);
    pushMerged(s.slice(sp.open, sp.close + 1), true);
    cursor = Math.max(cursor, sp.close + 1);
  }
  if (cursor < s.length) pushMerged(s.slice(cursor), false);

  if (!chunks.some((c) => c.wordsOfChrist)) return null;
  return chunks;
}

export async function fetchKjvRedLetterChapter(
  book: string,
  chapter: number
): Promise<{
  segmentsByVerse: Map<number, ChristWordSegment[]>;
  versesWithChristWords: Set<number>;
} | null> {
  if (!RED_LETTER_BOOK_NAMES.has(book)) {
    return null;
  }

  const cacheKey = `${book}:${chapter}`;
  const hit = chapterCache.get(cacheKey);
  if (hit) return hit;

  const bookPath = encodeURIComponent(book);
  const url = `https://raw.githubusercontent.com/jburson/bible-data/main/data/kjv/books/${bookPath}/chapters/${chapter}/${chapter}.json`;

  try {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{
      r?: string;
      t?: string;
      h?: number;
    }>;

    const segmentsByVerse = new Map<number, ChristWordSegment[]>();
    const versesWithChristWords = new Set<number>();

    for (const row of rows) {
      if (!row?.r || typeof row.t !== 'string') continue;
      const vnum = verseNumberFromRef(row.r);
      if (vnum == null) continue;

      const segments = parseAnnotatedTokens(row.t);
      if (!segments.length) continue;

      segmentsByVerse.set(vnum, segments);
      if (segments.some((s) => s.wordsOfChrist)) {
        versesWithChristWords.add(vnum);
      }
    }

    const payload = { segmentsByVerse, versesWithChristWords };
    chapterCache.set(cacheKey, payload);
    return payload;
  } catch {
    return null;
  }
}
