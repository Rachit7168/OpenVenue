import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateVenue } from "@openvenue/scene-schema";
import { describe, expect, it } from "vitest";

const examplePath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../examples/conference-hall.venue.json",
);

describe("conference hall example", () => {
  it("is a valid hall with a stage and 200 chairs", () => {
    const result = validateVenue(JSON.parse(readFileSync(examplePath, "utf8")));
    expect(result.valid ? [] : result.issues).toEqual([]);
    expect(result.valid).toBe(true);
    if (!result.valid) {
      return;
    }
    const floor = result.document.venue.floors[0];
    if (!floor) {
      throw new Error("missing floor");
    }
    const chairs = floor.objects.filter((object) => object.type === "chair");
    expect(chairs).toHaveLength(200);
    expect(floor.objects.some((object) => object.name === "Stage")).toBe(true);
    expect(
      floor.walls.some((wall) => wall.openings?.some((opening) => opening.kind === "door")),
    ).toBe(true);
    expect(result.document.venue.spawnPoints[0]?.position.z).toBeGreaterThan(0);
  });
});
