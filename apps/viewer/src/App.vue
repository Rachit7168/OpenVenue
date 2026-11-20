<script setup lang="ts">
import { mountVenueView, type VenueView } from "@openvenue/renderer-3d";
import { loadVenueJson, type VenueDocument } from "@openvenue/scene-schema";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { publicContentFetchUrl, publicVenueIdFromUrl, safeContentRef, safeVenueUrl } from "./fetch";
import DialogChrome from "./DialogChrome.vue";
import { trapTabKey } from "./focus";
import {
  findCategories,
  floorsForChrome,
  floorMarkers,
  iconGlyph,
  mapPlaces,
  mergePlaceDetails,
  searchPlaces,
  zoneMapColor,
  type FindCategory,
  type MapPlace,
  type MapViewMode,
} from "./map";
import { clearChromePopover, closeChromePanels, openChromePopover } from "./panels";
import {
  liveSummary,
  mapProjection,
  parseContent,
  visitorSpawn,
  zoneAt,
  type VisitorContent,
} from "./visitor";

const status = ref("Open a venue.json file, or add ?url= to this page.");
const document = ref<VenueDocument | null>(null);
const floorId = ref<string | null>(null);
const selectedPlaceId = ref<string | null>(null);
const panel = ref<VisitorContent | null>(null);
const muted = ref(true);
const quality = ref<"simple" | "high">("simple");
const viewMode = ref<MapViewMode>("3d");
const findOpen = ref(false);
const searchOpen = ref(false);
const searchQuery = ref("");
const expandedCategory = ref<string | null>(null);
const hintsVisible = ref(true);
const canvas = ref<HTMLCanvasElement | null>(null);
const map2d = ref<HTMLCanvasElement | null>(null);
const dialogChrome = ref<InstanceType<typeof DialogChrome> | null>(null);
const findPanel = computed(() => dialogChrome.value?.findPanel ?? null);
const searchPanel = computed(() => dialogChrome.value?.searchPanel ?? null);
const popoverPanel = computed(() => dialogChrome.value?.popoverPanel ?? null);
const mapPan = ref({ x: 0, y: 0 });
const mapZoom = ref(1);
const mapPointers = new Map<number, { x: number; y: number }>();
let mapDrag: {
  pointerId: number;
  button: number;
  x: number;
  y: number;
  panX: number;
  panY: number;
} | null = null;
let mapPinch: { distance: number; zoom: number } | null = null;
let view: VenueView | null = null;
let restoreFocus: HTMLElement | null = null;
let audio: HTMLAudioElement | null = null;
let ambient: HTMLAudioElement | null = null;
let frame = 0;
let contentGeneration = 0;
let refreshTimer: ReturnType<typeof setInterval> | null = null;
const activeContentRef = ref<string | null>(null);
const publicVenue = ref<{ venueId: string; apiOrigin: string } | null>(null);
const walkForward = ref(0);
const walkStrafe = ref(0);
const hoverZoneId = ref<string | null>(null);
const popover = ref<MapPlace | null>(null);
let syncingUrl = false;

const categories = computed(() => (document.value ? findCategories(document.value) : []));
const searchResults = computed(() =>
  document.value ? searchPlaces(document.value, searchQuery.value) : [],
);
const floorButtons = computed(() => (document.value ? floorsForChrome(document.value) : []));
const live = computed(() => liveSummary(panel.value));
const selectedPlace = computed(() =>
  document.value && selectedPlaceId.value
    ? (mapPlaces(document.value).find((place) => place.id === selectedPlaceId.value) ?? null)
    : null,
);

function writeUrl() {
  if (syncingUrl || typeof window === "undefined") {
    return;
  }
  const url = new URL(window.location.href);
  if (viewMode.value === "3d") {
    url.searchParams.delete("view");
  } else {
    url.searchParams.set("view", viewMode.value);
  }
  if (floorId.value) {
    url.searchParams.set("floor", floorId.value);
  } else {
    url.searchParams.delete("floor");
  }
  if (selectedPlaceId.value) {
    url.searchParams.set("place", selectedPlaceId.value);
  } else {
    url.searchParams.delete("place");
  }
  window.history.replaceState({}, "", url);
}

function stopContentRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

function applyCameraForMode() {
  if (!view) {
    return;
  }
  if (viewMode.value === "walk") {
    // Set the walk floor before entering walk so beginWalk stays on that level.
    if (floorId.value) {
      view.setShownFloor(floorId.value);
    }
    view.setCameraMode("walk");
    view.setWalkClick(true);
    if (selectedPlaceId.value) {
      view.setSelected(selectedPlaceId.value);
    }
    return;
  }
  view.setWalkClick(false);
  view.setWalkTarget(null);
  view.setCameraMode("map");
  view.setMapFloor(floorId.value);
  if (selectedPlaceId.value) {
    view.setSelected(selectedPlaceId.value);
  }
  view.fit();
}

