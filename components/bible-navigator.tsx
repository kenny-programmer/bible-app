"use client";

import { useState, useEffect } from 'react';
import { BIBLE_BOOKS, getBookDisplayName } from '@/lib/bible-data';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Book, X } from 'lucide-react';
import { motion } from 'framer-motion';

type BibleNavigatorProps = {
  currentBook: string;
  currentChapter: number;
  onNavigate: (book: string, chapter: number) => void;
  /** Active translation (lowercase code), from parent `localBibleVersion`. */
  bibleVersion: string;
};

export function BibleNavigator({ currentBook, currentChapter, onNavigate, bibleVersion }: BibleNavigatorProps) {
  const [open, setOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(currentBook);
  const version = bibleVersion?.toLowerCase().trim() || 'kjv';

  useEffect(() => {
    if (open) {
      setSelectedBook(currentBook);
    }
  }, [open, currentBook]);

  const selectedBookData = BIBLE_BOOKS.find(b => b.name === selectedBook);

  const handleBookSelect = (bookName: string) => {
    setSelectedBook(bookName);
  };

  const handleChapterSelect = (chapter: number) => {
    onNavigate(selectedBook, chapter);
    setOpen(false);
  };

  const currentDisplayName = getBookDisplayName(currentBook, version);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="text-[#333333]">
          <Book className="h-4 w-4 mr-2" />
          {currentDisplayName} {currentChapter}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="flex h-[85dvh] max-h-[85dvh] flex-col overflow-hidden bg-[#FDFCF8] sm:h-[85vh] sm:max-h-[85vh]"
      >
        <SheetHeader className="shrink-0">
          <SheetTitle className="text-[#333333] font-serif">
            {version === 'tagalog' || version === 'asnd'
              ? 'Pumili ng Aklat at Kabanata'
              : 'Select Book & Chapter'}
          </SheetTitle>
        </SheetHeader>

        <div className="grid min-h-0 flex-1 grid-cols-2 gap-4 pt-6">
          <div className="flex min-h-0 flex-col">
            <h3 className="mb-3 shrink-0 text-xs font-semibold uppercase tracking-wide text-[#333333]/70">
              {version === 'tagalog' || version === 'asnd' ? 'Mga Aklat' : 'Books'}
            </h3>
            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-1 pr-4">
                {BIBLE_BOOKS.map((book) => {
                  const displayName = getBookDisplayName(book.name, version);
                  return (
                    <Button
                      key={book.name}
                      variant={selectedBook === book.name ? 'default' : 'ghost'}
                      className={`w-full justify-start text-left ${
                        selectedBook === book.name
                          ? 'bg-[#D4AF37] text-white hover:bg-[#D4AF37]/90'
                          : 'text-[#333333] hover:bg-[#D4AF37]/10'
                      }`}
                      onClick={() => handleBookSelect(book.name)}
                    >
                      <span className="truncate">{displayName}</span>
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          <div className="flex min-h-0 flex-col">
            <h3 className="mb-3 shrink-0 text-xs font-semibold uppercase tracking-wide text-[#333333]/70">
              {`${version === 'tagalog' || version === 'asnd' ? 'Mga Kabanata' : 'Chapters'} (${selectedBookData?.chapters ?? 0})`}
            </h3>
            <ScrollArea className="min-h-0 flex-1">
              <div className="grid grid-cols-4 gap-2 pr-4">
                {Array.from({ length: selectedBookData?.chapters || 0 }, (_, i) => i + 1).map((ch) => (
                  <Button
                    key={ch}
                    variant={selectedBook === currentBook && ch === currentChapter ? 'default' : 'outline'}
                    size="sm"
                    className={`${
                      selectedBook === currentBook && ch === currentChapter
                        ? 'bg-[#D4AF37] text-white hover:bg-[#D4AF37]/90 border-[#D4AF37]'
                        : 'text-[#333333] border-[#D4AF37]/20 hover:bg-[#D4AF37]/10'
                    }`}
                    onClick={() => handleChapterSelect(ch)}
                  >
                    {ch}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
