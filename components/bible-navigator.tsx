"use client";

import { useState, useEffect } from 'react';
import { BIBLE_BOOKS, getBookDisplayName } from '@/lib/bible-data';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Book, X } from 'lucide-react';
import { motion } from 'framer-motion';

type BibleNavigatorProps = {
  currentBook: string;
  currentChapter: number;
  onNavigate: (book: string, chapter: number) => void;
};

export function BibleNavigator({ currentBook, currentChapter, onNavigate }: BibleNavigatorProps) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(currentBook);
  const version = profile?.preferred_bible_version?.toLowerCase() || 'kjv';

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
      <SheetContent side="bottom" className="h-[85vh] bg-[#FDFCF8]">
        <SheetHeader>
          <SheetTitle className="text-[#333333] font-serif">
            {version === 'tagalog' ? 'Pumili ng Aklat at Kabanata' : 'Select Book & Chapter'}
          </SheetTitle>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-4 mt-6 h-[calc(100%-60px)]">
          <div>
            <h3 className="text-xs font-semibold text-[#333333]/70 uppercase tracking-wide mb-3">
              {version === 'tagalog' ? 'Mga Aklat' : 'Books'}
            </h3>
            <ScrollArea className="h-[calc(100%-30px)]">
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

          <div>
            <h3 className="text-xs font-semibold text-[#333333]/70 uppercase tracking-wide mb-3">
              {version === 'tagalog' ? 'Mga Kabanata' : 'Chapters'} ({selectedBookData?.chapters || 0})
            </h3>
            <ScrollArea className="h-[calc(100%-30px)]">
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
