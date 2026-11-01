import { describe, expect, it } from "vitest";
import { benchmarkVenue } from "./benchmark-scene.js";
import { capacityOf } from "./capacity.js";
import { checkVenue } from "./checks.js";

function elapsed(run: () => void): number {
  const start = performance.now();
  run();
  return performance.now() - start;
}

describe("benchmark scenes", () => {
  it("keeps 500 tables and 2,000 chairs inside the room", () => {
    const tables = benchmarkVenue(500, "table");
    const chairs = benchmarkVenue(2000, "chair");
    expect(tables.venue.floors[0]?.objects).toHaveLength(500);
    expect(chairs.venue.floors[0]?.objects).toHaveLength(2000);
    expect(checkVenue(tables).some((warning) => warning.ruleId === "object.outside-floor")).toBe(
      false,
    );
    expect(checkVenue(chairs).some((warning) => warning.ruleId === "object.overlap")).toBe(false);
    expect(capacityOf(chairs).seats).toBe(2000);
  });

  it("finishes planning checks for the benchmark halls", () => {
    const tables = benchmarkVenue(500, "table");
    const chairs = benchmarkVenue(2000, "chair");
    checkVenue(tables);
    checkVenue(chairs);
    const tableMs = elapsed(() => checkVenue(tables));
    const chairMs = elapsed(() => checkVenue(chairs));
    const capacityMs = elapsed(() => capacityOf(chairs));
    expect(tableMs).toBeLessThan(5_000);
    expect(chairMs).toBeLessThan(20_000);
    expect(capacityMs).toBeLessThan(2_000);
  });
});