function setFloorFilter(next: string | null) {
  floorId.value = next;
  mapPan.value = { x: 0, y: 0 };
  mapZoom.value = 1;
  if (viewMode.value === "walk") {
    if (next) {
      view?.setShownFloor(next);
    }
  } else {
    view?.setMapFloor(next);
    view?.fit();
  }
  writeUrl();
  drawMap2d();
}

function setViewMode(next: MapViewMode) {
  viewMode.value = next;
  applyCameraForMode();
  writeUrl();
  void nextTick(() => {
    resizeSurfaces();
    drawMap2d();
  });
}

function drawMap2d() {
  const surface = map2d.value;
  const current = document.value;
  if (!surface || !current || viewMode.value !== "2d") {
    return;
  }
  const floors =
    floorId.value === null
      ? [...current.venue.floors].sort((a, b) => a.level - b.level)
      : current.venue.floors.filter((floor) => floor.id === floorId.value);
  const context = surface.getContext("2d");
  if (!context) {
    return;
  }
  const width = surface.width;
  const height = surface.height;
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#eef1f8";
  context.fillRect(0, 0, width, height);
  if (floors.length === 0) {
    return;
  }
  const stack = floors.length > 1;
  const sliceHeight = stack ? height / floors.length : height;
  const placesById = new Map(mapPlaces(current).map((place) => [place.id, place]));
  const showIcons = mapZoom.value >= 0.85;
  floors.forEach((floor, index) => {
    const offsetY = stack ? (floors.length - 1 - index) * sliceHeight : 0;
    const project = mapProjection(floor, width, sliceHeight - 16).toScreen;
    context.save();
    context.translate(mapPan.value.x, mapPan.value.y);
    context.scale(mapZoom.value, mapZoom.value);
    context.translate(0, offsetY + 8);
    context.strokeStyle = "#64748b";
    context.lineWidth = 2;
    for (const wall of floor.walls) {
      const start = project(wall.start.x, wall.start.z);
      const end = project(wall.end.x, wall.end.z);
      context.beginPath();
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
      context.stroke();
    }
    for (const zone of floor.zones) {
      if (zone.boundary.length < 3 || (zone as { visible?: unknown }).visible === false) {
        continue;
      }
      const place = placesById.get(zone.id);
      const active = selectedPlaceId.value === zone.id || hoverZoneId.value === zone.id;
      context.beginPath();
      const first = project(zone.boundary[0]!.x, zone.boundary[0]!.z);
      context.moveTo(first.x, first.y);
      for (let i = 1; i < zone.boundary.length; i += 1) {
        const point = project(zone.boundary[i]!.x, zone.boundary[i]!.z);
        context.lineTo(point.x, point.y);
      }
      context.closePath();
      context.fillStyle = zoneMapColor(zone);
      context.globalAlpha = active ? 1 : 0.85;
      context.fill();
      context.globalAlpha = 1;
      context.strokeStyle = active ? "#0f172a" : "#475569";
      context.lineWidth = active ? 2.5 : 1;
      context.stroke();
      if (showIcons) {
        const centre = project(place?.x ?? 0, place?.z ?? 0);
        context.fillStyle = "#0f172a";
        context.font = "12px sans-serif";
        context.textAlign = "center";
        context.fillText(iconGlyph(place?.icon ?? "other"), centre.x, centre.y + 4);
      }
    }
    for (const marker of floorMarkers(floor)) {
      const point = project(marker.position.x, marker.position.z);
      const yaw = marker.rotationY ?? 0;
      context.save();
      context.translate(point.x, point.y);
      if (marker.kind === "stair" || marker.kind === "elevator") {
        context.fillStyle = "#34d399";
        context.fillRect(-5, -5, 10, 10);
        context.fillStyle = "#0f172a";
        context.font = "9px sans-serif";
        context.textAlign = "center";
        context.fillText(marker.kind === "stair" ? "S" : "↑", 0, 3);
      } else {
        // mapProjection maps +Z to canvas +Y; schema/3D treat yaw 0 as +Z.
        context.fillStyle = marker.kind === "exit" ? "#fb7185" : "#1d4ed8";
        context.rotate(yaw);
        context.beginPath();
        context.moveTo(0, 6);
        context.lineTo(5, -4);
        context.lineTo(-5, -4);
        context.closePath();
        context.fill();
      }
      context.restore();
      if (marker.label) {
        context.fillStyle = "#334155";
        context.font = "10px sans-serif";
        context.textAlign = "center";
        context.fillText(marker.label, point.x, point.y + 14);
      }
    }
    context.fillStyle = "#334155";
    context.font = "bold 12px sans-serif";
    context.textAlign = "left";
    context.fillText(`L${floor.level} · ${floor.name}`, 12, 14);
    context.restore();
  });
}

