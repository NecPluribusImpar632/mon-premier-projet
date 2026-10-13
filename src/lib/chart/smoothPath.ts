export interface Point {
  x: number;
  y: number;
}

/** Catmull-Rom-to-Bezier smoothing (uniform, 1/6 tension) — turns a polyline
 * into a curve without overshoot on mostly-monotonic series, and reads far
 * less "spreadsheet" than straight segments. Shared by every SVG line/fan
 * chart in the app. */
export function smoothPath(pts: Point[]): string {
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
export function smoothPathBody(pts: Point[]): string {
  return smoothPath(pts).replace(/^M[-\d.]+,[-\d.]+\s*/, "");
}
