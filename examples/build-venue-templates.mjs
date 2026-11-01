import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const now = "2026-11-01T00:00:00.000Z";

function makeId(prefix, index) {
  const hex = index.toString(16).padStart(12, "0");
  return `${prefix}-0000-4000-8000-${hex}`;
}

const ASSET_SIDE_CHAIR = "6f1c2a40-7b2e-4c1a-9d3e-1a2b3c4d5e01";
const ASSET_BANQUET_TABLE = "6f1c2a40-7b2e-4c1a-9d3e-1a2b3c4d5e02";
const ASSET_PODIUM = "6f1c2a40-7b2e-4c1a-9d3e-1a2b3c4d5e03";
const ASSET_ARMCHAIR = "6f1c2a40-7b2e-4c1a-9d3e-1a2b3c4d5e04";
const ASSET_STOOL = "6f1c2a40-7b2e-4c1a-9d3e-1a2b3c4d5e05";
const ASSET_BENCH = "6f1c2a40-7b2e-4c1a-9d3e-1a2b3c4d5e06";
const ASSET_BAR_STOOL = "6f1c2a40-7b2e-4c1a-9d3e-1a2b3c4d5e07";
const ASSET_COCKTAIL_TABLE = "6f1c2a40-7b2e-4c1a-9d3e-1a2b3c4d5e08";
const ASSET_CONF_TABLE = "6f1c2a40-7b2e-4c1a-9d3e-1a2b3c4d5e09";
const ASSET_COFFEE_TABLE = "6f1c2a40-7b2e-4c1a-9d3e-1a2b3c4d5e0a";
const ASSET_PLATFORM = "6f1c2a40-7b2e-4c1a-9d3e-1a2b3c4d5e0b";
const ASSET_RISER = "6f1c2a40-7b2e-4c1a-9d3e-1a2b3c4d5e0c";
const ASSET_SHELL_BOOTH = "6f1c2a40-7b2e-4c1a-9d3e-1a2b3c4d5e0d";
const ASSET_COUNTER_BOOTH = "6f1c2a40-7b2e-4c1a-9d3e-1a2b3c4d5e0e";
const ASSET_INFO_DESK = "6f1c2a40-7b2e-4c1a-9d3e-1a2b3c4d5e11";
const ASSET_SCREEN = "6f1c2a40-7b2e-4c1a-9d3e-1a2b3c4d5e12";
const ASSET_SPEAKER = "6f1c2a40-7b2e-4c1a-9d3e-1a2b3c4d5e13";
const ASSET_EXIT_SIGN = "6f1c2a40-7b2e-4c1a-9d3e-1a2b3c4d5e1a";

