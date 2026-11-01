import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateVenue } from "@openvenue/scene-schema";
import { describe, expect, it } from "vitest";

const examplesDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../../examples");

describe("venue blueprint templates", () => {
  it("validates conference hall example", () => {
    const raw = readFileSync(resolve(examplesDir, "conference-hall.venue.json"), "utf8");
    const result = validateVenue(JSON.parse(raw));
    expect(result.valid ? [] : result.issues).toEqual([]);
    if (!result.valid) {
      throw new Error(`Invalid: ${result.issues.join(", ")}`);
    }

    const floor = result.document.venue.floors[0]!;
    const chairs = floor.objects.filter((obj) => obj.type === "chair");
    expect(chairs).toHaveLength(200);
    expect(floor.objects.some((obj) => obj.name === "Stage")).toBe(true);
    expect(floor.walls.some((w) => w.openings?.some((o) => o.kind === "door"))).toBe(true);
  });

  it("validates exhibition expo template", () => {
    const raw = readFileSync(resolve(examplesDir, "exhibition-expo.venue.json"), "utf8");
    const result = validateVenue(JSON.parse(raw));
    expect(result.valid ? [] : result.issues).toEqual([]);
    if (!result.valid) {
      throw new Error(`Invalid: ${result.issues.join(", ")}`);
    }

    const floor = result.document.venue.floors[0]!;
    const booths = floor.objects.filter((obj) => obj.type === "booth");
    expect(booths.length).toBeGreaterThanOrEqual(10);
    expect(floor.zones.length).toBeGreaterThanOrEqual(2);
    expect(floor.walls.some((w) => w.openings?.some((o) => o.kind === "door"))).toBe(true);
  });

  it("validates gala banquet template", () => {
    const raw = readFileSync(resolve(examplesDir, "gala-banquet.venue.json"), "utf8");
    const result = validateVenue(JSON.parse(raw));
    expect(result.valid ? [] : result.issues).toEqual([]);
    if (!result.valid) {
      throw new Error(`Invalid: ${result.issues.join(", ")}`);
    }

    const floor = result.document.venue.floors[0]!;
    const tables = floor.objects.filter((obj) => obj.type === "table");
    const chairs = floor.objects.filter((obj) => obj.type === "chair");
    expect(tables.length).toBeGreaterThanOrEqual(12);
    expect(chairs.length).toBeGreaterThanOrEqual(70);
    expect(floor.objects.some((obj) => obj.name === "Live Music Platform")).toBe(true);
    expect(floor.zones.some((z) => z.name === "Central Dance Floor")).toBe(true);
  });

  it("validates theater stage template", () => {
    const raw = readFileSync(resolve(examplesDir, "theater-stage.venue.json"), "utf8");
    const result = validateVenue(JSON.parse(raw));
    expect(result.valid ? [] : result.issues).toEqual([]);
    if (!result.valid) {
      throw new Error(`Invalid: ${result.issues.join(", ")}`);
    }

    const floor = result.document.venue.floors[0]!;
    const chairs = floor.objects.filter((obj) => obj.type === "chair");
    expect(chairs.length).toBeGreaterThanOrEqual(140);
    expect(floor.objects.some((obj) => obj.name === "Main Performance Stage")).toBe(true);
    expect(floor.objects.some((obj) => obj.name === "Keynote LED Wall")).toBe(true);
  });

  it("validates hackathon arena template", () => {
    const raw = readFileSync(resolve(examplesDir, "hackathon-arena.venue.json"), "utf8");
    const result = validateVenue(JSON.parse(raw));
    expect(result.valid ? [] : result.issues).toEqual([]);
    if (!result.valid) {
      throw new Error(`Invalid: ${result.issues.join(", ")}`);
    }

    const floor = result.document.venue.floors[0]!;
    const tables = floor.objects.filter((obj) => obj.type === "table");
    const chairs = floor.objects.filter((obj) => obj.type === "chair");
    expect(tables.length).toBeGreaterThanOrEqual(8);
    expect(chairs.length).toBeGreaterThanOrEqual(48);
    expect(floor.objects.some((obj) => obj.name === "Hackathon Pitch Stage")).toBe(true);
    expect(floor.zones.some((z) => z.name === "Central Mentorship Lounge")).toBe(true);
  });
});
