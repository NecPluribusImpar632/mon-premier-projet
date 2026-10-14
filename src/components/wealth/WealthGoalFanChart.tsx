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
import {
  CURRENT_SERIES_LABEL,
  PROPOSAL_SERIES_LABEL,
} from "@/lib/wealth/wealthGoalProposal";

interface WealthGoalFanChartProps {
  bands: MonteCarloResult["bands"];
  /** A second set of bands drawn over the first: the proposed allocation,
   * simulated on the same random draws. When present, the first series is
   * drawn in grey and the second in the accent colour, with a legend. */
  comparisonBands?: MonteCarloResult["bands"];
}

const WIDTH = 600;
const HEIGHT = 220;
const PADDING = { top: 18, right: 100, bottom: 28, left: 8 };
const PLOT_WIDTH = WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;

/** Same accent as NetWorthProjectionChart — one shared visual family across
 * every projection chart in the app. */
const CHART_ACCENT = "#0f9d6e";
/** The current situation when a proposal is overlaid: neutral so the eye
 * reads the accent series as "what changes". */
const CHART_NEUTRAL = "#6b7280";

function horizonLabel(years: number): string {
  if (years <= 0) return "Aujourd'hui";
  if (years === 1) return "Dans 1 an";
  return `Dans ${years} ans`;
}

interface SeriesPaths {
  p10: Point[];
  p50: Point[];
  p90: Point[];
  p90Path: string;
  p50Path: string;
  p10Path: string;
  areaPath: string;
}

function buildSeriesPaths(
  bands: MonteCarloResult["bands"],
  xForIndex: (i: number) => number,
  yForValue: (v: number) => number
): SeriesPaths {
  const p10 = bands.p10.map((p, i) => ({ x: xForIndex(i), y: yForValue(p.netWorth) }));
  const p50 = bands.p50.map((p, i) => ({ x: xForIndex(i), y: yForValue(p.netWorth) }));
  const p90 = bands.p90.map((p, i) => ({ x: xForIndex(i), y: yForValue(p.netWorth) }));
  const p90Path = smoothPath(p90);
  const p50Path = smoothPath(p50);
  const p10Path = smoothPath(p10);
  // The shaded region between the 10th and 90th percentile — the p90 curve
  // forward, then the p10 curve reversed back, closing the loop.
  const p10Last = p10[p10.length - 1];
  const areaPath =
    `${p90Path} L${p10Last.x.toFixed(1)},${p10Last.y.toFixed(1)} ` +
    `${smoothPathBody([...p10].reverse())} Z`;
  return { p10, p50, p90, p90Path, p50Path, p10Path, areaPath };
}

