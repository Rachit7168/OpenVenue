import type {
  Asset,
  BoxDimensions,
  Floor,
  Room,
  SceneObject,
  SpawnPoint,
  Vec3,
  VenueDocument,
  Wall,
  Zone,
} from "@openvenue/scene-schema";
import {
  cloneDocument,
  findObject,
  findRoom,
  findWall,
  jsonClone,
  requireFloor,
} from "./document.js";
import { CommandError } from "./errors.js";
import type { CommandType, EditorCommand } from "./history.js";

function clone<T>(value: T): T {
  return jsonClone(value);
}

function setPosition(document: VenueDocument, objectId: string, position: Vec3): VenueDocument {
  const next = cloneDocument(document);
  const found = findObject(next, objectId);
  found.object.transform.position = clone(position);
  return next;
}

function setRotation(document: VenueDocument, objectId: string, rotation: Vec3): VenueDocument {
  const next = cloneDocument(document);
  const found = findObject(next, objectId);
  found.object.transform.rotation = clone(rotation);
  return next;
}

function setDimensions(
  document: VenueDocument,
  objectId: string,
  dimensions: BoxDimensions | null,
): VenueDocument {
  const next = cloneDocument(document);
  const found = findObject(next, objectId);
  if (dimensions) {
    found.object.dimensions = clone(dimensions);
  } else {
    delete found.object.dimensions;
  }
  return next;
}

class MoveObjectCommand implements EditorCommand {
  readonly type = "MOVE_OBJECT" as const;

  constructor(
    private readonly objectId: string,
    private readonly previous: Vec3,
    private readonly nextPosition: Vec3,
  ) {}

  execute(document: VenueDocument): VenueDocument {
    return setPosition(document, this.objectId, this.nextPosition);
  }

  undo(document: VenueDocument): VenueDocument {
    return setPosition(document, this.objectId, this.previous);
  }

  merge(next: EditorCommand): EditorCommand | null {
    if (!(next instanceof MoveObjectCommand) || next.objectId !== this.objectId) {
      return null;
    }
    return new MoveObjectCommand(this.objectId, this.previous, next.nextPosition);
  }
}

class RotateObjectCommand implements EditorCommand {
  readonly type = "ROTATE_OBJECT" as const;

  constructor(
    private readonly objectId: string,
    private readonly previous: Vec3,
    private readonly nextRotation: Vec3,
  ) {}

  execute(document: VenueDocument): VenueDocument {
    return setRotation(document, this.objectId, this.nextRotation);
  }

  undo(document: VenueDocument): VenueDocument {
    return setRotation(document, this.objectId, this.previous);
  }

  merge(next: EditorCommand): EditorCommand | null {
    if (!(next instanceof RotateObjectCommand) || next.objectId !== this.objectId) {
      return null;
    }
    return new RotateObjectCommand(this.objectId, this.previous, next.nextRotation);
  }
}

class ResizeObjectCommand implements EditorCommand {
  readonly type = "RESIZE_OBJECT" as const;

  constructor(
    private readonly objectId: string,
    private readonly previous: BoxDimensions | null,
    private readonly nextDimensions: BoxDimensions,
  ) {}

  execute(document: VenueDocument): VenueDocument {
    return setDimensions(document, this.objectId, this.nextDimensions);
  }

  undo(document: VenueDocument): VenueDocument {
    return setDimensions(document, this.objectId, this.previous);
  }

  merge(next: EditorCommand): EditorCommand | null {
    if (!(next instanceof ResizeObjectCommand) || next.objectId !== this.objectId) {
      return null;
    }
    return new ResizeObjectCommand(this.objectId, this.previous, next.nextDimensions);
  }
}

class AddObjectCommand implements EditorCommand {
  readonly type = "ADD_OBJECT" as const;

  constructor(
    private readonly floorId: string,
    private readonly object: SceneObject,
  ) {}

  execute(document: VenueDocument): VenueDocument {
    const next = cloneDocument(document);
    const floor = requireFloor(next, this.floorId);
    if (floor.objects.some((item) => item.id === this.object.id)) {
      throw new CommandError(`Object ${this.object.id} already exists`);
    }
    floor.objects.push(clone(this.object));
    return next;
  }

