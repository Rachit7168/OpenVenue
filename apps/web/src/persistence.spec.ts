import { createEmptyVenue } from "@openvenue/scene-schema";
import { describe, expect, it } from "vitest";
import {
  createMemoryDatabase,
  newerDocument,
  openVenueDatabase,
  SNAPSHOT_LIMIT,
} from "./persistence";

describe("venue persistence", () => {
  it("keeps the newer snapshot and only the last few copies", async () => {
    const current = createEmptyVenue("Hall");
    const newer = structuredClone(current);
    newer.project.metadata.updatedAt = "2099-01-01T00:00:00.000Z";
    newer.project.name = "Recovered hall";
    expect(newerDocument(current, newer).project.name).toBe("Recovered hall");
    expect(newerDocument(newer, current).project.name).toBe("Recovered hall");

    const database = createMemoryDatabase();
    for (let index = 0; index < SNAPSHOT_LIMIT + 2; index += 1) {
      const copy = structuredClone(current);
      copy.project.metadata.updatedAt = `2026-01-0${index + 1}T00:00:00.000Z`;
      await database.addSnapshot(copy);
    }
    const latest = await database.latestSnapshot(current.project.id);
    expect(latest?.project.metadata.updatedAt).toBe("2026-01-07T00:00:00.000Z");
  });

  it("round-trips a project through the browser database", async () => {
    const database = await openVenueDatabase();
    const document = createEmptyVenue("Stored hall");
    await database.put(document);
    await database.addSnapshot(document);
    const listed = await database.list();
    expect(listed.map((item) => item.project.name)).toContain("Stored hall");
    expect((await database.latestSnapshot(document.project.id))?.project.name).toBe("Stored hall");
    await database.remove(document.project.id);
    expect(await database.latestSnapshot(document.project.id)).toBeNull();
  });
});
