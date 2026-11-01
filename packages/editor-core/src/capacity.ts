import { pointInPolygon, polygonArea, type Vec2 } from "@openvenue/geometry";
import type { SceneObject, VenueDocument } from "@openvenue/scene-schema";

export const CAPACITY_NOTE = "Planning estimate, not an approved occupancy figure.";
export const DEFAULT_METRES_PER_PERSON = 1.5;

export interface CapacityReport {
  total: number;
  occupied: number;
  free: number;
  seating: number;
  exhibition: number;
  stage: number;
  circulation: number;
  seats: number;
  metresPerPerson: number;
  estimate: number;
}

interface Footprint {
  object: SceneObject;
  area: number;
  corners: Vec2[];
  center: Vec2;
  base: number;
  top: number;
}

function shown(entity: object): boolean {
  return (entity as { visible?: unknown }).visible !== false;
}

function scaleOf(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value) || value === 0) {
    return 1;
  }
  return Math.abs(value);
}

function footprintOf(object: SceneObject): Footprint {
  const width = (object.dimensions?.width ?? 0.6) * scaleOf(object.transform.scale?.x);
  const depth = (object.dimensions?.depth ?? 0.6) * scaleOf(object.transform.scale?.z);
  const height = (object.dimensions?.height ?? 0.75) * scaleOf(object.transform.scale?.y);
  const yaw = object.transform.rotation.y;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const center = { x: object.transform.position.x, z: object.transform.position.z };
  const local: Vec2[] = [
    { x: -width / 2, z: -depth / 2 },
    { x: width / 2, z: -depth / 2 },
    { x: width / 2, z: depth / 2 },
    { x: -width / 2, z: depth / 2 },
  ];
  return {
    object,
    area: Math.abs(width * depth),
    center,
    base: object.transform.position.y,
    top: object.transform.position.y + height,
    corners: local.map((point) => ({
      x: center.x + point.x * cos + point.z * sin,
      z: center.z - point.x * sin + point.z * cos,
    })),
  };
}

function restsOn(above: Footprint, below: Footprint): boolean {
  return above.base >= below.top - 0.02 && pointInPolygon(above.center, below.corners);
}

/** Areas and a planning headcount for the whole venue. Not an approved occupancy figure. */
export function capacityOf(
  document: VenueDocument,
  metresPerPerson = DEFAULT_METRES_PER_PERSON,
): CapacityReport {
  let total = 0;
  let seating = 0;
  let exhibition = 0;
  let stage = 0;
  let other = 0;
  let seats = 0;

  for (const floor of document.venue.floors) {
    for (const room of floor.rooms) {
      if (shown(room)) {
        total += polygonArea(room.boundary);
      }
    }
    const items = floor.objects.filter(shown).map(footprintOf);
    for (const item of items) {
      if (items.some((otherItem) => otherItem !== item && restsOn(item, otherItem))) {
        continue;
      }
      const type = item.object.type;
      if (type === "chair") {
        seating += item.area;
        seats += 1;
      } else if (type === "table") {
        seating += item.area;
      } else if (type === "booth") {
        exhibition += item.area;
      } else if (type === "stage" || type === "podium") {
        stage += item.area;
      } else {
        other += item.area;
      }
    }
  }

  const occupied = seating + exhibition + stage + other;
  const free = Math.max(0, total - occupied);
  const density = Number.isFinite(metresPerPerson) && metresPerPerson > 0 ? metresPerPerson : 0;
  return {
    total,
    occupied,
    free,
    seating,
    exhibition,
    stage,
    circulation: free,
    seats,
    metresPerPerson: density,
    estimate: density > 0 ? Math.floor(total / density) : 0,
  };
}
