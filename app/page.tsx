"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { BIBLE_BOOKS, BIBLE_VERSIONS } from '@/lib/bible-data';
import { BibleReader } from '@/components/bible-reader';
import { BibleNavigator } from '@/components/bible-navigator';
import { AIAssistant } from '@/components/ai-assistant';
import { DailyVerse } from '@/components/daily-verse';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase-client';
import { Loader as Loader2, LogOut, MessageCircle, Settings } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const ALLOWED_BIBLE_VERSIONS = new Set(BIBLE_VERSIONS.map((v) => v.value));

function normalizeBibleVersionKey(raw: string | null | undefined): string {
  const key = raw?.toLowerCase().trim() || 'kjv';
  return ALLOWED_BIBLE_VERSIONS.has(key) ? key : 'kjv';
}

export default function HomePage() {
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const router = useRouter();
  const [currentBook, setCurrentBook] = useState("John");
  const [currentChapter, setCurrentChapter] = useState(1);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [aiPrefill, setAiPrefill] = useState<string | null>(null);
  const [readerSelectionCount, setReaderSelectionCount] = useState(0);
  /** Controlled select must not use only server value or the UI snaps back before Supabase finishes. */
  const [localBibleVersion, setLocalBibleVersion] = useState('kjv');
  /** Only seed `localBibleVersion` from Supabase once per login — never on every profile refetch (stale reads reset you to KJV). */
  const bibleVersionSeededForUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (profile?.last_read_book && profile?.last_read_chapter) {
      setCurrentBook(profile.last_read_book);
      setCurrentChapter(profile.last_read_chapter);
    }
  }, [profile]);

  useEffect(() => {
    if (!user?.id) {
      bibleVersionSeededForUserId.current = null;
      return;
    }
    if (!profile) return;
    if (bibleVersionSeededForUserId.current === user.id) return;
    bibleVersionSeededForUserId.current = user.id;
    setLocalBibleVersion(normalizeBibleVersionKey(profile.preferred_bible_version));
  }, [user?.id, profile]);

  const handleNavigate = (book: string, chapter: number) => {
    setCurrentBook(book);
    setCurrentChapter(chapter);
  };

  const handleChapterChange = (chapter: number) => {
    setCurrentChapter(chapter);
  };

  const handleBibleVersionChange = async (version: string) => {
    if (!user) return;

    const next = normalizeBibleVersionKey(version);
    const previous = localBibleVersion;
    setLocalBibleVersion(next);

    const { data, error } = await supabase
      .from('profiles')
      .update({ preferred_bible_version: next.toUpperCase() })
      .eq('id', user.id)
      .select('preferred_bible_version')
      .maybeSingle();

    if (error) {
      console.error('Failed to update Bible version:', error);
      setLocalBibleVersion(previous);
      return;
    }

    const updated = Array.isArray(data) ? data[0] : data;
    if (!updated?.preferred_bible_version) {
      console.error(
        'Bible version was not saved (0 rows updated). Check that your profile row exists and RLS allows UPDATE on profiles.'
      );
      setLocalBibleVersion(previous);
      return;
    }

    await refreshProfile();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCF8]">
        <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const currentBookData = BIBLE_BOOKS.find(b => b.name === currentBook);

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col overflow-x-hidden bg-[#FDFCF8]">
      <header className="flex-shrink-0 z-20 bg-white/95 backdrop-blur-sm border-b-2 border-[#D4AF37]/10 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3.5 md:px-6 md:py-4">
          <h1 className="text-xl md:text-2xl font-serif font-semibold text-[#333333]">
            Bible
          </h1>

          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAiAssistantOpen(true)}
              className="h-9 gap-1.5 px-2 text-[#333333] md:hidden"
              aria-label="Open AI assistant"
            >
              <MessageCircle className="h-4 w-4 text-[#D4AF37]" />
              <span className="text-xs font-medium">AI</span>
            </Button>
            <BibleNavigator
              currentBook={currentBook}
              currentChapter={currentChapter}
              onNavigate={handleNavigate}
              bibleVersion={localBibleVersion}
            />

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="text-[#333333] h-9 w-9 md:h-10 md:w-10">
                  <Settings className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="bg-[#FDFCF8] h-auto max-h-[85vh] overflow-y-auto rounded-t-3xl">
                <SheetHeader>
                  <SheetTitle className="text-[#333333] font-serif text-lg md:text-xl">
                    Settings
                  </SheetTitle>
                </SheetHeader>

                <div className="space-y-6 mt-6 pb-4">
                  <div>
                    <label
                      htmlFor="bible-version"
                      className="text-sm md:text-base font-semibold text-[#333333] mb-2 block"
                    >
                      Bible Version
                    </label>
                    <select
                      id="bible-version"
                      className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-[15px] md:text-base text-[#333333] ring-offset-background focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 focus:ring-offset-2"
                      value={localBibleVersion}
                      onChange={(e) => void handleBibleVersionChange(e.target.value)}
                    >
                      {BIBLE_VERSIONS.map((version) => (
                        <option key={version.value} value={version.value}>
                          {version.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t-2 border-[#D4AF37]/10">
                    <div className="h-12 w-12 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
                      <span className="text-base font-semibold text-[#D4AF37]">
                        {profile?.display_name?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm md:text-base font-medium text-[#333333] truncate">
                        {profile?.display_name || 'User'}
                      </p>
                      <p className="text-xs md:text-sm text-[#333333]/60 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={signOut}
                    variant="outline"
                    className="w-full h-12 text-[15px] md:text-base"
                  >
                    <LogOut className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <DailyVerse bibleVersion={localBibleVersion} />

      <main
        className={cn(
          "min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain scroll-smooth [-webkit-overflow-scrolling:touch] md:pb-10",
          readerSelectionCount > 0
            ? "pb-[calc(19rem+env(safe-area-inset-bottom,0px))]"
            : "pb-[max(12rem,calc(6.5rem+env(safe-area-inset-bottom,0px)))]"
        )}
      >
        <BibleReader
          book={currentBook}
          chapter={currentChapter}
          onChapterChange={handleChapterChange}
          maxChapter={currentBookData?.chapters || 1}
          bibleVersion={localBibleVersion}
          onSelectionChange={setReaderSelectionCount}
          onAddToAI={(text) => {
            setAiPrefill(text);
            setAiAssistantOpen(true);
          }}
        />
      </main>

      <AIAssistant
        open={aiAssistantOpen}
        onOpenChange={setAiAssistantOpen}
        prefillText={aiPrefill}
        hideComposerButton={readerSelectionCount > 0}
      />
    </div>
  );
}
