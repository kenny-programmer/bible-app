"use client";

import { useEffect, useRef, useState } from 'react';
import { fetchRandomVerse } from '@/lib/bible-api';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase-client';
import { Sparkles, Loader as Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type DailyVerseProps = {
  /** When set, overrides profile for translation (keeps daily verse in sync with Settings). */
  bibleVersion?: string;
};

export function DailyVerse({ bibleVersion }: DailyVerseProps) {
  const { user, profile } = useAuth();
  const [verse, setVerse] = useState<{ text: string; reference: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  // Only re-check "once per day" when the signed-in user changes. Translation changes
  // must not re-run this effect or Daily Bread re-opens and stacks over Settings.
  const versionPrefsRef = useRef({
    bibleVersion,
    profileVersion: profile?.preferred_bible_version,
  });
  versionPrefsRef.current = {
    bibleVersion,
    profileVersion: profile?.preferred_bible_version,
  };

  useEffect(() => {
    const checkAndLoadVerse = async () => {
      if (!user?.id) return;

      const today = new Date().toISOString().split('T')[0];

      const { data: existingView } = await supabase
        .from('daily_verse_views')
        .select('*')
        .eq('user_id', user.id)
        .eq('view_date', today)
        .maybeSingle();

      if (existingView) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const { bibleVersion: bv, profileVersion: pv } = versionPrefsRef.current;
      const raw = bv ?? pv;
      const version = (raw?.toLowerCase()?.trim() || 'kjv') as any;
      try {
        const verseData = await fetchRandomVerse(version);
        setVerse(verseData);
        setOpen(true);
      } catch (error) {
        console.error('Error loading daily verse:', error);
        setVerse(null);
      }
      setLoading(false);
    };

    checkAndLoadVerse();
  }, [user?.id]);

  const handleClose = async () => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];

    await supabase
      .from('daily_verse_views')
      .insert({
        user_id: user.id,
        view_date: today
      });

    setOpen(false);
  };

  if (!verse || loading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-lg mx-auto rounded-2xl bg-[#FDFCF8] border-2 border-[#D4AF37]/20 shadow-lg p-6 md:p-8">
        <DialogHeader className="space-y-0">
          <DialogTitle className="flex items-center gap-2.5 text-[#333333] font-serif text-xl md:text-2xl">
            <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-[#D4AF37] flex-shrink-0" />
            Daily Bread
          </DialogTitle>
        </DialogHeader>

        <div className="pt-6 space-y-4">
          <p className="font-serif italic text-base md:text-lg text-[#333333] leading-relaxed">
            {verse.text}
          </p>
          <p className="text-sm md:text-base text-[#333333]/60 font-medium text-right pt-2 border-t border-[#D4AF37]/10">
            {verse.reference}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
