import { describe, expect, it } from "vitest";
import { wrapFocusIndex } from "./focus.js";

describe("wrapFocusIndex", () => {
  it("wraps forward and backward inside a dialog", () => {
    expect(wrapFocusIndex(3, 2, false)).toBe(0);
    expect(wrapFocusIndex(3, 0, true)).toBe(2);
    expect(wrapFocusIndex(3, 1, false)).toBe(2);
    expect(wrapFocusIndex(0, 0, false)).toBe(-1);
  });
});
