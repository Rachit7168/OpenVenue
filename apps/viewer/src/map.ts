import { polygonCentroid } from "@openvenue/geometry";
import type { Floor, MapMarker, VenueDocument, Zone } from "@openvenue/scene-schema";

export type MapViewMode = "2d" | "3d" | "walk";

export const MAP_CATEGORIES = [
  { id: "stages", label: "Stages" },
  { id: "meeting-rooms", label: "Meeting rooms" },
  { id: "community", label: "Community" },
  { id: "supporters", label: "Supporters" },
  { id: "food-drink", label: "Food & drink" },
  { id: "washrooms", label: "Washrooms" },
  { id: "cowork", label: "Cowork & discussion" },
  { id: "check-in", label: "Check-in & swag" },
  { id: "fun-rest", label: "Fun & rest" },
  { id: "other", label: "Other" },
] as const;

export type KnownMapCategoryId = (typeof MAP_CATEGORIES)[number]["id"];

const CATEGORY_COLORS: Record<string, string> = {
  stages: "#93c5fd",
  "meeting-rooms": "#c4b5fd",
  community: "#f9a8d4",
  supporters: "#fdba74",
  "food-drink": "#86efac",
  washrooms: "#a5b4fc",
  cowork: "#fde68a",
  "check-in": "#67e8f9",
  "fun-rest": "#fca5a5",
  other: "#d4d4d8",
};

const ICON_GLYPH: Record<string, string> = {
  stage: "✦",
  food: "☕",
  booth: "▣",
  game: "🎮",
  laptop: "💻",
  washroom: "WC",
  entrance: "→",
  music: "♪",
  tent: "⛺",
  other: "•",
};

export interface MapLink {
  label: string;
  href: string;
  kind?: string;
}

export interface MapPlace {
  id: string;
  name: string;
  floorId: string;
  floorName: string;
  floorLevel: number;
  category: string;
  categoryLabel: string;
  icon: string;
  color: string;
  blurb: string;
  links: MapLink[];
  contentRef?: string;
  x: number;
  z: number;
}

export interface FindCategory {
  id: string;
  label: string;
  count: number;
  byFloor: { floorId: string; floorName: string; floorLevel: number; places: MapPlace[] }[];
}

export function safeExternalHref(href: string | undefined | null): string | null {
  if (typeof href !== "string") {
    return null;
  }
  const trimmed = href.trim();
  if (!trimmed) {
    return null;
  }
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed)?.[1]?.toLowerCase();
  if (!scheme) {
    return null;
  }
  if (scheme === "mailto") {
    return trimmed;
  }
  if (scheme === "http" || scheme === "https") {
    // Reject obvious script / data payloads even if scheme looks fine.
    if (/[\s<>"']/.test(trimmed) || trimmed.toLowerCase().includes("javascript:")) {
      return null;
    }
    return trimmed;
  }
  return null;
}

export function sanitizeLinks(
  links: { label?: string; href: string; kind?: string }[] | undefined,
): MapLink[] {
  if (!Array.isArray(links)) {
    return [];
  }
  return links.flatMap((link) => {
    const href = safeExternalHref(link.href);
    if (!href) {
      return [];
    }
    return [
      {
        href,
        label: typeof link.label === "string" && link.label.trim() ? link.label.trim() : "Link",
        kind: typeof link.kind === "string" ? link.kind : undefined,
      },
    ];
  });
}

function zoneVisible(zone: Zone): boolean {
  return (zone as { visible?: unknown }).visible !== false;
}

