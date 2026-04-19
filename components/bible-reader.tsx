"use client";

import { useEffect, useRef, useState } from 'react';
import { fetchChapter } from '@/lib/bible-api';
import { getBookDisplayName } from '@/lib/bible-data';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase-client';
import { Loader as Loader2, ChevronLeft, ChevronRight, Bookmark, BookmarkCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

type BibleReaderProps = {
  book: string;
  chapter: number;
  onChapterChange: (chapter: number) => void;
  maxChapter: number;
  /** Active translation (lowercase code). Passed from parent so changes apply before profile refetch. */
  bibleVersion: string;
};

export function BibleReader({ book, chapter, onChapterChange, maxChapter, bibleVersion }: BibleReaderProps) {
  const { user } = useAuth();
  const [verses, setVerses] = useState<Array<{ verse: number; text: string }>>([]);
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [bookmarkedVerses, setBookmarkedVerses] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const lastSuccessRef = useRef<{ book: string; chapter: number; version: string } | null>(null);

  useEffect(() => {
    loadChapter();
  }, [book, chapter, bibleVersion]);

  useEffect(() => {
    loadBookmarks();
  }, [book, chapter, user?.id]);

  const loadChapter = async () => {
    const version = (bibleVersion?.toLowerCase().trim() || 'kjv') as any;
    const snap = lastSuccessRef.current;
    const versionOnlyChange = Boolean(
      snap && snap.book === book && snap.chapter === chapter && snap.version !== version
    );

    setError(null);
    if (versionOnlyChange) {
      setTranslating(true);
    } else {
      setLoading(true);
    }

    const data = await fetchChapter(book, chapter, version);

    if (data) {
      setVerses(data.verses);
      setReference(`${getBookDisplayName(book, version)} ${chapter}`);
      setError(null);
      lastSuccessRef.current = { book, chapter, version };

      if (user) {
        await supabase.from('profiles').update({
          last_read_book: book,
          last_read_chapter: chapter,
        }).eq('id', user.id);
      }
    } else if (versionOnlyChange) {
      setError('Unable to load this translation. Showing the previous text until you pick another version.');
    } else {
      setVerses([]);
      setReference(`${getBookDisplayName(book, version)} ${chapter}`);
      setError('Unable to load chapter. Please try again.');
    }

    setLoading(false);
    setTranslating(false);
  };

  const loadBookmarks = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('bookmarks')
      .select('verse')
      .eq('user_id', user.id)
      .eq('book', book)
      .eq('chapter', chapter);

    if (data) {
      setBookmarkedVerses(new Set(data.map(b => b.verse).filter(Boolean)));
    }
  };

  const toggleBookmark = async (verseNumber: number) => {
    if (!user) return;

    if (bookmarkedVerses.has(verseNumber)) {
      await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('book', book)
        .eq('chapter', chapter)
        .eq('verse', verseNumber);

      setBookmarkedVerses(prev => {
        const next = new Set(prev);
        next.delete(verseNumber);
        return next;
      });
    } else {
      await supabase.from('bookmarks').insert({
        user_id: user.id,
        book,
        chapter,
        verse: verseNumber,
      });

      setBookmarkedVerses(prev => new Set(prev).add(verseNumber));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
        <p className="text-sm text-[#333333]/60">Loading {book} {chapter}...</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-6">
      {translating && (
        <div
          className="sticky top-0 z-20 flex items-center justify-center gap-2 border-b border-[#D4AF37]/20 bg-[#FDFCF8]/95 py-2 text-sm text-[#333333]/80 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#D4AF37]" />
          Switching translation…
        </div>
      )}
      <div className="sticky top-0 z-10 bg-[#FDFCF8]/95 backdrop-blur-sm border-b border-[#D4AF37]/20 px-4 py-3">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChapterChange(chapter - 1)}
            disabled={chapter <= 1}
            className="text-[#333333]"
          >
            <ChevronLeft className="h-5 w-5 mr-1" />
            Previous
          </Button>

          <h2 className="text-lg font-serif font-semibold text-[#333333]">
            {reference || `${book} ${chapter}`}
          </h2>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChapterChange(chapter + 1)}
            disabled={chapter >= maxChapter}
            className="text-[#333333]"
          >
            Next
            <ChevronRight className="h-5 w-5 ml-1" />
          </Button>
        </div>
      </div>

      <div className="px-4 pb-8 max-md:pr-28 max-md:pl-3 md:px-4">
        {error && (
          <div className="max-w-3xl mx-auto mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {verses.length === 0 && !error && (
          <div className="max-w-3xl mx-auto text-center py-8">
            <p className="text-[#333333]/60">No verses found for {book} {chapter}</p>
          </div>
        )}

        <div className="max-w-3xl mx-auto space-y-4">
          {verses.map((v) => (
            <motion.div
              key={v.verse}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: v.verse * 0.02 }}
              className="flex gap-3 group"
            >
              <button
                onClick={() => toggleBookmark(v.verse)}
                className="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {bookmarkedVerses.has(v.verse) ? (
                  <BookmarkCheck className="h-4 w-4 text-[#D4AF37]" />
                ) : (
                  <Bookmark className="h-4 w-4 text-[#333333]/30" />
                )}
              </button>

              <div className="flex-1">
                <span className="font-serif text-sm font-semibold text-[#D4AF37] mr-2">
                  {v.verse}
                </span>
                <span className="font-serif text-[#333333] leading-relaxed text-base md:text-lg">
                  {v.text}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
