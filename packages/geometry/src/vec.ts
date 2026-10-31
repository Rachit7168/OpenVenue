/** Plan point. x is world X, z is world Z. Y is up and is not stored here. */
export interface Vec2 {
  x: number;
  z: number;
}

/** World vector in metres, or Euler angles in radians when used as a rotation. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export const LENGTH_EPSILON = 1e-9;

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(b.x - a.x, b.z - a.z);
}

export function nearlyEqual(a: number, b: number, epsilon = LENGTH_EPSILON): boolean {
  return Math.abs(a - b) <= epsilon;
}

/** Decimal places needed to write `precision` without rounding a valid multiple. */
function decimalPlaces(precision: number): number {
  const [mantissa = "0", exponentText = "0"] = precision.toExponential().split("e");
  const fraction = mantissa.split(".")[1];
  const places = (fraction ? fraction.length : 0) - Number(exponentText);
  return Math.max(0, Math.min(20, places));
}

/** Round to the nearest multiple of `precision` (0.01 m by default). */
export function quantize(value: number, precision = 0.01): number {
  if (!Number.isFinite(value) || !Number.isFinite(precision) || !(precision > 0)) {
    throw new Error("value and precision must be finite, and precision must be positive");
  }
  const quantized = Math.round(value / precision) * precision;
  const parsed = Number(quantized.toFixed(decimalPlaces(precision)));
  return Object.is(parsed, -0) ? 0 : parsed;
}

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/** Display helper. Storage and commands stay in radians. */
export function formatDegrees(radians: number, fractionDigits = 1): string {
  return `${radiansToDegrees(radians).toFixed(fractionDigits)}°`;
}

/** Plan (x, z) plus a floor elevation becomes world (x, y, z). */
export function planToWorld(point: Vec2, elevation = 0): Vec3 {
  return { x: point.x, y: elevation, z: point.z };
}

export function worldToPlan(point: Vec3): Vec2 {
  return { x: point.x, z: point.z };
}
