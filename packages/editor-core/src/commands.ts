import type {
  BoxDimensions,
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
