"use client";

import { memo } from "react";

export const VerseNumber = memo(function VerseNumber({ value }: { value: number }) {
  return (
    <sup
      className="select-none align-super text-[0.68em] font-semibold tracking-tight text-[#333333]/45"
      aria-hidden="true"
    >
      {value}
    </sup>
  );
});

