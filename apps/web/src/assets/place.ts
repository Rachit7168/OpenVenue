import { addAsset, addObject, groupCommands, type EditorCommand } from "@openvenue/editor-core";
import { snapPoint } from "@openvenue/geometry";
import type { VenueDocument } from "@openvenue/scene-schema";
import { assetObject, findAsset } from "./catalogue";

/** Snap a catalogue asset onto the ground floor. Returns the asset name. */
export function placeCatalogueAsset(
  execute: (command: EditorCommand) => void,
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
  const object = assetObject(crypto.randomUUID(), asset, snapped.x, snapped.z);
  const place = addObject(floor.id, object);
  if (document.assets.some((item) => item.id === asset.id)) {
    execute(place);
  } else {
    execute(
      groupCommands("ADD_OBJECT", [
        addAsset({
          id: asset.id,
          name: asset.name,
          format: "glb",
          uri: asset.url,
          license: asset.licence,
        }),
        place,
      ]),
    );
  }
  return asset.name;
}
