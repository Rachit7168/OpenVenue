import { describe, expect, it } from "vitest";
import { validateGeometry } from "./index.js";

describe("validation package", () => {
  it("exposes geometry rules alongside the schema validator", () => {
    const issues = validateGeometry({
      walls: [
        {
          id: "wall-1",
          start: { x: 0, z: 0 },
          end: { x: 0, z: 0 },
          thickness: 0.2,
          height: 3,
        },
      ],
    });
    expect(issues).toEqual([
      {
        ruleId: "wall.zero-length",
        severity: "error",
        message: "Wall length must be greater than zero.",
        objectIds: ["wall-1"],
      },
    ]);
  });
});
