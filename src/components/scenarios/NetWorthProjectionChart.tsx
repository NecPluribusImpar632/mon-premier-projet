"use client";

import { useId, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { ProjectionYearPoint } from "@/lib/scenarios/projection";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format/currency";

interface NetWorthProjectionChartProps {
  points: ProjectionYearPoint[];
}

const WIDTH = 600;
const HEIGHT = 220;
const PADDING = { top: 12, right: 12, bottom: 24, left: 64 };
const PLOT_WIDTH = WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;
const PLOT_BOTTOM_Y = PADDING.top + PLOT_HEIGHT;

interface Point {
  x: number;
  y: number;
}

/** Catmull-Rom-to-Bezier smoothing (uniform, 1/6 tension) — turns the polyline
 * into a curve without overshoot on the mostly-monotonic series this chart
 * plots, and reads far less "spreadsheet" than straight segments. */
function smoothPath(pts: Point[]): string {
  if (pts.length < 2) return "";
  if (pts.length === 2) {
    return `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)} L${pts[1].x.toFixed(1)},${pts[1].y.toFixed(1)}`;
  }
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

export function NetWorthProjectionChart({ points }: NetWorthProjectionChartProps) {
  const gradientId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (points.length < 2) return null;

  const allValues = points.flatMap((p) => [p.netWorth, p.realNetWorth]);
  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const valuePadding = (rawMax - rawMin) * 0.1 || Math.abs(rawMax) * 0.1 || 1;
  const minValue = rawMin - valuePadding;
  const maxValue = rawMax + valuePadding;
  const valueRange = maxValue - minValue || 1;

  const xForIndex = (index: number) =>
    PADDING.left + (index / (points.length - 1)) * PLOT_WIDTH;
  const yForValue = (value: number) =>
    PADDING.top + PLOT_HEIGHT - ((value - minValue) / valueRange) * PLOT_HEIGHT;

  const nominalPts = points.map((p, i) => ({ x: xForIndex(i), y: yForValue(p.netWorth) }));
  const realPts = points.map((p, i) => ({ x: xForIndex(i), y: yForValue(p.realNetWorth) }));
  const nominalPath = smoothPath(nominalPts);
  const realPath = smoothPath(realPts);
  const areaPath =
    `${nominalPath} L${nominalPts[nominalPts.length - 1].x.toFixed(1)},${PLOT_BOTTOM_Y}` +
    ` L${nominalPts[0].x.toFixed(1)},${PLOT_BOTTOM_Y} Z`;

  const ticks = [minValue, (minValue + maxValue) / 2, maxValue];
  const yearLabelStride = Math.max(1, Math.ceil(points.length / 8));
  const lastIndex = points.length - 1;

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const viewBoxX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let nearestDist = Infinity;
    points.forEach((_, i) => {
      const dist = Math.abs(xForIndex(i) - viewBoxX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoveredIndex(nearest);
  }

  const hovered = hoveredIndex !== null ? points[hoveredIndex] : null;
  const hoveredXPct = hoveredIndex !== null ? (xForIndex(hoveredIndex) / WIDTH) * 100 : 0;
  // Clamp so the tooltip box never overflows the chart's left/right edge.
  const tooltipLeftPct = Math.min(Math.max(hoveredXPct, 12), 88);
  // Anchor just above whichever line sits higher at this point, clamped to the
  // container's own top — keeps the tooltip near the cursor instead of always
  // jumping to the container's top edge, where it can crowd whatever sits
  // just above the chart.
  const tooltipTopPct = hovered
    ? Math.max(0, (Math.min(yForValue(hovered.netWorth), yForValue(hovered.realNetWorth)) / HEIGHT) * 100 - 4)
    : 0;

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="relative w-full overflow-x-auto"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoveredIndex(null)}
      >
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          className="h-48 w-full"
          style={{ minWidth: 420 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-emerald)" stopOpacity={0.16} />
              <stop offset="100%" stopColor="var(--color-emerald)" stopOpacity={0} />
            </linearGradient>
          </defs>

          {ticks.map((tick) => (
            <line
              key={tick}
              x1={PADDING.left}
              y1={yForValue(tick)}
              x2={WIDTH - PADDING.right}
              y2={yForValue(tick)}
              stroke="var(--color-line)"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />

          <path
            d={realPath}
            fill="none"
            stroke="var(--color-slate)"
            strokeWidth={2}
            strokeDasharray="4 3"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={nominalPath}
            fill="none"
            stroke="var(--color-emerald)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {hoveredIndex !== null && (
            <line
              x1={xForIndex(hoveredIndex)}
              y1={PADDING.top}
              x2={xForIndex(hoveredIndex)}
              y2={PLOT_BOTTOM_Y}
              stroke="var(--color-slate)"
              strokeWidth={1}
              strokeOpacity={0.35}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {/* Text and circular markers are rendered as HTML, not inside the SVG:
            preserveAspectRatio="none" scales x/y non-uniformly, which would
            otherwise squash/stretch glyphs and turn circles into ellipses. */}
        {ticks.map((tick) => (
          <span
            key={tick}
            className="pointer-events-none absolute -translate-y-1/2 whitespace-nowrap text-right text-[9px] text-slate"
            style={{
              left: 0,
              width: `${((PADDING.left - 8) / WIDTH) * 100}%`,
              top: `${(yForValue(tick) / HEIGHT) * 100}%`,
            }}
          >
            {formatCurrencyCompact(tick)}
          </span>
        ))}

        {points.map((p, i) =>
          i % yearLabelStride === 0 || i === points.length - 1 ? (
            <span
              key={p.year}
              className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap text-[9px] text-slate"
              style={{
                left: `${(xForIndex(i) / WIDTH) * 100}%`,
                top: `${((HEIGHT - 14) / HEIGHT) * 100}%`,
              }}
            >
              A{p.year}
            </span>
          ) : null
        )}

        {/* End marker on the primary series — a direct label needs no repeated
            per-point dots, just the one endpoint the eye lands on. */}
        <span
          className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald ring-2 ring-surface"
          style={{
            left: `${(xForIndex(lastIndex) / WIDTH) * 100}%`,
            top: `${(yForValue(points[lastIndex].netWorth) / HEIGHT) * 100}%`,
          }}
        />

        {hovered && hoveredIndex !== null && (
          <>
            <span
              className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald ring-2 ring-surface"
              style={{
                left: `${hoveredXPct}%`,
                top: `${(yForValue(hovered.netWorth) / HEIGHT) * 100}%`,
              }}
            />
            <span
              className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate ring-2 ring-surface"
              style={{
                left: `${hoveredXPct}%`,
                top: `${(yForValue(hovered.realNetWorth) / HEIGHT) * 100}%`,
              }}
            />
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs shadow-md"
              style={{ left: `${tooltipLeftPct}%`, top: `${tooltipTopPct}%` }}
            >
              <p className="font-medium text-ink">Année {hovered.year}</p>
              <p className="flex items-center justify-between gap-3 text-emerald-strong">
                <span>Courants</span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(hovered.netWorth)}
                </span>
              </p>
              <p className="flex items-center justify-between gap-3 text-slate">
                <span>Constants</span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(hovered.realNetWorth)}
                </span>
              </p>
            </div>
          </>
        )}
      </div>
      <div className="mt-2 flex items-center gap-4 text-xs text-slate">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-emerald" />
          Patrimoine net (euros courants)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full border-t border-dashed border-slate" />
          En euros constants
        </span>
      </div>
    </div>
  );
}