const COMMON_ASSETS = [
  {
    id: ASSET_SIDE_CHAIR,
    name: "Side chair",
    format: "glb",
    uri: "/assets/side-chair.glb",
    license: "Apache-2.0",
  },
  {
    id: ASSET_BANQUET_TABLE,
    name: "Banquet table",
    format: "glb",
    uri: "/assets/banquet-table.glb",
    license: "Apache-2.0",
  },
  {
    id: ASSET_PODIUM,
    name: "Podium",
    format: "glb",
    uri: "/assets/podium.glb",
    license: "Apache-2.0",
  },
  {
    id: ASSET_ARMCHAIR,
    name: "Armchair",
    format: "glb",
    uri: "/assets/armchair.glb",
    license: "Apache-2.0",
  },
  {
    id: ASSET_STOOL,
    name: "Stool",
    format: "glb",
    uri: "/assets/stool.glb",
    license: "Apache-2.0",
  },
  {
    id: ASSET_BENCH,
    name: "Bench",
    format: "glb",
    uri: "/assets/bench.glb",
    license: "Apache-2.0",
  },
  {
    id: ASSET_BAR_STOOL,
    name: "Bar stool",
    format: "glb",
    uri: "/assets/bar-stool.glb",
    license: "Apache-2.0",
  },
  {
    id: ASSET_COCKTAIL_TABLE,
    name: "Cocktail table",
    format: "glb",
    uri: "/assets/cocktail-table.glb",
    license: "Apache-2.0",
  },
  {
    id: ASSET_CONF_TABLE,
    name: "Conference table",
    format: "glb",
    uri: "/assets/conference-table.glb",
    license: "Apache-2.0",
  },
  {
    id: ASSET_COFFEE_TABLE,
    name: "Coffee table",
    format: "glb",
    uri: "/assets/coffee-table.glb",
    license: "Apache-2.0",
  },
  {
    id: ASSET_PLATFORM,
    name: "Platform",
    format: "glb",
    uri: "/assets/platform.glb",
    license: "Apache-2.0",
  },
  {
    id: ASSET_RISER,
    name: "Riser",
    format: "glb",
    uri: "/assets/riser.glb",
    license: "Apache-2.0",
  },
  {
    id: ASSET_SHELL_BOOTH,
    name: "Shell booth",
    format: "glb",
    uri: "/assets/shell-booth.glb",
    license: "Apache-2.0",
  },
  {
    id: ASSET_COUNTER_BOOTH,
    name: "Counter booth",
    format: "glb",
    uri: "/assets/counter-booth.glb",
    license: "Apache-2.0",
  },
  {
    id: ASSET_INFO_DESK,
    name: "Info desk",
    format: "glb",
    uri: "/assets/info-desk.glb",
    license: "Apache-2.0",
  },
  {
    id: ASSET_SCREEN,
    name: "Display screen",
    format: "glb",
    uri: "/assets/display-screen.glb",
    license: "Apache-2.0",
  },
  {
    id: ASSET_SPEAKER,
    name: "Speaker",
    format: "glb",
    uri: "/assets/speaker.glb",
    license: "Apache-2.0",
  },
  {
    id: ASSET_EXIT_SIGN,
    name: "Exit sign",
    format: "glb",
    uri: "/assets/exit-sign.glb",
    license: "Apache-2.0",
  },
];

function buildPerimeterWalls(prefix, width, depth, height, doors = []) {
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
  const walls = wallLines.map(([start, end], index) => {
    const wallId = makeId(prefix, 10 + index);
    const wallDoors = doors.filter((d) => d.wallIndex === index);
    return {
      id: wallId,
      start,
      end,
      thickness: 0.25,
      height,
      ...(wallDoors.length > 0
        ? {
            openings: wallDoors.map((d, dIdx) => ({
              id: makeId(prefix, 30 + index * 4 + dIdx),
              kind: "door",
              offset: d.offset,
              width: d.width,
              height: 2.2,
              sill: 0,
            })),
          }
        : {}),
    };
  });
  return { boundary, walls };
}

