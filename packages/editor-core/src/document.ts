import type { Floor, Room, SceneObject, VenueDocument, Wall } from "@openvenue/scene-schema";
import { CommandError } from "./errors.js";

export function jsonClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function cloneDocument(document: VenueDocument): VenueDocument {
  return jsonClone(document);
}

export function requireFloor(document: VenueDocument, floorId: string): Floor {
  const floor = document.venue.floors.find((item) => item.id === floorId);
  if (!floor) {
    throw new CommandError(`Unknown floor ${floorId}`);
  }
  return floor;
}

export function findObject(
  document: VenueDocument,
  objectId: string,
): { floor: Floor; index: number; object: SceneObject } {
  for (const floor of document.venue.floors) {
    const index = floor.objects.findIndex((item) => item.id === objectId);
    const object = index >= 0 ? floor.objects[index] : undefined;
    if (object) {
      return { floor, index, object };
    }
  }
  throw new CommandError(`Unknown object ${objectId}`);
}

export function findWall(
  document: VenueDocument,
  wallId: string,
): { floor: Floor; index: number; wall: Wall } {
  for (const floor of document.venue.floors) {
    const index = floor.walls.findIndex((item) => item.id === wallId);
    const wall = index >= 0 ? floor.walls[index] : undefined;
    if (wall) {
      return { floor, index, wall };
    }
  }
  throw new CommandError(`Unknown wall ${wallId}`);
}

export function findRoom(
  document: VenueDocument,
  roomId: string,
): { floor: Floor; index: number; room: Room } {
  for (const floor of document.venue.floors) {
    const index = floor.rooms.findIndex((item) => item.id === roomId);
    const room = index >= 0 ? floor.rooms[index] : undefined;
    if (room) {
      return { floor, index, room };
    }
  }
  throw new CommandError(`Unknown room ${roomId}`);
}
