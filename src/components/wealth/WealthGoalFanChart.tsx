"use client";

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { MonteCarloResult } from "@/lib/wealth/monteCarloProjection";
import { smoothPath, smoothPathBody, type Point } from "@/lib/chart/smoothPath";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format/currency";

interface WealthGoalFanChartProps {
  bands: MonteCarloResult["bands"];
}

const WIDTH = 600;
const HEIGHT = 220;
const PADDING = { top: 18, right: 100, bottom: 28, left: 8 };
const PLOT_WIDTH = WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;

/** Same accent as NetWorthProjectionChart — one shared visual family across
 * every projection chart in the app. */
const CHART_ACCENT = "#0f9d6e";

function horizonLabel(years: number): string {
  if (years <= 0) return "Aujourd'hui";
  if (years === 1) return "Dans 1 an";
  return `Dans ${years} ans`;
}

export function WealthGoalFanChart({ bands }: WealthGoalFanChartProps) {
  const gradientId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const p90LabelRef = useRef<HTMLDivElement>(null);
  const p50LabelRef = useRef<HTMLDivElement>(null);
  const p10LabelRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipOffset, setTooltipOffset] = useState({ x: 0, y: 0 });

  const points = bands.p50;

  // Same measured collision-avoidance as NetWorthProjectionChart, generalized
  // from 2 permanent end-labels to 3 (p90/p50/p10).
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
      const labelRects = [p90LabelRef.current, p50LabelRef.current, p10LabelRef.current]
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
        dy = Math.max(dy, Math.max(...collidingBottoms) + margin - natural.top);
      }
      if (natural.bottom + dy > containerRect.bottom - margin) {
        dy = containerRect.bottom - margin - natural.bottom;
      }

      return dx === prevOffset.x && dy === prevOffset.y ? prevOffset : { x: dx, y: dy };
    });
  }, [hoveredIndex, points]);

  if (points.length < 2) return null;

  const allValues = [...bands.p10, ...bands.p50, ...bands.p90].map((p) => p.netWorth);
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

  const p10Pts: Point[] = bands.p10.map((p, i) => ({ x: xForIndex(i), y: yForValue(p.netWorth) }));
  const p50Pts: Point[] = bands.p50.map((p, i) => ({ x: xForIndex(i), y: yForValue(p.netWorth) }));
  const p90Pts: Point[] = bands.p90.map((p, i) => ({ x: xForIndex(i), y: yForValue(p.netWorth) }));
  const p90Path = smoothPath(p90Pts);
  const p50Path = smoothPath(p50Pts);
  const p10Path = smoothPath(p10Pts);

  // The shaded region between the 10th and 90th percentile — the p90 curve
  // forward, then the p10 curve reversed back, closing the loop.
  const p10Last = p10Pts[p10Pts.length - 1];
  const bandAreaPath =
    `${p90Path} L${p10Last.x.toFixed(1)},${p10Last.y.toFixed(1)} ` +
    `${smoothPathBody([...p10Pts].reverse())} Z`;

  const lastIndex = points.length - 1;
  // A label every 5 years (plus the end), so the axis reads as a timeline
  // rather than three isolated stops that could pass for the only data points.
  const xLabelIndices = Array.from(
    new Set([
      ...points.map((p, i) => (p.year % 5 === 0 ? i : -1)).filter((i) => i >= 0),
      lastIndex,
    ])
  ).filter((i) => i === 0 || i === lastIndex || lastIndex - i >= 3);

  const startY = yForValue(points[0].netWorth);

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

  // Push the three end-labels apart if they'd otherwise overlap vertically.
  const rawEndYs = { p90: p90Pts[lastIndex].y, p50: p50Pts[lastIndex].y, p10: p10Pts[lastIndex].y };
  const minLabelGap = 26;
  let p90LabelY = rawEndYs.p90;
  let p50LabelY = rawEndYs.p50;
  let p10LabelY = rawEndYs.p10;
  if (p50LabelY - p90LabelY < minLabelGap) {
    const push = (minLabelGap - (p50LabelY - p90LabelY)) / 2;
    p90LabelY -= push;
    p50LabelY += push;
  }
  if (p10LabelY - p50LabelY < minLabelGap) {
    const push = (minLabelGap - (p10LabelY - p50LabelY)) / 2;
    p50LabelY -= push;
    p10LabelY += push;
  }

  const hoveredP10 = hoveredIndex !== null ? bands.p10[hoveredIndex] : null;
  const hoveredP50 = hoveredIndex !== null ? bands.p50[hoveredIndex] : null;
  const hoveredP90 = hoveredIndex !== null ? bands.p90[hoveredIndex] : null;
  const hoveredXPct = hoveredIndex !== null ? (xForIndex(hoveredIndex) / WIDTH) * 100 : 0;
  const tooltipEdgeClass =
    hoveredXPct > 70 ? "-translate-x-full" : hoveredXPct < 15 ? "" : "-translate-x-1/2";
  const tooltipTopPct = hoveredP90
    ? Math.max(0, (yForValue(hoveredP90.netWorth) / HEIGHT) * 100 - 4)
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
              <stop offset="0%" stopColor={CHART_ACCENT} stopOpacity={0.28} />
              <stop offset="100%" stopColor={CHART_ACCENT} stopOpacity={0.1} />
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

          <path d={bandAreaPath} fill={`url(#${gradientId})`} stroke="none" />

          <path
            d={p90Path}
            fill="none"
            stroke="var(--color-slate)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={p10Path}
            fill="none"
            stroke="var(--color-slate)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={p50Path}
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

        <div
          ref={p90LabelRef}
          className="pointer-events-none absolute -translate-y-1/2 whitespace-nowrap leading-tight"
          style={{ left: `${(xForIndex(lastIndex) / WIDTH) * 100}%`, top: `${(p90LabelY / HEIGHT) * 100}%`, marginLeft: 8 }}
        >
          <div className="text-xs text-slate">{formatCurrencyCompact(bands.p90[lastIndex].netWorth)}</div>
          <div className="text-[10px] text-slate">optimiste (p90)</div>
        </div>
        <div
          ref={p50LabelRef}
          className="pointer-events-none absolute -translate-y-1/2 whitespace-nowrap leading-tight"
          style={{ left: `${(xForIndex(lastIndex) / WIDTH) * 100}%`, top: `${(p50LabelY / HEIGHT) * 100}%`, marginLeft: 8 }}
        >
          <div className="font-serif text-sm text-ink">{formatCurrencyCompact(bands.p50[lastIndex].netWorth)}</div>
          <div className="text-[10px] text-slate">médian (p50)</div>
        </div>
        <div
          ref={p10LabelRef}
          className="pointer-events-none absolute -translate-y-1/2 whitespace-nowrap leading-tight"
          style={{ left: `${(xForIndex(lastIndex) / WIDTH) * 100}%`, top: `${(p10LabelY / HEIGHT) * 100}%`, marginLeft: 8 }}
        >
          <div className="text-xs text-slate">{formatCurrencyCompact(bands.p10[lastIndex].netWorth)}</div>
          <div className="text-[10px] text-slate">pessimiste (p10)</div>
        </div>

        <span
          className="pointer-events-none absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate ring-2 ring-surface"
          style={{ left: `${(xForIndex(lastIndex) / WIDTH) * 100}%`, top: `${(rawEndYs.p90 / HEIGHT) * 100}%` }}
        />
        <span
          className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
          style={{ left: `${(xForIndex(lastIndex) / WIDTH) * 100}%`, top: `${(rawEndYs.p50 / HEIGHT) * 100}%`, backgroundColor: CHART_ACCENT }}
        />
        <span
          className="pointer-events-none absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate ring-2 ring-surface"
          style={{ left: `${(xForIndex(lastIndex) / WIDTH) * 100}%`, top: `${(rawEndYs.p10 / HEIGHT) * 100}%` }}
        />

        {hoveredP10 && hoveredP50 && hoveredP90 && hoveredIndex !== null && (
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
            <p className="font-medium text-ink">Année {hoveredP50.year}</p>
            <p className="flex items-center justify-between gap-3 text-slate">
              <span>Optimiste (p90)</span>
              <span className="font-mono tabular-nums">{formatCurrency(hoveredP90.netWorth)}</span>
            </p>
            <p className="flex items-center justify-between gap-3 text-ink">
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: CHART_ACCENT }} />
                Médian (p50)
              </span>
              <span className="font-mono tabular-nums">{formatCurrency(hoveredP50.netWorth)}</span>
            </p>
            <p className="flex items-center justify-between gap-3 text-slate">
              <span>Pessimiste (p10)</span>
              <span className="font-mono tabular-nums">{formatCurrency(hoveredP10.netWorth)}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
