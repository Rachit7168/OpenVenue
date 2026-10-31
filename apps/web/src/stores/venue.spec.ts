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
});