function categoryLabelFor(id: string): string {
  const known = MAP_CATEGORIES.find((item) => item.id === id);
  if (known) {
    return known.label;
  }
  return id
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function zoneCategory(zone: Zone): string {
  if (typeof zone.category === "string" && zone.category.trim()) {
    return zone.category.trim().toLowerCase();
  }
  return "other";
}

export function zoneIcon(zone: Zone): string {
  if (typeof zone.icon === "string" && zone.icon.trim()) {
    return zone.icon.trim();
  }
  const category = zoneCategory(zone);
  const defaults: Record<string, string> = {
    stages: "stage",
    "meeting-rooms": "laptop",
    community: "tent",
    supporters: "booth",
    "food-drink": "food",
    washrooms: "washroom",
    cowork: "laptop",
    "check-in": "entrance",
    "fun-rest": "game",
    other: "other",
  };
  return defaults[category] ?? "other";
}

export function zoneMapColor(zone: Zone): string {
  if (typeof zone.mapColor === "string" && zone.mapColor.trim()) {
    return zone.mapColor.trim();
  }
  if (typeof zone.color === "string" && zone.color.trim()) {
    return zone.color.trim();
  }
  return CATEGORY_COLORS[zoneCategory(zone)] ?? CATEGORY_COLORS.other!;
}

export function iconGlyph(icon: string): string {
  return ICON_GLYPH[icon] ?? ICON_GLYPH.other!;
}

export function mapPlaces(document: VenueDocument): MapPlace[] {
  return document.venue.floors.flatMap((floor) =>
    floor.zones.filter(zoneVisible).map((zone) => {
      const category = zoneCategory(zone);
      const centre = zone.boundary.length >= 3 ? polygonCentroid(zone.boundary) : { x: 0, z: 0 };
      return {
        id: zone.id,
        name: zone.name,
        floorId: floor.id,
        floorName: floor.name,
        floorLevel: floor.level,
        category,
        categoryLabel: categoryLabelFor(category),
        icon: zoneIcon(zone),
        color: zoneMapColor(zone),
        blurb: typeof zone.blurb === "string" ? zone.blurb : "",
        links: sanitizeLinks(
          Array.isArray(zone.links)
            ? zone.links.flatMap((link) =>
                link && typeof link === "object" && typeof link.href === "string"
                  ? [
                      {
                        href: link.href,
                        label: typeof link.label === "string" ? link.label : undefined,
                        kind: typeof link.kind === "string" ? link.kind : undefined,
                      },
                    ]
                  : [],
              )
            : [],
        ),
        contentRef: zone.interaction?.contentRef,
        x: centre.x,
        z: centre.z,
      };
    }),
  );
}

export function findCategories(document: VenueDocument): FindCategory[] {
  const places = mapPlaces(document);
  const order = new Map<string, number>(MAP_CATEGORIES.map((item, index) => [item.id, index]));
  const ids = [...new Set(places.map((place) => place.category))];
  ids.sort((left, right) => {
    const leftOrder = order.get(left) ?? MAP_CATEGORIES.length;
    const rightOrder = order.get(right) ?? MAP_CATEGORIES.length;
    return leftOrder - rightOrder || left.localeCompare(right);
  });
  return ids.map((categoryId) => {
    const matched = places.filter((place) => place.category === categoryId);
    const floors = new Map<string, FindCategory["byFloor"][number]>();
    for (const place of matched) {
      let group = floors.get(place.floorId);
      if (!group) {
        group = {
          floorId: place.floorId,
          floorName: place.floorName,
          floorLevel: place.floorLevel,
          places: [],
        };
        floors.set(place.floorId, group);
      }
      group.places.push(place);
    }
    return {
      id: categoryId,
      label: categoryLabelFor(categoryId),
      count: matched.length,
      byFloor: [...floors.values()].sort((a, b) => a.floorLevel - b.floorLevel),
    };
  });
}

export function searchPlaces(document: VenueDocument, query: string): MapPlace[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return [];
  }
  return mapPlaces(document).filter((place) => {
    const haystack = [
      place.name,
      place.categoryLabel,
      place.category,
      place.floorName,
      `l${place.floorLevel}`,
      place.blurb,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

export function floorMarkers(floor: Floor): MapMarker[] {
  return Array.isArray(floor.mapMarkers) ? floor.mapMarkers : [];
}

export function floorsForChrome(
  document: VenueDocument,
): { id: string; label: string; level: number }[] {
  return [...document.venue.floors]
    .sort((a, b) => b.level - a.level || b.elevation - a.elevation)
    .map((floor) => ({
      id: floor.id,
      label: `L${floor.level}`,
      level: floor.level,
    }));
}

/** Places visible when a single floor filter is active (null = all floors). */
export function placesForFloorFilter(document: VenueDocument, floorId: string | null): MapPlace[] {
  const places = mapPlaces(document);
  if (floorId === null) {
    return places;
  }
  return places.filter((place) => place.floorId === floorId);
}

export function mergePlaceDetails(
  place: MapPlace,
  content: { body?: string; links?: MapLink[]; icon?: string; title?: string },
): { title: string; body: string; links: MapLink[]; icon: string } {
  const contentLinks = sanitizeLinks(content.links);
  const seen = new Set(contentLinks.map((link) => link.href));
  const links = [
    ...contentLinks,
    ...place.links.filter((link) => {
      if (seen.has(link.href)) {
        return false;
      }
      seen.add(link.href);
      return true;
    }),
  ];
  const body =
    typeof content.body === "string" && content.body.trim()
      ? content.body
      : place.blurb || "No extra details are attached.";
  return {
    title: content.title?.trim() || place.name,
    body,
    links,
    icon: content.icon || place.icon,
  };
}
