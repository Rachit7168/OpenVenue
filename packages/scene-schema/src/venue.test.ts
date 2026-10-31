import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createEmptyVenue } from "./create-empty-venue.js";
import { VenueValidationError } from "./errors.js";
import { loadVenueJson, saveVenueJson, validateVenue } from "./validate.js";
import type { VenueDocument, Zone } from "./generated/venue.js";

const examplesDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../../examples");

function readExample(name: string): unknown {
  const text = readFileSync(resolve(examplesDir, name), "utf8");
  return JSON.parse(text) as unknown;
}

function firstFloor(document: VenueDocument) {
  const floor = document.venue.floors[0];
  if (!floor) {
    throw new Error("expected a ground floor");
  }
  return floor;
}

describe("venue schema", () => {
  it("accepts the empty venue example", () => {
    const result = validateVenue(readExample("empty-venue.json"));
    expect(result.valid).toBe(true);
  });

  it("accepts zones, interactions, spawn points, and navigation", () => {
    const result = validateVenue(readExample("venue-with-zone.json"));
    expect(result.valid).toBe(true);
    if (!result.valid) {
      return;
    }
    const zone = firstFloor(result.document).zones[0];
    expect(zone?.name).toBe("Food Court");
    expect(zone?.interaction?.contentRef).toBe("content/food-court.json");
    expect(result.document.venue.spawnPoints).toHaveLength(1);
    expect(result.document.venue.navigation?.walkableAreas).toHaveLength(1);
  });

  it("accepts a venue created in code and round-trips it", () => {
    const document = createEmptyVenue("Demo", new Date("2026-01-01T00:00:00.000Z"));
    const result = validateVenue(document);
    expect(result.valid).toBe(true);

    const saved = saveVenueJson(document);
    const loaded = validateVenue(JSON.parse(saved) as unknown);
    expect(loaded.valid).toBe(true);
    if (loaded.valid) {
      expect(loaded.document.project.name).toBe("Demo");
      expect(loaded.document.schemaVersion).toBe("1.0.0");
    }
  });

  it("keeps unknown properties on round-trip", () => {
    const document = createEmptyVenue();
    const withExtra = { ...document, futureNote: "keep me" };
    const result = validateVenue(withExtra);
    expect(result.valid).toBe(true);
    if (!result.valid) {
      return;
    }
    const saved = JSON.parse(saveVenueJson(result.document)) as { futureNote?: string };
    expect(saved.futureNote).toBe("keep me");
  });

  it("requires contentRef when an interaction opens something", () => {
    const document = createEmptyVenue();
    const zone: Zone = {
      id: crypto.randomUUID(),
      type: "zone",
      name: "Food Court",
      boundary: [
        { x: 0, z: 0 },
        { x: 4, z: 0 },
        { x: 4, z: 4 },
      ],
      interaction: { type: "info-panel", contentRef: "content/food-court.json" },
    };
    firstFloor(document).zones.push(zone);
    expect(validateVenue(document).valid).toBe(true);

    const missingRef = structuredClone(document) as VenueDocument;
    const broken = firstFloor(missingRef).zones[0];
    if (broken?.interaction) {
      delete broken.interaction.contentRef;
    }
    expect(validateVenue(missingRef).valid).toBe(false);

    const dismissed = structuredClone(document) as VenueDocument;
    const quiet = firstFloor(dismissed).zones[0];
    if (quiet) {
      quiet.interaction = { type: "none" };
    }
    expect(validateVenue(dismissed).valid).toBe(true);
  });

  it.each([
    "invalid/missing-id.json",
    "invalid/bad-uuid.json",
    "invalid/bad-interaction.json",
    "invalid/unsupported-version.json",
  ])("rejects %s", (name) => {
    const result = validateVenue(readExample(name));
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues.length).toBeGreaterThan(0);
    }
  });

  it("rejects text that is not JSON", () => {
    expect(() => loadVenueJson("{")).toThrow(VenueValidationError);
  });
});
