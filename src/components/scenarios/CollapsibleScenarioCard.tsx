"use client";

import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface CollapsibleScenarioCardProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  summaryValue: ReactNode;
  isActive: boolean;
  children: ReactNode;
}

/**
 * Same shell as ScenarioCard, but collapsed by default — only the title,
 * description, and a one-line current-impact summary show until the user
 * clicks to reveal the slider/detail/methodology. Auto-expands the first
 * time `isActive` turns true (e.g. a preset dials in a shock affecting this
 * card), so the user sees what's moving the patrimoine without hunting for
 * it — but only on that rising edge, so it never fights a manual
 * expand/collapse afterward.
 */
export function CollapsibleScenarioCard({
  icon: Icon,
  title,
  description,
  summaryValue,
  isActive,
  children,
}: CollapsibleScenarioCardProps) {
  const [expanded, setExpanded] = useState(isActive);
  const wasActiveRef = useRef(isActive);

  useEffect(() => {
    if (isActive && !wasActiveRef.current) {
      setExpanded(true);
    }
    wasActiveRef.current = isActive;
  }, [isActive]);

  return (
    <div className="rounded-lg border border-line bg-surface p-6">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-paper text-emerald">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <h3 className="font-serif text-lg text-ink">{title}</h3>
            <p className="text-sm text-slate">{description}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-1">
          {!expanded && (
            <span className="font-mono text-sm tabular-nums text-ink">{summaryValue}</span>
          )}
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {expanded && <div className="mt-5 flex flex-col gap-4">{children}</div>}
    </div>
  );
}
