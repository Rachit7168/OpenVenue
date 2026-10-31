import { describe, expect, it } from "vitest";
import { MATERIAL_NAMES, materialPreset } from "./materials.js";

describe("materialPreset", () => {
  it("returns a distinct shared material for each named surface", () => {
    const materials = MATERIAL_NAMES.map((name) => materialPreset(name));
    expect(new Set(materials).size).toBe(MATERIAL_NAMES.length);
    expect(materialPreset("Wood")).toBe(materialPreset("wood"));
    expect(materialPreset("glass").transparent).toBe(true);
    expect(materialPreset("glass").opacity).toBeLessThan(1);
    expect(materialPreset(undefined)).toBe(materialPreset("carpet"));
    expect(materialPreset("marble")).toBe(materialPreset("carpet"));
  });
});
