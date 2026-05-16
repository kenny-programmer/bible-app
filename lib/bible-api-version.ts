/**
 * Shared mapping from app translation keys → bible-api.com `translation=` parameter.
 */

export const BIBLE_BOOK_ID_MAP: Record<string, string> = {
  Genesis: '01',
  Exodus: '02',
  Leviticus: '03',
  Numbers: '04',
  Deuteronomy: '05',
  Joshua: '06',
  Judges: '07',
  Ruth: '08',
  '1 Samuel': '09',
  '2 Samuel': '10',
  '1 Kings': '11',
  '2 Kings': '12',
  '1 Chronicles': '13',
  '2 Chronicles': '14',
  Ezra: '15',
  Nehemiah: '16',
  Esther: '17',
  Job: '18',
  Psalms: '19',
  Proverbs: '20',
  Ecclesiastes: '21',
  'Song of Solomon': '22',
  Isaiah: '23',
  Jeremiah: '24',
  Lamentations: '25',
  Ezekiel: '26',
  Daniel: '27',
  Hosea: '28',
  Joel: '29',
  Amos: '30',
  Obadiah: '31',
  Jonah: '32',
  Micah: '33',
  Nahum: '34',
  Habakkuk: '35',
  Zephaniah: '36',
  Haggai: '37',
  Zechariah: '38',
  Malachi: '39',
  Matthew: '40',
  Mark: '41',
  Luke: '42',
  John: '43',
  Acts: '44',
  Romans: '45',
  '1 Corinthians': '46',
  '2 Corinthians': '47',
  Galatians: '48',
  Ephesians: '49',
  Philippians: '50',
  Colossians: '51',
  '1 Thessalonians': '52',
  '2 Thessalonians': '53',
  '1 Timothy': '54',
  '2 Timothy': '55',
  Titus: '56',
  Philemon: '57',
  Hebrews: '58',
  James: '59',
  '1 Peter': '60',
  '2 Peter': '61',
  '1 John': '62',
  '2 John': '63',
  '3 John': '64',
  Jude: '65',
  Revelation: '66',
};

/**
 * Normalizes loose book spellings/casing to keys in `BIBLE_BOOK_ID_MAP` (required by getBible).
 * Returns null if unknown.
 */
export function canonicalEnglishBibleBookName(book: string): string | null {
  const trimmed = book.trim().replace(/\s+/g, ' ');
  if (!trimmed) return null;

  if (trimmed in BIBLE_BOOK_ID_MAP) return trimmed;

  const lc = trimmed.toLowerCase();
  if (lc === 'psalm' || lc === 'psalms') return 'Psalms';

  const found = (Object.keys(BIBLE_BOOK_ID_MAP) as Array<keyof typeof BIBLE_BOOK_ID_MAP>).find(
    (k) => k.toLowerCase() === lc
  );
  return found ?? null;
}

const SUPPORTED_BIBLE_API_VERSIONS = ['kjv', 'web', 'asv', 'bbe', 'darby', 'dra', 'ylt'] as const;

export function getVersionForBibleAPI(version: string): string {
  const normalized = version.toLowerCase();

  // Legacy keys (older builds used these identifiers; bible-api.com removed them)
  if (normalized === 'bsb') return 'web';
  if (normalized === 'clementine') return 'dra';

  return SUPPORTED_BIBLE_API_VERSIONS.includes(normalized as (typeof SUPPORTED_BIBLE_API_VERSIONS)[number])
    ? normalized
    : 'kjv';
}
