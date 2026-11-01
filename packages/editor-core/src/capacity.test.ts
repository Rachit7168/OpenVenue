import { createEmptyVenue } from "@openvenue/scene-schema";
import { describe, expect, it } from "vitest";
import { CAPACITY_NOTE, capacityOf } from "./capacity.js";

function furnished() {
  const document = createEmptyVenue("Hall");
  const floor = document.venue.floors[0];
  if (!floor) {
    throw new Error("missing floor");
  }
  floor.rooms.push({
    id: "room-1",
    name: "Hall",
    boundary: [
      { x: 0, z: 0 },
      { x: 0, z: 8 },
      { x: 10, z: 8 },
      { x: 10, z: 0 },
    ],
    wallIds: [],
  });
  floor.objects.push(
    {
      id: "chair-1",
      type: "chair",
      name: "Chair",
      transform: { position: { x: 2, y: 0, z: 2 }, rotation: { x: 0, y: 0, z: 0 } },
      dimensions: { width: 0.5, height: 0.9, depth: 0.5 },
    },
    {
      id: "table-1",
      type: "table",
      name: "Table",
      transform: { position: { x: 4, y: 0, z: 2 }, rotation: { x: 0, y: 0, z: 0 } },
      dimensions: { width: 1, height: 0.75, depth: 1 },
    },
    {
      id: "booth-1",
      type: "booth",
      name: "Booth",
      transform: { position: { x: 2, y: 0, z: 6 }, rotation: { x: 0, y: 0, z: 0 } },
      dimensions: { width: 2, height: 2.4, depth: 2 },
    },
    {
      id: "stage-1",
      type: "stage",
      name: "Stage",
      transform: { position: { x: 7, y: 0, z: 6 }, rotation: { x: 0, y: 0, z: 0 } },
      dimensions: { width: 4, height: 0.4, depth: 2 },
    },
    {
      id: "podium-1",
      type: "podium",
      name: "Podium",
      transform: { position: { x: 7, y: 0.4, z: 6 }, rotation: { x: 0, y: 0, z: 0 } },
      dimensions: { width: 0.6, height: 1.1, depth: 0.5 },
    },
    {
      id: "hidden",
      type: "chair",
      name: "Hidden",
      visible: false,
      transform: { position: { x: 1, y: 0, z: 1 }, rotation: { x: 0, y: 0, z: 0 } },
      dimensions: { width: 0.5, height: 0.9, depth: 0.5 },
    },
  );
  return document;
}

describe("capacity", () => {
  it("sums room area and keeps a podium on the stage out of the total", () => {
    expect(capacityOf(createEmptyVenue()).estimate).toBe(0);
    const report = capacityOf(furnished(), 2);
    expect(report.total).toBeCloseTo(80);
    expect(report.seating).toBeCloseTo(1.25);
    expect(report.exhibition).toBeCloseTo(4);
    expect(report.stage).toBeCloseTo(8);
    expect(report.occupied).toBeCloseTo(13.25);
    expect(report.free).toBeCloseTo(66.75);
    expect(report.circulation).toBeCloseTo(report.free);
    expect(report.seats).toBe(1);
    expect(report.estimate).toBe(40);
    expect(CAPACITY_NOTE).toMatch(/not an approved occupancy/);
  });
});
