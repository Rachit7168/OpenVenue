export interface PlanPoint {
  x: number;
  z: number;
}

/** Screen mapping for a top-down plan. +X is right, +Z is up. */
export interface Viewport {
  /** Pixels per metre. */
  scale: number;
  /** Screen pixel of world (0, 0). */
  originX: number;
  originY: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface ScreenLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  major: boolean;
}

const MIN_SCALE = 4;
const MAX_SCALE = 400;

export function defaultViewport(width: number, height: number): Viewport {
  return { scale: 40, originX: width / 2, originY: height / 2 };
}

export function worldToScreen(viewport: Viewport, point: PlanPoint): ScreenPoint {
  return {
    x: viewport.originX + point.x * viewport.scale,
    y: viewport.originY - point.z * viewport.scale,
  };
}

export function screenToWorld(viewport: Viewport, point: ScreenPoint): PlanPoint {
  return {
    x: (point.x - viewport.originX) / viewport.scale,
    z: (viewport.originY - point.y) / viewport.scale,
  };
}

export function panViewport(viewport: Viewport, dx: number, dy: number): Viewport {
  return { ...viewport, originX: viewport.originX + dx, originY: viewport.originY + dy };
}

/** Zoom around a screen point so that point stays on the same world coordinate. */
export function zoomViewport(viewport: Viewport, anchor: ScreenPoint, factor: number): Viewport {
  const world = screenToWorld(viewport, anchor);
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, viewport.scale * factor));
  return {
    scale,
    originX: anchor.x - world.x * scale,
    originY: anchor.y + world.z * scale,
  };
}

export function fitViewport(
  points: readonly PlanPoint[],
  width: number,
  height: number,
  padding = 24,
): Viewport {
  if (points.length === 0 || width <= 0 || height <= 0) {
    return defaultViewport(Math.max(width, 0), Math.max(height, 0));
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minZ = Math.min(minZ, point.z);
    maxZ = Math.max(maxZ, point.z);
  }
  const spanX = Math.max(maxX - minX, 1);
  const spanZ = Math.max(maxZ - minZ, 1);
  const availableW = Math.max(width - padding * 2, 1);
  const availableH = Math.max(height - padding * 2, 1);
  const scale = Math.min(
    MAX_SCALE,
    Math.max(MIN_SCALE, Math.min(availableW / spanX, availableH / spanZ)),
  );
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  return {
    scale,
    originX: width / 2 - centerX * scale,
    originY: height / 2 + centerZ * scale,
  };
}

export function pointsToPath(viewport: Viewport, points: readonly PlanPoint[]): string {
  return points
    .map((point, index) => {
      const screen = worldToScreen(viewport, point);
      const command = index === 0 ? "M" : "L";
      return `${command}${screen.x.toFixed(2)} ${screen.y.toFixed(2)}`;
    })
    .join(" ");
}

/** Grid lines currently on screen. The step grows when the view would draw too many lines. */
export function gridLines(
  viewport: Viewport,
  width: number,
  height: number,
  step = 0.5,
): { step: number; lines: ScreenLine[] } {
  const topLeft = screenToWorld(viewport, { x: 0, y: 0 });
  const bottomRight = screenToWorld(viewport, { x: width, y: height });
  let minX = Math.min(topLeft.x, bottomRight.x);
  let maxX = Math.max(topLeft.x, bottomRight.x);
  let minZ = Math.min(topLeft.z, bottomRight.z);
  let maxZ = Math.max(topLeft.z, bottomRight.z);
  let size = step;
  while ((maxX - minX) / size > 80 || (maxZ - minZ) / size > 80) {
    size *= 2;
  }
  minX -= size;
  maxX += size;
  minZ -= size;
  maxZ += size;
  const lines: ScreenLine[] = [];
  const major = size * 4;
  for (let x = Math.ceil(minX / size) * size; x <= maxX; x += size) {
    const start = worldToScreen(viewport, { x, z: minZ });
    const end = worldToScreen(viewport, { x, z: maxZ });
    lines.push({
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
      major: Math.abs(x / major - Math.round(x / major)) < 1e-6,
    });
  }
  for (let z = Math.ceil(minZ / size) * size; z <= maxZ; z += size) {
    const start = worldToScreen(viewport, { x: minX, z });
    const end = worldToScreen(viewport, { x: maxX, z });
    lines.push({
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
      major: Math.abs(z / major - Math.round(z / major)) < 1e-6,
    });
  }
  return { step: size, lines };
}

/** Rectangle corners around a plan center. Yaw is radians, right-handed about +Y. */
export function footprintCorners(
  center: PlanPoint,
  width: number,
  depth: number,
  yaw = 0,
): [PlanPoint, PlanPoint, PlanPoint, PlanPoint] {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const local: PlanPoint[] = [
    { x: -width / 2, z: -depth / 2 },
    { x: width / 2, z: -depth / 2 },
    { x: width / 2, z: depth / 2 },
    { x: -width / 2, z: depth / 2 },
  ];
  return local.map((point) => ({
    x: center.x + point.x * cos + point.z * sin,
    z: center.z - point.x * sin + point.z * cos,
  })) as [PlanPoint, PlanPoint, PlanPoint, PlanPoint];
}
