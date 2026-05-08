"use client";

import { memo } from "react";
import { InlineVerse } from "@/components/reader/InlineVerse";
import type { ChristWordSegment } from "@/lib/bible-red-letter";

export type ReaderVerse = {
  verse: number;
  text: string;
  /** Word-level red letter (KJV-aligned); when set, body text is built from these segments. */
  christSegments?: ChristWordSegment[];
  /** Approximate red letter for non-KJV: whole verse body in red when parallel KJV marks Christ. */
  christWholeVerse?: boolean;
};

type BibleParagraphProps = {
  verses: ReaderVerse[];
  selectedVerses: Set<number>;
  highlightByVerse: Map<number, string>;
  onSelectVerse: (verse: number, ev: React.MouseEvent | React.KeyboardEvent) => void;
};

export const BibleParagraph = memo(function BibleParagraph({
  verses,
  selectedVerses,
  highlightByVerse,
  onSelectVerse,
}: BibleParagraphProps) {
  return (
    <p className="m-0 text-[17px] leading-[1.95] tracking-[0.01em] text-[#1F1F1F] [text-rendering:optimizeLegibility] [font-smooth:always]">
      {verses.map((v) => (
        <InlineVerse
          key={v.verse}
          verse={v.verse}
          text={v.text}
          christSegments={v.christSegments}
          christWholeVerse={v.christWholeVerse}
          selected={selectedVerses.has(v.verse)}
          highlightedColor={highlightByVerse.get(v.verse) ?? null}
          onSelect={onSelectVerse}
        />
      ))}
    </p>
  );
});

