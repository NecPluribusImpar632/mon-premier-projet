"use client";

import { ASSET_CATEGORIES } from "@/lib/allocation/categories";
import type { AllocationEntry } from "@/types/allocation";

interface AllocationDonutChartProps {
  entries: AllocationEntry[];
}

const SIZE = 200;
const RADIUS = 80;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function AllocationDonutChart({ entries }: AllocationDonutChartProps) {
  const total = entries.reduce((sum, e) => sum + e.percentage, 0);

  const dashLengths = entries
    .filter((entry) => entry.percentage > 0)
    .map((entry) => {
      const category = ASSET_CATEGORIES.find((c) => c.id === entry.categoryId);
      const fraction = total > 0 ? entry.percentage / total : 0;
      return { color: category?.color ?? "#94a3b8", dash: fraction * CIRCUMFERENCE };
    });

  const segments = dashLengths.map((segment, index) => ({
    color: segment.color,
    dashArray: `${segment.dash} ${CIRCUMFERENCE - segment.dash}`,
    dashOffset: -dashLengths.slice(0, index).reduce((sum, s) => sum + s.dash, 0),
  }));

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      <circle
        cx={CENTER}
        cy={CENTER}
        r={RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth={24}
        className="text-zinc-200 dark:text-zinc-800"
      />
      {segments.map((segment, index) => (
        <circle
          key={index}
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke={segment.color}
          strokeWidth={24}
          strokeDasharray={segment.dashArray}
          strokeDashoffset={segment.dashOffset}
          transform={`rotate(-90 ${CENTER} ${CENTER})`}
        />
      ))}
      <text
        x={CENTER}
        y={CENTER}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-zinc-900 text-lg font-semibold dark:fill-zinc-50"
      >
        {total}%
      </text>
    </svg>
  );
}
