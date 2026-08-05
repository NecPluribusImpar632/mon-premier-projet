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
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          className="h-48 w-full"
          style={{ minWidth: 420 }}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PADDING.left}
                y1={yForValue(tick)}
                x2={WIDTH - PADDING.right}
                y2={yForValue(tick)}
                stroke="var(--color-line)"
              />
              <text
                x={PADDING.left - 8}
                y={yForValue(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={9}
                fill="var(--color-slate)"
              >
                {formatCurrencyCompact(tick)}
              </text>
            </g>
          ))}

          <path d={nominalPath} fill="none" stroke="var(--color-emerald)" strokeWidth={2} />
          <path
            d={realPath}
            fill="none"
            stroke="var(--color-slate)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />

          {points.map((p, i) =>
            i % yearLabelStride === 0 || i === points.length - 1 ? (
              <text
                key={p.year}
                x={xForIndex(i)}
                y={HEIGHT - 6}
                textAnchor="middle"
                fontSize={9}
                fill="var(--color-slate)"
              >
                A{p.year}
              </text>
            ) : null
          )}
        </svg>
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
