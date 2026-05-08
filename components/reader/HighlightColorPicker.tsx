"use client";

import { memo } from "react";

export type HighlightColor = "yellow" | "green" | "blue" | "pink" | "purple";

const COLORS: Array<{ id: HighlightColor; label: string; swatch: string }> = [
  { id: "yellow", label: "Yellow", swatch: "bg-yellow-300" },
  { id: "green", label: "Green", swatch: "bg-emerald-300" },
  { id: "blue", label: "Blue", swatch: "bg-sky-300" },
  { id: "pink", label: "Pink", swatch: "bg-pink-300" },
  { id: "purple", label: "Purple", swatch: "bg-violet-300" },
];

type HighlightColorPickerProps = {
  value: HighlightColor | null;
  onPick: (color: HighlightColor) => void;
  onClear: () => void;
  /** `light` = bar on cream paper; `dark` = on translucent black pill */
  variant?: "light" | "dark";
};

export const HighlightColorPicker = memo(function HighlightColorPicker({
  value,
  onPick,
  onClear,
  variant = "dark",
}: HighlightColorPickerProps) {
  const selectedRing =
    variant === "light"
      ? "ring-2 ring-[#D4AF37] ring-offset-2 ring-offset-[#FDFCF8]"
      : "ring-2 ring-white/80 ring-offset-2 ring-offset-black/25";

  const clearBtn =
    variant === "light"
      ? "ml-1 rounded-full border border-[#333333]/15 bg-white px-3 py-1.5 text-xs font-semibold text-[#333333] shadow-sm hover:bg-[#FDFCF8]"
      : "ml-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 hover:bg-white/15 active:bg-white/20";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {COLORS.map((c) => (
        <button
          key={c.id}
          type="button"
          className={[
            "h-9 w-9 rounded-full border border-black/15 shadow-sm transition-transform active:scale-95 sm:h-8 sm:w-8",
            c.swatch,
            value === c.id ? selectedRing : "",
          ].join(" ")}
          onClick={() => onPick(c.id)}
          aria-label={`Highlight ${c.label}`}
          title={c.label}
        />
      ))}
      <button type="button" onClick={onClear} className={clearBtn}>
        Clear
      </button>
    </div>
  );
});

