"use client";

import { memo, useMemo } from "react";
import { VerseNumber } from "@/components/reader/VerseNumber";
import type { ChristWordSegment } from "@/lib/bible-red-letter";

/** Typical “red-letter” Bible ink (aligned with scripture-styles `--ss-color-redlettter`). */
const CHRIST_RED = "text-[#d32f2f]";

type InlineVerseProps = {
  verse: number;
  text: string;
  christSegments?: ChristWordSegment[];
  christWholeVerse?: boolean;
  selected: boolean;
  highlightedColor: string | null;
  onSelect: (verse: number, ev: React.MouseEvent | React.KeyboardEvent) => void;
};

const HIGHLIGHT_CLASS: Record<string, string> = {
  yellow: "bg-yellow-100/90",
  green: "bg-emerald-100/90",
  blue: "bg-sky-100/90",
  pink: "bg-pink-100/90",
  purple: "bg-violet-100/90",
};

export const InlineVerse = memo(function InlineVerse({
  verse,
  text,
  christSegments,
  christWholeVerse,
  selected,
  highlightedColor,
  onSelect,
}: InlineVerseProps) {
  const highlightClass = highlightedColor ? HIGHLIGHT_CLASS[highlightedColor] : "";

  const classes = useMemo(() => {
    /** `box-decoration-break: clone` keeps multi-line verse wraps feeling like one brush, not stacked “pills”. */
    const flow =
      "[box-decoration-break:clone] [-webkit-box-decoration-break:clone] " +
      "px-0.5 -mx-0.5 py-px";

    const base =
      `relative inline ${flow} rounded-[2px] transition-colors duration-200 ease-out ` +
      "hover:bg-black/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/35 " +
      "touch-manipulation [webkit-tap-highlight-color:transparent]";

    const highlight = highlightClass ? ` ${highlightClass}` : "";
    /** Selection: underline + faint wash (`box-decoration-break: clone` applies both per line cleanly). */
    const selection =
      selected ?
        " bg-zinc-900/10 underline underline-offset-[5px] decoration-[2.5px] decoration-zinc-900/85"
      : "";
    return base + highlight + selection;
  }, [highlightClass, selected]);

  return (
    <span
      data-verse={verse}
      role="button"
      tabIndex={0}
      className={classes}
      onPointerDown={(ev) => {
        // Prevent native text selection from eating taps on mobile.
        // Still allows long-press selection elsewhere on the page.
        ev.preventDefault();
        onSelect(verse, ev as unknown as React.MouseEvent);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(verse, e);
        }
      }}
      aria-selected={selected}
      aria-label={`Verse ${verse}`}
    >
      <span className="mr-1.5">
        <VerseNumber value={verse} />
      </span>
      <span className="font-serif text-inherit">
        {christSegments?.length ?
          christSegments.map((seg, i) => (
            <span
              key={i}
              className={
                seg.wordsOfChrist ?
                  CHRIST_RED
                : ""
              }
            >
              {seg.text}
              {i < christSegments.length - 1 ? " " : ""}
            </span>
          ))
        : christWholeVerse ?
          <span className={CHRIST_RED}>{text}</span>
        : text}
      </span>{" "}
    </span>
  );
});

