"use client";

import { useId, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { ProjectionYearPoint } from "@/lib/scenarios/projection";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format/currency";

interface NetWorthProjectionChartProps {
  points: ProjectionYearPoint[];
}

const WIDTH = 600;
const HEIGHT = 220;
const PADDING = { top: 18, right: 100, bottom: 28, left: 8 };
const PLOT_WIDTH = WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;

interface Point {
  x: number;
  y: number;
}

/** Chart-specific accent — more saturated than the app-wide navy `--color-emerald`,
 * validated against `--color-slate` with the dataviz skill's palette checker
 * (CVD ΔE 9.7/10.6, normal-vision ΔE 15.3, all pass). Scoped to this chart only. */
const CHART_ACCENT = "#0f9d6e";

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

/** Body of a smoothed path (no leading M) — for appending a reversed curve to
 * an already-open path where the cursor is already at the right start point. */
function smoothPathBody(pts: Point[]): string {
  return smoothPath(pts).replace(/^M[-\d.]+,[-\d.]+\s*/, "");
}

function horizonLabel(years: number): string {
  if (years <= 0) return "Aujourd'hui";
  if (years === 1) return "Dans 1 an";
  return `Dans ${years} ans`;
}

export function NetWorthProjectionChart({ points }: NetWorthProjectionChartProps) {
  const gradientId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (points.length < 2) return null;

  const allValues = points.flatMap((p) => [p.netWorth, p.realNetWorth]);
  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const breathingRoom = (rawMax - rawMin) * 0.12 || Math.abs(rawMax) * 0.12 || 1;
  const minValue = rawMin - breathingRoom;
  const maxValue = rawMax + breathingRoom;
  const valueRange = maxValue - minValue || 1;

  const xForIndex = (index: number) =>
    PADDING.left + (index / (points.length - 1)) * PLOT_WIDTH;
  const yForValue = (value: number) =>
    PADDING.top + PLOT_HEIGHT - ((value - minValue) / valueRange) * PLOT_HEIGHT;

  const nominalPts = points.map((p, i) => ({ x: xForIndex(i), y: yForValue(p.netWorth) }));
  const realPts = points.map((p, i) => ({ x: xForIndex(i), y: yForValue(p.realNetWorth) }));
  const nominalPath = smoothPath(nominalPts);
  const realPath = smoothPath(realPts);

  // The band between the two curves, not a fill down to a floor axis: the gap
  // between nominal and real net worth is the one part of this data that's
  // genuinely dynamic (it widens with cumulative inflation), so it's what
  // earns the visual weight instead of a decorative area-under-the-line.
  const realLast = realPts[realPts.length - 1];
  const gapAreaPath =
    `${nominalPath} L${realLast.x.toFixed(1)},${realLast.y.toFixed(1)} ` +
    `${smoothPathBody([...realPts].reverse())} Z`;

  const lastIndex = points.length - 1;
  const midIndex = Math.round(lastIndex / 2);
  const xLabelIndices =
    lastIndex <= 2 ? [0, lastIndex] : Array.from(new Set([0, midIndex, lastIndex]));

  // Single reference hairline: today's starting value, not an arbitrary tick —
  // it gives the eye a fixed anchor to read growth against, editorial-style,
  // instead of a full library-default grid.
  const startY = yForValue(points[0].netWorth);

  const inflationGap = points[lastIndex].netWorth - points[lastIndex].realNetWorth;

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
  const tooltipLeftPct = Math.min(Math.max(hoveredXPct, 12), 74);
  // Anchor just above whichever line sits higher at this point, clamped to the
  // container's own top — keeps the tooltip near the cursor instead of always
  // jumping to the container's top edge, where it can crowd whatever sits
  // just above the chart.
  const tooltipTopPct = hovered
    ? Math.max(0, (Math.min(yForValue(hovered.netWorth), yForValue(hovered.realNetWorth)) / HEIGHT) * 100 - 4)
    : 0;

  // End labels sit beside their own dot; if the gap between the two final
  // values is too tight the text collides, so nudge them apart a touch
  // instead of letting them overlap.
  const nominalEndY = nominalPts[lastIndex].y;
  const realEndY = realPts[lastIndex].y;
  const minLabelGap = 30;
  const endLabelGap = realEndY - nominalEndY;
  const endLabelPush =
    endLabelGap < minLabelGap ? (minLabelGap - endLabelGap) / 2 : 0;
  const nominalLabelY = nominalEndY - endLabelPush;
  const realLabelY = realEndY + endLabelPush;

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
              <stop offset="0%" stopColor="var(--color-slate)" stopOpacity={0.16} />
              <stop offset="100%" stopColor="var(--color-slate)" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <line
            x1={PADDING.left}
            y1={startY}
            x2={WIDTH - PADDING.right}
            y2={startY}
            stroke="var(--color-line)"
            vectorEffect="non-scaling-stroke"
          />

          <path d={gapAreaPath} fill={`url(#${gradientId})`} stroke="none" />

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
            stroke={CHART_ACCENT}
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
              y2={PADDING.top + PLOT_HEIGHT}
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
        {xLabelIndices.map((i) => (
          <span
            key={points[i].year}
            className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap text-[10px] text-slate"
            style={{
              left: `${(xForIndex(i) / WIDTH) * 100}%`,
              top: `${((HEIGHT - 16) / HEIGHT) * 100}%`,
            }}
          >
            {horizonLabel(points[i].year)}
          </span>
        ))}

        {/* Direct end labels double as the legend: at the right edge the two
            series have separated enough to read the color + name together,
            so a distant swatch-and-text legend would only repeat this. */}
        <div
          className="pointer-events-none absolute -translate-y-1/2 whitespace-nowrap leading-tight"
          style={{ left: `${(xForIndex(lastIndex) / WIDTH) * 100}%`, top: `${(nominalLabelY / HEIGHT) * 100}%`, marginLeft: 8 }}
        >
          <div className="font-serif text-sm text-ink">
            {formatCurrencyCompact(points[lastIndex].netWorth)}
          </div>
          <div className="text-[10px] text-slate">courants</div>
        </div>
        <div
          className="pointer-events-none absolute -translate-y-1/2 whitespace-nowrap leading-tight"
          style={{ left: `${(xForIndex(lastIndex) / WIDTH) * 100}%`, top: `${(realLabelY / HEIGHT) * 100}%`, marginLeft: 8 }}
        >
          <div className="text-xs text-slate">{formatCurrencyCompact(points[lastIndex].realNetWorth)}</div>
          <div className="text-[10px] text-slate">constants</div>
        </div>

        <span
          className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
          style={{
            left: `${(xForIndex(lastIndex) / WIDTH) * 100}%`,
            top: `${(nominalEndY / HEIGHT) * 100}%`,
            backgroundColor: CHART_ACCENT,
          }}
        />
        <span
          className="pointer-events-none absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate ring-2 ring-surface"
          style={{
            left: `${(xForIndex(lastIndex) / WIDTH) * 100}%`,
            top: `${(realEndY / HEIGHT) * 100}%`,
          }}
        />

        {hovered && hoveredIndex !== null && (
          <>
            <span
              className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
              style={{
                left: `${hoveredXPct}%`,
                top: `${(yForValue(hovered.netWorth) / HEIGHT) * 100}%`,
                backgroundColor: CHART_ACCENT,
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
              <p className="flex items-center justify-between gap-3 text-ink">
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-0.5 w-3 rounded-full"
                    style={{ backgroundColor: CHART_ACCENT }}
                  />
                  Courants
                </span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(hovered.netWorth)}
                </span>
              </p>
              <p className="flex items-center justify-between gap-3 text-slate">
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-3 rounded-full border-t border-dashed border-slate" />
                  Constants
                </span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(hovered.realNetWorth)}
                </span>
              </p>
            </div>
          </>
        )}
      </div>

      {inflationGap > 1 && (
        <p className="mt-2 text-xs text-slate">
          Écart lié à l&apos;inflation à l&apos;échéance : {formatCurrency(inflationGap)}
        </p>
      )}
    </div>
  );
}
