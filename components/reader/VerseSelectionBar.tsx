"use client";

import { memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import { HighlightColor, HighlightColorPicker } from "@/components/reader/HighlightColorPicker";

type VerseSelectionBarProps = {
  open: boolean;
  selectionCount: number;
  onClearSelection: () => void;
  onAskAI: () => void;
  onPickHighlight: (color: HighlightColor) => void;
  onClearHighlight: () => void;
};

/**
 * Reader actions while verses are selected — calm, paper-native UI.
 * Avoid gold “FAB” styling here so it never fights the real AI Chat FAB.
 */
export const VerseSelectionBar = memo(function VerseSelectionBar({
  open,
  selectionCount,
  onClearSelection,
  onAskAI,
  onPickHighlight,
  onClearHighlight,
}: VerseSelectionBarProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none fixed inset-x-0 bottom-0 z-[10060] px-3 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]"
        >
          <div className="pointer-events-auto mx-auto w-full max-w-[740px]">
            <div className="rounded-2xl border border-[#333333]/10 bg-[#FDFCF8]/98 shadow-[0_-12px_40px_-16px_rgba(0,0,0,0.2)] backdrop-blur-md backdrop-saturate-150">
              <div className="flex items-center justify-between gap-2 border-b border-[#333333]/8 px-3 py-3 sm:px-4">
                <p className="min-w-0 truncate text-[15px] font-semibold tracking-tight text-[#1a1a1a] tabular-nums">
                  {selectionCount} verse{selectionCount === 1 ? "" : "s"}
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={onAskAI}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#333]/12 bg-white px-2.5 text-[13px] font-semibold text-[#333] shadow-sm hover:bg-[#FAFAF8] active:scale-[0.98]"
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-[#333]/70" aria-hidden />
                    Ask AI
                  </button>
                  <button
                    type="button"
                    onClick={onClearSelection}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#333]/12 bg-white text-[#333]/75 shadow-sm hover:bg-[#FAFAF8] active:scale-[0.98]"
                    aria-label="Clear selection"
                    title="Clear selection"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="px-3 py-3 sm:px-4 sm:pb-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#333]/45">
                  Highlight
                </p>
                <div className="-mx-1 overflow-x-auto px-1 pb-0.5 [-webkit-overflow-scrolling:touch]">
                  <HighlightColorPicker
                    variant="light"
                    value={null}
                    onPick={onPickHighlight}
                    onClear={onClearHighlight}
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
