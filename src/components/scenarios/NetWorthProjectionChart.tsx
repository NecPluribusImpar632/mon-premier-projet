import type { ProjectionYearPoint } from "@/lib/scenarios/projection";
import { formatCurrencyCompact } from "@/lib/format/currency";

interface NetWorthProjectionChartProps {
  points: ProjectionYearPoint[];
}

const WIDTH = 600;
const HEIGHT = 220;
const PADDING = { top: 12, right: 12, bottom: 24, left: 64 };
const PLOT_WIDTH = WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;

export function NetWorthProjectionChart({ points }: NetWorthProjectionChartProps) {
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

  const nominalPath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${xForIndex(i).toFixed(1)},${yForValue(p.netWorth).toFixed(1)}`)
    .join(" ");
  const realPath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${xForIndex(i).toFixed(1)},${yForValue(p.realNetWorth).toFixed(1)}`)
    .join(" ");

  const ticks = [minValue, (minValue + maxValue) / 2, maxValue];
  const yearLabelStride = Math.max(1, Math.ceil(points.length / 8));

  return (
    <div className="w-full">
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          className="h-48 w-full"
          style={{ minWidth: 420 }}
        >
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

          <path
            d={nominalPath}
            fill="none"
            stroke="var(--color-emerald)"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={realPath}
            fill="none"
            stroke="var(--color-slate)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Text is rendered as HTML, not inside the SVG: preserveAspectRatio="none" scales
            x/y non-uniformly, which would otherwise squash/stretch every glyph. */}
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
