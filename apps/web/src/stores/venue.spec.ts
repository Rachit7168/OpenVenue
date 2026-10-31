import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
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

  it("keeps the current name when a rename is empty or too long", () => {
    const store = useVenueStore();
    store.renameVenue("");
    expect(store.document.venue.name).toBe("Untitled venue");
    expect(store.issues[0]).toMatch(/1 and 200/);

    store.renameProject("x".repeat(201));
    expect(store.document.project.name).toBe("Untitled venue");
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
});