  undo(document: VenueDocument): VenueDocument {
    const next = cloneDocument(document);
    const floor = requireFloor(next, this.floorId);
    const index = floor.objects.findIndex((item) => item.id === this.object.id);
    if (index < 0) {
      throw new CommandError(`Object ${this.object.id} is not on the floor`);
    }
    floor.objects.splice(index, 1);
    return next;
  }
}

class DeleteObjectCommand implements EditorCommand {
  readonly type = "DELETE_OBJECT" as const;

  constructor(
    private readonly floorId: string,
    private readonly index: number,
    private readonly object: SceneObject,
  ) {}

  execute(document: VenueDocument): VenueDocument {
    const next = cloneDocument(document);
    const floor = requireFloor(next, this.floorId);
    const index = floor.objects.findIndex((item) => item.id === this.object.id);
    if (index < 0) {
      throw new CommandError(`Object ${this.object.id} is not on the floor`);
    }
    floor.objects.splice(index, 1);
    return next;
  }

  undo(document: VenueDocument): VenueDocument {
    const next = cloneDocument(document);
    const floor = requireFloor(next, this.floorId);
    floor.objects.splice(this.index, 0, clone(this.object));
    return next;
  }
}

class AddWallCommand implements EditorCommand {
  readonly type = "ADD_WALL" as const;

  constructor(
    private readonly floorId: string,
    private readonly wall: Wall,
  ) {}

  execute(document: VenueDocument): VenueDocument {
    const next = cloneDocument(document);
    const floor = requireFloor(next, this.floorId);
    if (floor.walls.some((item) => item.id === this.wall.id)) {
      throw new CommandError(`Wall ${this.wall.id} already exists`);
    }
    floor.walls.push(clone(this.wall));
    return next;
  }

  undo(document: VenueDocument): VenueDocument {
    const next = cloneDocument(document);
    const floor = requireFloor(next, this.floorId);
    const index = floor.walls.findIndex((item) => item.id === this.wall.id);
    if (index < 0) {
      throw new CommandError(`Wall ${this.wall.id} is not on the floor`);
    }
    floor.walls.splice(index, 1);
    return next;
  }
}

class UpdateWallCommand implements EditorCommand {
  readonly type = "UPDATE_WALL" as const;

  constructor(
    private readonly wallId: string,
    private readonly previous: Wall,
    private readonly nextWall: Wall,
  ) {}

  execute(document: VenueDocument): VenueDocument {
    return replaceWall(document, this.wallId, this.nextWall);
  }

  undo(document: VenueDocument): VenueDocument {
    return replaceWall(document, this.wallId, this.previous);
  }

  merge(next: EditorCommand): EditorCommand | null {
    if (!(next instanceof UpdateWallCommand) || next.wallId !== this.wallId) {
      return null;
    }
    return new UpdateWallCommand(this.wallId, this.previous, next.nextWall);
  }
}

function replaceWall(document: VenueDocument, wallId: string, wall: Wall): VenueDocument {
  const next = cloneDocument(document);
  const found = findWall(next, wallId);
  found.floor.walls[found.index] = clone(wall);
  return next;
}

class AddRoomCommand implements EditorCommand {
  readonly type = "ADD_ROOM" as const;

  constructor(
    private readonly floorId: string,
    private readonly room: Room,
  ) {}

  execute(document: VenueDocument): VenueDocument {
    const next = cloneDocument(document);
    const floor = requireFloor(next, this.floorId);
    if (floor.rooms.some((item) => item.id === this.room.id)) {
      throw new CommandError(`Room ${this.room.id} already exists`);
    }
    floor.rooms.push(clone(this.room));
    return next;
  }

  undo(document: VenueDocument): VenueDocument {
    const next = cloneDocument(document);
    const floor = requireFloor(next, this.floorId);
    const index = floor.rooms.findIndex((item) => item.id === this.room.id);
    if (index < 0) {
      throw new CommandError(`Room ${this.room.id} is not on the floor`);
    }
    floor.rooms.splice(index, 1);
    return next;
  }
}

class UpdateMaterialCommand implements EditorCommand {
  readonly type = "UPDATE_MATERIAL" as const;

