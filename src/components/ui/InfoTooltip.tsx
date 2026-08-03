"use client";

import { useState, type ReactNode } from "react";
import { Info } from "lucide-react";

interface InfoTooltipProps {
  children: ReactNode;
  label?: string;
}

/**
 * Small "?" trigger that reveals arbitrary content (a methodology note, a
 * per-zone breakdown, etc.) on hover or focus, and toggles on click/tap for
 * touch devices where hover doesn't apply. Kept generic — content is
 * `children`, not a fixed string — so it can hold anything from a one-line
 * caveat to a structured list.
 */
export function InfoTooltip({ children, label = "Méthodologie" }: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-expanded={isOpen}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-4 w-4 items-center justify-center rounded-full text-slate transition-colors hover:text-emerald focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald/30"
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      {isOpen && (
        <div
          role="tooltip"
          className="absolute top-full left-0 z-20 mt-2 w-80 rounded-md border border-line bg-paper p-3 text-xs text-slate shadow-lg"
        >
          {children}
        </div>
      )}
    </span>
  );
}
