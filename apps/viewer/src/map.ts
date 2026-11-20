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

export type MapCategoryId = (typeof MAP_CATEGORIES)[number]["id"];

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

export interface MapPlace {
  id: string;
  name: string;
  floorId: string;
  floorName: string;
  floorLevel: number;
  category: MapCategoryId;
  categoryLabel: string;
  icon: string;
  color: string;
  blurb: string;
  links: { label: string; href: string; kind?: string }[];
  contentRef?: string;
  x: number;
  z: number;
}

export interface FindCategory {
  id: MapCategoryId;
  label: string;
  count: number;
  byFloor: { floorId: string; floorName: string; floorLevel: number; places: MapPlace[] }[];
}

function asCategory(value: unknown): MapCategoryId {
  const id = typeof value === "string" ? value.trim().toLowerCase() : "";
  return MAP_CATEGORIES.some((item) => item.id === id) ? (id as MapCategoryId) : "other";
}

export function zoneCategory(zone: Zone): MapCategoryId {
  return asCategory(zone.category);
}

export function zoneIcon(zone: Zone): string {
  if (typeof zone.icon === "string" && zone.icon.trim()) {
    return zone.icon.trim();
  }
  const category = zoneCategory(zone);
  const defaults: Record<MapCategoryId, string> = {
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
  return defaults[category];
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
    floor.zones.map((zone) => {
      const category = zoneCategory(zone);
      const centre = zone.boundary.length >= 3 ? polygonCentroid(zone.boundary) : { x: 0, z: 0 };
      const links = Array.isArray(zone.links)
        ? zone.links.flatMap((link) => {
            if (!link || typeof link !== "object" || typeof link.href !== "string") {
              return [];
            }
            return [
              {
                label: typeof link.label === "string" && link.label.trim() ? link.label : "Link",
                href: link.href,
                kind: typeof link.kind === "string" ? link.kind : undefined,
              },
            ];
          })
        : [];
      return {
        id: zone.id,
        name: zone.name,
        floorId: floor.id,
        floorName: floor.name,
        floorLevel: floor.level,
        category,
        categoryLabel: MAP_CATEGORIES.find((item) => item.id === category)?.label ?? "Other",
        icon: zoneIcon(zone),
        color: zoneMapColor(zone),
        blurb: typeof zone.blurb === "string" ? zone.blurb : "",
        links,
        contentRef: zone.interaction?.contentRef,
        x: centre.x,
        z: centre.z,
      };
    }),
  );
}

export function findCategories(document: VenueDocument): FindCategory[] {
  const places = mapPlaces(document);
  return MAP_CATEGORIES.map((category) => {
    const matched = places.filter((place) => place.category === category.id);
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
      id: category.id,
      label: category.label,
      count: matched.length,
      byFloor: [...floors.values()].sort((a, b) => a.floorLevel - b.floorLevel),
    };
  }).filter((category) => category.count > 0);
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
