<script setup lang="ts">
import { loadGlb, loadGlbBytes, rememberModel, validateGlb } from "@openvenue/renderer-3d";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import {
  addImported,
  assets,
  onAssetsChanged,
  searchAssets,
  type AssetRecord,
} from "../assets/catalogue";

const query = ref("");
const listed = ref<AssetRecord[]>(assets());
const progress = ref<Record<string, number>>({});
const errors = ref<Record<string, string>>({});
const fileInput = ref<HTMLInputElement | null>(null);

const results = computed(() => searchAssets(listed.value, query.value));

let stop: () => void = () => undefined;

onMounted(() => {
  stop = onAssetsChanged(() => {
    listed.value = assets();
  });
  for (const asset of assets()) {
    void loadAsset(asset);
  }
});

onBeforeUnmount(() => stop());

async function loadAsset(asset: AssetRecord) {
  try {
    const model = await loadGlb(asset.url, (ratio) => {
      progress.value = { ...progress.value, [asset.id]: ratio };
    });
    rememberModel(asset.id, model);
    progress.value = { ...progress.value, [asset.id]: 1 };
  } catch (error) {
    errors.value = {
      ...errors.value,
      [asset.id]: error instanceof Error ? error.message : "Could not load the model.",
    };
  }
}

function onDragStart(event: DragEvent, asset: AssetRecord) {
  event.dataTransfer?.setData("application/x-openvenue-asset", asset.id);
  event.dataTransfer?.setData("text/plain", asset.id);
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "copy";
  }
}

async function onImport(event: Event) {
  const input = event.target instanceof HTMLInputElement ? event.target : null;
  const file = input?.files?.[0];
  if (!file) {
    return;
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const problem = validateGlb(bytes);
  if (problem) {
    errors.value = { ...errors.value, import: problem };
    input.value = "";
    return;
  }
  try {
    const model = await loadGlbBytes(bytes);
    const id = crypto.randomUUID();
    rememberModel(id, model);
    const base = model.userData.base as { width: number; height: number; depth: number };
    addImported({
      id,
      name: file.name.replace(/\.glb$/i, "") || "Imported model",
      category: "generic",
      dimensions: {
        width: roundSize(base.width),
        height: roundSize(base.height),
        depth: roundSize(base.depth),
      },
      licence: "Imported locally",
      attribution: "Imported in this browser. Not part of the shared catalogue.",
      version: "1",
      tags: ["imported"],
      thumbnail: "",
      url: URL.createObjectURL(new Blob([bytes], { type: "model/gltf-binary" })),
    });
    delete errors.value.import;
  } catch (error) {
    errors.value = {
      ...errors.value,
      import: error instanceof Error ? error.message : "Could not read the model.",
    };
  }
  if (input) {
    input.value = "";
  }
}

function roundSize(value: number): number {
  return Math.max(0.3, Math.round(value * 100) / 100);
}
</script>

<template>
  <section class="rounded-xl border border-zinc-800 bg-zinc-900 p-3" data-testid="asset-library">
    <div class="flex flex-wrap items-center gap-2">
      <h2 class="text-sm font-medium text-zinc-100">Assets</h2>
      <input
        v-model="query"
        class="w-48 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100"
        type="search"
        placeholder="Search chairs, tables…"
        data-testid="asset-search"
        aria-label="Search assets"
      />
      <button
        type="button"
        class="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-100"
        @click="fileInput?.click()"
      >
        Import GLB
      </button>
      <input
        ref="fileInput"
        class="hidden"
        type="file"
        accept=".glb,model/gltf-binary"
        data-testid="asset-import"
        @change="onImport"
      />
      <p v-if="errors.import" class="text-xs text-rose-300">{{ errors.import }}</p>
    </div>
    <ul class="mt-3 flex gap-2 overflow-x-auto">
      <li v-for="asset in results" :key="asset.id">
        <button
          type="button"
          class="flex w-36 flex-col gap-1 rounded-md border border-zinc-700 bg-zinc-950 p-2 text-left"
          draggable="true"
          data-testid="asset-card"
          @dragstart="onDragStart($event, asset)"
        >
          <img
            v-if="asset.thumbnail"
            :src="asset.thumbnail"
            alt=""
            class="h-10 w-full rounded bg-zinc-900 object-cover"
          />
          <span class="truncate text-xs font-medium text-zinc-100">{{ asset.name }}</span>
          <span class="truncate text-[10px] uppercase tracking-wide text-zinc-500">{{
            asset.category
          }}</span>
          <span v-if="errors[asset.id]" class="text-[10px] text-rose-300">{{
            errors[asset.id]
          }}</span>
          <span v-else-if="(progress[asset.id] ?? 0) < 1" class="text-[10px] text-zinc-400">
            Loading {{ Math.round((progress[asset.id] ?? 0) * 100) }}%
          </span>
          <span v-else class="text-[10px] text-teal-300">Drag onto the plan</span>
        </button>
      </li>
    </ul>
  </section>
</template>