async function openDocument(text: string) {
  stopContentRefresh();
  contentGeneration += 1;
  const loaded = loadVenueJson(text);
  document.value = loaded;
  const spawn = visitorSpawn(loaded);
  const params = new URLSearchParams(window.location.search);
  const requestedFloor = params.get("floor");
  const requestedPlace = params.get("place");
  const requestedView = params.get("view");
  floorId.value =
    requestedFloor && loaded.venue.floors.some((floor) => floor.id === requestedFloor)
      ? requestedFloor
      : null;
  if (requestedView === "2d" || requestedView === "3d" || requestedView === "walk") {
    viewMode.value = requestedView;
  } else {
    viewMode.value = "3d";
  }
  panel.value = null;
  popover.value = null;
  selectedPlaceId.value = null;
  activeContentRef.value = null;
  status.value = loaded.project.name;
  view?.setDocument(loaded);
  if (viewMode.value === "walk" && !floorId.value) {
    floorId.value = spawn.floorId;
  }
  applyCameraForMode();
  if (requestedPlace) {
    const place = mapPlaces(loaded).find((item) => item.id === requestedPlace);
    if (place) {
      await selectPlace(place, false);
    }
  }
  writeUrl();
  drawMap2d();
}

async function onFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) {
    return;
  }
  publicVenue.value = null;
  status.value = "Loading venue…";
  await openDocument(await file.text());
}

async function openContent(contentRef: string | undefined, fallback?: MapPlace) {
  stopContentRefresh();
  const generation = ++contentGeneration;
  if (!contentRef) {
    activeContentRef.value = null;
    if (fallback) {
      const merged = mergePlaceDetails(fallback, {});
      panel.value = {
        title: merged.title,
        kind: "info",
        body: merged.body,
        icon: merged.icon,
        links: merged.links,
      };
      return;
    }
    panel.value = { title: "This area", kind: "info", body: "No extra details are attached." };
    return;
  }
  const safe = safeContentRef(contentRef);
  if (!safe) {
    activeContentRef.value = null;
    panel.value = {
      title: "Blocked link",
      kind: "info",
      body: "That content reference is not allowed.",
    };
    return;
  }
  activeContentRef.value = contentRef;
  status.value = "Loading zone details…";
  const fetchUrl =
    publicVenue.value && !contentRef.includes("://")
      ? publicContentFetchUrl(publicVenue.value.venueId, publicVenue.value.apiOrigin, contentRef)
      : safe;
  try {
    const response = await fetch(fetchUrl);
    if (generation !== contentGeneration) {
      return;
    }
    if (!response.ok) {
      console.warn(`Venue content failed (${response.status}): ${contentRef}`);
    }
    const payload = response.ok ? await response.json() : null;
    if (generation !== contentGeneration) {
      return;
    }
    const parsed = parseContent(payload);
    if (fallback) {
      const merged = mergePlaceDetails(fallback, parsed);
      panel.value = {
        ...parsed,
        title: merged.title,
        body: merged.body,
        icon: merged.icon,
        links: merged.links,
      };
    } else {
      panel.value = parsed;
    }
    status.value = document.value?.project.name ?? "Visitor";
  } catch (error) {
    if (generation !== contentGeneration) {
      return;
    }
    console.warn("Venue content request failed", error);
    if (fallback) {
      const merged = mergePlaceDetails(fallback, {});
      panel.value = {
        title: merged.title,
        kind: "info",
        body: fallback.blurb || "The content file could not be loaded.",
        icon: merged.icon,
        links: merged.links,
      };
    } else {
      panel.value = {
        title: "Details",
        kind: "info",
        body: "The content file could not be loaded.",
      };
    }
    status.value = document.value?.project.name ?? "Visitor";
  }
  if (generation !== contentGeneration) {
    return;
  }
  if (audio) {
    audio.pause();
    audio = null;
  }
  const source = panel.value?.audio ? safeContentRef(panel.value.audio) : null;
  if (source && !muted.value) {
    audio = new Audio(source);
    void audio.play().catch(() => undefined);
  }
}

async function selectPlace(place: MapPlace, dismissPanels = true) {
  stopContentRefresh();
  captureRestoreFocus();
  selectedPlaceId.value = place.id;
  if (dismissPanels) {
    findOpen.value = false;
    searchOpen.value = false;
  }
  const chrome = openChromePopover({
    findOpen: findOpen.value,
    searchOpen: searchOpen.value,
    popoverOpen: false,
  });
  findOpen.value = chrome.findOpen;
  searchOpen.value = chrome.searchOpen;
  popover.value = place;
  view?.setSelected(place.id);
  if (viewMode.value === "walk") {
    floorId.value = place.floorId;
    view?.setShownFloor(place.floorId);
    view?.setWalkTarget({ x: place.x, z: place.z });
  } else if (floorId.value !== null && floorId.value !== place.floorId) {
    setFloorFilter(place.floorId);
  }
  await openContent(place.contentRef, place);
  writeUrl();
  drawMap2d();
}

function clearSelection() {
  stopContentRefresh();
  contentGeneration += 1;
  selectedPlaceId.value = null;
  clearChromePopover({
    findOpen: findOpen.value,
    searchOpen: searchOpen.value,
    popoverOpen: true,
  });
  popover.value = null;
  panel.value = null;
  activeContentRef.value = null;
  view?.setSelected(null);
  writeUrl();
  drawMap2d();
  void nextTick(() => restoreChromeFocus());
}

function applyWalkAxes() {
  view?.setWalkAxes({ forward: walkForward.value, strafe: walkStrafe.value });
}

