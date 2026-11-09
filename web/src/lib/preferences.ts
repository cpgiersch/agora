/**
 * Pure model for the exploratory shopping preference explorer.
 * Two independent bounded axes, each -100..100:
 *  x: negative = Price (affordability), positive = Luxury
 *  y: negative = Durability, positive = Performance (top)
 * These are exploratory pairings, not opposed traits or verified product attributes.
 */
export type PreferencePoint = { x: number; y: number };

export const AXIS_MIN = -100;
export const AXIS_MAX = 100;

export const BALANCED_PREFERENCES: PreferencePoint = Object.freeze({ x: 0, y: 0 }) as PreferencePoint;

export function clampAxis(value: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  const r = Math.round(Math.min(AXIS_MAX, Math.max(AXIS_MIN, value)));
  return r === 0 ? 0 : r; // normalize -0
}

export function pointFromCoordinates(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number }
): PreferencePoint {
  const fx = rect.width > 0 && Number.isFinite(rect.width) ? (clientX - rect.left) / rect.width : 0.5;
  const fy = rect.height > 0 && Number.isFinite(rect.height) ? (clientY - rect.top) / rect.height : 0.5;
  return {
    x: clampAxis(fx * 200 - 100),
    y: clampAxis((1 - fy) * 200 - 100),
  };
}

function strength(v: number): string | null {
  const a = Math.abs(v);
  if (a < 15) return null;
  if (a < 45) return "slightly";
  if (a < 80) return "moderately";
  return "strongly";
}

function axisPhrase(v: number, neg: string, pos: string): string | null {
  const s = strength(v);
  if (!s) return null;
  return `${s} toward ${v < 0 ? neg : pos}`;
}

export function describePreferences(point: PreferencePoint): string {
  const x = clampAxis(point.x);
  const y = clampAxis(point.y);
  const px = axisPhrase(x, "Price (affordability)", "Luxury");
  const py = axisPhrase(y, "Durability", "Performance");
  if (!px && !py) return "Balanced: no lean on either axis.";
  const parts: string[] = [];
  parts.push(px ? `Leaning ${px}` : "Balanced between Price and Luxury");
  parts.push(py ? (px ? `and ${py}` : `leaning ${py}`) : "balanced between Durability and Performance");
  return `${parts.join(px && py ? " " : ", ")}.`;
}

export const PREFERENCE_PRESETS: ReadonlyArray<{ label: string; point: PreferencePoint }> = [
  { label: "Balanced", point: { x: 0, y: 0 } },
  { label: "Affordable and long-lasting", point: { x: -60, y: -60 } },
  { label: "Affordable performance", point: { x: -50, y: 60 } },
  { label: "Premium performance", point: { x: 65, y: 65 } },
  { label: "Built to last, finer finish", point: { x: 50, y: -55 } },
];
