import { LENGTH_EPSILON, type Vec2 } from "./vec.js";

/** Signed area in square metres. Positive is counter-clockwise when viewed from +Y. */
export function signedArea(points: readonly Vec2[]): number {
  let sum = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    if (!current || !next) {
      continue;
    }
    sum += current.z * next.x - current.x * next.z;
  }
  return sum / 2;
}

export function polygonArea(points: readonly Vec2[]): number {
  return Math.abs(signedArea(points));
}

export function isCounterClockwise(points: readonly Vec2[]): boolean {
  return signedArea(points) > 0;
}

export function polygonCentroid(points: readonly Vec2[]): Vec2 {
  if (points.length === 0) {
    return { x: 0, z: 0 };
  }
  const area = signedArea(points);
  if (Math.abs(area) < LENGTH_EPSILON) {
    const sum = points.reduce((total, point) => ({ x: total.x + point.x, z: total.z + point.z }), {
      x: 0,
      z: 0,
    });
    return { x: sum.x / points.length, z: sum.z / points.length };
  }
  let x = 0;
  let z = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    if (!current || !next) {
      continue;
    }
    const cross = current.z * next.x - current.x * next.z;
    x += (current.x + next.x) * cross;
    z += (current.z + next.z) * cross;
  }
  const factor = 1 / (6 * area);
  return { x: x * factor, z: z * factor };
}

function onSegment(point: Vec2, start: Vec2, end: Vec2): boolean {
  const cross = (end.x - start.x) * (point.z - start.z) - (end.z - start.z) * (point.x - start.x);
  if (Math.abs(cross) > 1e-8) {
    return false;
  }
  const dot = (point.x - start.x) * (end.x - start.x) + (point.z - start.z) * (end.z - start.z);
  if (dot < -1e-8) {
    return false;
  }
  const lengthSquared = (end.x - start.x) ** 2 + (end.z - start.z) ** 2;
  return dot <= lengthSquared + 1e-8;
}

/** Boundary counts as inside. */
export function pointInPolygon(point: Vec2, polygon: readonly Vec2[]): boolean {
  if (polygon.length < 3) {
    return false;
  }
  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];
    if (start && end && onSegment(point, start, end)) {
      return true;
    }
  }

  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const current = polygon[index];
    const prior = polygon[previous];
    if (!current || !prior || current.z === prior.z) {
      continue;
    }
    const crosses =
      current.z > point.z !== prior.z > point.z &&
      point.x < ((prior.x - current.x) * (point.z - current.z)) / (prior.z - current.z) + current.x;
    if (crosses) {
      inside = !inside;
    }
  }
  return inside;
}

export interface SegmentHit {
  point: Vec2;
  /** 0 at the start of the first segment, 1 at its end. */
  t: number;
}

/**
 * Intersection of two finite segments.
 * Collinear overlaps return null. Proper crossings omit shared endpoints.
 */
export function segmentIntersection(
  a: Vec2,
  b: Vec2,
  c: Vec2,
  d: Vec2,
  includeEndpoints = true,
): SegmentHit | null {
  const rx = b.x - a.x;
  const rz = b.z - a.z;
  const sx = d.x - c.x;
  const sz = d.z - c.z;
  const denominator = rx * sz - rz * sx;
  if (Math.abs(denominator) < 1e-12) {
    return null;
  }
  const qx = c.x - a.x;
  const qz = c.z - a.z;
  const t = (qx * sz - qz * sx) / denominator;
  const u = (qx * rz - qz * rx) / denominator;
  const minimum = includeEndpoints ? -1e-9 : 1e-9;
  const maximum = includeEndpoints ? 1 + 1e-9 : 1 - 1e-9;
  if (t < minimum || t > maximum || u < minimum || u > maximum) {
    return null;
  }
  return { point: { x: a.x + t * rx, z: a.z + t * rz }, t };
}

function edgesShareVertex(first: number, second: number, count: number): boolean {
  if (Math.abs(first - second) <= 1) {
    return true;
  }
  return (first === 0 && second === count - 1) || (second === 0 && first === count - 1);
}

function segmentsTouch(a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean {
  if (segmentIntersection(a, b, c, d, false)) {
    return true;
  }
  return onSegment(a, c, d) || onSegment(b, c, d) || onSegment(c, a, b) || onSegment(d, a, b);
}

/** True when non-adjacent edges cross, overlap, or meet. Adjacent corners of a simple ring do not count. */
export function polygonSelfIntersects(points: readonly Vec2[]): boolean {
  const count = points.length;
  if (count < 4) {
    return false;
  }
  for (let first = 0; first < count; first += 1) {
    for (let second = first + 1; second < count; second += 1) {
      if (edgesShareVertex(first, second, count)) {
        continue;
      }
      const a = points[first];
      const b = points[(first + 1) % count];
      const c = points[second];
      const d = points[(second + 1) % count];
      if (!a || !b || !c || !d) {
        continue;
      }
      if (segmentsTouch(a, b, c, d)) {
        return true;
      }
    }
  }
  return false;
}