function setWalkStep(forward: number, strafe: number) {
  walkForward.value = forward;
  walkStrafe.value = strafe;
  applyWalkAxes();
}

function itemImageSrc(image: string | undefined): string | null {
  return image ? safeContentRef(image) : null;
}

function activeFloorIdForPick(): string | null {
  if (floorId.value) {
    return floorId.value;
  }
  return view?.position()?.floorId ?? document.value?.venue.floors[0]?.id ?? null;
}

function onSceneHover(event: MouseEvent) {
  // In 3D map All-floors mode, plane picking is ambiguous; selection comes from mesh picks.
  if (viewMode.value === "2d" || (viewMode.value === "3d" && floorId.value === null)) {
    hoverZoneId.value = null;
    return;
  }
  const current = document.value;
  const floor = activeFloorIdForPick();
  const point = view?.floorPoint(event.clientX, event.clientY);
  if (!current || !floor || !point) {
    hoverZoneId.value = null;
    return;
  }
  const zone = zoneAt(current, floor, point);
  hoverZoneId.value = zone?.id ?? null;
}

function onSceneClick(event: MouseEvent) {
  // 3D map selection is handled by renderer mesh picks (works for All floors).
  if (viewMode.value !== "walk") {
    return;
  }
  const current = document.value;
  const floor = activeFloorIdForPick();
  const point = view?.floorPoint(event.clientX, event.clientY);
  if (!current || !floor || !point) {
    return;
  }
  const zone = zoneAt(current, floor, point);
  if (!zone) {
    return;
  }
  const place = mapPlaces(current).find((item) => item.id === zone.id);
  if (place) {
    void selectPlace(place);
  }
}

function map2dLocalPoint(event: {
  clientX: number;
  clientY: number;
}): { x: number; y: number } | null {
  const surface = map2d.value;
  if (!surface) {
    return null;
  }
  const bounds = surface.getBoundingClientRect();
  const localX = ((event.clientX - bounds.left) / bounds.width) * surface.width;
  const localY = ((event.clientY - bounds.top) / bounds.height) * surface.height;
  return {
    x: (localX - mapPan.value.x) / mapZoom.value,
    y: (localY - mapPan.value.y) / mapZoom.value,
  };
}

function pointerDistance(): number {
  const points = [...mapPointers.values()];
  if (points.length < 2) {
    return 0;
  }
  return Math.hypot(points[0]!.x - points[1]!.x, points[0]!.y - points[1]!.y);
}

function beginMapDrag(event: PointerEvent) {
  mapPinch = null;
  mapDrag = {
    pointerId: event.pointerId,
    button: event.button,
    x: event.clientX,
    y: event.clientY,
    panX: mapPan.value.x,
    panY: mapPan.value.y,
  };
}

function beginMapPinch() {
  mapDrag = null;
  const distance = pointerDistance();
  if (distance <= 0) {
    mapPinch = null;
    return;
  }
  mapPinch = { distance, zoom: mapZoom.value };
}

function onMap2dPointerDown(event: PointerEvent) {
  if (viewMode.value !== "2d") {
    return;
  }
  mapPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  if (mapPointers.size >= 2) {
    beginMapPinch();
    return;
  }
  beginMapDrag(event);
}

function onMap2dPointerMove(event: PointerEvent) {
  if (!mapPointers.has(event.pointerId)) {
    return;
  }
  mapPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (mapPinch && mapPointers.size >= 2) {
    const distance = pointerDistance();
    if (distance > 0 && mapPinch.distance > 0) {
      mapZoom.value = Math.min(3, Math.max(0.5, mapPinch.zoom * (distance / mapPinch.distance)));
      drawMap2d();
    }
    return;
  }
  if (!mapDrag || mapDrag.pointerId !== event.pointerId) {
    return;
  }
  mapPan.value = {
    x: mapDrag.panX + (event.clientX - mapDrag.x),
    y: mapDrag.panY + (event.clientY - mapDrag.y),
  };
  drawMap2d();
}

function onMap2dPointerUp(event: PointerEvent) {
  if (!mapPointers.has(event.pointerId)) {
    return;
  }
  mapPointers.delete(event.pointerId);
  if (mapPinch) {
    mapPinch = null;
    mapDrag = null;
    if (mapPointers.size === 1) {
      const remaining = mapPointers.entries().next().value;
      if (remaining) {
        const [pointerId, point] = remaining;
        mapDrag = {
          pointerId,
          button: 0,
          x: point.x,
          y: point.y,
          panX: mapPan.value.x,
          panY: mapPan.value.y,
        };
      }
    }
    return;
  }
  if (!mapDrag || mapDrag.pointerId !== event.pointerId) {
    return;
  }
  const moved = Math.hypot(event.clientX - mapDrag.x, event.clientY - mapDrag.y) > 6;
  const primary = mapDrag.button === 0;
  mapDrag = null;
  if (!moved && primary) {
    onMap2dClick(event);
  }
}