  constructor(
    private readonly roomId: string,
    private readonly previous: string | null,
    private readonly nextMaterial: string,
  ) {}

  execute(document: VenueDocument): VenueDocument {
    return setMaterial(document, this.roomId, this.nextMaterial);
  }

  undo(document: VenueDocument): VenueDocument {
    return setMaterial(document, this.roomId, this.previous);
  }
}

function setMaterial(
  document: VenueDocument,
  roomId: string,
  material: string | null,
): VenueDocument {
  const next = cloneDocument(document);
  const found = findRoom(next, roomId);
  if (material === null) {
    delete found.room.floorMaterial;
  } else {
    found.room.floorMaterial = material;
  }
  return next;
}

export function addObject(floorId: string, object: SceneObject): EditorCommand {
  return new AddObjectCommand(floorId, clone(object));
}

class AddAssetCommand implements EditorCommand {
  readonly type = "ADD_ASSET" as const;

  constructor(private readonly asset: Asset) {}

  execute(document: VenueDocument): VenueDocument {
    if (document.assets.some((item) => item.id === this.asset.id)) {
      return document;
    }
    const next = cloneDocument(document);
    next.assets.push(clone(this.asset));
    return next;
  }

  undo(document: VenueDocument): VenueDocument {
    const next = cloneDocument(document);
    next.assets = next.assets.filter((item) => item.id !== this.asset.id);
    return next;
  }
}

/** Record a catalogue file so an object may reference it. A repeat id leaves the document unchanged. */
export function addAsset(asset: Asset): EditorCommand {
  return new AddAssetCommand(clone(asset));
}

export function moveObject(
  document: VenueDocument,
  objectId: string,
  position: Vec3,
): EditorCommand {
  const found = findObject(document, objectId);
  return new MoveObjectCommand(objectId, clone(found.object.transform.position), clone(position));
}

export function rotateObject(
  document: VenueDocument,
  objectId: string,
  rotation: Vec3,
): EditorCommand {
  const found = findObject(document, objectId);
  return new RotateObjectCommand(objectId, clone(found.object.transform.rotation), clone(rotation));
}

export function resizeObject(
  document: VenueDocument,
  objectId: string,
  dimensions: BoxDimensions,
): EditorCommand {
  const found = findObject(document, objectId);
  return new ResizeObjectCommand(
    objectId,
    found.object.dimensions ? clone(found.object.dimensions) : null,
    clone(dimensions),
  );
}

export function deleteObject(document: VenueDocument, objectId: string): EditorCommand {
  const found = findObject(document, objectId);
  return new DeleteObjectCommand(found.floor.id, found.index, clone(found.object));
}

export function addWall(floorId: string, wall: Wall): EditorCommand {
  return new AddWallCommand(floorId, clone(wall));
}

export function updateWall(document: VenueDocument, wallId: string, wall: Wall): EditorCommand {
  if (wall.id !== wallId) {
    throw new CommandError("Updated wall must keep the same id");
  }
  const found = findWall(document, wallId);
  return new UpdateWallCommand(wallId, clone(found.wall), clone(wall));
}

export function addRoom(floorId: string, room: Room): EditorCommand {
  return new AddRoomCommand(floorId, clone(room));
}

class DeleteWallCommand implements EditorCommand {
  readonly type = "DELETE_WALL" as const;

  constructor(
    private readonly floorId: string,
    private readonly index: number,
    private readonly wall: Wall,
  ) {}

  execute(document: VenueDocument): VenueDocument {
    const next = cloneDocument(document);
    const floor = requireFloor(next, this.floorId);
    if (floor.rooms.some((room) => (room.wallIds ?? []).includes(this.wall.id))) {
      throw new CommandError(`Wall ${this.wall.id} is part of a room`);
    }
    const index = floor.walls.findIndex((item) => item.id === this.wall.id);
    if (index < 0) {
      throw new CommandError(`Wall ${this.wall.id} is not on the floor`);
    }
    floor.walls.splice(index, 1);
    return next;
  }

  undo(document: VenueDocument): VenueDocument {
    const next = cloneDocument(document);
    const floor = requireFloor(next, this.floorId);
    floor.walls.splice(this.index, 0, clone(this.wall));
    return next;
  }
}

