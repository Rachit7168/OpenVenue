import {
  addAsset,
  addObject,
  circulationTarget,
  groupCommands,
  setFloorLink,
  type EditorCommand,
} from "@openvenue/editor-core";
import { snapPoint } from "@openvenue/geometry";
import type { VenueDocument } from "@openvenue/scene-schema";
import { assetObject, findAsset } from "./catalogue";

/** Snap a catalogue asset onto the target floor (defaults to ground floor). Returns the asset name. */
export function placeCatalogueAsset(
  execute: (command: EditorCommand) => void,
  document: VenueDocument,
  assetId: string,
  x: number,
  z: number,
  floorId?: string,
): string | null {
  const asset = findAsset(assetId);
  const floor =
    (floorId ? document.venue.floors.find((item) => item.id === floorId) : undefined) ??
    document.venue.floors[0];
  if (!asset || !floor) {
    return null;
  }
  const snapped = snapPoint({ x, z }).point;
  const object = assetObject(crypto.randomUUID(), asset, snapped.x, snapped.z);
  const steps: EditorCommand[] = [];
  if (!document.assets.some((item) => item.id === asset.id)) {
    steps.push(
      addAsset({
        id: asset.id,
        name: asset.name,
        format: "glb",
        uri: asset.url,
        license: asset.licence,
      }),
    );
  }
  steps.push(addObject(floor.id, object));
  const vertical = asset.tags.some((tag) => tag === "stairs" || tag === "lift");
  const target = vertical ? circulationTarget(document, floor.id) : null;
  if (target) {
    steps.push(setFloorLink(document, object.id, target, crypto.randomUUID()));
  }
  execute(steps.length === 1 ? steps[0]! : groupCommands("ADD_OBJECT", steps));
  return asset.name;
}
