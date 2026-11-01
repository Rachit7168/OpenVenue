import type { Opening, SceneObject, VenueDocument, Wall } from "@openvenue/scene-schema";
import * as THREE from "three";
import { modelTemplate } from "./glb.js";
import { materialPreset } from "./materials.js";

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

function objectSize(object: SceneObject): { width: number; height: number; depth: number } {
  return {
    width: (object.dimensions?.width ?? 0.6) * scaleOf(object.transform.scale?.x),
    height: (object.dimensions?.height ?? 0.75) * scaleOf(object.transform.scale?.y),
    depth: (object.dimensions?.depth ?? 0.6) * scaleOf(object.transform.scale?.z),
  };
}

function sharedSurface(type: string): boolean {
  return (
    type === "table" ||
    type === "chair" ||
    type === "podium" ||
    type === "screen" ||
    type === "generic" ||
    type === "custom"
  );
}

function furnitureMaterial(type: string): THREE.Material {
  if (type === "screen") {
    return materialPreset("glass");
  }
  if (type === "generic" || type === "custom") {
    return materialPreset("concrete");
  }
  if (type === "table" || type === "chair" || type === "podium") {
    return materialPreset("wood");
  }
  return new THREE.MeshStandardMaterial({
    color: objectColors[type] ?? "#a8a29e",
    roughness: 0.7,
  });
}

const chairDummy = new THREE.Object3D();

export interface ChairSlot {
  mesh: THREE.InstancedMesh;
  index: number;
  locked: boolean;
}

/** One slot per visible chair, grouped inside instanced batches. */
export function indexChairs(group: THREE.Object3D): Map<string, ChairSlot> {
  const map = new Map<string, ChairSlot>();
  group.traverse((child) => {
    if (!(child instanceof THREE.InstancedMesh) || !Array.isArray(child.userData.entityIds)) {
      return;
    }
    const locks = child.userData.lockedFlags;
    child.userData.entityIds.forEach((id: unknown, index: number) => {
      if (typeof id !== "string" || id.length === 0) {
        return;
      }
      map.set(id, {
        mesh: child,
        index,
        locked: Array.isArray(locks) && locks[index] === true,
      });
    });
  });
  return map;
}

/** Write one chair's pose. False when the chair no longer matches this batch's box. */
export function writeChairMatrix(
  mesh: THREE.InstancedMesh,
  index: number,
  object: SceneObject,
): boolean {
  const size = objectSize(object);
  const geometry = mesh.geometry;
  if (!(geometry instanceof THREE.BoxGeometry) || index < 0 || index >= mesh.count) {
    return false;
  }
  const { width, height, depth } = geometry.parameters;
  if (width !== size.width || height !== size.height || depth !== size.depth) {
    return false;
  }
  chairDummy.position.set(
    object.transform.position.x,
    object.transform.position.y + size.height / 2,
    object.transform.position.z,
  );
  chairDummy.rotation.set(
    object.transform.rotation.x,
    object.transform.rotation.y,
    object.transform.rotation.z,
  );
  chairDummy.scale.set(1, 1, 1);
  chairDummy.updateMatrix();
  mesh.setMatrixAt(index, chairDummy.matrix);
  mesh.instanceMatrix.needsUpdate = true;
  return true;
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
  material: THREE.Material = wallMaterial,
): void {
  const span = to - from;
  const height = top - bottom;
  if (span < 1e-3 || height < 1e-3) {
    return;
  }
  const along = (from + to) / 2;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(span, height, wall.thickness), material);
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

function addWall(
  group: THREE.Group,
  wall: Wall,
  height = wall.height,
  bottom = 0,
  material: THREE.Material = wallMaterial,
): void {
  const dx = wall.end.x - wall.start.x;
  const dz = wall.end.z - wall.start.z;
  const length = Math.hypot(dx, dz);
  if (length < 1e-6 || height < 1e-3) {
    return;
  }
  const direction = { x: dx / length, z: dz / length };
  const yaw = Math.atan2(-dz, dx);
  const openings = wall.openings ?? [];
  const top = bottom + height;
  for (const span of solidSpans(length, openings)) {
    addSpan(group, wall, direction, yaw, span.from, span.to, bottom, top, material);
  }
  for (const opening of openings) {
    const span = clippedSpan(length, opening.offset, opening.width);
    if (!span) {
      continue;
    }
    const sill = Math.min(top, bottom + Math.max(0, opening.sill ?? 0));
    const head = Math.min(top, sill + opening.height);
    if (sill > bottom + 1e-3) {
      addSpan(group, wall, direction, yaw, span.from, span.to, bottom, sill, material);
    }
    if (head < top - 1e-3) {
      addSpan(group, wall, direction, yaw, span.from, span.to, head, top, material);
    }
  }
}