class DeleteRoomCommand implements EditorCommand {
  readonly type = "DELETE_ROOM" as const;

  constructor(
    private readonly floorId: string,
    private readonly index: number,
    private readonly room: Room,
  ) {}

  execute(document: VenueDocument): VenueDocument {
    const next = cloneDocument(document);
    const floor = requireFloor(next, this.floorId);
    const index = floor.rooms.findIndex((item) => item.id === this.room.id);
    if (index < 0) {
      throw new CommandError(`Room ${this.room.id} is not on the floor`);
    }
    floor.rooms.splice(index, 1);
    return next;
  }

  undo(document: VenueDocument): VenueDocument {
    const next = cloneDocument(document);
    const floor = requireFloor(next, this.floorId);
    floor.rooms.splice(this.index, 0, clone(this.room));
    return next;
  }
}

class AddZoneCommand implements EditorCommand {
  readonly type = "ADD_ZONE" as const;

  constructor(
    private readonly floorId: string,
    private readonly zone: Zone,
  ) {}

  execute(document: VenueDocument): VenueDocument {
    const next = cloneDocument(document);
    const floor = requireFloor(next, this.floorId);
    if (floor.zones.some((item) => item.id === this.zone.id)) {
      throw new CommandError(`Zone ${this.zone.id} already exists`);
    }
    floor.zones.push(clone(this.zone));
    return next;
  }

  undo(document: VenueDocument): VenueDocument {
    const next = cloneDocument(document);
    const floor = requireFloor(next, this.floorId);
    const index = floor.zones.findIndex((item) => item.id === this.zone.id);
    if (index < 0) {
      throw new CommandError(`Zone ${this.zone.id} is not on the floor`);
    }
    floor.zones.splice(index, 1);
    return next;
  }
}

class DeleteZoneCommand implements EditorCommand {
  readonly type = "DELETE_ZONE" as const;

  constructor(
    private readonly floorId: string,
    private readonly index: number,
    private readonly zone: Zone,
  ) {}

  execute(document: VenueDocument): VenueDocument {
    const next = cloneDocument(document);
    const floor = requireFloor(next, this.floorId);
    const index = floor.zones.findIndex((item) => item.id === this.zone.id);
    if (index < 0) {
      throw new CommandError(`Zone ${this.zone.id} is not on the floor`);
    }
    floor.zones.splice(index, 1);
    return next;
  }

  undo(document: VenueDocument): VenueDocument {
    const next = cloneDocument(document);
    const floor = requireFloor(next, this.floorId);
    floor.zones.splice(this.index, 0, clone(this.zone));
    return next;
  }
}

class AddSpawnCommand implements EditorCommand {
  readonly type = "ADD_SPAWN" as const;

  constructor(private readonly spawn: SpawnPoint) {}

  execute(document: VenueDocument): VenueDocument {
    const next = cloneDocument(document);
    if (next.venue.spawnPoints.some((item) => item.id === this.spawn.id)) {
      throw new CommandError(`Spawn ${this.spawn.id} already exists`);
    }
    if (!next.venue.floors.some((floor) => floor.id === this.spawn.floorId)) {
      throw new CommandError(`Spawn ${this.spawn.id} references a missing floor`);
    }
    next.venue.spawnPoints.push(clone(this.spawn));
    return next;
  }

  undo(document: VenueDocument): VenueDocument {
    const next = cloneDocument(document);
    const index = next.venue.spawnPoints.findIndex((item) => item.id === this.spawn.id);
    if (index < 0) {
      throw new CommandError(`Spawn ${this.spawn.id} is missing`);
    }
    next.venue.spawnPoints.splice(index, 1);
    return next;
  }
}

export function deleteWall(document: VenueDocument, wallId: string): EditorCommand {
  const found = findWall(document, wallId);
  return new DeleteWallCommand(found.floor.id, found.index, clone(found.wall));
}

export function deleteRoom(document: VenueDocument, roomId: string): EditorCommand {
  const found = findRoom(document, roomId);
  return new DeleteRoomCommand(found.floor.id, found.index, clone(found.room));
}

export function addZone(floorId: string, zone: Zone): EditorCommand {
  return new AddZoneCommand(floorId, clone(zone));
}

