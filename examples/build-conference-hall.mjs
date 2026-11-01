import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const width = 24;
const depth = 18;
const height = 4;
const now = "2026-11-01T00:00:00.000Z";

function id(index) {
  return `c0ffee00-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;
}

const boundary = [
  { x: 0, z: 0 },
  { x: 0, z: depth },
  { x: width, z: depth },
  { x: width, z: 0 },
];
const wallLines = [
  [boundary[0], boundary[1]],
  [boundary[1], boundary[2]],
  [boundary[2], boundary[3]],
  [boundary[3], boundary[0]],
];
const walls = wallLines.map(([start, end], index) => ({
  id: id(5 + index),
  start,
  end,
  thickness: 0.2,
  height,
}));
walls[3].openings = [
  {
    id: id(9),
    kind: "door",
    offset: (width - 1.4) / 2,
    width: 1.4,
    height: 2.1,
    sill: 0,
  },
];

const chairs = [];
const rows = 10;
const perSide = 10;
const spacingX = 0.75;
const spacingZ = 0.9;
const aisle = 1.6;
const block = (perSide - 1) * spacingX;
const startX = (width - (block * 2 + aisle)) / 2;
const startZ = 2.4;
let chairIndex = 20;
for (let row = 0; row < rows; row += 1) {
  for (let side = 0; side < 2; side += 1) {
    for (let column = 0; column < perSide; column += 1) {
      chairs.push({
        id: id(chairIndex),
        type: "chair",
        name: `Chair ${chairIndex - 19}`,
        assetId: "6f1c2a40-7b2e-4c1a-9d3e-1a2b3c4d5e01",
        transform: {
          position: {
            x: Number((startX + side * (block + aisle) + column * spacingX).toFixed(3)),
            y: 0,
            z: Number((startZ + row * spacingZ).toFixed(3)),
          },
          rotation: { x: 0, y: 0, z: 0 },
        },
        dimensions: { width: 0.46, height: 0.88, depth: 0.46 },
      });
      chairIndex += 1;
    }
  }
}

const document = {
  schemaVersion: "1.0.0",
  project: {
    id: id(1),
    name: "Conference hall",
    metadata: {
      createdAt: now,
      updatedAt: now,
      description: "Sample hall with a stage and 200 chairs.",
      generator: "openvenue",
      planWidth: width,
      planDepth: depth,
    },
  },
  coordinateSystem: {
    lengthUnit: "metres",
    upAxis: "Y",
    handedness: "right",
    angleUnit: "radians",
  },
  assets: [
    {
      id: "6f1c2a40-7b2e-4c1a-9d3e-1a2b3c4d5e01",
      name: "Side chair",
      format: "glb",
      uri: "/assets/side-chair.glb",
      license: "Apache-2.0",
    },
    {
      id: "6f1c2a40-7b2e-4c1a-9d3e-1a2b3c4d5e03",
      name: "Podium",
      format: "glb",
      uri: "/assets/podium.glb",
      license: "Apache-2.0",
    },
  ],
  venue: {
    id: id(2),
    name: "Conference hall",
    floors: [
      {
        id: id(3),
        name: "Ground floor",
        level: 0,
        elevation: 0,
        height,
        rooms: [
          {
            id: id(4),
            name: "Hall",
            boundary,
            wallIds: walls.map((wall) => wall.id),
            floorMaterial: "carpet",
          },
        ],
        walls,
        objects: [
          {
            id: id(11),
            type: "stage",
            name: "Stage",
            transform: {
              position: { x: width / 2, y: 0, z: depth - 2.2 },
              rotation: { x: 0, y: 0, z: 0 },
            },
            dimensions: { width: 8, height: 0.4, depth: 3 },
          },
          {
            id: id(12),
            type: "stage",
            name: "Podium",
            assetId: "6f1c2a40-7b2e-4c1a-9d3e-1a2b3c4d5e03",
            transform: {
              position: { x: width / 2, y: 0.4, z: depth - 2.2 },
              rotation: { x: 0, y: 0, z: 0 },
            },
            dimensions: { width: 0.6, height: 1.06, depth: 0.5 },
          },
          ...chairs,
        ],
        zones: [],
      },
    ],
    spawnPoints: [
      {
        id: id(10),
        name: "Entrance",
        floorId: id(3),
        position: { x: width / 2, y: 0, z: 1.2 },
        rotationY: Math.PI,
        role: "visitor",
      },
    ],
  },
};

if (chairs.length !== 200) {
  throw new Error(`expected 200 chairs, got ${chairs.length}`);
}

const root = dirname(fileURLToPath(import.meta.url));
writeFileSync(
  resolve(root, "conference-hall.venue.json"),
  `${JSON.stringify(document, null, 2)}\n`,
);
console.log(`wrote ${chairs.length} chairs`);