function onMap2dPointerCancel(event: PointerEvent) {
  mapPointers.delete(event.pointerId);
  if (mapDrag?.pointerId === event.pointerId) {
    mapDrag = null;
  }
  if (mapPointers.size < 2) {
    mapPinch = null;
  }
  if (mapPointers.size === 0) {
    mapDrag = null;
    mapPinch = null;
  }
}

function onMap2dWheel(event: WheelEvent) {
  if (viewMode.value !== "2d") {
    return;
  }
  event.preventDefault();
  const factor = event.deltaY > 0 ? 0.9 : 1.1;
  mapZoom.value = Math.min(3, Math.max(0.5, mapZoom.value * factor));
  drawMap2d();
}

function onMap2dClick(event: { clientX: number; clientY: number }) {
  const current = document.value;
  const surface = map2d.value;
  const local = map2dLocalPoint(event);
  if (!current || !surface || !local) {
    return;
  }
  const floors =
    floorId.value === null
      ? [...current.venue.floors].sort((a, b) => a.level - b.level)
      : current.venue.floors.filter((floor) => floor.id === floorId.value);
  if (floors.length === 0) {
    return;
  }
  const localX = local.x;
  const localY = local.y;
  const stack = floors.length > 1;
  const sliceHeight = stack ? surface.height / floors.length : surface.height;
  const index = stack ? Math.min(floors.length - 1, Math.floor(localY / sliceHeight)) : 0;
  const visualIndex = stack ? floors.length - 1 - index : 0;
  const floor = floors[visualIndex];
  if (!floor) {
    return;
  }
  const offsetY = stack ? (floors.length - 1 - visualIndex) * sliceHeight : 0;
  const world = mapProjection(floor, surface.width, sliceHeight - 16).toWorld(
    localX,
    localY - offsetY - 8,
  );
  const zone = zoneAt(current, floor.id, world);
  const place = zone ? mapPlaces(current).find((item) => item.id === zone.id) : undefined;
  if (place) {
    void selectPlace(place);
  }
}

function toggleCategory(category: FindCategory) {
  expandedCategory.value = expandedCategory.value === category.id ? null : category.id;
}

function chromeFocusFallback(): HTMLElement | null {
  return window.document.querySelector<HTMLElement>("[data-map-chrome='find']");
}

function captureRestoreFocus() {
  const active = window.document.activeElement as HTMLElement | null;
  if (!active || !active.isConnected) {
    if (!restoreFocus?.isConnected) {
      restoreFocus = chromeFocusFallback();
    }
    return;
  }
  const insideDialog =
    !!findPanel.value?.contains(active) ||
    !!searchPanel.value?.contains(active) ||
    !!popoverPanel.value?.contains(active);
  if (insideDialog) {
    if (!restoreFocus?.isConnected) {
      restoreFocus = chromeFocusFallback();
    }
    return;
  }
  restoreFocus = active;
}

function restoreChromeFocus() {
  if (findOpen.value || searchOpen.value || popover.value) {
    return;
  }
  const target = restoreFocus?.isConnected ? restoreFocus : chromeFocusFallback();
  target?.focus();
  restoreFocus = null;
}

function dismissPopoverForPanel() {
  if (!popover.value) {
    return;
  }
  stopContentRefresh();
  contentGeneration += 1;
  selectedPlaceId.value = null;
  popover.value = null;
  panel.value = null;
  activeContentRef.value = null;
  view?.setSelected(null);
  writeUrl();
  drawMap2d();
}

function openFind() {
  captureRestoreFocus();
  dismissPopoverForPanel();
  dialogChrome.value?.openFind();
}

function openSearch() {
  captureRestoreFocus();
  dismissPopoverForPanel();
  dialogChrome.value?.openSearch();
}

function closePanels() {
  dialogChrome.value?.closePanels();
  const chrome = closeChromePanels({
    findOpen: findOpen.value,
    searchOpen: searchOpen.value,
    popoverOpen: !!popover.value,
  });
  findOpen.value = chrome.findOpen;
  searchOpen.value = chrome.searchOpen;
  void nextTick(() => restoreChromeFocus());
}

function onKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  const typing =
    target &&
    (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
  if (findOpen.value && findPanel.value && trapTabKey(findPanel.value, event)) {
    return;
  }
  if (searchOpen.value && searchPanel.value && trapTabKey(searchPanel.value, event)) {
    return;
  }
  if (popover.value && popoverPanel.value && trapTabKey(popoverPanel.value, event)) {
    return;
  }
  if (event.key === "Escape") {
    if (findOpen.value || searchOpen.value) {
      closePanels();
      return;
    }
    if (popover.value) {
      clearSelection();
      return;
    }
    setFloorFilter(null);
    return;
  }
  if (typing) {
    return;
  }
  if (event.key === "f" || event.key === "F") {
    event.preventDefault();
    if (findOpen.value) {
      closePanels();
    } else {
      openFind();
    }
  }
  if (event.key === "/") {
    event.preventDefault();
    openSearch();
  }
}