export function deleteZone(document: VenueDocument, zoneId: string): EditorCommand {
  let found: { floorId: string; index: number; zone: Zone } | null = null;
  for (const floor of document.venue.floors) {
    const index = floor.zones.findIndex((item) => item.id === zoneId);
    const zone = index >= 0 ? floor.zones[index] : undefined;
    if (zone) {
      found = { floorId: floor.id, index, zone };
      break;
    }
  }
  if (!found) {
    throw new CommandError(`Unknown zone ${zoneId}`);
  }
  return new DeleteZoneCommand(found.floorId, found.index, clone(found.zone));
}

export function addSpawn(spawn: SpawnPoint): EditorCommand {
  return new AddSpawnCommand(clone(spawn));
}

class DeleteSpawnCommand implements EditorCommand {
  readonly type = "DELETE_SPAWN" as const;

  constructor(
    private readonly index: number,
    private readonly spawn: SpawnPoint,
  ) {}

  execute(document: VenueDocument): VenueDocument {
    const next = cloneDocument(document);
    const index = next.venue.spawnPoints.findIndex((item) => item.id === this.spawn.id);
    if (index < 0) {
      throw new CommandError(`Spawn ${this.spawn.id} is missing`);
    }
    next.venue.spawnPoints.splice(index, 1);
    return next;
  }

  undo(document: VenueDocument): VenueDocument {
    const next = cloneDocument(document);
    next.venue.spawnPoints.splice(this.index, 0, clone(this.spawn));
    return next;
  }
}

export function deleteSpawn(document: VenueDocument, spawnId: string): EditorCommand {
  const index = document.venue.spawnPoints.findIndex((item) => item.id === spawnId);
  const spawn = index >= 0 ? document.venue.spawnPoints[index] : undefined;
  if (!spawn) {
    throw new CommandError(`Unknown spawn ${spawnId}`);
  }
  return new DeleteSpawnCommand(index, clone(spawn));
}

class GroupCommand implements EditorCommand {
  constructor(
    readonly type: CommandType,
    private readonly steps: readonly EditorCommand[],
  ) {}

  execute(document: VenueDocument): VenueDocument {
    return this.steps.reduce((current, step) => step.execute(current), document);
  }

  undo(document: VenueDocument): VenueDocument {
    return [...this.steps].reverse().reduce((current, step) => step.undo(current), document);
  }
}

/** Apply several edits as one undo step. Later steps see the document produced by earlier ones. */
export function groupCommands(type: CommandType, steps: readonly EditorCommand[]): EditorCommand {
  return new GroupCommand(type, steps);
}

class RenameCommand implements EditorCommand {
  readonly type = "RENAME" as const;

  constructor(
    private readonly id: string,
    private readonly previous: string,
    private readonly nextName: string,
  ) {}

  execute(document: VenueDocument): VenueDocument {
    return setName(document, this.id, this.nextName);
  }

  undo(document: VenueDocument): VenueDocument {
    return setName(document, this.id, this.previous);
  }
}

class UpdateZoneCommand implements EditorCommand {
  readonly type = "UPDATE_ZONE" as const;

  constructor(
    private readonly zoneId: string,
    private readonly previous: Zone,
    private readonly nextZone: Zone,
  ) {}

  execute(document: VenueDocument): VenueDocument {
    return replaceZone(document, this.zoneId, this.nextZone);
  }

  undo(document: VenueDocument): VenueDocument {
    return replaceZone(document, this.zoneId, this.previous);
  }
}

class SetFlagCommand implements EditorCommand {
  readonly type = "SET_FLAG" as const;

  constructor(
    private readonly id: string,
    private readonly flag: "locked" | "visible",
    private readonly previous: boolean,
    private readonly nextValue: boolean,
  ) {}

  execute(document: VenueDocument): VenueDocument {
    return setFlag(document, this.id, this.flag, this.nextValue);
  }

  undo(document: VenueDocument): VenueDocument {
    return setFlag(document, this.id, this.flag, this.previous);
  }
}

type NamedEntity = { id: string; name: string; [key: string]: unknown };

function namedEntities(document: VenueDocument): NamedEntity[] {
  return [
    ...document.venue.floors.flatMap((floor) => [...floor.rooms, ...floor.zones, ...floor.objects]),
    ...document.venue.spawnPoints,
  ];
}

