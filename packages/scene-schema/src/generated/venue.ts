/* Generated from src/schema/venue.schema.json. Do not edit by hand. */

/**
 * Open ring of plan points in metres. Do not repeat the first point. Winding is counter-clockwise when viewed from +Y.
 *
 * @minItems 3
 */
export type Polygon = [PlanPoint, PlanPoint, PlanPoint, ...PlanPoint[]];
/**
 * What a visitor click should open. contentRef points at a separate content file or, later, an API resource.
 */
export type Interaction =
  | {
      type: "none";
      /**
       * Path or URI kept outside venue.json, for example content/food-court.json.
       */
      contentRef?: string;
      [k: string]: unknown;
    }
  | {
      type: "info-panel" | "link" | "menu" | "session-list";
      /**
       * Path or URI kept outside venue.json, for example content/food-court.json.
       */
      contentRef: string;
      [k: string]: unknown;
    };

/**
 * OpenVenue venue document v1.0.0. Lengths are metres. World space is right-handed with +Y up. Angles are radians. The floor plan uses X and Z. Unknown properties must be preserved on save. Content referenced by interaction.contentRef lives outside this file.
 */
export interface VenueDocument {
  /**
   * Schema version of this document. Loaders migrate older versions before validation.
   */
  schemaVersion: "1.0.0";
  project: Project;
  coordinateSystem: CoordinateSystem;
  assets: Asset[];
  venue: Venue;
  [k: string]: unknown;
}
export interface Project {
  id: string;
  name: string;
  metadata: Metadata;
  [k: string]: unknown;
}
export interface Metadata {
  createdAt: string;
  updatedAt: string;
  description?: string;
  author?: string;
  /**
   * Tool that last wrote this file, for example openvenue-web.
   */
  generator?: string;
  [k: string]: unknown;
}
/**
 * v1.0.0 allows only this coordinate system. The object is stored so later versions can migrate rather than guess.
 */
export interface CoordinateSystem {
  lengthUnit: "metres";
  upAxis: "Y";
  handedness: "right";
  angleUnit: "radians";
  [k: string]: unknown;
}
export interface Asset {
  id: string;
  name: string;
  format: "glb" | "image" | "audio";
  /**
   * Relative path or URI. Prefer compressed GLB (Draco or meshopt) for visitor devices.
   */
  uri: string;
  license?: string;
  /**
   * Maximum triangles for this model. Used by asset guidelines, not enforced by the schema.
   */
  polygonBudget?: number;
  [k: string]: unknown;
}
export interface Venue {
  id: string;
  name: string;
  floors: Floor[];
  /**
   * Where visitors and the editor camera start. Also used later for entrance and exit checks.
   */
  spawnPoints: SpawnPoint[];
  navigation?: Navigation;
  [k: string]: unknown;
}
export interface Floor {
  id: string;
  name: string;
  /**
   * 0 is ground. Negative values are below ground.
   */
  level: number;
  /**
   * World Y of the floor surface, in metres.
   */
  elevation: number;
  /**
   * Floor-to-floor height in metres.
   */
  height: number;
  rooms: Room[];
  walls: Wall[];
  objects: SceneObject[];
  zones: Zone[];
  [k: string]: unknown;
}
export interface Room {
  id: string;
  name: string;
  boundary: Polygon;
  wallIds?: string[];
  floorMaterial?: string;
  [k: string]: unknown;
}
/**
 * Point on the floor plan. x is world X and z is world Z. Y is up and is not stored on plan points.
 */
export interface PlanPoint {
  x: number;
  z: number;
  [k: string]: unknown;
}
export interface Wall {
  id: string;
  start: PlanPoint;
  end: PlanPoint;
  thickness: number;
  height: number;
  openings?: Opening[];
  [k: string]: unknown;
}
export interface Opening {
  id: string;
  kind: "door" | "window" | "opening";
  /**
   * Distance in metres from the wall start to the near edge of the opening.
   */
  offset: number;
  width: number;
  height: number;
  /**
   * Height of the opening base above the floor, in metres.
   */
  sill?: number;
  [k: string]: unknown;
}
export interface SceneObject {
  id: string;
  type: "generic" | "stage" | "chair" | "table" | "booth" | "screen" | "podium" | "sign" | "custom";
  name: string;
  assetId?: string;
  transform: Transform;
  dimensions?: BoxDimensions;
  /**
   * Free-form subtype when type is custom.
   */
  subtype?: string;
  interaction?: Interaction;
  [k: string]: unknown;
}
export interface Transform {
  position: Vec3;
  /**
   * Euler angles in radians, XYZ order, matching Three.js Euler order XYZ.
   */
  rotation: Vec3;
  scale?: Vec3;
  [k: string]: unknown;
}
/**
 * World-space vector in metres, or Euler angles in radians (XYZ order) when used as a rotation.
 */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
  [k: string]: unknown;
}
/**
 * Placeholder box size in metres before a GLB is bound. width is X, height is Y, depth is Z.
 */
export interface BoxDimensions {
  width: number;
  height: number;
  depth: number;
  [k: string]: unknown;
}
/**
 * Named area such as a food court or sponsor booth. The viewer raycasts this boundary and opens the interaction overlay. The menu or booth copy is not stored here.
 */
export interface Zone {
  id: string;
  type: "zone";
  name: string;
  boundary: Polygon;
  interaction?: Interaction;
  [k: string]: unknown;
}
export interface SpawnPoint {
  id: string;
  name: string;
  floorId: string;
  position: Vec3;
  /**
   * Yaw around +Y, in radians.
   */
  rotationY: number;
  role: "visitor" | "staff" | "exit";
  [k: string]: unknown;
}
/**
 * Optional walkable areas and waypoints. Present so later pathfinding does not require a schema migration.
 */
export interface Navigation {
  walkableAreas?: WalkableArea[];
  waypoints?: Waypoint[];
  [k: string]: unknown;
}
export interface WalkableArea {
  id: string;
  floorId: string;
  boundary: Polygon;
  [k: string]: unknown;
}
export interface Waypoint {
  id: string;
  floorId: string;
  position: Vec3;
  links: string[];
  [k: string]: unknown;
}
