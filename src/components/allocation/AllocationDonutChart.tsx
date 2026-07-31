"use client";

import { ASSET_CATEGORIES } from "@/lib/allocation/categories";
import type { AllocationEntry } from "@/types/allocation";

interface AllocationDonutChartProps {
  entries: AllocationEntry[];
}

const WIDTH = 340;
const HEIGHT = 280;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;
const RADIUS = 66;
const STROKE_WIDTH = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const MIN_PERCENTAGE_FOR_INSIDE_LABEL = 8;

const RING_OUTER = RADIUS + STROKE_WIDTH / 2;
const LEADER_START_RADIUS = RING_OUTER + 4;
const LEADER_KNEE_RADIUS = RING_OUTER + 16;
const LABEL_OFFSET_X = RING_OUTER + 38;
const MIN_LABEL_GAP = 15;

const PALETTE_STYLE = `
.allocation-donut {
${ASSET_CATEGORIES.map((c) => `  --segment-${c.id}: ${c.color};\n  --on-segment-${c.id}: ${c.onColor};`).join("\n")}
}
`;

function pointAtAngle(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CENTER_X + radius * Math.cos(rad),
    y: CENTER_Y + radius * Math.sin(rad),
  };
}

function angleForArcLength(arcLength: number) {
  return (arcLength / CIRCUMFERENCE) * 360 - 90;
}

interface ExternalLabel {
  categoryId: string;
  percentage: number;
  start: { x: number; y: number };
  kneeX: number;
  kneeY: number;
  side: "left" | "right";
}

/** Pushes vertically-stacked external labels apart so they never overlap. */
function resolveLabelCollisions(labels: ExternalLabel[]): ExternalLabel[] {
  const sorted = [...labels].sort((a, b) => a.kneeY - b.kneeY);
  for (let i = 1; i < sorted.length; i++) {
    const minY = sorted[i - 1].kneeY + MIN_LABEL_GAP;
    if (sorted[i].kneeY < minY) {
      sorted[i] = { ...sorted[i], kneeY: minY };
    }
  }
  return sorted;
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
    const angleDeg = angleForArcLength(cumulative + segment.dash / 2);
    return {
      ...segment,
      dashArray: `${segment.dash} ${CIRCUMFERENCE - segment.dash}`,
      dashOffset: -cumulative,
      angleDeg,
    };
  });

  const insideLabels = segments
    .filter((segment) => segment.percentage >= MIN_PERCENTAGE_FOR_INSIDE_LABEL)
    .map((segment) => ({
      ...segment,
      position: pointAtAngle(segment.angleDeg, RADIUS),
    }));

  const outsideRaw: ExternalLabel[] = segments
    .filter((segment) => segment.percentage < MIN_PERCENTAGE_FOR_INSIDE_LABEL)
    .map((segment) => {
      const start = pointAtAngle(segment.angleDeg, LEADER_START_RADIUS);
      const knee = pointAtAngle(segment.angleDeg, LEADER_KNEE_RADIUS);
      const side: "left" | "right" =
        Math.cos((segment.angleDeg * Math.PI) / 180) >= 0 ? "right" : "left";
      return {
        categoryId: segment.categoryId,
        percentage: segment.percentage,
        start,
        kneeX: knee.x,
        kneeY: knee.y,
        side,
      };
    });

  const outsideLabels = [
    ...resolveLabelCollisions(outsideRaw.filter((l) => l.side === "left")),
    ...resolveLabelCollisions(outsideRaw.filter((l) => l.side === "right")),
  ];

  return (
    <div className="allocation-donut flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-4">
      <style>{PALETTE_STYLE}</style>
      <svg
        width={WIDTH}
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="shrink-0"
      >
        <circle
          cx={CENTER_X}
          cy={CENTER_Y}
          r={RADIUS}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={STROKE_WIDTH}
        />
        {segments.map((segment) => (
          <circle
            key={segment.categoryId}
            cx={CENTER_X}
            cy={CENTER_Y}
            r={RADIUS}
            fill="none"
            stroke={`var(--segment-${segment.categoryId})`}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={segment.dashArray}
            strokeDashoffset={segment.dashOffset}
            transform={`rotate(-90 ${CENTER_X} ${CENTER_Y})`}
          />
        ))}

        {outsideLabels.map((item) => {
          const labelX =
            item.side === "right"
              ? CENTER_X + LABEL_OFFSET_X
              : CENTER_X - LABEL_OFFSET_X;
          return (
            <g key={item.categoryId}>
              <polyline
                points={`${item.start.x},${item.start.y} ${item.kneeX},${item.kneeY} ${labelX},${item.kneeY}`}
                fill="none"
                stroke="var(--color-slate)"
                strokeWidth={1}
              />
              <text
                x={labelX + (item.side === "right" ? 4 : -4)}
                y={item.kneeY}
                textAnchor={item.side === "right" ? "start" : "end"}
                dominantBaseline="middle"
                fontFamily="var(--font-mono)"
                fontSize={11}
                className="fill-ink"
              >
                {Math.round(item.percentage)}%
              </text>
            </g>
          );
        })}

        {insideLabels.map((segment) => (
          <text
            key={segment.categoryId}
            x={segment.position.x}
            y={segment.position.y}
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
          x={CENTER_X}
          y={CENTER_Y}
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
