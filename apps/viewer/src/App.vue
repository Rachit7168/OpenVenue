<script setup lang="ts">
import { mountVenueView, type VenueView } from "@openvenue/renderer-3d";
import { loadVenueJson, type VenueDocument } from "@openvenue/scene-schema";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  publicContentFetchUrl,
  publicVenueIdFromUrl,
  safeContentRef,
  safeVenueUrl,
} from "./fetch";
import {
  directory,
  liveSummary,
  mapProjection,
  parseContent,
  visitorSpawn,
  zoneAt,
  type VisitorContent,
} from "./visitor";

const status = ref("Open a venue.json file, or add ?url= to this page.");
const document = ref<VenueDocument | null>(null);
const floorId = ref("");
const panel = ref<VisitorContent | null>(null);
const muted = ref(true);
const quality = ref<"simple" | "high">("simple");
const canvas = ref<HTMLCanvasElement | null>(null);
const map = ref<HTMLCanvasElement | null>(null);
let view: VenueView | null = null;
let audio: HTMLAudioElement | null = null;
let ambient: HTMLAudioElement | null = null;
let frame = 0;
let contentGeneration = 0;
let refreshTimer: ReturnType<typeof setInterval> | null = null;
const activeContentRef = ref<string | null>(null);
const publicVenue = ref<{ venueId: string; apiOrigin: string } | null>(null);
const walkForward = ref(0);
const walkStrafe = ref(0);

const entries = computed(() => (document.value ? directory(document.value) : []));
const live = computed(() => liveSummary(panel.value));
const floorName = computed(
  () => document.value?.venue.floors.find((floor) => floor.id === floorId.value)?.name ?? "",
);

function drawMap() {
  const surface = map.value;
  const current = document.value;
  const floor = current?.venue.floors.find((item) => item.id === floorId.value);
  if (!surface || !floor) {
    return;
  }
  const context = surface.getContext("2d");
  if (!context) {
    return;
  }
  const project = mapProjection(floor, surface.width, surface.height).toScreen;
  const walker = view?.position();
  context.clearRect(0, 0, surface.width, surface.height);
  context.strokeStyle = "#e4e4e7";
  context.lineWidth = 2;
  for (const wall of floor.walls) {
    const start = project(wall.start.x, wall.start.z);
    const end = project(wall.end.x, wall.end.z);
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.stroke();
  }
  const spawn = current ? visitorSpawn(current) : null;
  const here = walker?.floorId === floor.id ? walker : spawn?.floorId === floor.id ? spawn : null;
  if (here) {
    const dot = project(here.x, here.z);
    context.fillStyle = "#2dd4bf";
    context.beginPath();
    context.arc(dot.x, dot.y, 4, 0, Math.PI * 2);
    context.fill();
  }
}