function setName(document: VenueDocument, id: string, name: string): VenueDocument {
  if (name.length < 1 || name.length > 200) {
    throw new CommandError("Name must be between 1 and 200 characters");
  }
  const next = cloneDocument(document);
  const found = namedEntities(next).find((item) => item.id === id);
  if (!found) {
    throw new CommandError(`Unknown item ${id}`);
  }
  found.name = name;
  return next;
}

function replaceZone(document: VenueDocument, zoneId: string, zone: Zone): VenueDocument {
  if (zone.id !== zoneId) {
    throw new CommandError("Updated zone must keep the same id");
  }
  const next = cloneDocument(document);
  for (const floor of next.venue.floors) {
    const index = floor.zones.findIndex((item) => item.id === zoneId);
    if (index >= 0) {
      floor.zones[index] = clone(zone);
      return next;
    }
  }
  throw new CommandError(`Unknown zone ${zoneId}`);
}

function setFlag(
  document: VenueDocument,
  id: string,
  flag: "locked" | "visible",
  value: boolean,
): VenueDocument {
  const next = cloneDocument(document);
  const found = namedEntities(next).find((item) => item.id === id);
  if (!found) {
    throw new CommandError(`Unknown item ${id}`);
  }
  found[flag] = value;
  return next;
}

export function renameEntity(document: VenueDocument, id: string, name: string): EditorCommand {
  const found = namedEntities(document).find((item) => item.id === id);
  if (!found) {
    throw new CommandError(`Unknown item ${id}`);
  }
  return new RenameCommand(id, found.name, name);
}

export function updateZone(document: VenueDocument, zoneId: string, zone: Zone): EditorCommand {
  let previous: Zone | undefined;
  for (const floor of document.venue.floors) {
    previous = floor.zones.find((item) => item.id === zoneId);
    if (previous) {
      break;
    }
  }
  if (!previous) {
    throw new CommandError(`Unknown zone ${zoneId}`);
  }
  return new UpdateZoneCommand(zoneId, clone(previous), clone(zone));
}

export function setEntityFlag(
  document: VenueDocument,
  id: string,
  flag: "locked" | "visible",
  value: boolean,
): EditorCommand {
  const found = namedEntities(document).find((item) => item.id === id);
  if (!found) {
    throw new CommandError(`Unknown item ${id}`);
  }
  const current = found[flag];
  const previous = typeof current === "boolean" ? current : flag === "visible";
  return new SetFlagCommand(id, flag, previous, value);
}

export function updateMaterial(
  document: VenueDocument,
  roomId: string,
  material: string,
): EditorCommand {
  const found = findRoom(document, roomId);
  return new UpdateMaterialCommand(roomId, found.room.floorMaterial ?? null, material);
}

export const MIN_FLOOR_ELEVATION = -20;
export const MAX_FLOOR_ELEVATION = 100;

export type FloorPatch = Partial<Pick<Floor, "name" | "elevation" | "height" | "level">>;

function assertFloorFields(floor: Pick<Floor, "name" | "elevation" | "height" | "level">): void {
  if (floor.name.length < 1 || floor.name.length > 200) {
    throw new CommandError("Floor name must be between 1 and 200 characters");
  }
  if (
    !Number.isFinite(floor.elevation) ||
    floor.elevation < MIN_FLOOR_ELEVATION ||
    floor.elevation > MAX_FLOOR_ELEVATION
  ) {
    throw new CommandError(
      `Floor elevation must be between ${MIN_FLOOR_ELEVATION} and ${MAX_FLOOR_ELEVATION} metres`,
    );
  }
  if (!Number.isFinite(floor.height) || floor.height <= 0) {
    throw new CommandError("Floor height must be positive");
  }
  if (!Number.isInteger(floor.level)) {
    throw new CommandError("Floor level must be an integer");
  }
}

class AddFloorCommand implements EditorCommand {
  readonly type = "ADD_FLOOR" as const;

  constructor(private readonly floor: Floor) {}