// 1. EXHIBITION TRADE FAIR (30 x 20 m)
function buildExhibitionTradeFair() {
  const prefix = "ee000000";
  const width = 30;
  const depth = 20;
  const height = 4.5;

  const { boundary, walls } = buildPerimeterWalls(prefix, width, depth, height, [
    { wallIndex: 3, offset: (width - 2.4) / 2, width: 2.4 },
    { wallIndex: 1, offset: (width - 1.8) / 2, width: 1.8 },
    { wallIndex: 0, offset: depth / 2 - 0.8, width: 1.6 },
    { wallIndex: 2, offset: depth / 2 - 0.8, width: 1.6 },
  ]);

  const objects = [];
  let objIdx = 100;

  objects.push({
    id: makeId(prefix, objIdx++),
    type: "booth",
    name: "Registration Desk A",
    assetId: ASSET_INFO_DESK,
    transform: { position: { x: width / 2 - 3, y: 0, z: 2.5 }, rotation: { x: 0, y: 0, z: 0 } },
    dimensions: { width: 1.8, height: 1.05, depth: 0.7 },
  });
  objects.push({
    id: makeId(prefix, objIdx++),
    type: "booth",
    name: "Registration Desk B",
    assetId: ASSET_INFO_DESK,
    transform: { position: { x: width / 2 + 3, y: 0, z: 2.5 }, rotation: { x: 0, y: 0, z: 0 } },
    dimensions: { width: 1.8, height: 1.05, depth: 0.7 },
  });

  const boothWidth = 3.5;
  const boothDepth = 3.0;
  const xPositions = [4.5, 9.5, 15, 20.5, 25.5];

  let boothNum = 1;
  for (const z of [7.5, 14.5]) {
    for (const x of xPositions) {
      objects.push({
        id: makeId(prefix, objIdx++),
        type: "booth",
        name: `Booth ${boothNum} Shell`,
        assetId: ASSET_SHELL_BOOTH,
        transform: { position: { x, y: 0, z }, rotation: { x: 0, y: 0, z: 0 } },
        dimensions: { width: boothWidth, height: 2.5, depth: boothDepth },
      });
      objects.push({
        id: makeId(prefix, objIdx++),
        type: "booth",
        name: `Booth ${boothNum} Counter`,
        assetId: ASSET_COUNTER_BOOTH,
        transform: { position: { x, y: 0, z: z - 0.9 }, rotation: { x: 0, y: 0, z: 0 } },
        dimensions: { width: 1.4, height: 1.0, depth: 0.5 },
      });
      objects.push({
        id: makeId(prefix, objIdx++),
        type: "screen",
        name: `Booth ${boothNum} Screen`,
        assetId: ASSET_SCREEN,
        transform: { position: { x: x - 0.8, y: 0, z: z + 0.8 }, rotation: { x: 0, y: 0, z: 0 } },
        dimensions: { width: 1.2, height: 1.8, depth: 0.4 },
      });
      objects.push({
        id: makeId(prefix, objIdx++),
        type: "chair",
        name: `Booth ${boothNum} Stool`,
        assetId: ASSET_BAR_STOOL,
        transform: { position: { x: x + 0.6, y: 0, z }, rotation: { x: 0, y: 0, z: 0 } },
        dimensions: { width: 0.45, height: 0.95, depth: 0.45 },
      });
      boothNum++;
    }
  }

  objects.push({
    id: makeId(prefix, objIdx++),
    type: "table",
    name: "Lounge Coffee Table",
    assetId: ASSET_COFFEE_TABLE,
    transform: { position: { x: width / 2, y: 0, z: depth - 2.5 }, rotation: { x: 0, y: 0, z: 0 } },
    dimensions: { width: 1.4, height: 0.45, depth: 0.8 },
  });
  objects.push({
    id: makeId(prefix, objIdx++),
    type: "chair",
    name: "Lounge Armchair 1",
    assetId: ASSET_ARMCHAIR,
    transform: {
      position: { x: width / 2 - 1.5, y: 0, z: depth - 2.5 },
      rotation: { x: 0, y: 0, z: 0 },
    },
    dimensions: { width: 0.85, height: 0.82, depth: 0.85 },
  });
  objects.push({
    id: makeId(prefix, objIdx++),
    type: "chair",
    name: "Lounge Armchair 2",
    assetId: ASSET_ARMCHAIR,
    transform: {
      position: { x: width / 2 + 1.5, y: 0, z: depth - 2.5 },
      rotation: { x: 0, y: 0, z: 0 },
    },
    dimensions: { width: 0.85, height: 0.82, depth: 0.85 },
  });

  objects.push({
    id: makeId(prefix, objIdx++),
    type: "sign",
    name: "Exit Sign South",
    assetId: ASSET_EXIT_SIGN,
    transform: { position: { x: width / 2, y: 2.4, z: 0.2 }, rotation: { x: 0, y: 0, z: 0 } },
    dimensions: { width: 0.4, height: 0.2, depth: 0.05 },
  });
  objects.push({
    id: makeId(prefix, objIdx++),
    type: "sign",
    name: "Exit Sign North",
    assetId: ASSET_EXIT_SIGN,
    transform: {
      position: { x: width / 2, y: 2.4, z: depth - 0.2 },
      rotation: { x: 0, y: 0, z: 0 },
    },
    dimensions: { width: 0.4, height: 0.2, depth: 0.05 },
  });

  return {
    schemaVersion: "1.0.0",
    project: {
      id: makeId(prefix, 1),
      name: "Exhibition Trade Fair",
      metadata: {
        createdAt: now,
        updatedAt: now,
        description:
          "30x20m trade expo hall with 10 exhibitor shell booths, demo counters, registration desk, and networking lounge.",
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
    assets: COMMON_ASSETS,
    venue: {
      id: makeId(prefix, 2),
      name: "Exhibition Trade Fair",
      floors: [
        {
          id: makeId(prefix, 3),
          name: "Main Expo Floor",
          level: 0,
          elevation: 0,
          height,
          rooms: [
            {
              id: makeId(prefix, 4),
              name: "Exhibition Pavilion",
              boundary,
              wallIds: walls.map((w) => w.id),
              floorMaterial: "concrete",
            },
          ],
          walls,
          objects,
          zones: [
            {
              id: makeId(prefix, 50),
              type: "zone",
              name: "Registration & Welcome",
              boundary: [
                { x: width / 2 - 5, z: 1 },
                { x: width / 2 - 5, z: 4 },
                { x: width / 2 + 5, z: 4 },
                { x: width / 2 + 5, z: 1 },
              ],
              interaction: {
                type: "info-panel",
                contentRef: "content/registration.json",
              },
            },
            {
              id: makeId(prefix, 51),
              type: "zone",
              name: "VIP Networking Hub",
              boundary: [
                { x: width / 2 - 4, z: depth - 4 },
                { x: width / 2 - 4, z: depth - 1 },
                { x: width / 2 + 4, z: depth - 1 },
                { x: width / 2 + 4, z: depth - 4 },
              ],
              interaction: {
                type: "menu",
                contentRef: "content/networking.json",
              },
            },
          ],
        },
      ],
      spawnPoints: [
        {
          id: makeId(prefix, 5),
          name: "Main Entrance",
          floorId: makeId(prefix, 3),
          position: { x: width / 2, y: 0, z: 1.2 },
          rotationY: Math.PI,
          role: "visitor",
        },
      ],
    },
  };
}

// 2. GALA BANQUET & RECEPTION (22 x 16 m)
function buildGalaBanquet() {
  const prefix = "bb000000";
  const width = 22;
  const depth = 16;
  const height = 4.2;

  const { boundary, walls } = buildPerimeterWalls(prefix, width, depth, height, [
    { wallIndex: 3, offset: (width - 2.0) / 2, width: 2.0 },
    { wallIndex: 1, offset: (width - 1.6) / 2, width: 1.6 },
  ]);

  const objects = [];
  let objIdx = 100;

  objects.push({
    id: makeId(prefix, objIdx++),
    type: "stage",
    name: "Live Music Platform",
    assetId: ASSET_PLATFORM,
    transform: { position: { x: width / 2, y: 0, z: depth - 2.0 }, rotation: { x: 0, y: 0, z: 0 } },
    dimensions: { width: 6.0, height: 0.4, depth: 2.4 },
  });

  objects.push({
    id: makeId(prefix, objIdx++),
    type: "generic",
    name: "Left Sound Tower",
    assetId: ASSET_SPEAKER,
    transform: {
      position: { x: width / 2 - 3.5, y: 0, z: depth - 2.0 },
      rotation: { x: 0, y: 0, z: 0 },
    },
    dimensions: { width: 0.5, height: 1.5, depth: 0.5 },
  });
  objects.push({
    id: makeId(prefix, objIdx++),
    type: "generic",
    name: "Right Sound Tower",
    assetId: ASSET_SPEAKER,
    transform: {
      position: { x: width / 2 + 3.5, y: 0, z: depth - 2.0 },
      rotation: { x: 0, y: 0, z: 0 },
    },
    dimensions: { width: 0.5, height: 1.5, depth: 0.5 },
  });

  const leftX = [4.0, 7.5];
  const rightX = [14.5, 18.0];
  const zRows = [4.0, 7.5, 11.0];

  let tableNum = 1;
  const allTableX = [...leftX, ...rightX];
  for (const x of allTableX) {
    for (const z of zRows) {
      objects.push({
        id: makeId(prefix, objIdx++),
        type: "table",
        name: `Banquet Table ${tableNum}`,
        assetId: ASSET_BANQUET_TABLE,
        transform: { position: { x, y: 0, z }, rotation: { x: 0, y: 0, z: 0 } },
        dimensions: { width: 1.8, height: 0.75, depth: 0.9 },
      });

      const chairOffsets = [
        { dx: -0.5, dz: -0.8 },
        { dx: 0.5, dz: -0.8 },
        { dx: -0.5, dz: 0.8 },
        { dx: 0.5, dz: 0.8 },
        { dx: -1.2, dz: 0 },
        { dx: 1.2, dz: 0 },
      ];
      for (let cIdx = 0; cIdx < chairOffsets.length; cIdx++) {
        const off = chairOffsets[cIdx];
        objects.push({
          id: makeId(prefix, objIdx++),
          type: "chair",
          name: `T${tableNum} Chair ${cIdx + 1}`,
          assetId: ASSET_SIDE_CHAIR,
          transform: {
            position: {
              x: Number((x + off.dx).toFixed(2)),
              y: 0,
              z: Number((z + off.dz).toFixed(2)),
            },
            rotation: { x: 0, y: 0, z: 0 },
          },
          dimensions: { width: 0.46, height: 0.88, depth: 0.46 },
        });
      }
      tableNum++;
    }
  }

  objects.push({
    id: makeId(prefix, objIdx++),
    type: "table",
    name: "Cocktail Table East",
    assetId: ASSET_COCKTAIL_TABLE,
    transform: { position: { x: width - 3.0, y: 0, z: 2.0 }, rotation: { x: 0, y: 0, z: 0 } },
    dimensions: { width: 0.8, height: 1.05, depth: 0.8 },
  });
  objects.push({
    id: makeId(prefix, objIdx++),
    type: "table",
    name: "Cocktail Table West",
    assetId: ASSET_COCKTAIL_TABLE,
    transform: { position: { x: 3.0, y: 0, z: 2.0 }, rotation: { x: 0, y: 0, z: 0 } },
    dimensions: { width: 0.8, height: 1.05, depth: 0.8 },
  });

  return {
    schemaVersion: "1.0.0",
    project: {
      id: makeId(prefix, 1),
      name: "Gala Banquet & Reception",
      metadata: {
        createdAt: now,
        updatedAt: now,
        description:
          "22x16m ballroom with 12 dining tables, 72 chairs, central dance floor zone, live band stage, and cocktail bar.",
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
    assets: COMMON_ASSETS,
    venue: {
      id: makeId(prefix, 2),
      name: "Gala Banquet & Reception",
      floors: [
        {
          id: makeId(prefix, 3),
          name: "Grand Ballroom",
          level: 0,
          elevation: 0,
          height,
          rooms: [
            {
              id: makeId(prefix, 4),
              name: "Ballroom Hall",
              boundary,
              wallIds: walls.map((w) => w.id),
              floorMaterial: "carpet",
            },
          ],
          walls,
          objects,
          zones: [
            {
              id: makeId(prefix, 50),
              type: "zone",
              name: "Central Dance Floor",
              boundary: [
                { x: width / 2 - 3.5, z: 5.0 },
                { x: width / 2 - 3.5, z: 12.0 },
                { x: width / 2 + 3.5, z: 12.0 },
                { x: width / 2 + 3.5, z: 5.0 },
              ],
              interaction: {
                type: "session-list",
                contentRef: "content/schedule.json",
              },
            },
          ],
        },
      ],
      spawnPoints: [
        {
          id: makeId(prefix, 5),
          name: "Ballroom Arrival",
          floorId: makeId(prefix, 3),
          position: { x: width / 2, y: 0, z: 1.2 },
          rotationY: Math.PI,
          role: "visitor",
        },
      ],
    },
  };
}

// 3. THEATER & KEYNOTE STAGE (24 x 16 m)
function buildTheaterStage() {
  const prefix = "cc000000";
  const width = 24;
  const depth = 16;
  const height = 4.8;

  const { boundary, walls } = buildPerimeterWalls(prefix, width, depth, height, [
    { wallIndex: 3, offset: (width - 2.2) / 2, width: 2.2 },
    { wallIndex: 1, offset: (width - 1.8) / 2, width: 1.8 },
    { wallIndex: 0, offset: depth / 2 - 0.7, width: 1.4 },
    { wallIndex: 2, offset: depth / 2 - 0.7, width: 1.4 },
  ]);

  const objects = [];
  let objIdx = 100;

  objects.push({
    id: makeId(prefix, objIdx++),
    type: "stage",
    name: "Main Performance Stage",
    assetId: ASSET_PLATFORM,
    transform: { position: { x: width / 2, y: 0, z: depth - 2.6 }, rotation: { x: 0, y: 0, z: 0 } },
    dimensions: { width: 10.0, height: 0.6, depth: 3.5 },
  });

  objects.push({
    id: makeId(prefix, objIdx++),
    type: "podium",
    name: "Speaker Keynote Podium",
    assetId: ASSET_PODIUM,
    transform: {
      position: { x: width / 2 - 2.0, y: 0.6, z: depth - 2.2 },
      rotation: { x: 0, y: 0, z: 0 },
    },
    dimensions: { width: 0.6, height: 1.06, depth: 0.5 },
  });

  objects.push({
    id: makeId(prefix, objIdx++),
    type: "screen",
    name: "Keynote LED Wall",
    assetId: ASSET_SCREEN,
    transform: {
      position: { x: width / 2, y: 0.6, z: depth - 4.0 },
      rotation: { x: 0, y: 0, z: 0 },
    },
    dimensions: { width: 5.0, height: 2.8, depth: 0.4 },
  });

  objects.push({
    id: makeId(prefix, objIdx++),
    type: "generic",
    name: "Stage Left Audio Array",
    assetId: ASSET_SPEAKER,
    transform: {
      position: { x: width / 2 - 5.5, y: 0, z: depth - 2.6 },
      rotation: { x: 0, y: 0, z: 0 },
    },
    dimensions: { width: 0.6, height: 1.8, depth: 0.6 },
  });
  objects.push({
    id: makeId(prefix, objIdx++),
    type: "generic",
    name: "Stage Right Audio Array",
    assetId: ASSET_SPEAKER,
    transform: {
      position: { x: width / 2 + 5.5, y: 0, z: depth - 2.6 },
      rotation: { x: 0, y: 0, z: 0 },
    },
    dimensions: { width: 0.6, height: 1.8, depth: 0.6 },
  });

  const rows = 7;
  const chairsPerRowSide = 10;
  const spacingX = 0.7;
  const spacingZ = 0.85;
  const centralAisle = 1.8;
  const sideBlockWidth = (chairsPerRowSide - 1) * spacingX;
  const startX = (width - (sideBlockWidth * 2 + centralAisle)) / 2;
  const startZ = 2.4;

  let chairCount = 1;
  for (let r = 0; r < rows; r++) {
    for (let side = 0; side < 2; side++) {
      for (let col = 0; col < chairsPerRowSide; col++) {
        const posX = startX + side * (sideBlockWidth + centralAisle) + col * spacingX;
        const posZ = startZ + r * spacingZ;
        objects.push({
          id: makeId(prefix, objIdx++),
          type: "chair",
          name: `Audience Chair ${chairCount++}`,
          assetId: ASSET_SIDE_CHAIR,
          transform: {
            position: { x: Number(posX.toFixed(2)), y: 0, z: Number(posZ.toFixed(2)) },
            rotation: { x: 0, y: 0, z: 0 },
          },
          dimensions: { width: 0.46, height: 0.88, depth: 0.46 },
        });
      }
    }
  }

  objects.push({
    id: makeId(prefix, objIdx++),
    type: "table",
    name: "AV Production Console",
    assetId: ASSET_CONF_TABLE,
    transform: { position: { x: width / 2, y: 0, z: 1.2 }, rotation: { x: 0, y: 0, z: 0 } },
    dimensions: { width: 2.2, height: 0.75, depth: 0.9 },
  });

  return {
    schemaVersion: "1.0.0",
    project: {
      id: makeId(prefix, 1),
      name: "Theater & Keynote Stage",
      metadata: {
        createdAt: now,
        updatedAt: now,
        description:
          "24x16m theater auditorium with 10m raised stage, podium, LED screen, 140 audience chairs, and rear AV production console.",
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
    assets: COMMON_ASSETS,
    venue: {
      id: makeId(prefix, 2),
      name: "Theater & Keynote Stage",
      floors: [
        {
          id: makeId(prefix, 3),
          name: "Main Auditorium Floor",
          level: 0,
          elevation: 0,
          height,
          rooms: [
            {
              id: makeId(prefix, 4),
              name: "Auditorium Hall",
              boundary,
              wallIds: walls.map((w) => w.id),
              floorMaterial: "wood",
            },
          ],
          walls,
          objects,
          zones: [
            {
              id: makeId(prefix, 50),
              type: "zone",
              name: "Keynote Presentation Zone",
              boundary: [
                { x: width / 2 - 5.5, z: depth - 5.0 },
                { x: width / 2 - 5.5, z: depth - 0.5 },
                { x: width / 2 + 5.5, z: depth - 0.5 },
                { x: width / 2 + 5.5, z: depth - 5.0 },
              ],
              interaction: {
                type: "info-panel",
                contentRef: "content/keynote.json",
              },
            },
          ],
        },
      ],
      spawnPoints: [
        {
          id: makeId(prefix, 5),
          name: "Auditorium Entrance",
          floorId: makeId(prefix, 3),
          position: { x: width / 2, y: 0, z: 0.8 },
          rotationY: Math.PI,
          role: "visitor",
        },
      ],
    },
  };
}

// 4. HACKATHON & ESPORTS ARENA (26 x 18 m)
function buildHackathonArena() {
  const prefix = "dd000000";
  const width = 26;
  const depth = 18;
  const height = 4.5;

  const { boundary, walls } = buildPerimeterWalls(prefix, width, depth, height, [
    { wallIndex: 3, offset: (width - 2.2) / 2, width: 2.2 },
    { wallIndex: 1, offset: (width - 1.8) / 2, width: 1.8 },
  ]);

  const objects = [];
  let objIdx = 100;

  objects.push({
    id: makeId(prefix, objIdx++),
    type: "stage",
    name: "Hackathon Pitch Stage",
    assetId: ASSET_PLATFORM,
    transform: { position: { x: width / 2, y: 0, z: depth - 2.5 }, rotation: { x: 0, y: 0, z: 0 } },
    dimensions: { width: 7.0, height: 0.4, depth: 3.0 },
  });
  objects.push({
    id: makeId(prefix, objIdx++),
    type: "podium",
    name: "Pitch Stage Podium",
    assetId: ASSET_PODIUM,
    transform: {
      position: { x: width / 2 - 2.0, y: 0.4, z: depth - 2.2 },
      rotation: { x: 0, y: 0, z: 0 },
    },
    dimensions: { width: 0.6, height: 1.06, depth: 0.5 },
  });
  objects.push({
    id: makeId(prefix, objIdx++),
    type: "screen",
    name: "Main Arena Projector Screen",
    assetId: ASSET_SCREEN,
    transform: {
      position: { x: width / 2, y: 0.4, z: depth - 3.8 },
      rotation: { x: 0, y: 0, z: 0 },
    },
    dimensions: { width: 4.5, height: 2.5, depth: 0.3 },
  });

  const podLeftX = [4.5, 9.0];
  const podRightX = [17.0, 21.5];
  const podZRows = [4.5, 9.5];

  let podNum = 1;
  const allPodX = [...podLeftX, ...podRightX];
  for (const x of allPodX) {
    for (const z of podZRows) {
      objects.push({
        id: makeId(prefix, objIdx++),
        type: "table",
        name: `Team Pod ${podNum} Table`,
        assetId: ASSET_CONF_TABLE,
        transform: { position: { x, y: 0, z }, rotation: { x: 0, y: 0, z: 0 } },
        dimensions: { width: 2.4, height: 0.75, depth: 1.0 },
      });

      const chairPos = [
        { dx: -0.7, dz: -0.8 },
        { dx: 0, dz: -0.8 },
        { dx: 0.7, dz: -0.8 },
        { dx: -0.7, dz: 0.8 },
        { dx: 0, dz: 0.8 },
        { dx: 0.7, dz: 0.8 },
      ];
      for (let c = 0; c < chairPos.length; c++) {
        objects.push({
          id: makeId(prefix, objIdx++),
          type: "chair",
          name: `Pod ${podNum} Seat ${c + 1}`,
          assetId: ASSET_SIDE_CHAIR,
          transform: {
            position: {
              x: Number((x + chairPos[c].dx).toFixed(2)),
              y: 0,
              z: Number((z + chairPos[c].dz).toFixed(2)),
            },
            rotation: { x: 0, y: 0, z: 0 },
          },
          dimensions: { width: 0.46, height: 0.88, depth: 0.46 },
        });
      }
      podNum++;
    }
  }

  objects.push({
    id: makeId(prefix, objIdx++),
    type: "table",
    name: "Lounge Table",
    assetId: ASSET_COFFEE_TABLE,
    transform: { position: { x: width / 2, y: 0, z: 7.0 }, rotation: { x: 0, y: 0, z: 0 } },
    dimensions: { width: 1.6, height: 0.45, depth: 0.8 },
  });
  objects.push({
    id: makeId(prefix, objIdx++),
    type: "chair",
    name: "Mentor Armchair 1",
    assetId: ASSET_ARMCHAIR,
    transform: { position: { x: width / 2 - 1.6, y: 0, z: 7.0 }, rotation: { x: 0, y: 0, z: 0 } },
    dimensions: { width: 0.85, height: 0.82, depth: 0.85 },
  });
  objects.push({
    id: makeId(prefix, objIdx++),
    type: "chair",
    name: "Mentor Armchair 2",
    assetId: ASSET_ARMCHAIR,
    transform: { position: { x: width / 2 + 1.6, y: 0, z: 7.0 }, rotation: { x: 0, y: 0, z: 0 } },
    dimensions: { width: 0.85, height: 0.82, depth: 0.85 },
  });

  return {
    schemaVersion: "1.0.0",
    project: {
      id: makeId(prefix, 1),
      name: "Hackathon & Esports Arena",
      metadata: {
        createdAt: now,
        updatedAt: now,
        description:
          "26x18m tech arena with 8 team hack pods (48 developer seats), central pitch stage, LED wall, and mentor lounge.",
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
    assets: COMMON_ASSETS,
    venue: {
      id: makeId(prefix, 2),
      name: "Hackathon & Esports Arena",
      floors: [
        {
          id: makeId(prefix, 3),
          name: "Arena Floor",
          level: 0,
          elevation: 0,
          height,
          rooms: [
            {
              id: makeId(prefix, 4),
              name: "Hacking Mainspace",
              boundary,
              wallIds: walls.map((w) => w.id),
              floorMaterial: "concrete",
            },
          ],
          walls,
          objects,
          zones: [
            {
              id: makeId(prefix, 50),
              type: "zone",
              name: "Central Mentorship Lounge",
              boundary: [
                { x: width / 2 - 3.0, z: 5.5 },
                { x: width / 2 - 3.0, z: 8.5 },
                { x: width / 2 + 3.0, z: 8.5 },
                { x: width / 2 + 3.0, z: 5.5 },
              ],
              interaction: {
                type: "info-panel",
                contentRef: "content/mentor.json",
              },
            },
          ],
        },
      ],
      spawnPoints: [
        {
          id: makeId(prefix, 5),
          name: "Arena Check-in",
          floorId: makeId(prefix, 3),
          position: { x: width / 2, y: 0, z: 1.2 },
          rotationY: Math.PI,
          role: "visitor",
        },
      ],
    },
  };
}

const templates = [
  { file: "exhibition-expo.venue.json", build: buildExhibitionTradeFair },
  { file: "gala-banquet.venue.json", build: buildGalaBanquet },
  { file: "theater-stage.venue.json", build: buildTheaterStage },
  { file: "hackathon-arena.venue.json", build: buildHackathonArena },
];

const root = dirname(fileURLToPath(import.meta.url));

for (const { file, build } of templates) {
  const doc = build();
  const dest = resolve(root, file);
  writeFileSync(dest, `${JSON.stringify(doc, null, 2)}\n`);
  console.log(`✓ Generated ${file} (${doc.venue.floors[0].objects.length} objects)`);
}