function resizeSurfaces() {
  const map = map2d.value;
  if (map && viewMode.value === "2d") {
    const parent = map.parentElement;
    const width = Math.max(320, Math.floor(parent?.clientWidth ?? window.innerWidth));
    const height = Math.max(320, Math.floor(parent?.clientHeight ?? window.innerHeight));
    if (map.width !== width || map.height !== height) {
      map.width = width;
      map.height = height;
    }
  }
  if (canvas.value && view) {
    const parent = canvas.value.parentElement;
    view.resize(parent?.clientWidth ?? 800, parent?.clientHeight ?? 600);
  }
}

watch(muted, (value) => {
  if (value) {
    audio?.pause();
    ambient?.pause();
    return;
  }
  void ambient?.play().catch(() => undefined);
  if (panel.value?.audio && audio) {
    void audio.play().catch(() => undefined);
  }
});

watch(panel, (value) => {
  stopContentRefresh();
  if (value?.kind === "session-list" && activeContentRef.value) {
    const ref = activeContentRef.value;
    const placeId = selectedPlaceId.value;
    const generation = contentGeneration;
    refreshTimer = setInterval(() => {
      if (generation !== contentGeneration || selectedPlaceId.value !== placeId) {
        stopContentRefresh();
        return;
      }
      void openContent(ref, selectedPlace.value ?? undefined);
    }, 30_000);
  }
});

watch(quality, (value) => view?.setQuality(value));
watch([document, floorId, selectedPlaceId, viewMode], () => drawMap2d());

onMounted(async () => {
  window.addEventListener("keydown", onKeydown);
  window.addEventListener("resize", resizeSurfaces);
  const element = canvas.value;
  if (element) {
    try {
      view = mountVenueView(element);
      view.setHandlers({
        onSelect: (id) => {
          const current = document.value;
          if (!current || !id || viewMode.value === "2d") {
            return;
          }
          const place = mapPlaces(current).find((item) => item.id === id);
          if (place) {
            void selectPlace(place);
          }
        },
        onTransform: () => undefined,
        onFloor: (id) => {
          if (viewMode.value === "walk") {
            floorId.value = id;
            writeUrl();
            return;
          }
          if (viewMode.value === "3d" && floorId.value === null) {
            setFloorFilter(id);
          }
        },
      });
      view.setQuality(quality.value);
      view.setCameraMode("map");
      view.setMapFloor(null);
    } catch {
      status.value = "This browser could not start the 3D view.";
    }
  }
  const url = new URLSearchParams(window.location.search).get("url");
  const bootUrl = url ?? "/examples/map-demo.venue.json";
  const safe = safeVenueUrl(bootUrl);
  if (!safe) {
    status.value =
      "That venue link is not allowed. Use a same-origin .json URL, a public /api/v1/public/venues/{id}/ URL, or set VITE_API_ORIGIN for your API host.";
  } else {
    status.value = "Loading venue…";
    try {
      publicVenue.value = publicVenueIdFromUrl(safe);
      const response = await fetch(safe);
      await openDocument(await response.text());
    } catch {
      status.value = url
        ? "The venue link could not be loaded."
        : "Open a venue.json file, or add ?url= to this page.";
    }
  }
  ambient = new Audio("/ambience.mp3");
  ambient.loop = true;
  ambient.volume = 0.2;
  const loop = () => {
    drawMap2d();
    frame = requestAnimationFrame(loop);
  };
  frame = requestAnimationFrame(loop);
  resizeSurfaces();
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
  window.removeEventListener("resize", resizeSurfaces);
  cancelAnimationFrame(frame);
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
  audio?.pause();
  ambient?.pause();
  view?.dispose();
});
</script>

