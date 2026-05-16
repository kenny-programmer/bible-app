import type { BibleVersion } from '@/lib/bible-data';

/** Optional red-letter runs (matches `ChristWordSegment` in bible-red-letter.ts; kept local to avoid circular imports). */
export type BibleChapterVerse = {
  verse: number;
  text: string;
  christSegments?: Array<{ text: string; wordsOfChrist: boolean }>;
};

export { getVersionForBibleAPI } from '@/lib/bible-api-version';

async function fetchAsndChapter(
  book: string,
  chapter: number
): Promise<{ verses: BibleChapterVerse[]; reference: string } | null> {
  try {
    const params = new URLSearchParams({
      version: 'asnd',
      book,
      chapter: String(chapter),
    });
    const response = await fetch(`/api/bible/scripture?${params}`, { cache: 'no-store' });
    if (!response.ok) {
      console.error('ASND chapter fetch failed:', response.status);
      return null;
    }
    const data = await response.json();
    if (!data.verses || !Array.isArray(data.verses)) return null;
    return {
      verses: data.verses.map((vv: Record<string, unknown>) => ({
        verse: Number(vv.verse),
        text: typeof vv.text === 'string' ? vv.text.trim() : String(vv.text ?? ''),
        christSegments:
          Array.isArray(vv.christSegments) ?
            vv.christSegments.filter(
              (s): s is { text: string; wordsOfChrist: boolean } =>
                Boolean(s && typeof (s as { text?: unknown }).text === 'string')
            ).map((s) => ({
              text: (s as { text: string }).text,
              wordsOfChrist: Boolean((s as { wordsOfChrist?: unknown }).wordsOfChrist),
            }))
          : undefined,
      })),
      reference: typeof data.reference === 'string' ? data.reference : `${book} ${chapter}`,
    };
  } catch (error) {
    console.error('ASND chapter API error:', error);
    return null;
  }
}

async function fetchAsndVerse(reference: string): Promise<{ text: string; reference: string } | null> {
  try {
    const params = new URLSearchParams({
      version: 'asnd',
      reference: reference.trim(),
    });
    const response = await fetch(`/api/bible/scripture?${params}`, { cache: 'no-store' });
    if (!response.ok) return null;
    const data = await response.json();
    if (typeof data.text !== 'string') return null;
    return { text: data.text, reference: data.reference ?? reference };
  } catch (error) {
    console.error('ASND verse API error:', error);
    return null;
  }
}

async function fetchChapterViaAppRoute(
  book: string,
  chapter: number,
  version: string
): Promise<{ verses: BibleChapterVerse[]; reference: string } | null> {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams({
      book,
      chapter: String(chapter),
      version,
    });
    const res = await fetch(`/api/bible/chapter?${params}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.error || !Array.isArray(data.verses)) return null;
    return {
      verses: data.verses.map((vv: Record<string, unknown>) => ({
        verse: Number(vv.verse),
        text: typeof vv.text === 'string' ? vv.text.trim() : String(vv.text ?? ''),
        christSegments:
          Array.isArray(vv.christSegments) ?
            vv.christSegments.filter(
              (s): s is { text: string; wordsOfChrist: boolean } =>
                Boolean(s && typeof (s as { text?: unknown }).text === 'string')
            ).map((s) => ({
              text: (s as { text: string }).text,
              wordsOfChrist: Boolean((s as { wordsOfChrist?: unknown }).wordsOfChrist),
            }))
          : undefined,
      })),
      reference: typeof data.reference === 'string' ? data.reference : `${book} ${chapter}`,
    };
  } catch {
    return null;
  }
}

export async function fetchChapter(
  book: string,
  chapter: number,
  version: BibleVersion = 'kjv'
): Promise<{ verses: BibleChapterVerse[]; reference: string } | null> {
  const normalized = version.toLowerCase();

  if (normalized === 'asnd') {
    return fetchAsndChapter(book, chapter);
  }

  const proxied = await fetchChapterViaAppRoute(book, chapter, normalized);
  if (proxied) return proxied;

  try {
    const { fetchChapterFromUpstream } = await import('./bible-chapter-fetch');
    return fetchChapterFromUpstream(book, chapter, normalized);
  } catch (error) {
    console.error('Bible chapter fetch:', error);
    return null;
  }
}

async function fetchTagalogVerse(reference: string): Promise<{ text: string; reference: string } | null> {
  try {
    const trimmed = reference.trim();
    const match = trimmed.match(/^(\d?\s*[\w][\w\s]{0,40}?)\s+(\d+):(\d+)(?:-(\d+))?$/i);
    if (!match) {
      console.error('Invalid verse reference format');
      return null;
    }

    const [, bookName, chapterNum, startVerse, endVerse] = match;
    const chapter = parseInt(chapterNum, 10);

    const chapterData = await fetchChapter(bookName.trim(), chapter, 'tagalog');
    if (!chapterData) return null;

    const start = parseInt(startVerse, 10);
    const end = endVerse ? parseInt(endVerse, 10) : start;

    const verses = chapterData.verses
      .filter(v => v.verse >= start && v.verse <= end)
      .map(v => v.text)
      .join(' ');

    return {
      text: verses,
      reference: trimmed,
    };
  } catch (error) {
    console.error('Tagalog verse fetch error:', error);
    return null;
  }
}

async function fetchVerseViaAppRoute(
  reference: string,
  version: string
): Promise<{ text: string; reference: string } | null> {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams({
      reference: reference.trim(),
      version,
    });
    const res = await fetch(`/api/bible/verse?${params}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.error || typeof data.text !== 'string') return null;
    return { text: data.text.trim(), reference: typeof data.reference === 'string' ? data.reference : reference };
  } catch {
    return null;
  }
}

export async function fetchVerse(reference: string, version: BibleVersion = 'kjv'): Promise<{ text: string; reference: string } | null> {
  const normalized = version.toLowerCase();

  if (normalized === 'tagalog') {
    return fetchTagalogVerse(reference);
  }

  if (normalized === 'asnd') {
    return fetchAsndVerse(reference);
  }

  const proxied = await fetchVerseViaAppRoute(reference, normalized);
  if (proxied) return proxied;

  try {
    const { fetchVerseFromUpstream } = await import('./bible-chapter-fetch');
    return fetchVerseFromUpstream(reference, normalized);
  } catch (error) {
    console.error('Bible verse fetch:', error);
    return null;
  }
}

export async function fetchRandomVerse(version: BibleVersion = 'kjv'): Promise<{ text: string; reference: string } | null> {
  const inspiringVerses = [
    'Philippians 4:13',
    'Jeremiah 29:11',
    'Proverbs 3:5-6',
    'Romans 8:28',
    'Psalm 23:1',
    'John 3:16',
    'Isaiah 41:10',
    'Matthew 6:33',
    'Psalm 46:1',
    'Joshua 1:9',
    'Proverbs 16:3',
    'Psalm 119:105',
    'Romans 12:2',
    '2 Timothy 1:7',
    'Philippians 4:6-7',
    'Isaiah 40:31',
    'Matthew 11:28',
    'Psalm 27:1',
    'Colossians 3:23',
    'James 1:2-3',
  ];

  const randomVerse = inspiringVerses[Math.floor(Math.random() * inspiringVerses.length)];
  return fetchVerse(randomVerse, version);
}
