import { addObject } from "@openvenue/editor-core";
import { snapPoint } from "@openvenue/geometry";
import type { VenueDocument } from "@openvenue/scene-schema";
import { assetObject, findAsset } from "./catalogue";

/** Snap a catalogue asset onto the ground floor. Returns the asset name. */
export function placeCatalogueAsset(
  execute: (command: ReturnType<typeof addObject>) => void,
  document: VenueDocument,
  assetId: string,
  x: number,
  z: number,
): string | null {
  const asset = findAsset(assetId);
  const floor = document.venue.floors[0];
  if (!asset || !floor) {
    return null;
  }
  const snapped = snapPoint({ x, z }).point;
  execute(addObject(floor.id, assetObject(crypto.randomUUID(), asset, snapped.x, snapped.z)));
  return asset.name;
}