async function openDocument(text: string) {
  const loaded = loadVenueJson(text);
  document.value = loaded;
  const spawn = visitorSpawn(loaded);
  floorId.value = spawn.floorId;
  panel.value = null;
  status.value = loaded.project.name;
  view?.setDocument(loaded);
  view?.setShownFloor(spawn.floorId);
  view?.setCameraMode("walk");
  view?.setWalkClick(true);
  view?.setWalkTarget(null);
  drawMap();
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

async function openContent(contentRef: string | undefined) {
  const generation = ++contentGeneration;
  if (!contentRef) {
    activeContentRef.value = null;
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
    panel.value = parseContent(response.ok ? await response.json() : null);
    status.value = document.value?.project.name ?? "Visitor";
  } catch {
    if (generation !== contentGeneration) {
      return;
    }
    panel.value = { title: "Details", kind: "info", body: "The content file could not be loaded." };
    status.value = document.value?.project.name ?? "Visitor";
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

function applyWalkAxes() {
  view?.setWalkAxes({ forward: walkForward.value, strafe: walkStrafe.value });
}

function setWalkStep(forward: number, strafe: number) {
  walkForward.value = forward;
  walkStrafe.value = strafe;
  applyWalkAxes();
}

function onSceneClick(event: MouseEvent) {
  const current = document.value;
  const here = view?.position();
  const point = view?.floorPoint(event.clientX, event.clientY);
  if (!current || !here?.floorId || !point) {
    return;
  }
  const zone = zoneAt(current, here.floorId, point);
  if (zone?.interaction && zone.interaction.type !== "none") {
    void openContent(zone.interaction.contentRef);
  }
}

function goTo(entry: { floorId: string; x: number; z: number; contentRef?: string }) {
  floorId.value = entry.floorId;
  view?.setShownFloor(entry.floorId);
  view?.setCameraMode("walk");
  view?.setWalkClick(true);
  view?.setWalkTarget({ x: entry.x, z: entry.z });
  void openContent(entry.contentRef);
}

function onMapClick(event: MouseEvent) {
  const current = document.value;
  if (!current || !floorId.value) {
    return;
  }
  const surface = event.currentTarget as HTMLCanvasElement;
  const floor = current.venue.floors.find((item) => item.id === floorId.value);
  const bounds = surface.getBoundingClientRect();
  if (!floor) {
    return;
  }
  const world = mapProjection(floor, surface.width, surface.height).toWorld(
    ((event.clientX - bounds.left) / bounds.width) * surface.width,
    ((event.clientY - bounds.top) / bounds.height) * surface.height,
  );
  const zone = zoneAt(current, floorId.value, world);
  if (zone?.interaction && zone.interaction.type !== "none") {
    void openContent(zone.interaction.contentRef);
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
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
  if (value?.kind === "session-list" && activeContentRef.value) {
    const ref = activeContentRef.value;
    refreshTimer = setInterval(() => {
      void openContent(ref);
    }, 30_000);
  }
});

watch(quality, (value) => view?.setQuality(value));

onMounted(async () => {
  const element = canvas.value;
  if (element) {
    try {
      view = mountVenueView(element);
      view.setHandlers({
        onSelect: () => undefined,
        onTransform: () => undefined,
        onFloor: (id) => {
          floorId.value = id;
        },
      });
      view.setQuality(quality.value);
      view.setWalkClick(true);
    } catch {
      status.value = "This browser could not start the 3D view.";
    }
  }
  const url = new URLSearchParams(window.location.search).get("url");
  if (url) {
    const safe = safeVenueUrl(url);
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
        status.value = "The venue link could not be loaded.";
      }
    }
  }
  ambient = new Audio("/ambience.mp3");
  ambient.loop = true;
  ambient.volume = 0.2;
  const loop = () => {
    drawMap();
    frame = requestAnimationFrame(loop);
  };
  frame = requestAnimationFrame(loop);
});

onBeforeUnmount(() => {
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
    <aside style="padding: 16px; overflow: auto; border-right: 1px solid #27272a">
      <h1 style="font-size: 18px; margin: 0 0 8px">Visitor</h1>
      <p style="font-size: 13px; color: #a1a1aa">{{ status }}</p>
      <p v-if="floorName" style="font-size: 13px">Floor: {{ floorName }}</p>
      <label style="display: block; margin: 12px 0">
        Venue file
        <input type="file" accept="application/json,.json" @change="onFile" />
      </label>
      <canvas
        ref="map"
        width="160"
        height="160"
        aria-label="Mini map"
        style="width: 160px; height: 160px; background: #18181b; border-radius: 8px"
        @click="onMapClick"
      />
      <h2 style="font-size: 14px">Take me there</h2>
      <button
        v-for="entry in entries"
        :key="entry.id"
        type="button"
        style="display: block; width: 100%; margin: 4px 0; text-align: left"
        @click="goTo(entry)"
      >
        {{ entry.name }}
      </button>
      <div style="display: flex; gap: 8px; margin-top: 12px">
        <button type="button" @click="quality = quality === 'simple' ? 'high' : 'simple'">
          {{ quality === "simple" ? "Simple" : "High" }}
        </button>
        <button type="button" @click="muted = !muted">
          {{ muted ? "Sound off" : "Sound on" }}
        </button>
      </div>
      <section v-if="panel" style="margin-top: 16px">
        <h2 style="font-size: 16px">{{ panel.title }}</h2>
        <p v-if="live">{{ live }}</p>
        <p v-if="panel.body">{{ panel.body }}</p>
        <p v-if="panel.href">
          <a :href="panel.href">{{ panel.href }}</a>
        </p>
        <ul>
          <li v-for="item in panel.items ?? []" :key="item.name">
            <a v-if="item.href" :href="item.href">{{ item.name }}</a>
            <template v-else>{{ item.name }}</template>
            <span v-if="item.price"> — {{ item.price }}</span>
            <span v-else-if="item.detail"> — {{ item.detail }}</span>
          </li>
        </ul>
        <button type="button" @click="panel = null">Close</button>
      </section>
    </aside>
    <div class="viewer-stage">
      <canvas ref="canvas" class="viewer-canvas" @click="onSceneClick" />
      <div
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
  grid-template-columns: minmax(0, 280px) minmax(0, 1fr);
  height: 100dvh;
  margin: 0;
  background: #09090b;
  color: #f4f4f5;
  font-family: sans-serif;
}

.viewer-stage {
  position: relative;
  min-height: 40vh;
}

.viewer-canvas {
  width: 100%;
  height: 100%;
  touch-action: manipulation;
}

.touch-walk {
  display: none;
  position: absolute;
  right: 16px;
  bottom: 16px;
  gap: 4px;
  flex-direction: column;
  align-items: center;
  opacity: 0.9;
}

.touch-walk-row {
  display: flex;
  gap: 8px;
}

.touch-walk button {
  width: 48px;
  height: 48px;
  border: 1px solid #3f3f46;
  border-radius: 8px;
  background: #18181b;
  color: inherit;
  font-size: 20px;
}

@media (max-width: 768px) {
  .viewer-shell {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(50vh, 1fr);
  }

  .touch-walk {
    display: flex;
  }
}
</style>
