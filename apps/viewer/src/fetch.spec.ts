import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  publicContentFetchUrl,
  publicVenueIdFromUrl,
  safeContentRef,
  safeVenueUrl,
  trustedApiOrigins,
} from "./fetch";

describe("safe fetch helpers", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { location: { origin: "http://localhost:5174" } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("blocks arbitrary external venue URLs", () => {
    expect(safeVenueUrl("https://evil.example/venue.json")).toBeNull();
    expect(safeContentRef("https://evil.example/steal")).toBeNull();
    expect(safeContentRef("//evil.example/path")).toBeNull();
  });

  it("allows same-origin public venue API paths", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    expect(safeVenueUrl(`/api/v1/public/venues/${id}/`)).toContain(id);
  });

  it("allows configured API origins for venue.json", () => {
    vi.stubEnv("VITE_API_ORIGIN", "http://localhost:8000");
    expect(trustedApiOrigins()).toEqual(["http://localhost:8000"]);
    expect(
      safeVenueUrl(
        "http://localhost:8000/api/v1/public/venues/11111111-1111-4111-8111-111111111111/",
      ),
    ).toBeTruthy();
  });

  it("parses public venue ids for content API refresh", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    const parsed = publicVenueIdFromUrl(`http://localhost/api/v1/public/venues/${id}/`);
    expect(parsed?.venueId).toBe(id);
    expect(publicContentFetchUrl(id, "http://localhost", "content/food-court.json")).toBe(
      "http://localhost/api/v1/public/venues/11111111-1111-4111-8111-111111111111/content/?ref=content%2Ffood-court.json",
    );
  });

  it("allows same-origin relative content", () => {
    expect(safeContentRef("content/food-court.json")).toBe("/content/food-court.json");
  });
});
