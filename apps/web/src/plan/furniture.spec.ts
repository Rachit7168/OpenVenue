import { describe, expect, it } from "vitest";
import { tableSeats } from "./furniture";

describe("tableSeats", () => {
  it("puts one chair on each long side of a small table", () => {
    const seats = tableSeats(1.2, 0.8);
    expect(seats).toHaveLength(2);
    expect(seats.map((seat) => seat.z)).toEqual([0.8 / 2 + 0.34, -(0.8 / 2 + 0.34)]);
  });
});
