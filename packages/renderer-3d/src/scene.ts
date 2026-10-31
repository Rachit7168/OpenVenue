import type { Opening, SceneObject, VenueDocument, Wall } from "@openvenue/scene-schema";
import * as THREE from "three";

const floorMaterial = new THREE.MeshStandardMaterial({ color: "#166534", roughness: 0.95 });
const ceilingMaterial = new THREE.MeshStandardMaterial({
  color: "#27272a",
  transparent: true,
  opacity: 0.22,
  roughness: 1,
  side: THREE.DoubleSide,
});
const wallMaterial = new THREE.MeshStandardMaterial({ color: "#f5f5f4", roughness: 0.72 });
const objectColors: Record<string, string> = {
  table: "#d4b483",
  chair: "#e7e5e4",
  stage: "#6d28d9",
  booth: "#0f766e",
  screen: "#0f172a",
  podium: "#57534e",
  sign: "#d97706",
};

function shown(entity: object): boolean {
  return (entity as { visible?: unknown }).visible !== false;
}

function scaleOf(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value) || value === 0) {
    return 1;
  }
  return Math.abs(value);
}

function solidSpans(length: number, openings: readonly Opening[]): { from: number; to: number }[] {
  const cuts = openings
    .map((opening) => ({
      from: Math.max(0, opening.offset),
      to: Math.min(length, opening.offset + opening.width),
    }))
    .filter((opening) => opening.to > opening.from)
    .sort((a, b) => a.from - b.from);
  const spans: { from: number; to: number }[] = [];
  let cursor = 0;
  for (const cut of cuts) {
    if (cut.from > cursor + 1e-4) {
      spans.push({ from: cursor, to: cut.from });
    }
    cursor = Math.max(cursor, cut.to);
  }
  if (cursor < length - 1e-4) {
    spans.push({ from: cursor, to: length });
  }
  return spans;
}

function addSpan(
  group: THREE.Group,
  wall: Wall,
  direction: { x: number; z: number },
  yaw: number,
  from: number,
  to: number,
  bottom: number,
  top: number,
): void {
  const span = to - from;
  const height = top - bottom;
  if (span < 1e-3 || height < 1e-3) {
    return;
  }
  const along = (from + to) / 2;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(span, height, wall.thickness), wallMaterial);
  mesh.position.set(
    wall.start.x + direction.x * along,
    bottom + height / 2,
    wall.start.z + direction.z * along,
  );
  mesh.rotation.y = yaw;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
}

function clippedSpan(
  length: number,
  offset: number,
  width: number,
): { from: number; to: number } | null {
  const from = Math.max(0, offset);
  const to = Math.min(length, offset + width);
  if (to - from < 1e-3) {
    return null;
  }
  return { from, to };
}

function addWall(group: THREE.Group, wall: Wall): void {
  const dx = wall.end.x - wall.start.x;
  const dz = wall.end.z - wall.start.z;
  const length = Math.hypot(dx, dz);
  if (length < 1e-6) {
    return;
  }
  const direction = { x: dx / length, z: dz / length };
  const yaw = Math.atan2(-dz, dx);
  const openings = wall.openings ?? [];
  for (const span of solidSpans(length, openings)) {
    addSpan(group, wall, direction, yaw, span.from, span.to, 0, wall.height);
  }
  for (const opening of openings) {
    const span = clippedSpan(length, opening.offset, opening.width);
    if (!span) {
      continue;
    }
    const sill = Math.min(wall.height, Math.max(0, opening.sill ?? 0));
    const head = Math.min(wall.height, sill + opening.height);
    if (sill > 1e-3) {
      addSpan(group, wall, direction, yaw, span.from, span.to, 0, sill);
    }
    if (head < wall.height - 1e-3) {
      addSpan(group, wall, direction, yaw, span.from, span.to, head, wall.height);
    }
  }
}

/** Move an existing furniture box to match the document. Keeps the mesh when the size is unchanged. */
export function placeObjectMesh(mesh: THREE.Mesh, object: SceneObject): void {
  const width = (object.dimensions?.width ?? 0.6) * scaleOf(object.transform.scale?.x);
  const height = (object.dimensions?.height ?? 0.75) * scaleOf(object.transform.scale?.y);
  const depth = (object.dimensions?.depth ?? 0.6) * scaleOf(object.transform.scale?.z);
  mesh.position.set(
    object.transform.position.x,
    object.transform.position.y + height / 2,
    object.transform.position.z,
  );
  mesh.rotation.set(
    object.transform.rotation.x,
    object.transform.rotation.y,
    object.transform.rotation.z,
  );
  mesh.scale.set(1, 1, 1);
  mesh.userData.entityId = object.id;
  mesh.userData.locked = (object as { locked?: unknown }).locked === true;
  mesh.userData.base = { width, height, depth };
  const geometry = mesh.geometry;
  const sameSize =
    geometry instanceof THREE.BoxGeometry &&
    geometry.parameters.width === width &&
    geometry.parameters.height === height &&
    geometry.parameters.depth === depth;
  if (!sameSize) {
    geometry.dispose();
    mesh.geometry = new THREE.BoxGeometry(width, height, depth);
  }
}

/** Meshes for the ground floor: floors, ceilings, walls with openings, and object boxes. */
export function buildVenueGroup(document: VenueDocument): THREE.Group {
  const group = new THREE.Group();
  group.name = "venue";
  const floor = document.venue.floors[0];
  if (!floor) {
    return group;
  }

  for (const room of floor.rooms) {
    if (!shown(room) || room.boundary.length < 3) {
      continue;
    }
    const shape = new THREE.Shape();
    room.boundary.forEach((point, index) => {
      const x = point.x;
      const y = -point.z;
      if (index === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    });
    const footprint = new THREE.ShapeGeometry(shape);
    const slab = new THREE.Mesh(footprint, floorMaterial);
    slab.rotation.x = -Math.PI / 2;
    slab.position.y = 0.02;
    slab.receiveShadow = true;
    group.add(slab);

    const ceiling = new THREE.Mesh(footprint.clone(), ceilingMaterial);
    ceiling.rotation.x = -Math.PI / 2;
    ceiling.position.y = Math.max(floor.height - 0.05, 0.2);
    group.add(ceiling);
  }

  for (const wall of floor.walls) {
    if (shown(wall)) {
      addWall(group, wall);
    }
  }

  for (const object of floor.objects) {
    if (!shown(object)) {
      continue;
    }
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: objectColors[object.type] ?? "#a8a29e" }),
    );
    placeObjectMesh(mesh, object);
    mesh.castShadow = true;
    mesh.userData.ownMaterial = true;
    group.add(mesh);
  }

  for (const spawn of document.venue.spawnPoints) {
    if (!shown(spawn) || spawn.floorId !== floor.id) {
      continue;
    }
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 16, 12),
      new THREE.MeshStandardMaterial({ color: spawn.role === "exit" ? "#fb7185" : "#38bdf8" }),
    );
    marker.position.set(spawn.position.x, spawn.position.y + 0.22, spawn.position.z);
    marker.userData.ownMaterial = true;
    group.add(marker);
  }

  return group;
}
