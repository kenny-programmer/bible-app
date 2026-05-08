/**
 * Server-side chapter loading from bible-api.com and getBible Tagalog (no reliance on browser fetch).
 */

import type { BibleChapterVerse } from '@/lib/bible-api';
import { BIBLE_BOOK_ID_MAP, getVersionForBibleAPI } from '@/lib/bible-api-version';

export async function fetchChapterFromUpstream(
  book: string,
  chapter: number,
  versionKey: string
): Promise<{ verses: BibleChapterVerse[]; reference: string } | null> {
  const normalized = versionKey.toLowerCase().trim();
  if (normalized === 'asnd') return null;

  if (normalized === 'tagalog') {
    const id = BIBLE_BOOK_ID_MAP[book];
    if (!id) return null;
    const bookNr = parseInt(id, 10);
    if (!Number.isFinite(bookNr)) return null;

    const url = `https://api.getbible.net/v2/tagalog/${bookNr}/${chapter}.json`;
    const response = await fetch(url, {
      cache: 'force-cache',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;

    const data = (await response.json()) as Record<string, unknown>;
    const raw = data.verses;
    if (!Array.isArray(raw)) return null;

    const verses: BibleChapterVerse[] = raw
      .map((row: Record<string, unknown>) => ({
        verse: typeof row.verse === 'number' ? row.verse : parseInt(String(row.verse ?? ''), 10),
        text: typeof row.text === 'string' ? row.text.trim() : '',
      }))
      .filter((v) => Number.isFinite(v.verse));
    verses.sort((a, b) => a.verse - b.verse);
    const refHint = typeof data.name === 'string' ? data.name : `${book} ${chapter}`;
    return { verses, reference: refHint };
  }

  try {
    const apiVersion = getVersionForBibleAPI(normalized);
    const formattedBook = book.replace(/\s+/g, '+');
    const url = `https://bible-api.com/${formattedBook}+${chapter}?translation=${apiVersion}`;

    const response = await fetch(url, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      if (apiVersion !== 'kjv') {
        return fetchChapterFromUpstream(book, chapter, 'kjv');
      }
      return null;
    }

    const data = (await response.json()) as Record<string, unknown>;

    if (Array.isArray(data.verses)) {
      return {
        verses: (data.verses as Record<string, unknown>[])
          .map((v) => {
            const vn = typeof v.verse === 'number' ? v.verse : Number.parseInt(String(v.verse ?? ''), 10);
            return {
              verse: vn,
              text: String(v.text ?? '').trim(),
            };
          })
          .filter((v) => Number.isFinite(v.verse)),
        reference: String(data.reference ?? ''),
      };
    }

    const rawV = data.verse;
    const verseNumber =
      typeof rawV === 'number' ? rawV : Number.parseInt(String(rawV ?? '1'), 10) || 1;
    return {
      verses: [{ verse: verseNumber, text: String(data.text ?? '').trim() }],
      reference: String(data.reference ?? ''),
    };
  } catch {
    if (normalized !== 'kjv') return fetchChapterFromUpstream(book, chapter, 'kjv');
    return null;
  }
}

export async function fetchVerseFromUpstream(
  reference: string,
  versionKey: string
): Promise<{ text: string; reference: string } | null> {
  const normalized = versionKey.toLowerCase().trim();

  try {
    const apiVersion = getVersionForBibleAPI(normalized);
    const formattedRef = reference.trim().replace(/\s+/g, '+');
    const url = `https://bible-api.com/${formattedRef}?translation=${apiVersion}`;
    const response = await fetch(url, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      if (apiVersion !== 'kjv') return fetchVerseFromUpstream(reference, 'kjv');
      return null;
    }
    const data = (await response.json()) as Record<string, unknown>;
    return {
      text: String(data.text ?? '').trim(),
      reference: String(data.reference ?? ''),
    };
  } catch {
    if (normalized !== 'kjv') return fetchVerseFromUpstream(reference, 'kjv');
    return null;
  }
}
