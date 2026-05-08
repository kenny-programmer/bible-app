"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookMarked, Copy, Highlighter, Share2, StickyNote } from "lucide-react";
import { HighlightColor, HighlightColorPicker } from "@/components/reader/HighlightColorPicker";

type ToolbarPosition = { top: number; left: number; placement: "above" | "below" };

type VerseActionToolbarProps = {
  open: boolean;
  anchorRect: DOMRect | null;
  verseNumber: number | null;
  isBookmarked: boolean;
  highlightColor: HighlightColor | null;
  onClose: () => void;
  onToggleBookmark: () => void;
  onCopy: () => void;
  onShare: () => void;
  onPickHighlight: (color: HighlightColor) => void;
  onClearHighlight: () => void;
  noteValue: string;
  onChangeNoteValue: (next: string) => void;
  onSaveNote: () => void;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export const VerseActionToolbar = memo(function VerseActionToolbar({
  open,
  anchorRect,
  verseNumber,
  isBookmarked,
  highlightColor,
  onClose,
  onToggleBookmark,
  onCopy,
  onShare,
  onPickHighlight,
  onClearHighlight,
  noteValue,
  onChangeNoteValue,
  onSaveNote,
}: VerseActionToolbarProps) {
  const [mode, setMode] = useState<"actions" | "highlight" | "note">("actions");
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) setMode("actions");
  }, [open]);

  const pos: ToolbarPosition | null = useMemo(() => {
    if (!open || !anchorRect) return null;

    const margin = 10;
    const estimatedWidth = mode === "note" ? 320 : mode === "highlight" ? 300 : 260;
    const estimatedHeight = mode === "note" ? 160 : 52;

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    const centerX = anchorRect.left + anchorRect.width / 2;
    const preferredLeft = centerX - estimatedWidth / 2;

    const aboveTop = anchorRect.top - estimatedHeight - 10;
    const belowTop = anchorRect.bottom + 10;
    const placeAbove = aboveTop > margin || belowTop + estimatedHeight > viewportH - margin;

    const top = placeAbove ? aboveTop : belowTop;
    const left = clamp(preferredLeft, margin, viewportW - estimatedWidth - margin);

    return { top, left, placement: placeAbove ? "above" : "below" };
  }, [anchorRect, mode, open]);

  if (!open || !pos || verseNumber == null) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onTouchStart={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <AnimatePresence>
        <motion.div
          ref={containerRef}
          key={`${verseNumber}-${mode}`}
          initial={{ opacity: 0, y: pos.placement === "above" ? 6 : -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: pos.placement === "above" ? 6 : -6, scale: 0.98 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          style={{ top: pos.top, left: pos.left }}
          className="absolute"
        >
          <div className="rounded-full bg-black/55 px-2 py-2 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.55)] backdrop-blur-md">
            {mode === "actions" && (
              <div className="flex items-center gap-1">
                <ToolbarIconButton
                  label="Highlight"
                  onClick={() => setMode("highlight")}
                  icon={<Highlighter className="h-4 w-4" />}
                />
                <ToolbarIconButton
                  label={isBookmarked ? "Bookmarked" : "Bookmark"}
                  onClick={onToggleBookmark}
                  active={isBookmarked}
                  icon={<BookMarked className="h-4 w-4" />}
                />
                <ToolbarIconButton
                  label="Note"
                  onClick={() => setMode("note")}
                  icon={<StickyNote className="h-4 w-4" />}
                />
                <ToolbarIconButton label="Copy" onClick={onCopy} icon={<Copy className="h-4 w-4" />} />
                <ToolbarIconButton label="Share" onClick={onShare} icon={<Share2 className="h-4 w-4" />} />
              </div>
            )}

            {mode === "highlight" && (
              <div className="flex items-center gap-2 px-2">
                <HighlightColorPicker
                  value={highlightColor}
                  onPick={(c) => {
                    onPickHighlight(c);
                    setMode("actions");
                  }}
                  onClear={() => {
                    onClearHighlight();
                    setMode("actions");
                  }}
                />
              </div>
            )}

            {mode === "note" && (
              <div className="w-[320px] max-w-[85vw] rounded-2xl bg-black/30 p-3 backdrop-blur-md">
                <div className="mb-2 text-xs font-semibold tracking-wide text-white/70">
                  Note • Verse {verseNumber}
                </div>
                <textarea
                  value={noteValue}
                  onChange={(e) => onChangeNoteValue(e.target.value)}
                  placeholder="Write a note…"
                  className="h-20 w-full resize-none rounded-xl bg-white/10 px-3 py-2 text-sm text-white/90 placeholder:text-white/40 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-white/25"
                />
                <div className="mt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setMode("actions")}
                    className="rounded-full px-3 py-1.5 text-xs font-medium text-white/70 hover:text-white/90"
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSaveNote();
                      setMode("actions");
                    }}
                    className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
});

function ToolbarIconButton({
  label,
  onClick,
  icon,
  active,
}: {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex h-9 w-9 items-center justify-center rounded-full text-white/85 transition-colors",
        "hover:bg-white/10 active:bg-white/15",
        active ? "bg-white/10" : "",
      ].join(" ")}
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );
}

