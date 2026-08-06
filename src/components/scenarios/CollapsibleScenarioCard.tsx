"use client";

import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { ChevronDown, X } from "lucide-react";

interface CollapsibleScenarioCardProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  summaryValue: ReactNode;
  isActive: boolean;
  children: ReactNode;
  /** Present only for cards the user added manually — lets them dismiss it
   * back to the hidden/empty state. Preset-driven cards don't get one. */
  onRemove?: () => void;
}

/**
 * Same shell as ScenarioCard, but collapsed by default — only the title,
 * description, and a one-line current-impact summary show until the user
 * clicks to reveal the slider/detail/methodology. A card only mounts once
 * it's meant to be seen (manually added, or revealed by a preset), so it
 * always starts expanded — the rising-edge effect below just guards against
 * it staying collapsed if it somehow mounted inactive and later activated.
 */
export function CollapsibleScenarioCard({
  icon: Icon,
  title,
  description,
  summaryValue,
  isActive,
  children,
  onRemove,
}: CollapsibleScenarioCardProps) {
  const [expanded, setExpanded] = useState(true);
  const wasActiveRef = useRef(isActive);

  useEffect(() => {
    if (isActive && !wasActiveRef.current) {
      setExpanded(true);
    }
    wasActiveRef.current = isActive;
  }, [isActive]);

  return (
    <div className="rounded-lg border border-line bg-surface p-6">
      <div className="flex w-full items-start gap-3">
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          className="flex flex-1 items-start justify-between gap-3 text-left"
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

        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Retirer ce choc"
            className="shrink-0 rounded-full p-1.5 text-slate transition-colors hover:bg-paper hover:text-bronze"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {expanded && <div className="mt-5 flex flex-col gap-4">{children}</div>}
    </div>
  );
}
