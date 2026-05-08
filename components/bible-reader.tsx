"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchChapter } from '@/lib/bible-api';
import { getBookDisplayName } from '@/lib/bible-data';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase-client';
import { Loader as Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BibleParagraph, type ReaderVerse } from '@/components/reader/BibleParagraph';
import type { HighlightColor } from '@/components/reader/HighlightColorPicker';
import {
  RED_LETTER_BOOK_NAMES,
  christSegmentsFromDialogueQuotes,
  fetchKjvRedLetterChapter,
  usesKjvRedLetterAccuracy,
} from '@/lib/bible-red-letter';
import { VerseSelectionBar } from '@/components/reader/VerseSelectionBar';
import { useToast } from '@/hooks/use-toast';

type BibleReaderProps = {
  book: string;
  chapter: number;
  onChapterChange: (chapter: number) => void;
  maxChapter: number;
  /** Active translation (lowercase code). Passed from parent so changes apply before profile refetch. */
  bibleVersion: string;
  onAddToAI?: (text: string) => void;
  /** Report how many verses are selected (for layout: hide AI FAB, extra bottom padding). */
  onSelectionChange?: (count: number) => void;
};

export function BibleReader({
  book,
  chapter,
  onChapterChange,
  maxChapter,
  bibleVersion,
  onAddToAI,
  onSelectionChange,
}: BibleReaderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [verses, setVerses] = useState<ReaderVerse[]>([]);
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [bookmarkedVerses, setBookmarkedVerses] = useState<Set<number>>(new Set());
  const [highlightedVerses, setHighlightedVerses] = useState<Map<number, HighlightColor>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const lastSuccessRef = useRef<{ book: string; chapter: number; version: string } | null>(null);

  const [selectedVerses, setSelectedVerses] = useState<Set<number>>(new Set());
  const lastSelectedVerseRef = useRef<number | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteByVerse, setNoteByVerse] = useState<Map<number, string>>(new Map());
  const splitParagraphs = useMemo(() => splitIntoParagraphs(verses), [verses]);

  useEffect(() => {
    loadChapter();
  }, [book, chapter, bibleVersion]);

  useEffect(() => {
    loadBookmarks();
  }, [book, chapter, user?.id]);

  useEffect(() => {
    loadHighlights();
  }, [book, chapter, user?.id]);

  useEffect(() => {
    loadNotes();
  }, [book, chapter, user?.id]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedVerses(new Set());
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    onSelectionChange?.(selectedVerses.size);
  }, [selectedVerses, onSelectionChange]);

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
      let versesOut: ReaderVerse[] = data.verses;
      if (RED_LETTER_BOOK_NAMES.has(book)) {
        const rl = await fetchKjvRedLetterChapter(book, chapter);
        if (rl) {
          const kjvAccuracy = usesKjvRedLetterAccuracy(version);
          versesOut = data.verses.map((v) => {
            /** ASND (API.Bible HTML) may ship `wj` spans already — see `/api/bible/scripture`. */
            if (v.christSegments?.length) return v;

            const segs = rl.segmentsByVerse.get(v.verse);
            if (kjvAccuracy && segs?.length) {
              return { ...v, christSegments: segs };
            }
            if (!kjvAccuracy && rl.versesWithChristWords.has(v.verse)) {
              const fromQuotes = christSegmentsFromDialogueQuotes(v.text);
              if (fromQuotes?.length) {
                return { ...v, christSegments: fromQuotes };
              }
              return { ...v, christWholeVerse: true };
            }
            return v;
          });
        }
      }
      setVerses(versesOut);
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
      if (version === 'asnd') {
        setError(
          'Ang Salita ng Dios could not load. The server needs SCRIPTURE_API_KEY from scripture.api.bible (see .env.example), then redeploy or restart.'
        );
      } else {
        setError('Unable to load chapter. Please try again.');
      }
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

  const loadHighlights = async () => {
    if (!user) {
      setHighlightedVerses(new Map());
      return;
    }

    const { data, error } = await supabase
      .from('highlights')
      .select('verse,color')
      .eq('user_id', user.id)
      .eq('book', book)
      .eq('chapter', chapter);

    if (error) {
      console.error('Failed to load highlights:', error);
      return;
    }

    if (!data) return;

    const next = new Map<number, HighlightColor>();
    for (const row of data as Array<{ verse: number | null; color: string | null }>) {
      if (!row?.verse || !row?.color) continue;
      next.set(row.verse, row.color as HighlightColor);
    }
    setHighlightedVerses(next);
  };

  const setHighlight = async (verseNumber: number, color: HighlightColor | null) => {
    if (!user) return;

    if (!color) {
      // Optimistic UI
      setHighlightedVerses((prev) => {
        const next = new Map(prev);
        next.delete(verseNumber);
        return next;
      });

      const { error: delError } = await supabase
        .from('highlights')
        .delete()
        .eq('user_id', user.id)
        .eq('book', book)
        .eq('chapter', chapter)
        .eq('verse', verseNumber);

      if (delError) {
        // Revert on failure
        await loadHighlights();
      }
      return;
    }

    // Optimistic UI
    setHighlightedVerses((prev) => {
      const next = new Map(prev);
      next.set(verseNumber, color);
      return next;
    });

    const { error: upsertError } = await supabase
      .from('highlights')
      .upsert(
        {
          user_id: user.id,
          book,
          chapter,
          verse: verseNumber,
          color,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,book,chapter,verse' }
      );
    if (upsertError) {
      // Revert on failure
      await loadHighlights();
    }
  };

  const loadNotes = async () => {
    if (!user) {
      setNoteByVerse(new Map());
      return;
    }
    const { data } = await supabase
      .from("bookmarks")
      .select("verse,note")
      .eq("user_id", user.id)
      .eq("book", book)
      .eq("chapter", chapter)
      .not("note", "is", null);

    if (!data) return;
    const next = new Map<number, string>();
    for (const row of data as Array<{ verse: number | null; note: string | null }>) {
      if (!row?.verse || !row.note) continue;
      next.set(row.verse, row.note);
    }
    setNoteByVerse(next);
  };

  const ensureBookmarkRow = async (verseNumber: number) => {
    if (!user) return;
    if (bookmarkedVerses.has(verseNumber)) return;
    await supabase.from("bookmarks").insert({
      user_id: user.id,
      book,
      chapter,
      verse: verseNumber,
    });
    setBookmarkedVerses((prev) => new Set(prev).add(verseNumber));
  };

  const toggleBookmark = async (verseNumber: number) => {
    if (!user) return;
    if (bookmarkedVerses.has(verseNumber)) {
      await supabase
        .from("bookmarks")
        .delete()
        .eq("user_id", user.id)
        .eq("book", book)
        .eq("chapter", chapter)
        .eq("verse", verseNumber);

      setBookmarkedVerses((prev) => {
        const next = new Set(prev);
        next.delete(verseNumber);
        return next;
      });
      setNoteByVerse((prev) => {
        const next = new Map(prev);
        next.delete(verseNumber);
        return next;
      });
      return;
    }

    await supabase.from("bookmarks").insert({
      user_id: user.id,
      book,
      chapter,
      verse: verseNumber,
    });
    setBookmarkedVerses((prev) => new Set(prev).add(verseNumber));
  };

  const selectVerse = (verseNumber: number, ev: React.MouseEvent | React.KeyboardEvent) => {
    setSelectedVerses((prev) => {
      const next = new Set(prev);

      const isShift = "shiftKey" in ev ? Boolean(ev.shiftKey) : false;
      const last = lastSelectedVerseRef.current;
      if (isShift && last != null) {
        const min = Math.min(last, verseNumber);
        const max = Math.max(last, verseNumber);
        for (let v = min; v <= max; v++) next.add(v);
      } else {
        if (next.has(verseNumber)) next.delete(verseNumber);
        else next.add(verseNumber);
      }

      lastSelectedVerseRef.current = verseNumber;
      return next;
    });

    // If single verse is selected, keep note draft ready for later (future enhancement).
    setNoteDraft(noteByVerse.get(verseNumber) ?? "");
  };

  const selectionCount = selectedVerses.size;
  const selectedVerseNumbersSorted = useMemo(() => {
    const list = Array.from(selectedVerses);
    list.sort((a, b) => a - b);
    return list;
  }, [selectedVerses]);

  const selectedText = useMemo(() => {
    if (!selectionCount) return "";
    return formatSelectionReference(reference, selectedVerseNumbersSorted);
  }, [reference, selectionCount, selectedVerses, verses]);

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

      <div className="px-4 pb-10 md:px-4">
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

        <div className="mx-auto max-w-[720px] md:max-w-[740px]">
          <div className="rounded-2xl bg-white/55 px-4 py-6 shadow-sm ring-1 ring-black/[0.04] backdrop-blur-sm md:px-7 md:py-8">
            <div className="space-y-6">
              {splitParagraphs.map((para, idx) => (
                <BibleParagraph
                  key={idx}
                  verses={para}
                  selectedVerses={selectedVerses}
                  highlightByVerse={highlightedVerses}
                  onSelectVerse={selectVerse}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <VerseSelectionBar
        open={selectionCount > 0}
        selectionCount={selectionCount}
        onClearSelection={() => setSelectedVerses(new Set())}
        onAskAI={() => {
          if (!selectionCount) return;
          onAddToAI?.(selectedText);
          setSelectedVerses(new Set());
        }}
        onPickHighlight={(color: HighlightColor) => {
          if (!selectionCount) return;
          const verses = selectedVerseNumbersSorted;
          setHighlightedVerses((prev) => {
            const next = new Map(prev);
            for (const v of verses) next.set(v, color);
            return next;
          });

          if (!user) {
            toast({
              title: 'Sign in required',
              description: 'Highlights are saved to your account after you sign in.',
            });
            setSelectedVerses(new Set());
            return;
          }

          void (async () => {
            const rows = verses.map((v) => ({
              user_id: user.id,
              book,
              chapter,
              verse: v,
              color,
              updated_at: new Date().toISOString(),
            }));
            const { error } = await supabase
              .from('highlights')
              .upsert(rows, { onConflict: 'user_id,book,chapter,verse' });
            if (error) {
              toast({
                title: 'Could not save highlights',
                description: highlightPersistHint(error.message),
                variant: 'destructive',
              });
              await loadHighlights();
              return;
            }
            setSelectedVerses(new Set());
          })();
        }}
        onClearHighlight={() => {
          if (!selectionCount) return;
          const verses = selectedVerseNumbersSorted;
          setHighlightedVerses((prev) => {
            const next = new Map(prev);
            for (const v of verses) next.delete(v);
            return next;
          });

          if (!user) {
            setSelectedVerses(new Set());
            return;
          }

          void (async () => {
            const { error } = await supabase
              .from('highlights')
              .delete()
              .eq('user_id', user.id)
              .eq('book', book)
              .eq('chapter', chapter)
              .in('verse', verses);
            if (error) {
              toast({
                title: 'Could not remove highlights',
                description: highlightPersistHint(error.message),
                variant: 'destructive',
              });
              await loadHighlights();
              return;
            }
            setSelectedVerses(new Set());
          })();
        }}
      />
    </div>
  );
}

function splitIntoParagraphs(verses: ReaderVerse[]): ReaderVerse[][] {
  if (verses.length === 0) return [];

  const paragraphs: ReaderVerse[][] = [];
  let current: ReaderVerse[] = [];

  const push = () => {
    if (current.length) paragraphs.push(current);
    current = [];
  };

  // Heuristic: group into natural-feeling paragraphs without any API paragraph markers.
  // Target ~4–7 verses per paragraph, but break earlier after strong punctuation.
  for (const v of verses) {
    current.push(v);
    const trimmed = v.text.trim();
    const endsStrong = /[.!?]["')\]]?$/.test(trimmed);
    const endsSoft = /[,;:]["')\]]?$/.test(trimmed);
    const len = current.length;

    if (len >= 7) {
      push();
    } else if (len >= 4 && endsStrong) {
      push();
    } else if (len >= 5 && endsSoft) {
      push();
    }
  }
  push();
  return paragraphs;
}

function highlightPersistHint(message: string): string {
  if (/schema cache|could not find.*table|PGRST205/i.test(message)) {
    return 'Supabase has no highlights table yet. Open SQL Editor, paste the file supabase/migrations/20260507120000_add_highlights.sql, Run. Then reload this page.';
  }
  if (/highlights_user_id_fkey|violates foreign key constraint.*highlights/i.test(message)) {
    return 'Your account has no matching profiles row for this FK. Run supabase/migrations/20260509140000_fix_highlights_user_fkey_auth_users.sql in SQL Editor, then reload.';
  }
  return message;
}

function formatSelectionReference(reference: string, verses: number[]): string {
  if (!verses.length) return "";
  const ranges: Array<[number, number]> = [];
  let start = verses[0];
  let prev = verses[0];
  for (let i = 1; i < verses.length; i++) {
    const cur = verses[i];
    if (cur === prev + 1) {
      prev = cur;
      continue;
    }
    ranges.push([start, prev]);
    start = cur;
    prev = cur;
  }
  ranges.push([start, prev]);

  const suffix = ranges
    .map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`))
    .join(",");
  return `${reference}:${suffix}`;
}
