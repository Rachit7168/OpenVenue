import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { assemblyGlb, loadGlbBytes, MAX_ASSET_TRIANGLES, validateGlb } from "./glb.js";
import { ASSET_PACK, packDimensions } from "./pack.js";

describe("asset pack", () => {
  it("ships thirty licensed assemblies inside the triangle budget", async () => {
    expect(ASSET_PACK).toHaveLength(30);
    const ids = new Set(ASSET_PACK.map((item) => item.id));
    const files = new Set(ASSET_PACK.map((item) => item.file));
    expect(ids.size).toBe(30);
    expect(files.size).toBe(30);
    const categories = ASSET_PACK.map((item) => item.category);
    expect(categories.filter((category) => category === "seating")).toHaveLength(5);
    expect(categories.filter((category) => category === "tables")).toHaveLength(4);
    expect(categories.filter((category) => category === "stage")).toHaveLength(3);
    expect(categories.filter((category) => category === "booth")).toHaveLength(5);
    expect(categories).toEqual(expect.arrayContaining(["av", "circulation", "sign"]));

    for (const item of ASSET_PACK) {
      expect(item.parts.length * 12).toBeLessThanOrEqual(MAX_ASSET_TRIANGLES);
      const bytes = assemblyGlb(item.parts);
      expect(validateGlb(bytes)).toBeNull();
      const model = await loadGlbBytes(bytes);
      const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
      const dimensions = packDimensions(item.parts);
      expect(size.x).toBeCloseTo(dimensions.width, 2);
      expect(size.y).toBeCloseTo(dimensions.height, 2);
      expect(size.z).toBeCloseTo(dimensions.depth, 2);
      expect(dimensions.width).toBeGreaterThan(0);
      expect(dimensions.height).toBeGreaterThan(0);
      expect(dimensions.depth).toBeGreaterThan(0);
    }
  });
});
