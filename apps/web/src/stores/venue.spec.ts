import { addFloor } from "@openvenue/editor-core";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { placeCatalogueAsset } from "../assets/place";
import { CATALOGUE } from "../assets/catalogue";
import { useVenueStore } from "./venue";

describe("venue store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("creates an empty venue and round-trips JSON", () => {
    const store = useVenueStore();
    expect(store.document.schemaVersion).toBe("1.0.0");
    expect(store.document.venue.floors).toHaveLength(1);

    const text = store.toJson();
    if (!text) {
      throw new Error("expected JSON");
    }
    expect(text).toContain('"schemaVersion": "1.0.0"');
    store.loadJson(text, "empty.json");
    expect(store.issues).toEqual([]);
    expect(store.status).toBe("Loaded empty.json");
    expect(store.document.project.name).toBe("Untitled venue");
  });

  it("keeps the current venue when the file is invalid", () => {
    const store = useVenueStore();
    store.renameProject("Keep me");
    store.loadJson("{", "broken.json");
    expect(store.issues.length).toBeGreaterThan(0);
    expect(store.document.project.name).toBe("Keep me");
    expect(store.status).toContain("Load failed");
  });

  it("keeps the project id when starting a new venue", () => {
    const store = useVenueStore();
    const id = store.document.project.id;
    store.renameVenue("Hall");
    store.createNew();
    expect(store.document.project.id).toBe(id);
    expect(store.document.venue.name).toBe("Hall");
    expect(store.document.venue.floors[0]?.rooms).toHaveLength(0);
  });

  it("keeps the current name when a rename is empty or too long", () => {
    const store = useVenueStore();
    store.renameVenue("");
    expect(store.document.venue.name).toBe("Untitled venue");
    expect(store.issues[0]).toMatch(/1 and 200/);

    store.renameProject("x".repeat(201));
    expect(store.document.project.name).toBe("Untitled venue");

    store.renameVenue("Main hall");
    const saved = store.toJson();
    expect(saved).toContain("Main hall");
  });

  it("ignores a file load that was superseded", () => {
    const store = useVenueStore();
    const text = store.toJson();
    if (!text) {
      throw new Error("expected JSON");
    }
    const token = store.startLoad();
    store.renameVenue("Newer");
    store.loadJson(text, "late.json", token);
    expect(store.document.venue.name).toBe("Newer");
    expect(store.fileName).toBe("venue.json");
  });

  it("tracks active floor, switches floors, and places stairs on the active floor", () => {
    const store = useVenueStore();
    const upperId = "11111111-1111-4111-8111-111111111111";
    store.execute(
      addFloor({
        id: upperId,
        name: "Level 1",
        level: 1,
        elevation: 3,
        height: 3,
        rooms: [],
        walls: [],
        objects: [],
        zones: [],
      }),
    );
    store.setActiveFloor(upperId);
    expect(store.activeFloorIndex).toBe(1);
    expect(store.activeFloor?.id).toBe(upperId);

    const stairAsset = CATALOGUE.find((item) => item.name.toLowerCase().includes("stair"));
    if (!stairAsset) {
      throw new Error("expected stair asset in catalogue");
    }
    placeCatalogueAsset(store.execute, store.document, stairAsset.id, 2, 3, store.activeFloorId);
    const ground = store.document.venue.floors[0]?.objects[0];
    const placed = store.document.venue.floors[1]?.objects[0];
    expect(placed?.connectsToFloorId).toBe(store.document.venue.floors[0]?.id);
    expect(ground?.connectsToFloorId).toBe(upperId);

    // Undoing object placement and floor addition falls back activeFloor to ground floor
    store.undo();
    store.undo();
    expect(store.document.venue.floors).toHaveLength(1);
    expect(store.activeFloorIndex).toBe(0);
  });
});
