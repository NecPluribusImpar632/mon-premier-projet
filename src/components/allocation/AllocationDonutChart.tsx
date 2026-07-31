"use client";

import { ASSET_CATEGORIES } from "@/lib/allocation/categories";
import type { AllocationEntry } from "@/types/allocation";

interface AllocationDonutChartProps {
  entries: AllocationEntry[];
}

const SIZE = 200;
const RADIUS = 80;
const CENTER = SIZE / 2;
const STROKE_WIDTH = 22;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const MIN_PERCENTAGE_FOR_LABEL = 8;

const PALETTE_STYLE = `
.allocation-donut {
${ASSET_CATEGORIES.map((c) => `  --segment-${c.id}: ${c.color};\n  --on-segment-${c.id}: ${c.onColor};`).join("\n")}
}
`;

function polarToCartesian(arcLength: number) {
  const angleDeg = (arcLength / CIRCUMFERENCE) * 360 - 90;
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: CENTER + RADIUS * Math.cos(angleRad),
    y: CENTER + RADIUS * Math.sin(angleRad),
  };
}

export function AllocationDonutChart({ entries }: AllocationDonutChartProps) {
  const total = entries.reduce((sum, e) => sum + e.percentage, 0);

  const dashLengths = entries
    .filter((entry) => entry.percentage > 0)
    .map((entry) => {
      const category = ASSET_CATEGORIES.find((c) => c.id === entry.categoryId);
      const fraction = total > 0 ? entry.percentage / total : 0;
      return {
        categoryId: entry.categoryId,
        label: category?.label ?? entry.categoryId,
        percentage: entry.percentage,
        dash: fraction * CIRCUMFERENCE,
      };
    });

  const segments = dashLengths.map((segment, index) => {
    const cumulative = dashLengths
      .slice(0, index)
      .reduce((sum, s) => sum + s.dash, 0);
    return {
      ...segment,
      dashArray: `${segment.dash} ${CIRCUMFERENCE - segment.dash}`,
      dashOffset: -cumulative,
      labelPosition: polarToCartesian(cumulative + segment.dash / 2),
    };
  });

  return (
    <div className="allocation-donut flex flex-col items-center gap-8 sm:flex-row sm:items-center sm:gap-10">
      <style>{PALETTE_STYLE}</style>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="shrink-0">
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={STROKE_WIDTH}
        />
        {segments.map((segment) => (
          <circle
            key={segment.categoryId}
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke={`var(--segment-${segment.categoryId})`}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={segment.dashArray}
            strokeDashoffset={segment.dashOffset}
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
          />
        ))}
        {segments
          .filter((segment) => segment.percentage >= MIN_PERCENTAGE_FOR_LABEL)
          .map((segment) => (
            <text
              key={segment.categoryId}
              x={segment.labelPosition.x}
              y={segment.labelPosition.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="var(--font-mono)"
              fontSize={12}
              fontWeight={500}
              style={{ fill: `var(--on-segment-${segment.categoryId})` }}
            >
              {Math.round(segment.percentage)}%
            </text>
          ))}
        <text
          x={CENTER}
          y={CENTER}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="var(--font-serif)"
          className="fill-ink text-2xl font-medium"
        >
          {total}%
        </text>
      </svg>

      <ul className="flex w-full flex-col gap-2.5 sm:w-auto sm:min-w-[190px]">
        {ASSET_CATEGORIES.map((category) => {
          const entry = entries.find((e) => e.categoryId === category.id);
          const percentage = entry?.percentage ?? 0;
          return (
            <li
              key={category.id}
              className="flex items-center justify-between gap-3 border-b border-line pb-2.5 text-sm last:border-b-0 last:pb-0"
            >
              <span className="flex items-center gap-2 text-ink">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: `var(--segment-${category.id})` }}
                />
                {category.label}
              </span>
              <span className="font-mono tabular-nums text-slate">
                {percentage}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
