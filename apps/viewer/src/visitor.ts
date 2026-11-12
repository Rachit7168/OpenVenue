import { pointInPolygon, polygonCentroid } from "@openvenue/geometry";
import type { Floor, VenueDocument, Zone } from "@openvenue/scene-schema";

export type VisitorContentKind = "menu" | "info" | "session-list" | "booth" | "link";

export interface VisitorContent {
  title: string;
  kind: VisitorContentKind;
  body?: string;
  items?: { name: string; detail?: string; price?: string; image?: string; href?: string }[];
  sessions?: { name: string; status: string; queueMinutes?: number }[];
  audio?: string;
  href?: string;
}

export interface DirectoryEntry {
  id: string;
  name: string;
  floorId: string;
  x: number;
  z: number;
  contentRef?: string;
}

export function visitorSpawn(document: VenueDocument): {
  floorId: string;
  x: number;
  z: number;
  yaw: number;
} {
  const spawn =
    document.venue.spawnPoints.find((point) => point.role === "visitor") ??
    document.venue.spawnPoints[0];
  const floor = document.venue.floors[0];
  if (!spawn || !floor) {
    return { floorId: floor?.id ?? "", x: 0, z: 0, yaw: 0 };
  }
  return {
    floorId: spawn.floorId,
    x: spawn.position.x,
    z: spawn.position.z,
    yaw: spawn.rotationY,
  };
}

export function zoneAt(
  document: VenueDocument,
  floorId: string,
  point: { x: number; z: number },
): Zone | undefined {
  const floor = document.venue.floors.find((item) => item.id === floorId);
  return floor?.zones.find(
    (zone) => zone.boundary.length >= 3 && pointInPolygon(point, zone.boundary),
  );
}

export function directory(document: VenueDocument): DirectoryEntry[] {
  return document.venue.floors.flatMap((floor) =>
    floor.zones.map((zone) => {
      const centre = zone.boundary.length >= 3 ? polygonCentroid(zone.boundary) : { x: 0, z: 0 };
      return {
        id: zone.id,
        name: zone.name,
        floorId: floor.id,
        x: centre.x,
        z: centre.z,
        contentRef: zone.interaction?.contentRef,
      };
    }),
  );
}

export function parseContent(value: unknown): VisitorContent {
  if (!value || typeof value !== "object") {
    return { title: "Details", kind: "info" };
  }
  const record = value as Record<string, unknown>;
  const kind: VisitorContentKind =
    record.kind === "menu" ||
    record.kind === "session-list" ||
    record.kind === "booth" ||
    record.kind === "link"
      ? record.kind
      : "info";
  const items = Array.isArray(record.items)
    ? record.items.flatMap((item) => {
        if (
          !item ||
          typeof item !== "object" ||
          typeof (item as { name?: unknown }).name !== "string"
        ) {
          return [];
        }
        const entry = item as {
          name: string;
          detail?: unknown;
          price?: unknown;
          image?: unknown;
          href?: unknown;
          link?: unknown;
        };
        return [
          {
            name: entry.name,
            detail: typeof entry.detail === "string" ? entry.detail : undefined,
            price: typeof entry.price === "string" ? entry.price : undefined,
            image: typeof entry.image === "string" ? entry.image : undefined,
            href:
              typeof entry.href === "string"
                ? entry.href
                : typeof entry.link === "string"
                  ? entry.link
                  : undefined,
          },
        ];
      })
    : undefined;
  const sessions = Array.isArray(record.sessions)
    ? record.sessions.flatMap((item) => {
        if (
          !item ||
          typeof item !== "object" ||
          typeof (item as { name?: unknown }).name !== "string"
        ) {
          return [];
        }
        const entry = item as { name: string; status?: unknown; queueMinutes?: unknown };
        return [
          {
            name: entry.name,
            status: typeof entry.status === "string" ? entry.status : "open",
            queueMinutes: typeof entry.queueMinutes === "number" ? entry.queueMinutes : undefined,
          },
        ];
      })
    : undefined;
  return {
    title: typeof record.title === "string" ? record.title : "Details",
    kind,
    body: typeof record.body === "string" ? record.body : undefined,
    items,
    sessions,
    audio: typeof record.audio === "string" ? record.audio : undefined,
    href: typeof record.href === "string" ? record.href : undefined,
  };
}

export function mapProjection(floor: Floor, width: number, height: number) {
  const points = floor.walls.flatMap((wall) => [wall.start, wall.end]);
  const xs = points.map((point) => point.x);
  const zs = points.map((point) => point.z);
  const minX = Math.min(0, ...xs);
  const maxX = Math.max(1, ...xs);
  const minZ = Math.min(0, ...zs);
  const maxZ = Math.max(1, ...zs);
  const scale = Math.min((width - 20) / (maxX - minX), (height - 20) / (maxZ - minZ));
  return {
    toScreen(x: number, z: number) {
      return { x: 10 + (x - minX) * scale, y: 10 + (z - minZ) * scale };
    },
    toWorld(x: number, y: number) {
      return { x: (x - 10) / scale + minX, z: (y - 10) / scale + minZ };
    },
  };
}

export function liveSummary(content: VisitorContent | null): string {
  const session = content?.sessions?.[0];
  if (!session) {
    return "";
  }
  const wait = session.queueMinutes === undefined ? "" : `, ${session.queueMinutes} min`;
  return `${session.name}: ${session.status}${wait}`;
}
