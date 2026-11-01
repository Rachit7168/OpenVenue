import { describe, expect, it } from "vitest";
import { assetObject, CATALOGUE, searchAssets } from "./catalogue";

describe("asset catalogue", () => {
  it("finds assets by name, tag, or licence and builds a placeable object", () => {
    expect(searchAssets(CATALOGUE, "banquet").map((asset) => asset.name)).toEqual([
      "Banquet table",
    ]);
    expect(searchAssets(CATALOGUE, "apache chair")).toHaveLength(1);
    expect(searchAssets(CATALOGUE, "missing")).toHaveLength(0);
    const chair = CATALOGUE[0];
    if (!chair) {
      throw new Error("missing chair");
    }
    const object = assetObject("6f1c2a40-7b2e-4c1a-9d3e-1a2b3c4d5e10", chair, 2, 3);
    expect(object.type).toBe("chair");
    expect(object.assetId).toBe(chair.id);
    expect(object.dimensions).toEqual(chair.dimensions);
    expect(object.transform.position).toEqual({ x: 2, y: 0, z: 3 });
    expect(chair.licence).toBe("Apache-2.0");
    expect(chair.attribution.length).toBeGreaterThan(0);
  });
});
