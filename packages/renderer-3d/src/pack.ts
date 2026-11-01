import { assemblyBounds, type GlbPart } from "./glb.js";

/**
 * Generated asset pack.
 *
 * Guidelines:
 * - Polygon budget: at most 500 triangles. Each box is 12.
 * - Scale: metres. The catalogue size is the mesh bounding box.
 * - Origin: the loader recentres the mesh on that box, so placement uses the centre.
 * - Naming: display names are title case; files are kebab-case `.glb`.
 * - Licence: Apache-2.0. These meshes are generated here, not scanned or downloaded.
 */

type Color = readonly [number, number, number];

const wood: Color = [0.55, 0.36, 0.22];
const oak: Color = [0.72, 0.55, 0.36];
const dark: Color = [0.22, 0.18, 0.16];
const cloth: Color = [0.35, 0.42, 0.62];
const metal: Color = [0.62, 0.66, 0.7];
const black: Color = [0.12, 0.13, 0.15];
const red: Color = [0.75, 0.18, 0.16];
const green: Color = [0.15, 0.55, 0.28];
const white: Color = [0.93, 0.93, 0.9];
const amber: Color = [0.86, 0.58, 0.16];
const blue: Color = [0.18, 0.38, 0.72];
const stage: Color = [0.28, 0.22, 0.38];
const booth: Color = [0.2, 0.35, 0.42];
const stone: Color = [0.55, 0.54, 0.52];

export interface PackAsset {
  id: string;
  name: string;
  category: string;
  swatch: string;
  tags: string[];
  file: string;
  parts: readonly GlbPart[];
}

export const ASSET_PACK: readonly PackAsset[] = [
  asset(1, "Side chair", "seating", "#5b6b9e", ["chair", "seating"], sideChair()),
  asset(2, "Banquet table", "tables", "#8c5b38", ["table", "banquet"], banquetTable()),
  asset(3, "Podium", "stage", "#57534e", ["podium", "stage"], podium()),
  asset(4, "Armchair", "seating", "#b08a62", ["armchair", "seating"], armchair()),
  asset(5, "Stool", "seating", "#3d342c", ["stool", "seating"], stool()),
  asset(6, "Bench", "seating", "#6b4a2f", ["bench", "seating"], bench()),
  asset(7, "Bar stool", "seating", "#3e4c6e", ["stool", "seating"], barStool()),
  asset(8, "Cocktail table", "tables", "#c4a36a", ["table", "cocktail"], cocktailTable()),
  asset(9, "Conference table", "tables", "#6b4a2f", ["table", "conference"], conferenceTable()),
  asset(10, "Coffee table", "tables", "#d6c4a8", ["table", "coffee"], coffeeTable()),
  asset(11, "Platform", "stage", "#2a2438", ["stage", "platform"], platform()),
  asset(12, "Riser", "stage", "#3f3a4a", ["stage", "riser"], riser()),
  asset(13, "Shell booth", "booth", "#34606e", ["booth", "shell"], shellBooth()),
  asset(14, "Counter booth", "booth", "#2f5560", ["booth", "counter"], counterBooth()),
  asset(15, "Corner booth", "booth", "#3d6b62", ["booth", "corner"], cornerBooth()),
  asset(16, "Demo counter", "booth", "#245058", ["booth", "demo"], demoCounter()),
  asset(17, "Info desk", "booth", "#4d6a78", ["booth", "desk"], infoDesk()),
  asset(18, "Display screen", "av", "#1c1f26", ["screen", "av"], displayScreen()),
  asset(19, "Speaker", "av", "#2a2e36", ["speaker", "av"], speaker()),
  asset(20, "Projector", "av", "#3a404a", ["projector", "av"], projector()),
  asset(21, "Microphone stand", "av", "#8d939c", ["microphone", "av"], microphone()),
  asset(22, "Door slab", "circulation", "#8c6239", ["door", "circulation"], doorSlab()),
  asset(23, "Stair flight", "circulation", "#8a8680", ["stairs", "circulation"], stairFlight()),
  asset(24, "Lift car", "circulation", "#9aa1ab", ["lift", "circulation"], liftCar()),
  asset(25, "Access ramp", "circulation", "#7d8794", ["ramp", "circulation"], accessRamp()),
  asset(26, "Exit sign", "sign", "#1f8a48", ["exit", "safety"], sign(green, white)),
  asset(27, "Fire sign", "sign", "#c0392b", ["fire", "safety"], sign(red, white)),
  asset(28, "First aid sign", "sign", "#f4f4f0", ["aid", "safety"], sign(white, green)),
  asset(29, "No entry sign", "sign", "#a32020", ["entry", "safety"], sign(red, white)),
  asset(30, "Assembly sign", "sign", "#2f62c0", ["assembly", "safety"], sign(blue, white)),
];