<template>
  <main class="viewer-shell">
    <header class="viewer-top">
      <div>
        <h1>Venue map</h1>
        <p>{{ status }}</p>
      </div>
      <div class="viewer-top-actions">
        <label class="file-btn">
          Open venue
          <input type="file" accept="application/json,.json" @change="onFile" />
        </label>
        <div class="mode-toggle" role="group" aria-label="View mode">
          <button type="button" :aria-pressed="viewMode === '2d'" @click="setViewMode('2d')">
            2D
          </button>
          <button type="button" :aria-pressed="viewMode === '3d'" @click="setViewMode('3d')">
            3D
          </button>
          <button type="button" :aria-pressed="viewMode === 'walk'" @click="setViewMode('walk')">
            Walk
          </button>
        </div>
        <button
          type="button"
          class="ghost"
          @click="quality = quality === 'simple' ? 'high' : 'simple'"
        >
          {{ quality === "simple" ? "Simple" : "High" }}
        </button>
        <button type="button" class="ghost" @click="muted = !muted">
          {{ muted ? "Sound off" : "Sound on" }}
        </button>
      </div>
    </header>

    <p v-if="hintsVisible" class="hint-strip">
      <span>Click a place</span>
      <span>Drag rotates</span>
      <span>Right-drag pans</span>
      <span>Scroll zooms</span>
      <span>F Find</span>
      <span>/ Search</span>
      <span>Esc All floors</span>
      <button type="button" class="ghost" aria-label="Dismiss hints" @click="hintsVisible = false">
        ×
      </button>
    </p>

    <div class="viewer-stage">
      <canvas
        v-show="viewMode !== '2d'"
        ref="canvas"
        class="viewer-canvas"
        @click="onSceneClick"
        @mousemove="onSceneHover"
        @mouseleave="hoverZoneId = null"
      />
      <canvas
        v-show="viewMode === '2d'"
        ref="map2d"
        class="viewer-canvas map-2d"
        aria-label="2D venue map"
        @pointerdown="onMap2dPointerDown"
        @pointermove="onMap2dPointerMove"
        @pointerup="onMap2dPointerUp"
        @pointercancel="onMap2dPointerCancel($event)"
        @wheel.prevent="onMap2dWheel"
      />

      <DialogChrome
        ref="dialogChrome"
        v-model:find-open="findOpen"
        v-model:search-open="searchOpen"
        v-model:search-query="searchQuery"
        :popover-open="!!popover"
        @dismiss-popover="dismissPopoverForPanel"
        @close-popover="clearSelection"
      >
        <template #find>
          <div class="category-list">
            <section v-for="category in categories" :key="category.id">
              <button
                type="button"
                class="category-row"
                :aria-expanded="expandedCategory === category.id"
                @click="toggleCategory(category)"
              >
                <span>{{ category.label }}</span>
                <span>{{ category.count }}</span>
              </button>
              <div v-if="expandedCategory === category.id" class="category-places">
                <div v-for="group in category.byFloor" :key="group.floorId">
                  <p class="level-label">LEVEL {{ group.floorLevel }}</p>
                  <button
                    v-for="place in group.places"
                    :key="place.id"
                    type="button"
                    class="place-row"
                    @click="selectPlace(place)"
                  >
                    <span>{{ iconGlyph(place.icon) }}</span>
                    {{ place.name }}
                  </button>
                </div>
              </div>
            </section>
          </div>
        </template>
        <template #search>
          <button
            v-for="place in searchResults"
            :key="place.id"
            type="button"
            class="place-row"
            role="option"
            @click="selectPlace(place)"
          >
            <span>{{ iconGlyph(place.icon) }}</span>
            <span>
              {{ place.name }}
              <small>L{{ place.floorLevel }} · {{ place.categoryLabel }}</small>
            </span>
          </button>
        </template>
        <template #popover>
          <div v-if="popover" class="popover-body">
            <div class="popover-icon" aria-hidden="true">{{ iconGlyph(popover.icon) }}</div>
            <div>
              <h2>{{ panel?.title || popover.name }}</h2>
              <p class="muted">Level {{ popover.floorLevel }} · {{ popover.floorName }}</p>
              <p v-if="panel?.body || popover.blurb">{{ panel?.body || popover.blurb }}</p>
              <p v-if="live" class="live">{{ live }}</p>
              <div v-if="panel?.links?.length || popover.links.length" class="link-row">
                <a
                  v-for="link in panel?.links?.length ? panel.links : popover.links"
                  :key="link.href"
                  :href="link.href"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {{ link.label }}
                </a>
              </div>
              <ul v-if="panel?.items?.length" class="content-items">
                <li v-for="item in panel.items" :key="item.name">
                  <img
                    v-if="itemImageSrc(item.image)"
                    :src="itemImageSrc(item.image) ?? undefined"
                    :alt="item.name"
                    class="content-item-image"
                  />
                  <a v-if="item.href" :href="item.href">{{ item.name }}</a>
                  <template v-else>{{ item.name }}</template>
                  <span v-if="item.price"> — {{ item.price }}</span>
                  <span v-else-if="item.detail"> — {{ item.detail }}</span>
                </li>
              </ul>
            </div>
          </div>
        </template>
      </DialogChrome>

      <div class="chrome-right" role="radiogroup" aria-label="Floor filter">
        <button
          v-for="floor in floorButtons"
          :key="floor.id"
          type="button"
          role="radio"
          :aria-checked="floorId === floor.id"
          :aria-label="`Level ${floor.level}`"
          @click="setFloorFilter(floor.id)"
        >
          {{ floor.label }}
        </button>
        <button
          type="button"
          :aria-pressed="floorId === null"
          aria-label="All floors"
          @click="setFloorFilter(null)"
        >
          All
        </button>
      </div>

      <div
        v-if="viewMode === 'walk'"
        class="touch-walk"
        aria-label="Walk controls"
        @pointerleave="setWalkStep(0, 0)"
        @pointerup="setWalkStep(0, 0)"
        @pointercancel="setWalkStep(0, 0)"
      >
        <button
          type="button"
          aria-label="Walk forward"
          @pointerdown="setWalkStep(1, 0)"
          @pointerup="setWalkStep(0, 0)"
        >
          ↑
        </button>
        <div class="touch-walk-row">
          <button
            type="button"
            aria-label="Strafe left"
            @pointerdown="setWalkStep(0, -1)"
            @pointerup="setWalkStep(0, 0)"
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Strafe right"
            @pointerdown="setWalkStep(0, 1)"
            @pointerup="setWalkStep(0, 0)"
          >
            →
          </button>
        </div>
        <button
          type="button"
          aria-label="Walk back"
          @pointerdown="setWalkStep(-1, 0)"
          @pointerup="setWalkStep(0, 0)"
        >
          ↓
        </button>
      </div>
    </div>
  </main>
