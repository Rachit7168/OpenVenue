import type {
  BoxDimensions,
  Room,
  SceneObject,
  Vec3,
  VenueDocument,
  Wall,
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
import type { EditorCommand } from "./history.js";

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

export function updateMaterial(
  document: VenueDocument,
  roomId: string,
  material: string,
): EditorCommand {
  const found = findRoom(document, roomId);
  return new UpdateMaterialCommand(roomId, found.room.floorMaterial ?? null, material);
}
