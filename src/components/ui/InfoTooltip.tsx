"use client";

import { useRef, useState, type ReactNode } from "react";
import { Info } from "lucide-react";

interface InfoTooltipProps {
  children: ReactNode;
  label?: string;
}

// Grace period before closing on mouse-out, so moving the cursor from the
// trigger down into the panel (to scroll a long table, say) doesn't get cut
// off by a moment of imprecise mouse movement.
const CLOSE_DELAY_MS = 200;

/**
 * Small "?" trigger that reveals arbitrary content (a methodology note, a
 * per-zone breakdown, etc.) on hover or focus, and toggles on click/tap for
 * touch devices where hover doesn't apply. Kept generic — content is
 * `children`, not a fixed string — so it can hold anything from a one-line
 * caveat to a structured list.
 */
export function InfoTooltip({ children, label = "Méthodologie" }: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function open() {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsOpen(true);
  }

  function scheduleClose() {
    closeTimeoutRef.current = setTimeout(() => setIsOpen(false), CLOSE_DELAY_MS);
  }

  return (
    // Hover tracked on the whole span (trigger + panel), not just the
    // button — the panel sits just below via absolute positioning, and
    // tracking hover on the button alone closes it the instant the cursor
    // crosses that gap, before it ever reaches the panel.
    <span className="relative inline-flex" onMouseEnter={open} onMouseLeave={scheduleClose}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={isOpen}
        onFocus={open}
        onBlur={scheduleClose}
        onClick={() => setIsOpen((prevOpen) => !prevOpen)}
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
