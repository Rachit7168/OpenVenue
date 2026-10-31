import { describe, expect, it } from "vitest";
import { qualityOptions } from "./quality.js";

describe("qualityOptions", () => {
  it("drops shadows and the extra light in simple mode", () => {
    expect(qualityOptions("simple")).toEqual({
      shadows: false,
      pixelRatioCap: 1,
      fillIntensity: 0,
      ambientIntensity: 0.7,
    });
    expect(qualityOptions("high").shadows).toBe(true);
    expect(qualityOptions("high").fillIntensity).toBeGreaterThan(0);
    expect(qualityOptions("high").ambientIntensity).toBeLessThan(
      qualityOptions("simple").ambientIntensity,
    );
  });
});
