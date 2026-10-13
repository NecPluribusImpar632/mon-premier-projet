"use client";

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { ProjectionYearPoint } from "@/lib/scenarios/projection";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format/currency";
import { smoothPath, smoothPathBody } from "@/lib/chart/smoothPath";

interface NetWorthProjectionChartProps {
  points: ProjectionYearPoint[];
}

const WIDTH = 600;
const HEIGHT = 220;
const PADDING = { top: 18, right: 100, bottom: 28, left: 8 };
const PLOT_WIDTH = WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;

/** Chart-specific accent — more saturated than the app-wide navy `--color-emerald`,
 * validated against `--color-slate` with the dataviz skill's palette checker
 * (CVD ΔE 9.7/10.6, normal-vision ΔE 15.3, all pass). Scoped to this chart only. */
const CHART_ACCENT = "#0f9d6e";

function horizonLabel(years: number): string {
  if (years <= 0) return "Aujourd'hui";
  if (years === 1) return "Dans 1 an";
  return `Dans ${years} ans`;
}

export function NetWorthProjectionChart({ points }: NetWorthProjectionChartProps) {
  const gradientId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const nominalLabelRef = useRef<HTMLDivElement>(null);
  const realLabelRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipOffset, setTooltipOffset] = useState({ x: 0, y: 0 });

  // Percentage-based positioning can't know the tooltip's actual rendered
  // size (it varies with the values shown) or the exact spot the two
  // permanent end-labels land at (it varies with the data's shape), so it
  // can't guarantee no overflow/overlap on its own — measure the real boxes
  // after each render and nudge the tooltip back in if it clips the
  // container on either axis, or collides with the end-labels. Runs only
  // when the hovered point (or the data behind it) changes, not on every
  // render — it reads back whatever offset is currently applied to recover
  // the tooltip's natural, unshifted position first, so it can't fight its
  // own correction.
  useLayoutEffect(() => {
    const tooltipEl = tooltipRef.current;
    const containerEl = containerRef.current;
    if (!tooltipEl || !containerEl) return;
    const tooltipRect = tooltipEl.getBoundingClientRect();
    const containerRect = containerEl.getBoundingClientRect();
    const margin = 4;
    setTooltipOffset((prevOffset) => {
      const natural = {
        left: tooltipRect.left - prevOffset.x,
        right: tooltipRect.right - prevOffset.x,
        top: tooltipRect.top - prevOffset.y,
        bottom: tooltipRect.bottom - prevOffset.y,
      };

      let dx = 0;
      if (natural.right > containerRect.right - margin) {
        dx = containerRect.right - margin - natural.right;
      } else if (natural.left < containerRect.left + margin) {
        dx = containerRect.left + margin - natural.left;
      }

      let dy = 0;
      if (natural.top < containerRect.top + margin) {
        dy = containerRect.top + margin - natural.top;
      }

      const shiftedTop = natural.top + dy;
      const shiftedBottom = natural.bottom + dy;
      const shiftedLeft = natural.left + dx;
      const shiftedRight = natural.right + dx;
      const labelRects = [nominalLabelRef.current, realLabelRef.current]
        .filter((el): el is HTMLDivElement => el !== null)
        .map((el) => el.getBoundingClientRect());
      const collidingBottoms = labelRects
        .filter(
          (r) =>
            shiftedLeft < r.right + margin &&
            shiftedRight > r.left - margin &&
            shiftedTop < r.bottom + margin &&
            shiftedBottom > r.top - margin
        )
        .map((r) => r.bottom);
      if (collidingBottoms.length > 0) {
        // Can't fit above the end-labels without also clipping the
        // container's top — flip below them instead.
        dy = Math.max(dy, Math.max(...collidingBottoms) + margin - natural.top);
      }
      if (natural.bottom + dy > containerRect.bottom - margin) {
        dy = containerRect.bottom - margin - natural.bottom;
      }

      return dx === prevOffset.x && dy === prevOffset.y ? prevOffset : { x: dx, y: dy };
    });
  }, [hoveredIndex, points]);

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

  const hovered = hoveredIndex !== null ? points[hoveredIndex] : null;
  const hoveredXPct = hoveredIndex !== null ? (xForIndex(hoveredIndex) / WIDTH) * 100 : 0;
  // A starting hint for which way to grow the box — near either edge it
  // anchors by that edge instead of centering. The measured effect above is
  // what actually guarantees no overflow/overlap; this just gets it close
  // on the first paint so the correction is usually a small nudge.
  const tooltipEdgeClass =
    hoveredXPct > 70 ? "-translate-x-full" : hoveredXPct < 15 ? "" : "-translate-x-1/2";
  // Anchor just above whichever line sits higher at this point — keeps the
  // tooltip near the cursor instead of always jumping to the container's top
  // edge. The measured effect nudges it clear of the container edges and the
  // permanent end-labels if this natural position collides with either.
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
        {/* The first/last labels anchor by their edge, not their center — a
            centered label on a point that sits at the container's own edge
            would have half its text clipped off-screen. */}
        {xLabelIndices.map((i) => {
          const edgeClass =
            i === 0 ? "" : i === lastIndex ? "-translate-x-full" : "-translate-x-1/2";
          return (
            <span
              key={points[i].year}
              className={`pointer-events-none absolute whitespace-nowrap text-[10px] text-slate ${edgeClass}`}
              style={{
                left: `${(xForIndex(i) / WIDTH) * 100}%`,
                top: `${((HEIGHT - 16) / HEIGHT) * 100}%`,
              }}
            >
              {horizonLabel(points[i].year)}
            </span>
          );
        })}

        {/* Direct end labels double as the legend: at the right edge the two
            series have separated enough to read the color + name together,
            so a distant swatch-and-text legend would only repeat this. */}
        <div
          ref={nominalLabelRef}
          className="pointer-events-none absolute -translate-y-1/2 whitespace-nowrap leading-tight"
          style={{ left: `${(xForIndex(lastIndex) / WIDTH) * 100}%`, top: `${(nominalLabelY / HEIGHT) * 100}%`, marginLeft: 8 }}
        >
          <div className="font-serif text-sm text-ink">
            {formatCurrencyCompact(points[lastIndex].netWorth)}
          </div>
          <div className="text-[10px] text-slate">courants</div>
        </div>
        <div
          ref={realLabelRef}
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
              ref={tooltipRef}
              className={`pointer-events-none absolute z-10 -translate-y-full whitespace-nowrap rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs shadow-md ${tooltipEdgeClass}`}
              style={{
                left: `${hoveredXPct}%`,
                top: `${tooltipTopPct}%`,
                marginLeft: tooltipOffset.x,
                marginTop: tooltipOffset.y,
              }}
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
