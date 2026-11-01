<script setup lang="ts">
import { CHECK_NOTE, checkVenue } from "@openvenue/editor-core";
import { computed } from "vue";
import { useVenueStore } from "../stores/venue";

const store = useVenueStore();
const warnings = computed(() => checkVenue(store.document));

function show(ids: readonly string[]) {
  if (ids.length > 0) {
    store.setSelection(ids);
  }
}
</script>

<template>
  <section
    data-testid="venue-checks"
    class="mt-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
  >
    <div class="flex items-baseline justify-between gap-3">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-zinc-500">Checks</h2>
      <p class="text-xs text-zinc-500">{{ warnings.length }}</p>
    </div>
    <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{{ CHECK_NOTE }}</p>
    <p v-if="warnings.length === 0" class="mt-3 text-sm text-zinc-500">No planning checks.</p>
    <ul v-else class="mt-3 space-y-2">
      <li v-for="warning in warnings" :key="`${warning.ruleId}-${warning.objectIds.join('-')}`">
        <button
          type="button"
          class="w-full rounded-md border border-zinc-200 px-3 py-2 text-left hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-zinc-800 dark:hover:bg-zinc-950 dark:focus-visible:ring-teal-400"
          @click="show(warning.objectIds)"
        >
          <span class="text-xs uppercase tracking-wide text-zinc-500">{{ warning.ruleId }}</span>
          <span class="mt-1 block text-sm">{{ warning.description }}</span>
          <span class="mt-1 block text-xs text-zinc-500">{{ warning.suggestedFix }}</span>
        </button>
      </li>
    </ul>
  </section>
</template>