export function packFileName(name: string): string {
  return `${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}.glb`;
}

/** Catalogue size, rounded to a millimetre, matching the mesh bounds. */
export function packDimensions(parts: readonly GlbPart[]): {
  width: number;
  height: number;
  depth: number;
} {
  const bounds = assemblyBounds(parts);
  return {
    width: roundMm(bounds.width),
    height: roundMm(bounds.height),
    depth: roundMm(bounds.depth),
  };
}

function asset(
  index: number,
  name: string,
  category: string,
  swatch: string,
  tags: string[],
  parts: readonly GlbPart[],
): PackAsset {
  return {
    id: `6f1c2a40-7b2e-4c1a-9d3e-1a2b3c4d5e${index.toString(16).padStart(2, "0")}`,
    name,
    category,
    swatch,
    tags,
    file: packFileName(name),
    parts,
  };
}

function box(
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  depth: number,
  color: Color,
): GlbPart {
  return { center: [x, y, z], size: [width, height, depth], color };
}

function legs(
  width: number,
  depth: number,
  height: number,
  inset: number,
  color: Color,
): GlbPart[] {
  const x = width / 2 - inset;
  const z = depth / 2 - inset;
  const thickness = 0.05;
  return [
    box(-x, height / 2, -z, thickness, height, thickness, color),
    box(x, height / 2, -z, thickness, height, thickness, color),
    box(-x, height / 2, z, thickness, height, thickness, color),
    box(x, height / 2, z, thickness, height, thickness, color),
  ];
}

function sideChair(): GlbPart[] {
  return [
    ...legs(0.46, 0.46, 0.42, 0.06, dark),
    box(0, 0.45, 0, 0.46, 0.06, 0.46, cloth),
    box(0, 0.68, -0.21, 0.46, 0.4, 0.04, cloth),
  ];
}

function armchair(): GlbPart[] {
  return [
    ...legs(0.62, 0.55, 0.38, 0.08, oak),
    box(0, 0.42, 0.02, 0.62, 0.08, 0.5, oak),
    box(0, 0.68, -0.24, 0.62, 0.42, 0.06, oak),
    box(-0.31, 0.54, 0.04, 0.08, 0.18, 0.4, oak),
    box(0.31, 0.54, 0.04, 0.08, 0.18, 0.4, oak),
  ];
}

function stool(): GlbPart[] {
  return [...legs(0.36, 0.36, 0.45, 0.05, dark), box(0, 0.48, 0, 0.36, 0.05, 0.36, dark)];
}

function bench(): GlbPart[] {
  return [
    ...legs(1.3, 0.4, 0.42, 0.08, wood),
    box(0, 0.45, 0, 1.4, 0.06, 0.42, wood),
    box(0, 0.64, -0.18, 1.4, 0.32, 0.05, wood),
  ];
}

function barStool(): GlbPart[] {
  return [
    box(0, 0.36, 0, 0.08, 0.72, 0.08, metal),
    box(0, 0.28, 0, 0.32, 0.03, 0.32, metal),
    box(0, 0.02, 0, 0.36, 0.04, 0.36, metal),
    box(0, 0.75, 0, 0.36, 0.05, 0.36, cloth),
  ];
}

function banquetTable(): GlbPart[] {
  return [...legs(1.5, 0.7, 0.69, 0.08, wood), box(0, 0.72, 0, 1.6, 0.06, 0.8, wood)];
}

function cocktailTable(): GlbPart[] {
  return [
    box(0, 0.02, 0, 0.4, 0.04, 0.4, oak),
    box(0, 0.55, 0, 0.1, 1.02, 0.1, metal),
    box(0, 1.08, 0, 0.55, 0.04, 0.55, oak),
  ];
}

function conferenceTable(): GlbPart[] {
  return [...legs(2.2, 0.95, 0.69, 0.1, wood), box(0, 0.72, 0, 2.4, 0.06, 1.1, wood)];
}

function coffeeTable(): GlbPart[] {
  return [
    ...legs(0.9, 0.48, 0.36, 0.08, oak),
    box(0, 0.16, 0, 0.8, 0.03, 0.4, oak),
    box(0, 0.4, 0, 1, 0.04, 0.55, oak),
  ];
}

function platform(): GlbPart[] {
  return [box(0, 0.15, 0, 2, 0.3, 1.4, stage), box(0, 0.32, 0, 1.9, 0.04, 1.3, black)];
}

function podium(): GlbPart[] {
  return [box(0, 0.5, 0, 0.5, 1, 0.4, dark), box(0, 1.03, 0.04, 0.6, 0.06, 0.5, oak)];
}

