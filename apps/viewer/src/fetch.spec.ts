import { describe, expect, it } from "vitest";
import { safeContentRef, safeVenueUrl } from "./fetch";

describe("safe fetch helpers", () => {
  it("blocks external venue and content links", () => {
    expect(safeVenueUrl("https://evil.example/venue.json")).toBeNull();
    expect(safeContentRef("https://evil.example/steal")).toBeNull();
    expect(safeContentRef("//evil.example/path")).toBeNull();
  });

  it("allows same-origin relative content", () => {
    expect(safeContentRef("content/food-court.json")).toBe("/content/food-court.json");
  });
});
