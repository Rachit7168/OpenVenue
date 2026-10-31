import { openingSpan } from "@openvenue/geometry";
import { footprintCorners, type PlanPoint } from "@openvenue/renderer-2d";
import type { VenueDocument } from "@openvenue/scene-schema";

export interface PlanPolygon {
  id: string;
  name: string;
  points: PlanPoint[];
}

export interface PlanWall {
  id: string;
  start: PlanPoint;
  end: PlanPoint;
  thickness: number;
}

export interface PlanOpening {
  id: string;
  kind: string;
  start: PlanPoint;
  end: PlanPoint;
}

export interface PlanSpawn {
  id: string;
  name: string;
  role: string;
  point: PlanPoint;
  rotationY: number;
}

export interface PlanFixture {
  id: string;
  name: string;
  type: string;
  center: PlanPoint;
  width: number;
  depth: number;
  yaw: number;
  points: PlanPoint[];
}

export interface PlanScene {
  rooms: PlanPolygon[];
  zones: PlanPolygon[];
  walls: PlanWall[];
  openings: PlanOpening[];
  objects: PlanFixture[];
  spawns: PlanSpawn[];
  points: PlanPoint[];
}

function horizontalScale(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value) || value === 0) {
    return 1;
  }
  return Math.abs(value);
}

/** Drawable plan for the first floor, plus spawns on that floor. */
export function planScene(document: VenueDocument, floorIndex = 0): PlanScene {
  const floor = document.venue.floors[floorIndex];
  const rooms: PlanPolygon[] = [];
  const zones: PlanPolygon[] = [];
  const walls: PlanWall[] = [];
  const openings: PlanOpening[] = [];
  const objects: PlanFixture[] = [];
  const spawns: PlanSpawn[] = [];
  const points: PlanPoint[] = [];

  if (!floor) {
    return { rooms, zones, walls, openings, objects, spawns, points };
  }

  for (const room of floor.rooms) {
    const polygon = room.boundary.map((point) => ({ x: point.x, z: point.z }));
    rooms.push({ id: room.id, name: room.name, points: polygon });
    points.push(...polygon);
  }
  for (const zone of floor.zones) {
    const polygon = zone.boundary.map((point) => ({ x: point.x, z: point.z }));
    zones.push({ id: zone.id, name: zone.name, points: polygon });
    points.push(...polygon);
  }
  for (const wall of floor.walls) {
    const start = { x: wall.start.x, z: wall.start.z };
    const end = { x: wall.end.x, z: wall.end.z };
    walls.push({ id: wall.id, start, end, thickness: wall.thickness });
    points.push(start, end);
    for (const opening of wall.openings ?? []) {
      const span = openingSpan({ start, end }, opening);
      if (!span.valid) {
        continue;
      }
      openings.push({ id: opening.id, kind: opening.kind, start: span.start, end: span.end });
    }
  }
  for (const object of floor.objects) {
    const width = (object.dimensions?.width ?? 0.6) * horizontalScale(object.transform.scale?.x);
    const depth = (object.dimensions?.depth ?? 0.6) * horizontalScale(object.transform.scale?.z);
    const center = { x: object.transform.position.x, z: object.transform.position.z };
    const yaw = object.transform.rotation.y;
    const corners = footprintCorners(center, width, depth, yaw);
    objects.push({
      id: object.id,
      name: object.name,
      type: object.type,
      center,
      width,
      depth,
      yaw,
      points: corners,
    });
    points.push(...corners);
  }
  for (const spawn of document.venue.spawnPoints) {
    if (spawn.floorId !== floor.id) {
      continue;
    }
    const point = { x: spawn.position.x, z: spawn.position.z };
    spawns.push({
      id: spawn.id,
      name: spawn.name,
      role: spawn.role,
      point,
      rotationY: spawn.rotationY,
    });
    points.push(point);
  }

  return { rooms, zones, walls, openings, objects, spawns, points };
}
