<script setup lang="ts">
import { benchmarkVenue, capacityOf, checkVenue, type BenchmarkKind } from "@openvenue/editor-core";
import { mountVenueView, type QualityMode, type VenueView } from "@openvenue/renderer-3d";
import { onMounted, ref } from "vue";

const status = ref("Running the benchmark…");
const canvas = ref<HTMLCanvasElement | null>(null);

const scenes: { name: string; count: number; kind: BenchmarkKind; quality: QualityMode }[] = [
  { name: "500 tables", count: 500, kind: "table", quality: "high" },
  { name: "2000 chairs", count: 2000, kind: "chair", quality: "high" },
  { name: "2000 chairs, simple", count: 2000, kind: "chair", quality: "simple" },
];

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function rendererName(element: HTMLCanvasElement): string {
  const gl = element.getContext("webgl2") ?? element.getContext("webgl");
  if (!gl) {
    return "no webgl";
  }
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  if (!info) {
    return "webgl";
  }
  const value = gl.getParameter(info.UNMASKED_RENDERER_WEBGL);
  return typeof value === "string" ? value : "webgl";
}

async function sample(count: number): Promise<number> {
  const start = performance.now();
  for (let index = 0; index < count; index += 1) {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }
  return (performance.now() - start) / count;
}

onMounted(async () => {
  const element = canvas.value;
  if (!element) {
    return;
  }
  let view: VenueView;
  try {
    view = mountVenueView(element);
  } catch (error) {
    status.value = error instanceof Error ? error.message : "WebGL failed";
    return;
  }
  view.resize(1280, 720);
  const rows = [];
  for (const scene of scenes) {
    const document = benchmarkVenue(scene.count, scene.kind);
    view.setQuality(scene.quality);
    const started = performance.now();
    view.setDocument(document);
    const buildMs = performance.now() - started;
    await sample(5);
    const frameMs = await sample(30);
    const checksStarted = performance.now();
    const warnings = checkVenue(document).length;
    const checksMs = performance.now() - checksStarted;
    const capacityStarted = performance.now();
    const seats = capacityOf(document).seats;
    const capacityMs = performance.now() - capacityStarted;
    rows.push({
      scene: scene.name,
      quality: scene.quality,
      buildMs: round(buildMs),
      frameMs: round(frameMs),
      checksMs: round(checksMs),
      capacityMs: round(capacityMs),
      warnings,
      seats,
    });
  }
  const payload = {
    renderer: rendererName(element),
    rows,
  };
  status.value = JSON.stringify(payload);
  view.dispose();
  const report = new URLSearchParams(window.location.search).get("report");
  if (report) {
    await fetch(report, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  }
});
</script>

<template>
  <main class="mx-auto max-w-5xl px-4 py-8">
    <h1 class="text-xl font-semibold">Benchmark</h1>
    <canvas ref="canvas" class="mt-4 h-[720px] w-[1280px] max-w-full bg-zinc-950" />
    <pre class="mt-4 overflow-auto text-sm" data-testid="benchmark-result">{{ status }}</pre>
  </main>
</template>
