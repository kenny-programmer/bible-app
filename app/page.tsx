"use client";

import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { BIBLE_BOOKS, BIBLE_VERSIONS } from '@/lib/bible-data';
import { BibleReader } from '@/components/bible-reader';
import { BibleNavigator } from '@/components/bible-navigator';
import { AIAssistant } from '@/components/ai-assistant';
import { DailyVerse } from '@/components/daily-verse';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase-client';
import { Loader as Loader2, LogOut, MessageCircle, Settings } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

export default function HomePage() {
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const router = useRouter();
  const [currentBook, setCurrentBook] = useState("John");
  const [currentChapter, setCurrentChapter] = useState(1);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);

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

  const handleNavigate = (book: string, chapter: number) => {
    setCurrentBook(book);
    setCurrentChapter(chapter);
  };

  const handleChapterChange = (chapter: number) => {
    setCurrentChapter(chapter);
  };

  const handleBibleVersionChange = async (version: string) => {
    if (!user) return;

    await supabase
      .from('profiles')
      .update({ preferred_bible_version: version.toUpperCase() })
      .eq('id', user.id);

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
                    <label className="text-sm md:text-base font-semibold text-[#333333] mb-2 block">
                      Bible Version
                    </label>
                    <Select
                      value={profile?.preferred_bible_version?.toLowerCase() || 'kjv'}
                      onValueChange={handleBibleVersionChange}
                    >
                      <SelectTrigger className="w-full h-12 text-[15px] md:text-base">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BIBLE_VERSIONS.map((version) => (
                          <SelectItem key={version.value} value={version.value}>
                            {version.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

      <DailyVerse />

      <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain scroll-smooth pb-[max(12rem,calc(6.5rem+env(safe-area-inset-bottom,0px)))] [-webkit-overflow-scrolling:touch] md:pb-10">
        <BibleReader
          book={currentBook}
          chapter={currentChapter}
          onChapterChange={handleChapterChange}
          maxChapter={currentBookData?.chapters || 1}
        />
      </main>

      <AIAssistant
        open={aiAssistantOpen}
        onOpenChange={setAiAssistantOpen}
      />
    </div>
  );
}