function riser(): GlbPart[] {
  return [box(0, 0.1, 0.2, 1.4, 0.2, 0.8, stage), box(0, 0.3, -0.1, 1.4, 0.2, 0.4, stage)];
}

function shellBooth(): GlbPart[] {
  return [
    box(0, 1.1, -0.55, 2, 2.2, 0.06, booth),
    box(-0.97, 1.1, 0.05, 0.06, 2.2, 1.2, booth),
    box(0.97, 1.1, 0.05, 0.06, 2.2, 1.2, booth),
    box(0, 0.5, 0.25, 1.6, 1, 0.4, oak),
  ];
}

function counterBooth(): GlbPart[] {
  return [
    box(0, 0.5, 0, 1.8, 1, 0.6, booth),
    box(0, 1.15, -0.27, 1.8, 0.7, 0.06, booth),
    box(0, 1.02, 0.1, 1.5, 0.04, 0.35, oak),
  ];
}

function cornerBooth(): GlbPart[] {
  return [
    box(-0.55, 1.05, 0, 0.06, 2.1, 1.2, booth),
    box(0.05, 1.05, -0.57, 1.2, 2.1, 0.06, booth),
    box(0.15, 0.5, 0.1, 0.9, 1, 0.5, oak),
  ];
}

function demoCounter(): GlbPart[] {
  return [
    box(0, 0.5, 0, 1.4, 1, 0.55, booth),
    box(0, 1.25, -0.12, 0.9, 0.5, 0.05, black),
    box(0, 0.95, 0, 0.08, 0.4, 0.08, metal),
  ];
}

function infoDesk(): GlbPart[] {
  return [
    box(0, 0.55, 0, 1.6, 1.1, 0.6, booth),
    box(-0.85, 0.55, 0.45, 0.5, 1.1, 0.4, booth),
    box(0, 1.12, 0.05, 1.3, 0.04, 0.4, white),
  ];
}

function displayScreen(): GlbPart[] {
  return [
    box(0, 0.04, 0, 0.5, 0.08, 0.4, metal),
    box(0, 0.7, 0, 0.08, 1.24, 0.08, metal),
    box(0, 1.5, 0, 1.4, 0.8, 0.06, black),
  ];
}

function speaker(): GlbPart[] {
  return [box(0, 0.4, 0, 0.4, 0.8, 0.35, black), box(0, 0.55, 0.16, 0.22, 0.22, 0.04, metal)];
}

function projector(): GlbPart[] {
  return [box(0, 0.1, 0, 0.36, 0.12, 0.28, dark), box(0, 0.1, 0.16, 0.08, 0.08, 0.06, metal)];
}

function microphone(): GlbPart[] {
  return [
    box(0, 0.02, 0, 0.28, 0.04, 0.28, metal),
    box(0, 0.6, 0, 0.04, 1.16, 0.04, metal),
    box(0, 1.2, 0.06, 0.04, 0.08, 0.14, black),
  ];
}

function doorSlab(): GlbPart[] {
  return [
    box(-0.48, 1.05, 0, 0.06, 2.1, 0.1, dark),
    box(0.48, 1.05, 0, 0.06, 2.1, 0.1, dark),
    box(0, 2.08, 0, 1.02, 0.08, 0.1, dark),
    box(0, 1.02, 0, 0.86, 1.96, 0.04, oak),
    box(0.34, 1, 0.04, 0.04, 0.12, 0.04, metal),
  ];
}

function stairFlight(): GlbPart[] {
  return [0, 1, 2, 3].map((step) =>
    box(0, (0.18 * (step + 1)) / 2, step * 0.28, 1, 0.18 * (step + 1), 0.28, stone),
  );
}

function liftCar(): GlbPart[] {
  return [
    box(0, 1.15, 0, 1.5, 2.3, 1.4, metal),
    box(0, 1.05, 0.68, 0.9, 1.9, 0.04, dark),
    box(0.4, 2.05, 0.72, 0.16, 0.1, 0.04, amber),
  ];
}

function accessRamp(): GlbPart[] {
  return [0, 1, 2, 3].map((step) =>
    box(0, (0.08 * (step + 1)) / 2, -step * 0.45, 1.2, 0.08 * (step + 1), 0.45, metal),
  );
}

function sign(board: Color, mark: Color): GlbPart[] {
  return [
    box(0, 0.8, 0, 0.06, 1.6, 0.06, metal),
    box(0, 1.7, 0, 0.56, 0.32, 0.04, board),
    box(0, 1.7, 0.025, 0.18, 0.16, 0.02, mark),
  ];
}

function roundMm(value: number): number {
  return Math.round(value * 1000) / 1000;
}
