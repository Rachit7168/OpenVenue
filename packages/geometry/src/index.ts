/**
 * Coordinate system shared with venue.json.
 * Snapping, walls, and polygon math are a later phase.
 * Metres, +Y up, right-handed. The floor plan is the XZ plane. Angles are radians.
 */
export const COORDINATE_SYSTEM = {
  lengthUnit: "metres",
  upAxis: "Y",
  handedness: "right",
  angleUnit: "radians",
  planAxes: ["x", "z"],
} as const;
