export {
  DEFAULT_ENDPOINT_TOLERANCE,
  DEFAULT_GRID,
  DEFAULT_WALL_TOLERANCE,
  snapPoint,
  snapToGrid,
  type GridSettings,
  type SnapOptions,
  type SnapResult,
  type SnapWall,
} from "./grid.js";
export {
  isCounterClockwise,
  pointInPolygon,
  polygonArea,
  polygonCentroid,
  polygonSelfIntersects,
  segmentIntersection,
  signedArea,
  type SegmentHit,
} from "./polygon.js";
export {
  validateGeometry,
  validateRoomBoundary,
  validateWall,
  type GeometryIssue,
  type GeometrySeverity,
  type WallToValidate,
} from "./validate.js";
export {
  buildRectangularRoom,
  openingSpan,
  wallAngle,
  wallLength,
  wallMidpoint,
  type OpeningPlacement,
  type OpeningSpan,
  type RectangularRoom,
  type WallLine,
} from "./wall.js";
export {
  LENGTH_EPSILON,
  degreesToRadians,
  distance,
  formatDegrees,
  nearlyEqual,
  planToWorld,
  quantize,
  radiansToDegrees,
  worldToPlan,
  type Vec2,
  type Vec3,
} from "./vec.js";
