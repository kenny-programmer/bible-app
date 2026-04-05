type BibleVersion = 'kjv' | 'web' | 'bsb' | 'asv' | 'bbe' | 'clementine' | 'darby' | 'dra' | 'rva' | 'ylt' | 'tagalog';

const SUPPORTED_BIBLE_API_VERSIONS = ['kjv', 'web', 'bsb', 'asv', 'bbe', 'clementine', 'darby', 'ylt'];

const BOOK_ID_MAP: Record<string, string> = {
  'Genesis': '01', 'Exodus': '02', 'Leviticus': '03', 'Numbers': '04', 'Deuteronomy': '05',
  'Joshua': '06', 'Judges': '07', 'Ruth': '08', '1 Samuel': '09', '2 Samuel': '10',
  '1 Kings': '11', '2 Kings': '12', '1 Chronicles': '13', '2 Chronicles': '14', 'Ezra': '15',
  'Nehemiah': '16', 'Esther': '17', 'Job': '18', 'Psalms': '19', 'Proverbs': '20',
  'Ecclesiastes': '21', 'Song of Solomon': '22', 'Isaiah': '23', 'Jeremiah': '24',
  'Lamentations': '25', 'Ezekiel': '26', 'Daniel': '27', 'Hosea': '28', 'Joel': '29',
  'Amos': '30', 'Obadiah': '31', 'Jonah': '32', 'Micah': '33', 'Nahum': '34',
  'Habakkuk': '35', 'Zephaniah': '36', 'Haggai': '37', 'Zechariah': '38', 'Malachi': '39',
  'Matthew': '40', 'Mark': '41', 'Luke': '42', 'John': '43', 'Acts': '44',
  'Romans': '45', '1 Corinthians': '46', '2 Corinthians': '47', 'Galatians': '48',
  'Ephesians': '49', 'Philippians': '50', 'Colossians': '51', '1 Thessalonians': '52',
  '2 Thessalonians': '53', '1 Timothy': '54', '2 Timothy': '55', 'Titus': '56',
  'Philemon': '57', 'Hebrews': '58', 'James': '59', '1 Peter': '60', '2 Peter': '61',
  '1 John': '62', '2 John': '63', '3 John': '64', 'Jude': '65', 'Revelation': '66'
};

async function fetchTagalogChapter(book: string, chapter: number): Promise<{ verses: Array<{ verse: number; text: string }>; reference: string } | null> {
  try {
    const bookNumber = parseInt(BOOK_ID_MAP[book]);
    if (!bookNumber) {
      console.error('Unknown book for Tagalog:', book);
      return null;
    }

    const url = `https://api.getbible.net/v2/tagalog.json`;
    console.log('Fetching Tagalog Bible:', { book, chapter, bookNumber });

    const response = await fetch(url, {
      cache: 'force-cache',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch Tagalog Bible:', response.status);
      return null;
    }

    const data = await response.json();

    if (!data.books || !Array.isArray(data.books)) {
      console.error('Invalid Tagalog Bible response structure');
      return null;
    }

    const targetBook = data.books.find((b: any) => b.nr === bookNumber);
    if (!targetBook || !targetBook.chapters) {
      console.error('Book not found in Tagalog Bible:', bookNumber);
      return null;
    }

    const targetChapter = targetBook.chapters.find((c: any) => c.chapter === chapter);
    if (!targetChapter || !targetChapter.verses) {
      console.error('Chapter not found in Tagalog Bible:', chapter);
      return null;
    }

    const verses = targetChapter.verses.map((v: any) => ({
      verse: v.verse,
      text: v.text || '',
    }));

    return {
      verses,
      reference: `${book} ${chapter}`,
    };
  } catch (error) {
    console.error('Tagalog Bible API Error:', error);
    return null;
  }
}

function getVersionForBibleAPI(version: string): string {
  const normalized = version.toLowerCase();

  if (normalized === 'dra') {
    return 'clementine';
  }

  if (normalized === 'rva') {
    return 'kjv';
  }

  return SUPPORTED_BIBLE_API_VERSIONS.includes(normalized) ? normalized : 'kjv';
}

export async function fetchChapter(book: string, chapter: number, version: BibleVersion = 'kjv'): Promise<{ verses: Array<{ verse: number; text: string }>; reference: string } | null> {
  const normalized = version.toLowerCase();

  if (normalized === 'tagalog') {
    return fetchTagalogChapter(book, chapter);
  }

  try {
    const apiVersion = getVersionForBibleAPI(version);
    const formattedBook = book.replace(/\s+/g, '+');
    const url = `https://bible-api.com/${formattedBook}+${chapter}?translation=${apiVersion}`;

    console.log('Fetching chapter:', { book, chapter, requestedVersion: version, apiVersion, url });

    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
      }
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      console.error('Failed to fetch chapter:', response.status, response.statusText);

      if (apiVersion !== 'kjv') {
        console.log('Retrying with KJV fallback');
        return fetchChapter(book, chapter, 'kjv');
      }

      return null;
    }

    const data = await response.json();
    console.log('Received data:', data);

    if (data.verses && Array.isArray(data.verses)) {
      return {
        verses: data.verses.map((v: any) => ({
          verse: v.verse,
          text: v.text.trim(),
        })),
        reference: data.reference,
      };
    }

    const verseNumber = data.verse || 1;
    return {
      verses: [{ verse: verseNumber, text: data.text.trim() }],
      reference: data.reference,
    };
  } catch (error) {
    console.error('Bible API Error:', error);

    if (version !== 'kjv') {
      console.log('Retrying with KJV fallback after error');
      return fetchChapter(book, chapter, 'kjv');
    }

    return null;
  }
}

async function fetchTagalogVerse(reference: string): Promise<{ text: string; reference: string } | null> {
  try {
    const match = reference.match(/^(\d?\s*\w+(?:\s+\w+)*)\s+(\d+):(\d+)(?:-(\d+))?$/);
    if (!match) {
      console.error('Invalid verse reference format');
      return null;
    }

    const [, bookName, chapterNum, startVerse, endVerse] = match;
    const chapter = parseInt(chapterNum);

    const chapterData = await fetchTagalogChapter(bookName.trim(), chapter);
    if (!chapterData) return null;

    const start = parseInt(startVerse);
    const end = endVerse ? parseInt(endVerse) : start;

    const verses = chapterData.verses
      .filter(v => v.verse >= start && v.verse <= end)
      .map(v => v.text)
      .join(' ');

    return {
      text: verses,
      reference: reference,
    };
  } catch (error) {
    console.error('Tagalog verse fetch error:', error);
    return null;
  }
}

export async function fetchVerse(reference: string, version: BibleVersion = 'kjv'): Promise<{ text: string; reference: string } | null> {
  const normalized = version.toLowerCase();

  if (normalized === 'tagalog') {
    return fetchTagalogVerse(reference);
  }

  try {
    const apiVersion = getVersionForBibleAPI(version);
    const formattedRef = reference.replace(/\s+/g, '+');
    const url = `https://bible-api.com/${formattedRef}?translation=${apiVersion}`;

    const response = await fetch(url, { cache: 'no-store' });

    if (!response.ok) {
      if (apiVersion !== 'kjv') {
        return fetchVerse(reference, 'kjv');
      }
      return null;
    }

    const data = await response.json();

    return {
      text: data.text.trim(),
      reference: data.reference,
    };
  } catch (error) {
    console.error('Bible API Error:', error);
    if (version !== 'kjv') {
      return fetchVerse(reference, 'kjv');
    }
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