export function WealthGoalFanChart({ bands, comparisonBands }: WealthGoalFanChartProps) {
  const gradientId = useId();
  const neutralGradientId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const p90LabelRef = useRef<HTMLDivElement>(null);
  const p50LabelRef = useRef<HTMLDivElement>(null);
  const p10LabelRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipOffset, setTooltipOffset] = useState({ x: 0, y: 0 });

  const points = bands.p50;
  // Narrowed once so every later use is typed without a repeated check.
  const overlay =
    comparisonBands !== undefined && comparisonBands.p50.length === points.length
      ? comparisonBands
      : null;

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

  const allBands = overlay ? [bands, overlay] : [bands];
  const allValues = allBands.flatMap((b) => [...b.p10, ...b.p50, ...b.p90]).map((p) => p.netWorth);
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

  const current = buildSeriesPaths(bands, xForIndex, yForValue);
  const proposal = overlay ? buildSeriesPaths(overlay, xForIndex, yForValue) : null;

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

  // End labels. Single series: p90 / p50 / p10 of that series. Comparison:
  // the two medians only (six labels would not fit), pushed apart the same way.
  const minLabelGap = 26;
  let endLabels: { y: number; rawY: number; value: number; caption: string; emphasis: boolean; color: string }[];
  if (proposal && overlay) {
    const rawCurrent = current.p50[lastIndex].y;
    const rawProposal = proposal.p50[lastIndex].y;
    let yCurrent = rawCurrent;
    let yProposal = rawProposal;
    if (Math.abs(yCurrent - yProposal) < minLabelGap) {
      const push = (minLabelGap - Math.abs(yCurrent - yProposal)) / 2;
      if (yCurrent <= yProposal) {
        yCurrent -= push;
        yProposal += push;
      } else {
        yProposal -= push;
        yCurrent += push;
      }
    }
    endLabels = [
      { y: yCurrent, rawY: rawCurrent, value: bands.p50[lastIndex].netWorth, caption: `${CURRENT_SERIES_LABEL} (médian)`, emphasis: false, color: CHART_NEUTRAL },
      { y: yProposal, rawY: rawProposal, value: overlay.p50[lastIndex].netWorth, caption: `${PROPOSAL_SERIES_LABEL} (médian)`, emphasis: true, color: CHART_ACCENT },
    ];
  } else {
    const rawEndYs = { p90: current.p90[lastIndex].y, p50: current.p50[lastIndex].y, p10: current.p10[lastIndex].y };
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
    endLabels = [
      { y: p90LabelY, rawY: rawEndYs.p90, value: bands.p90[lastIndex].netWorth, caption: "optimiste (p90)", emphasis: false, color: "var(--color-slate)" },
      { y: p50LabelY, rawY: rawEndYs.p50, value: bands.p50[lastIndex].netWorth, caption: "médian (p50)", emphasis: true, color: CHART_ACCENT },
      { y: p10LabelY, rawY: rawEndYs.p10, value: bands.p10[lastIndex].netWorth, caption: "pessimiste (p10)", emphasis: false, color: "var(--color-slate)" },
    ];
  }

  const hovered = hoveredIndex !== null ? hoveredIndex : null;
  const hoveredXPct = hovered !== null ? (xForIndex(hovered) / WIDTH) * 100 : 0;
  const tooltipEdgeClass =
    hoveredXPct > 70 ? "-translate-x-full" : hoveredXPct < 15 ? "" : "-translate-x-1/2";
  const hoveredTop =
    hovered !== null
      ? Math.min(
          ...allBands.map((b) => yForValue(b.p90[hovered].netWorth))
        )
      : 0;
  const tooltipTopPct = hovered !== null ? Math.max(0, (hoveredTop / HEIGHT) * 100 - 4) : 0;

  const currentStroke = proposal ? CHART_NEUTRAL : CHART_ACCENT;
  const currentFill = proposal ? `url(#${neutralGradientId})` : `url(#${gradientId})`;

  function renderSeries(paths: SeriesPaths, stroke: string, fill: string, envelopeStroke: string) {
    return (
      <>
        <path d={paths.areaPath} fill={fill} stroke="none" />
        <path
          d={paths.p90Path}
          fill="none"
          stroke={envelopeStroke}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={paths.p10Path}
          fill="none"
          stroke={envelopeStroke}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={paths.p50Path}
          fill="none"
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </>
    );
  }

  function tooltipRows(label: string | null, b: MonteCarloResult["bands"], color: string) {
    if (hovered === null) return null;
    return (
      <>
        {label && (
          <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-ink">
            <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: color }} />
            {label}
          </p>
        )}
        <p className="flex items-center justify-between gap-3 text-slate">
          <span>Optimiste (p90)</span>
          <span className="font-mono tabular-nums">{formatCurrency(b.p90[hovered].netWorth)}</span>
        </p>
        <p className="flex items-center justify-between gap-3 text-ink">
          <span className="flex items-center gap-1.5">
            {!label && <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: color }} />}
            Médian (p50)
          </span>
          <span className="font-mono tabular-nums">{formatCurrency(b.p50[hovered].netWorth)}</span>
        </p>
        <p className="flex items-center justify-between gap-3 text-slate">
          <span>Pessimiste (p10)</span>
          <span className="font-mono tabular-nums">{formatCurrency(b.p10[hovered].netWorth)}</span>
        </p>
      </>
    );
  }

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
            <linearGradient id={neutralGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_NEUTRAL} stopOpacity={0.18} />
              <stop offset="100%" stopColor={CHART_NEUTRAL} stopOpacity={0.06} />
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

          {renderSeries(current, currentStroke, currentFill, proposal ? CHART_NEUTRAL : "var(--color-slate)")}
          {proposal && renderSeries(proposal, CHART_ACCENT, `url(#${gradientId})`, CHART_ACCENT)}

          {hovered !== null && (
            <line
              x1={xForIndex(hovered)}
              y1={PADDING.top}
              x2={xForIndex(hovered)}
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

        {endLabels.map((label, i) => (
          <div
            key={label.caption}
            ref={i === 0 ? p90LabelRef : i === 1 ? p50LabelRef : p10LabelRef}
            className="pointer-events-none absolute -translate-y-1/2 whitespace-nowrap leading-tight"
            style={{ left: `${(xForIndex(lastIndex) / WIDTH) * 100}%`, top: `${(label.y / HEIGHT) * 100}%`, marginLeft: 8 }}
          >
            <div className={label.emphasis ? "font-serif text-sm text-ink" : "text-xs text-slate"}>
              {formatCurrencyCompact(label.value)}
            </div>
            <div className="text-[10px] text-slate">{label.caption}</div>
          </div>
        ))}

        {endLabels.map((label) => (
          <span
            key={`${label.caption}-dot`}
            className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface ${
              label.emphasis ? "h-2 w-2" : "h-1.5 w-1.5"
            }`}
            style={{
              left: `${(xForIndex(lastIndex) / WIDTH) * 100}%`,
              top: `${(label.rawY / HEIGHT) * 100}%`,
              backgroundColor: label.color,
            }}
          />
        ))}

        {hovered !== null && (
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
            <p className="font-medium text-ink">Année {points[hovered].year}</p>
            {overlay ? (
              <>
                {tooltipRows(CURRENT_SERIES_LABEL, bands, CHART_NEUTRAL)}
                {tooltipRows(PROPOSAL_SERIES_LABEL, overlay, CHART_ACCENT)}
              </>
            ) : (
              tooltipRows(null, bands, CHART_ACCENT)
            )}
          </div>
        )}
      </div>

      {proposal && (
        <div className="mt-1 flex flex-wrap items-center gap-4 text-[11px] text-slate">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: CHART_NEUTRAL }} />
            {CURRENT_SERIES_LABEL}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: CHART_ACCENT }} />
            {PROPOSAL_SERIES_LABEL}
          </span>
          <span>Bandes : 10e au 90e centile, trait plein : médiane</span>
        </div>
      )}
    </div>
  );
}
