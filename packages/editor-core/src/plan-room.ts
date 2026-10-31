import { buildRectangularRoom, type Vec2 } from "@openvenue/geometry";
import type { Room, Wall } from "@openvenue/scene-schema";

export interface PlannedRoom {
  walls: [Wall, Wall, Wall, Wall];
  room: Room;
  area: number;
  centroid: Vec2;
}

/** Pure description of a rectangular hall. Apply it with addWall and addRoom commands. */
export function planRectangularRoom(options: {
  name: string;
  width: number;
  depth: number;
  origin?: Vec2;
  thickness?: number;
  height?: number;
  roomId: string;
  wallIds: readonly [string, string, string, string];
}): PlannedRoom {
  const built = buildRectangularRoom({
    ...(options.origin ? { origin: options.origin } : {}),
    width: options.width,
    depth: options.depth,
  });
  const thickness = options.thickness ?? 0.2;
  const height = options.height ?? 3;
  const walls = built.walls.map((wall, index): Wall => {
    const id = options.wallIds[index];
    if (!id) {
      throw new Error("rectangular room needs four wall ids");
    }
    return {
      id,
      start: { x: wall.start.x, z: wall.start.z },
      end: { x: wall.end.x, z: wall.end.z },
      thickness,
      height,
    };
  });
  const [south, east, north, west] = walls;
  if (!south || !east || !north || !west) {
    throw new Error("rectangular room needs four walls");
  }
  const [first, second, third, fourth] = built.boundary;
  return {
    walls: [south, east, north, west],
    room: {
      id: options.roomId,
      name: options.name,
      boundary: [
        { x: first.x, z: first.z },
        { x: second.x, z: second.z },
        { x: third.x, z: third.z },
        { x: fourth.x, z: fourth.z },
      ],
      wallIds: [...options.wallIds],
    },
    area: built.area,
    centroid: built.centroid,
  };
}
