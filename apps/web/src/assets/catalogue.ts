import type { SceneObject } from "@openvenue/scene-schema";

export interface AssetRecord {
  id: string;
  name: string;
  category: string;
  dimensions: { width: number; height: number; depth: number };
  licence: string;
  attribution: string;
  version: string;
  tags: string[];
  thumbnail: string;
  url: string;
}

import { CATALOGUE_DATA } from "./catalogue.data";

export const CATALOGUE: readonly AssetRecord[] = CATALOGUE_DATA;

const imported: AssetRecord[] = [];
const listeners = new Set<() => void>();

export function assets(): AssetRecord[] {
  return [...CATALOGUE, ...imported];
}

export function findAsset(id: string): AssetRecord | undefined {
  return assets().find((asset) => asset.id === id);
}

export function addImported(asset: AssetRecord): void {
  imported.push(asset);
  for (const listener of listeners) {
    listener();
  }
}

export function onAssetsChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function searchAssets(list: readonly AssetRecord[], query: string): AssetRecord[] {
  const terms = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0);
  if (terms.length === 0) {
    return [...list];
  }
  return list.filter((asset) => {
    const haystack = [asset.name, asset.category, asset.licence, asset.attribution, ...asset.tags]
      .join(" ")
      .toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

export function objectTypeFor(category: string): SceneObject["type"] {
  switch (category) {
    case "seating":
      return "chair";
    case "tables":
      return "table";
    case "stage":
      return "stage";
    case "booth":
      return "booth";
    case "av":
      return "screen";
    case "sign":
      return "sign";
    case "circulation":
      return "generic";
    default:
      return "generic";
  }
}

export function assetObject(id: string, asset: AssetRecord, x: number, z: number): SceneObject {
  return {
    id,
    type: objectTypeFor(asset.category),
    name: asset.name,
    assetId: asset.id,
    transform: {
      position: { x, y: 0, z },
      rotation: { x: 0, y: 0, z: 0 },
    },
    dimensions: { ...asset.dimensions },
  };
}
