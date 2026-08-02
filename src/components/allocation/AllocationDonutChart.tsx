"use client";

import { ASSET_CATEGORIES } from "@/lib/allocation/categories";
import { formatCurrency } from "@/lib/format/currency";
import { roundPercent } from "@/lib/format/percent";
import type { AllocationEntry } from "@/types/allocation";

interface AllocationDonutChartProps {
  entries: AllocationEntry[];
  /** Total patrimoine in €, used only for the chart's aria-label. */
  totalValue: number;
}

const WIDTH = 1220;
const HEIGHT = 720;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;
const RADIUS = 225;
const STROKE_WIDTH = 170;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const MIN_PERCENTAGE_FOR_INSIDE_LABEL = 8;

const RING_OUTER = RADIUS + STROKE_WIDTH / 2;
const LEADER_START_RADIUS = RING_OUTER + 8;
const LABEL_OFFSET_X = RING_OUTER + 36;
const MIN_LABEL_GAP = 26;
/** Width of the white cut separating each segment from its neighbors. */
const SEPARATOR_WIDTH = 6;

const PALETTE_STYLE = `
.allocation-donut {
${ASSET_CATEGORIES.map((c) => `  --segment-${c.id}: ${c.color};\n  --on-segment-${c.id}: ${c.onColor};`).join("\n")}
}
`;

/**
 * Math.cos/sin can differ in their last bit between Node (SSR) and the
 * browser (CSR), which surfaces as a hydration mismatch once serialized to
 * a decimal string. Rounding collapses that epsilon-level drift.
 */
function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function pointAtAngle(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: round2(CENTER_X + radius * Math.cos(rad)),
    y: round2(CENTER_Y + radius * Math.sin(rad)),
  };
}

function angleForArcLength(arcLength: number) {
  return (arcLength / CIRCUMFERENCE) * 360 - 90;
}

interface ExternalLabel {
  categoryId: string;
  label: string;
  percentage: number;
  color: string;
  start: { x: number; y: number };
  angleRad: number;
  labelY: number;
  side: "left" | "right";
}

/** Pushes vertically-stacked external labels apart so they never overlap. */
function resolveLabelCollisions(labels: ExternalLabel[]): ExternalLabel[] {
  const sorted = [...labels].sort((a, b) => a.labelY - b.labelY);
  for (let i = 1; i < sorted.length; i++) {
    const minY = sorted[i - 1].labelY + MIN_LABEL_GAP;
    if (sorted[i].labelY < minY) {
      sorted[i] = { ...sorted[i], labelY: minY };
    }
  }
  return sorted;
}

/** A soft outward sweep that flattens to horizontal near the label — the classic callout curve. */
function buildCalloutPath(
  start: { x: number; y: number },
  angleRad: number,
  end: { x: number; y: number },
  side: "left" | "right"
) {
  const dirX = Math.cos(angleRad);
  const dirY = Math.sin(angleRad);
  const c1 = { x: round2(start.x + dirX * 60), y: round2(start.y + dirY * 60) };
  const pullback = side === "right" ? -60 : 60;
  const c2 = { x: round2(end.x + pullback), y: round2(end.y) };
  return `M ${round2(start.x)} ${round2(start.y)} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${round2(end.x)} ${round2(end.y)}`;
}

export function AllocationDonutChart({ entries, totalValue }: AllocationDonutChartProps) {
  const total = entries.reduce((sum, e) => sum + e.percentage, 0);

  const dashLengths = entries
    .filter((entry) => entry.percentage > 0)
    .map((entry) => {
      const category = ASSET_CATEGORIES.find((c) => c.id === entry.categoryId);
      const fraction = total > 0 ? entry.percentage / total : 0;
      return {
        categoryId: entry.categoryId,
        label: category?.label ?? entry.categoryId,
        color: category?.color ?? "#94a3b8",
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

  // A white cut at the start of every segment (plus the wrap-around seam
  // between the last and first segment, when the ring is fully allocated)
  // reads as distinct slices rather than one continuous ring.
  const isFullyAllocated = total >= 99.95;
  const boundaries = dashLengths.map((_, index) =>
    dashLengths.slice(0, index).reduce((sum, s) => sum + s.dash, 0)
  );
  const separatorAngles =
    dashLengths.length > 1 ? (isFullyAllocated ? boundaries : boundaries.slice(1)) : [];
  const separators = separatorAngles.map((cumulative) => {
    const angleDeg = angleForArcLength(cumulative);
    return {
      inner: pointAtAngle(angleDeg, RADIUS - STROKE_WIDTH / 2),
      outer: pointAtAngle(angleDeg, RADIUS + STROKE_WIDTH / 2),
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
      const angleRad = (segment.angleDeg * Math.PI) / 180;
      const start = pointAtAngle(segment.angleDeg, LEADER_START_RADIUS);
      const side: "left" | "right" = Math.cos(angleRad) >= 0 ? "right" : "left";
      return {
        categoryId: segment.categoryId,
        label: segment.label,
        percentage: segment.percentage,
        color: segment.color,
        start,
        angleRad,
        labelY: start.y,
        side,
      };
    });

  const outsideLabels = [
    ...resolveLabelCollisions(outsideRaw.filter((l) => l.side === "left")),
    ...resolveLabelCollisions(outsideRaw.filter((l) => l.side === "right")),
  ];

  return (
    <div className="allocation-donut mx-auto max-w-[1220px]">
      <style>{PALETTE_STYLE}</style>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Allocation d'actifs, patrimoine total ${formatCurrency(totalValue)}`}
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
            strokeDasharray={segment.dashArray}
            strokeDashoffset={segment.dashOffset}
            transform={`rotate(-90 ${CENTER_X} ${CENTER_Y})`}
          />
        ))}

        {separators.map((separator, index) => (
          <line
            key={index}
            x1={separator.inner.x}
            y1={separator.inner.y}
            x2={separator.outer.x}
            y2={separator.outer.y}
            stroke="#ffffff"
            strokeWidth={SEPARATOR_WIDTH}
            strokeLinecap="round"
          />
        ))}

        {outsideLabels.map((item) => {
          const labelX =
            item.side === "right"
              ? CENTER_X + LABEL_OFFSET_X
              : CENTER_X - LABEL_OFFSET_X;
          const end = { x: labelX, y: item.labelY };
          return (
            <g key={item.categoryId}>
              <path
                d={buildCalloutPath(item.start, item.angleRad, end, item.side)}
                fill="none"
                stroke="var(--color-slate)"
                strokeWidth={1.5}
              />
              <circle cx={end.x} cy={end.y} r={3.5} fill={`var(--segment-${item.categoryId})`} />
              <text
                x={end.x + (item.side === "right" ? 10 : -10)}
                y={end.y}
                textAnchor={item.side === "right" ? "start" : "end"}
                dominantBaseline="middle"
              >
                <tspan
                  fontFamily="var(--font-sans)"
                  fontSize={19}
                  className="fill-slate"
                >
                  {item.label}{" "}
                </tspan>
                <tspan
                  fontFamily="var(--font-mono)"
                  fontSize={19}
                  fontWeight={600}
                  className="fill-ink"
                >
                  {roundPercent(item.percentage)}%
                </tspan>
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
            fontSize={30}
            fontWeight={500}
            style={{ fill: `var(--on-segment-${segment.categoryId})` }}
          >
            {roundPercent(segment.percentage)}%
          </text>
        ))}
      </svg>
    </div>
  );
}