  execute(document: VenueDocument): VenueDocument {
    const next = cloneDocument(document);
    if (next.venue.floors.some((item) => item.id === this.floor.id)) {
      throw new CommandError(`Floor ${this.floor.id} already exists`);
    }
    assertFloorFields(this.floor);
    assertFloorIdsAreFree(next, this.floor);
    next.venue.floors.push(clone(this.floor));
    return next;
  }

  undo(document: VenueDocument): VenueDocument {
    const next = cloneDocument(document);
    const index = next.venue.floors.findIndex((item) => item.id === this.floor.id);
    if (index < 0) {
      throw new CommandError(`Floor ${this.floor.id} is missing`);
    }
    next.venue.floors.splice(index, 1);
    return next;
  }
}

class UpdateFloorCommand implements EditorCommand {
  readonly type = "UPDATE_FLOOR" as const;

  constructor(
    private readonly floorId: string,
    private readonly before: FloorPatch,
    private readonly after: FloorPatch,
  ) {}

  execute(document: VenueDocument): VenueDocument {
    return applyFloorPatch(document, this.floorId, this.after);
  }

  undo(document: VenueDocument): VenueDocument {
    return applyFloorPatch(document, this.floorId, this.before);
  }
}

function applyFloorPatch(
  document: VenueDocument,
  floorId: string,
  patch: FloorPatch,
): VenueDocument {
  const next = cloneDocument(document);
  const floor = requireFloor(next, floorId);
  if (patch.name !== undefined) {
    floor.name = patch.name;
  }
  if (patch.elevation !== undefined) {
    const delta = patch.elevation - floor.elevation;
    floor.elevation = patch.elevation;
    for (const spawn of next.venue.spawnPoints) {
      if (spawn.floorId === floorId) {
        spawn.position = { ...spawn.position, y: spawn.position.y + delta };
      }
    }
  }
  if (patch.height !== undefined) {
    floor.height = patch.height;
  }
  if (patch.level !== undefined) {
    floor.level = patch.level;
  }
  assertFloorFields(floor);
  return next;
}

function floorEntityIds(floor: Floor): string[] {
  return [
    floor.id,
    ...floor.walls.flatMap((wall) => [
      wall.id,
      ...(wall.openings ?? []).map((opening) => opening.id),
    ]),
    ...floor.rooms.map((room) => room.id),
    ...floor.objects.map((object) => object.id),
    ...floor.zones.map((zone) => zone.id),
  ];
}

function documentIds(document: VenueDocument): Set<string> {
  const ids = new Set<string>([
    document.project.id,
    document.venue.id,
    ...document.assets.map((asset) => asset.id),
    ...document.venue.spawnPoints.map((spawn) => spawn.id),
  ]);
  for (const floor of document.venue.floors) {
    for (const id of floorEntityIds(floor)) {
      ids.add(id);
    }
  }
  for (const area of document.venue.navigation?.walkableAreas ?? []) {
    ids.add(area.id);
  }
  for (const waypoint of document.venue.navigation?.waypoints ?? []) {
    ids.add(waypoint.id);
  }
  return ids;
}

function assertFloorIdsAreFree(document: VenueDocument, floor: Floor): void {
  const used = documentIds(document);
  for (const id of floorEntityIds(floor)) {
    if (used.has(id)) {
      throw new CommandError(`Id ${id} is already used`);
    }
    used.add(id);
  }
}

function nearestOtherFloor(document: VenueDocument, floorId: string): Floor | undefined {
  const floors = [...document.venue.floors].sort((left, right) => left.level - right.level);
  const index = floors.findIndex((floor) => floor.id === floorId);
  if (index < 0) {
    return undefined;
  }
  return floors[index + 1] ?? floors[index - 1];
}

class SetFloorLinkCommand implements EditorCommand {
  readonly type = "SET_FLOOR_LINK" as const;

  constructor(
    private readonly objectId: string,
    private readonly previousTarget: string | null,
    private readonly nextTarget: string | null,
    private readonly createdTwinId: string | null,
  ) {}

  execute(document: VenueDocument): VenueDocument {
    return applyFloorLink(document, this.objectId, this.nextTarget, this.createdTwinId, true);
  }

  undo(document: VenueDocument): VenueDocument {
    return applyFloorLink(document, this.objectId, this.previousTarget, this.createdTwinId, false);
  }
}

