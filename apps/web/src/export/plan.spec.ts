import { createEmptyVenue } from "@openvenue/scene-schema";
import { describe, expect, it } from "vitest";
import { planPdf, planPng, planSvg } from "./plan";

function hall() {
  const document = createEmptyVenue("Export hall");
  const floor = document.venue.floors[0];
  if (!floor) {
    throw new Error("missing floor");
  }
  floor.rooms.push({
    id: "room-1",
    name: "Hall",
    boundary: [
      { x: 0, z: 0 },
      { x: 0, z: 6 },
      { x: 8, z: 6 },
      { x: 8, z: 0 },
    ],
    wallIds: ["wall-1"],
  });
  floor.walls.push({
    id: "wall-1",
    start: { x: 0, z: 0 },
    end: { x: 8, z: 0 },
    thickness: 0.2,
    height: 3,
  });
  floor.objects.push({
    id: "table-1",
    type: "table",
    name: "Table",
    transform: {
      position: { x: 4, y: 0, z: 3 },
      rotation: { x: 0, y: 0, z: 0 },
    },
    dimensions: { width: 1.6, height: 0.75, depth: 0.8 },
  });
  return document;
}

describe("plan export", () => {
  it("draws the hall as SVG, PNG, and a one-page PDF", () => {
    const document = hall();
    const svg = planSvg(document);
    expect(svg).toContain("<svg");
    expect(svg).toContain("Export hall");
    expect(svg).toContain("polygon");

    const png = planPng(document);
    expect(Array.from(png.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(png.length).toBeGreaterThan(100);

    const pdf = planPdf(document);
    const text = new TextDecoder().decode(pdf);
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("Export hall");
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
  });
});