</template>

<style scoped>
.viewer-shell {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  height: 100dvh;
  margin: 0;
  background: #e8eaf6;
  color: #0f172a;
  font-family: "Segoe UI", system-ui, sans-serif;
}
.viewer-top {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #dbe1f1;
}
.viewer-top h1 {
  margin: 0;
  font-size: 18px;
}
.viewer-top p {
  margin: 2px 0 0;
  font-size: 13px;
  color: #64748b;
}
.viewer-top-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.file-btn {
  position: relative;
  overflow: hidden;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  padding: 8px 12px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
}
.file-btn input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
.mode-toggle {
  display: inline-flex;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  overflow: hidden;
}
.mode-toggle button,
.chrome-left button,
.chrome-right button,
.ghost,
.category-row,
.place-row {
  border: 0;
  background: #fff;
  color: inherit;
  cursor: pointer;
}
.mode-toggle button {
  padding: 8px 12px;
  font-size: 13px;
}
.mode-toggle button[aria-pressed="true"],
.chrome-left button[aria-pressed="true"],
.chrome-right button[aria-checked="true"],
.chrome-right button[aria-pressed="true"] {
  background: #4f46e5;
  color: #fff;
}
.ghost {
  background: transparent;
  padding: 4px 8px;
}
.hint-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin: 0;
  padding: 8px 16px;
  font-size: 12px;
  color: #475569;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}
.viewer-stage {
  position: relative;
  min-height: 0;
}
.viewer-canvas {
  width: 100%;
  height: 100%;
  display: block;
  background: #e8eaf6;
}
.map-2d {
  touch-action: none;
  cursor: grab;
}
.map-2d:active {
  cursor: grabbing;
}
.side-panel {
  position: absolute;
  left: 16px;
  top: 16px;
  bottom: 88px;
  width: min(360px, calc(100% - 32px));
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 8px 30px rgba(15, 23, 42, 0.12);
  overflow: auto;
  z-index: 3;
}
.side-panel header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.side-panel h2 {
  margin: 0;
  font-size: 16px;
}
.category-row,
.place-row {
  display: flex;
  width: 100%;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 8px;
  text-align: left;
  border-radius: 10px;
}
.category-row:hover,
.place-row:hover {
  background: #eef2ff;
}
.place-row {
  justify-content: flex-start;
  align-items: center;
}
.place-row small {
  display: block;
  color: #64748b;
}
.level-label {
  margin: 8px 0 4px;
  font-size: 11px;
  letter-spacing: 0.06em;
  color: #64748b;
}
.search-field input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 10px 12px;
}
.place-popover {
  position: absolute;
  left: 50%;
  top: 18%;
  transform: translateX(-50%);
  width: min(360px, calc(100% - 32px));
  padding: 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 8px 30px rgba(15, 23, 42, 0.18);
  z-index: 4;
}
.place-popover .close {
  position: absolute;
  right: 8px;
  top: 8px;
}
.popover-body {
  display: flex;
  gap: 12px;
}
.popover-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: #eef2ff;
  font-size: 20px;
}
.place-popover h2 {
  margin: 0 0 4px;
  font-size: 18px;
}
.muted {
  color: #64748b;
  margin: 0 0 8px;
}
.live {
  color: #0f766e;
}
.link-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.link-row a {
  color: #4f46e5;
}
.content-items {
  padding-left: 18px;
  margin: 8px 0 0;
}
.content-item-image {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 6px;
  vertical-align: middle;
  margin-right: 6px;
}
.chrome-left,
.chrome-right {
  position: absolute;
  z-index: 2;
  display: flex;
  gap: 8px;
}
.chrome-left {
  left: 16px;
  bottom: 16px;
}
.chrome-right {
  right: 16px;
  bottom: 16px;
  flex-direction: column;
}
.chrome-left button,
.chrome-right button {
  min-width: 52px;
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 999px;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.12);
  font-weight: 600;
}
.touch-walk {
  position: absolute;
  right: 88px;
  bottom: 16px;
  display: grid;
  gap: 6px;
  justify-items: center;
  z-index: 2;
}
.touch-walk-row {
  display: flex;
  gap: 6px;
}
.touch-walk button {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 0;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.12);
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
@media (max-width: 720px) {
  .viewer-top {
    flex-direction: column;
    align-items: stretch;
  }
  .side-panel {
    left: 8px;
    right: 8px;
    width: auto;
    bottom: 140px;
    max-height: min(50vh, 420px);
  }
  .place-popover {
    top: auto;
    bottom: 140px;
    width: calc(100% - 24px);
  }
  .chrome-left,
  .chrome-right {
    bottom: 12px;
  }
  .chrome-left button,
  .chrome-right button {
    min-width: 48px;
    min-height: 48px;
    font-size: 14px;
  }
  .touch-walk {
    right: 72px;
    bottom: 72px;
  }
}
</style>