/** Move a loaded GLB. Scale maps the model's own size onto the object's dimensions. */
export function placeModel(node: THREE.Object3D, object: SceneObject): void {
  const size = objectSize(object);
  const base = node.userData.base as { width?: number; height?: number; depth?: number };
  const width = typeof base.width === "number" && base.width > 0 ? base.width : size.width;
  const height = typeof base.height === "number" && base.height > 0 ? base.height : size.height;
  const depth = typeof base.depth === "number" && base.depth > 0 ? base.depth : size.depth;
  node.scale.set(size.width / width, size.height / height, size.depth / depth);
  node.position.set(
    object.transform.position.x,
    object.transform.position.y + size.height / 2,
    object.transform.position.z,
  );
  node.rotation.set(
    object.transform.rotation.x,
    object.transform.rotation.y,
    object.transform.rotation.z,
  );
  node.userData.entityId = object.id;
  node.userData.locked = (object as { locked?: unknown }).locked === true;
  node.userData.model = true;
  node.userData.base = { width, height, depth };
}

function fittedModel(object: SceneObject): THREE.Object3D | null {
  const template = modelTemplate(object.assetId);
  if (!template) {
    return null;
  }
  const clone = template.clone(true);
  placeModel(clone, object);
  return clone;
}

/** Move an existing furniture box to match the document. Keeps the mesh when the size is unchanged. */
export function placeObjectMesh(mesh: THREE.Mesh, object: SceneObject): void {
  const { width, height, depth } = objectSize(object);
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

function addChairs(
  group: THREE.Group,
  chairs: readonly SceneObject[],
  material: THREE.Material = materialPreset("wood"),
): void {
  const batches = new Map<string, SceneObject[]>();
  for (const chair of chairs) {
    const size = objectSize(chair);
    const key = `${size.width}\0${size.height}\0${size.depth}`;
    const list = batches.get(key);
    if (list) {
      list.push(chair);
    } else {
      batches.set(key, [chair]);
    }
  }
  for (const list of batches.values()) {
    const first = list[0];
    if (!first) {
      continue;
    }
    const size = objectSize(first);
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(size.width, size.height, size.depth),
      material,
      list.length,
    );
    mesh.userData.entityIds = list.map((chair) => chair.id);
    mesh.userData.lockedFlags = list.map(
      (chair) => (chair as { locked?: unknown }).locked === true,
    );
    list.forEach((chair, index) => {
      writeChairMatrix(mesh, index, chair);
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
}

/** Cutaway walls stay short so the rooms read as a plan. */
export const MAP_WALL_HEIGHT = 0.45;

/** Extra metres between plates when the map shows every floor at once. */
export const MAP_FLOOR_GAP = 8;

const MAP_SLAB_DEPTH = 0.12;

const mapWallMaterial = new THREE.MeshStandardMaterial({ color: "#d9d9e6", roughness: 1 });
const mapRoomColors = ["#93c5fd", "#fcd34d", "#86efac", "#f9a8d4", "#c4b5fd", "#fdba74", "#67e8f9"];
const mapFurnitureMaterials = new Map<string, THREE.MeshStandardMaterial>();

export interface BuildVenueOptions {
  /** Hall keeps ceilings and full-height walls. Map is a cutaway dollhouse. */
  style?: "hall" | "map";
  /** Draw this floor only. Omit it to draw every floor. */
  floorId?: string | null;
}

function mapFurnitureMaterial(type: string): THREE.Material {
  const color = objectColors[type] ?? "#a8a29e";
  const existing = mapFurnitureMaterials.get(color);
  if (existing) {
    return existing;
  }
  const material = new THREE.MeshStandardMaterial({ color, roughness: 1 });
  mapFurnitureMaterials.set(color, material);
  return material;
}

function floorsToDraw(document: VenueDocument, options: BuildVenueOptions) {
  const ordered = [...document.venue.floors].sort(
    (left, right) => left.level - right.level || left.elevation - right.elevation,
  );
  if (!options.floorId) {
    return ordered;
  }
  const chosen = ordered.filter((floor) => floor.id === options.floorId);
  return chosen.length > 0 ? chosen : ordered;
}

function addFloor(
  venue: THREE.Group,
  document: VenueDocument,
  floor: (typeof document.venue.floors)[number],
  originY: number,
  style: "hall" | "map",
): void {
  const group = new THREE.Group();
  group.name = `floor:${floor.id}`;
  group.userData.floorId = floor.id;
  group.position.y = originY;
  const map = style === "map";
  const wallBottom = map ? MAP_SLAB_DEPTH : 0;

  floor.rooms.forEach((room, index) => {
    if (!shown(room) || room.boundary.length < 3) {
      return;
    }
    const shape = new THREE.Shape();
    room.boundary.forEach((point, pointIndex) => {
      const x = point.x;
      const y = -point.z;
      if (pointIndex === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    });
    const material = map
      ? new THREE.MeshStandardMaterial({
          color: mapRoomColors[index % mapRoomColors.length],
          roughness: 1,
        })
      : materialPreset(room.floorMaterial);
    const slab = map
      ? new THREE.Mesh(
          new THREE.ExtrudeGeometry(shape, { depth: MAP_SLAB_DEPTH, bevelEnabled: false }),
          material,
        )
      : new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
    slab.rotation.x = -Math.PI / 2;
    slab.position.y = map ? 0 : 0.02;
    slab.receiveShadow = !map;
    if (map) {
      slab.userData.entityId = room.id;
    }
    slab.userData.ownMaterial = map;
    group.add(slab);

    if (!map) {
      const ceiling = new THREE.Mesh(slab.geometry.clone(), ceilingMaterial);
      ceiling.rotation.x = -Math.PI / 2;
      ceiling.position.y = Math.max(floor.height - 0.05, 0.2);
      group.add(ceiling);
    }
  });

  for (const wall of floor.walls) {
    if (!shown(wall)) {
      continue;
    }
    if (map) {
      addWall(group, wall, Math.min(wall.height, MAP_WALL_HEIGHT), wallBottom, mapWallMaterial);
    } else {
      addWall(group, wall);
    }
  }

  const chairs: SceneObject[] = [];
  for (const object of floor.objects) {
    if (!shown(object)) {
      continue;
    }
    if (object.type === "chair" && !modelTemplate(object.assetId)) {
      chairs.push(object);
      continue;
    }
    const model = fittedModel(object);
    if (model) {
      group.add(model);
      continue;
    }
    const material = map ? mapFurnitureMaterial(object.type) : furnitureMaterial(object.type);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
    placeObjectMesh(mesh, object);
    mesh.castShadow = !map;
    mesh.receiveShadow = !map;
    mesh.userData.ownMaterial = !map && !sharedSurface(object.type);
    group.add(mesh);
  }
  addChairs(group, chairs, map ? mapFurnitureMaterial("chair") : materialPreset("wood"));

  if (!map) {
    for (const spawn of document.venue.spawnPoints) {
      if (!shown(spawn) || spawn.floorId !== floor.id) {
        continue;
      }
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 16, 12),
        new THREE.MeshStandardMaterial({ color: spawn.role === "exit" ? "#fb7185" : "#38bdf8" }),
      );
      marker.position.set(
        spawn.position.x,
        spawn.position.y - floor.elevation + 0.22,
        spawn.position.z,
      );
      marker.userData.ownMaterial = true;
      group.add(marker);
    }
  }

  venue.add(group);
}

/** Meshes for every floor. Map style is a cutaway with an exploded stack. */
export function buildVenueGroup(
  document: VenueDocument,
  options: BuildVenueOptions = {},
): THREE.Group {
  const group = new THREE.Group();
  group.name = "venue";
  const style = options.style ?? "hall";
  const floors = floorsToDraw(document, options);
  const explode = style === "map" && !options.floorId && floors.length > 1;
  floors.forEach((floor, index) => {
    const origin = floor.elevation + (explode ? index * MAP_FLOOR_GAP : 0);
    addFloor(group, document, floor, origin, style);
  });
  return group;
}
