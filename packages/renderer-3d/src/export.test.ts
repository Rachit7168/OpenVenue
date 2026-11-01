import { createEmptyVenue } from "@openvenue/scene-schema";
import { describe, expect, it } from "vitest";
import { exportVenueGlb } from "./export.js";
import { validateGlb } from "./glb.js";

describe("venue glb export", () => {
  it("writes a glTF 2 hall", async () => {
    const document = createEmptyVenue("Export hall");
    const floor = document.venue.floors[0];
    if (!floor) {
      throw new Error("missing floor");
    }
    floor.walls.push({
      id: "wall-1",
      start: { x: 0, z: 0 },
      end: { x: 4, z: 0 },
      thickness: 0.2,
      height: 3,
    });
    floor.objects.push({
      id: "table-1",
      type: "table",
      name: "Table",
      transform: {
        position: { x: 2, y: 0, z: 2 },
        rotation: { x: 0, y: 0, z: 0 },
      },
      dimensions: { width: 1.2, height: 0.75, depth: 0.6 },
    });
    const bytes = await exportVenueGlb(document);
    expect(validateGlb(bytes)).toBeNull();
    const jsonLength = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(
      12,
      true,
    );
    const json = new TextDecoder().decode(bytes.subarray(20, 20 + jsonLength));
    expect(json).toContain("table-1");
    expect(json).toContain("meshes");
  });
});
