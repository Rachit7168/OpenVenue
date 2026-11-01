import { createEmptyVenue, type SceneObject, type VenueDocument } from "@openvenue/scene-schema";

export type BenchmarkKind = "table" | "chair";

function id(index: number): string {
  return `b0000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;
}

/** A single room filled with a grid of simple objects. Chairs share one size so the 3D view can instance them. */
export function benchmarkVenue(count: number, kind: BenchmarkKind): VenueDocument {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error("Benchmark count must be a positive integer");
  }
  const document = createEmptyVenue(kind === "chair" ? "Simple hall" : "Object hall");
  const floor = document.venue.floors[0];
  if (!floor) {
    throw new Error("missing floor");
  }
  const columns = Math.ceil(Math.sqrt(count));
  const spacing = kind === "chair" ? 0.8 : 1.6;
  const margin = 1;
  const edge = columns * spacing + margin * 2;
  floor.rooms.push({
    id: id(1),
    name: "Hall",
    boundary: [
      { x: 0, z: 0 },
      { x: 0, z: edge },
      { x: edge, z: edge },
      { x: edge, z: 0 },
    ],
  });
  const width = kind === "chair" ? 0.46 : 1.2;
  const height = kind === "chair" ? 0.88 : 0.75;
  const depth = kind === "chair" ? 0.46 : 0.8;
  const objects: SceneObject[] = [];
  for (let index = 0; index < count; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    objects.push({
      id: id(index + 20),
      type: kind,
      name: kind === "chair" ? "Chair" : "Table",
      transform: {
        position: {
          x: margin + (column + 0.5) * spacing,
          y: 0,
          z: margin + (row + 0.5) * spacing,
        },
        rotation: { x: 0, y: 0, z: 0 },
      },
      dimensions: { width, height, depth },
    });
  }
  floor.objects = objects;
  return document;
}
