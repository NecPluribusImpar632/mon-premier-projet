"use client";

import { useState } from "react";
import type { FullScenarioResult } from "@/lib/scenarios/calculations";
import { composeNarrativeParagraph, POST_METHODOLOGY_NOTES } from "@/lib/scenarios/narrative";
import { formatCurrency } from "@/lib/format/currency";
import { roundPercent } from "@/lib/format/percent";

interface ScenarioNarrativeProps {
  result: FullScenarioResult;
  activeChocCount: number;
}

export function ScenarioNarrative({ result, activeChocCount }: ScenarioNarrativeProps) {
  const [showDetail, setShowDetail] = useState(false);

  const hasActiveImpact = result.posts.some((post) => post.delta !== 0);
  if (!hasActiveImpact) return null;

  const paragraph = composeNarrativeParagraph(result, activeChocCount);

  return (
    <div className="rounded-lg border border-line bg-surface p-6">
      <p className="text-sm leading-relaxed text-ink">{paragraph}</p>

      <button
        type="button"
        onClick={() => setShowDetail((current) => !current)}
        className="mt-3 text-left text-xs font-medium text-emerald hover:text-emerald-strong"
      >
        {showDetail ? "Masquer le détail" : "En savoir plus"}
      </button>

      {showDetail && (
        <ul className="mt-3 flex flex-col gap-3 border-t border-line pt-3">
          {result.posts.map((post) => (
            <li key={post.id} className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink">{post.label}</span>
                <span
                  className={`font-mono tabular-nums ${
                    post.delta > 0 ? "text-emerald-strong" : post.delta < 0 ? "text-bronze" : "text-slate"
                  }`}
                >
                  {post.delta === 0
                    ? "Aucun effet"
                    : `${post.delta >= 0 ? "+" : ""}${formatCurrency(post.delta)}${
                        post.deltaPct !== null
                          ? ` (${post.deltaPct >= 0 ? "+" : ""}${roundPercent(post.deltaPct, 1)} %)`
                          : ""
                      }`}
                </span>
              </div>
              <p className="text-xs text-slate">
                {POST_METHODOLOGY_NOTES[post.id]}
                {post.isAssumption && " Repose sur une hypothèse simplificatrice."}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