function removePortalTwins(
  next: VenueDocument,
  sourceFloorId: string,
  source: SceneObject,
  keepId: string | null,
): void {
  const { x, z } = source.transform.position;
  for (const floor of next.venue.floors) {
    floor.objects = floor.objects.filter((object) => {
      if (keepId && object.id === keepId) {
        return true;
      }
      if (object.connectsToFloorId !== sourceFloorId) {
        return true;
      }
      const dx = object.transform.position.x - x;
      const dz = object.transform.position.z - z;
      return dx * dx + dz * dz > 1e-4;
    });
  }
}

function applyFloorLink(
  document: VenueDocument,
  objectId: string,
  targetFloorId: string | null,
  createdTwinId: string | null,
  creating: boolean,
): VenueDocument {
  const next = cloneDocument(document);
  const found = findObject(next, objectId);
  if (creating && createdTwinId) {
    for (const floor of next.venue.floors) {
      floor.objects = floor.objects.filter((object) => object.id !== createdTwinId);
    }
  }
  removePortalTwins(next, found.floor.id, found.object, null);
  if (targetFloorId) {
    requireFloor(next, targetFloorId);
    found.object.connectsToFloorId = targetFloorId;
    const twinId = createdTwinId;
    if (creating && twinId && !findObjectSafe(next, twinId)) {
      const twin = clone(found.object);
      twin.id = twinId;
      twin.connectsToFloorId = found.floor.id;
      requireFloor(next, targetFloorId).objects.push(twin);
    }
  } else {
    delete found.object.connectsToFloorId;
  }
  if (!creating && createdTwinId) {
    for (const floor of next.venue.floors) {
      floor.objects = floor.objects.filter((object) => object.id !== createdTwinId);
    }
  }
  return next;
}

function findObjectSafe(
  document: VenueDocument,
  objectId: string,
): { floor: Floor; object: SceneObject } | undefined {
  for (const floor of document.venue.floors) {
    const object = floor.objects.find((item) => item.id === objectId);
    if (object) {
      return { floor, object };
    }
  }
  return undefined;
}

export function addFloor(floor: Floor): EditorCommand {
  return new AddFloorCommand(clone(floor));
}

function findPortalTwinId(
  document: VenueDocument,
  objectId: string,
  targetFloorId: string,
): string | null {
  const existing = findObjectSafe(document, objectId);
  if (!existing) {
    return null;
  }
  const { x, z } = existing.object.transform.position;
  const target = requireFloor(document, targetFloorId);
  const twin = target.objects.find((object) => {
    if (object.connectsToFloorId !== existing.floor.id) {
      return false;
    }
    const dx = object.transform.position.x - x;
    const dz = object.transform.position.z - z;
    return dx * dx + dz * dz <= 1e-4;
  });
  return twin?.id ?? null;
}

export function setFloorLink(
  document: VenueDocument,
  objectId: string,
  targetFloorId: string | null,
  twinId: string | null = null,
): EditorCommand {
  const existing = findObjectSafe(document, objectId);
  const previous =
    existing && typeof existing.object.connectsToFloorId === "string"
      ? existing.object.connectsToFloorId
      : null;
  const createdTwin =
    targetFloorId === null
      ? twinId
      : (twinId ??
        findPortalTwinId(document, objectId, targetFloorId) ??
        globalThis.crypto.randomUUID());
  return new SetFloorLinkCommand(objectId, previous, targetFloorId, createdTwin);
}

/** The next floor a stair or lift should open onto, when one exists. */
export function circulationTarget(document: VenueDocument, floorId: string): string | null {
  return nearestOtherFloor(document, floorId)?.id ?? null;
}

export function updateFloor(
  document: VenueDocument,
  floorId: string,
  patch: FloorPatch,
): EditorCommand {
  const floor = requireFloor(document, floorId);
  const before: FloorPatch = {};
  if (patch.name !== undefined) {
    before.name = floor.name;
  }
  if (patch.elevation !== undefined) {
    before.elevation = floor.elevation;
  }
  if (patch.height !== undefined) {
    before.height = floor.height;
  }
  if (patch.level !== undefined) {
    before.level = floor.level;
  }
  return new UpdateFloorCommand(floorId, before, clone(patch));
}
