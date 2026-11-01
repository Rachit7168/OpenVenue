<script setup lang="ts">
import { CAPACITY_NOTE, DEFAULT_METRES_PER_PERSON, capacityOf } from "@openvenue/editor-core";
import { computed, ref } from "vue";
import { useVenueStore } from "../stores/venue";

const store = useVenueStore();
const metresPerPerson = ref(DEFAULT_METRES_PER_PERSON);
const report = computed(() => capacityOf(store.document, metresPerPerson.value));

const rows = computed(() => [
  { label: "Total", value: report.value.total },
  { label: "Occupied", value: report.value.occupied },
  { label: "Free", value: report.value.free },
  { label: "Seating", value: report.value.seating },
  { label: "Exhibition", value: report.value.exhibition },
  { label: "Stage", value: report.value.stage },
  { label: "Circulation", value: report.value.circulation },
]);

function onDensity(event: Event) {
  const value = Number((event.target as HTMLInputElement).value);
  if (Number.isFinite(value)) {
    metresPerPerson.value = value;
  }
}

function area(value: number): string {
  return `${value.toFixed(1)} m²`;
}
</script>

<template>
  <section
    data-testid="venue-capacity"
    class="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
  >
    <h2 class="text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
      Capacity
    </h2>
    <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{{ CAPACITY_NOTE }}</p>
    <dl class="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
      <div
        v-for="row in rows"
        :key="row.label"
        class="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-950"
      >
        <dt class="text-xs uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
          {{ row.label }}
        </dt>
        <dd class="mt-1 font-medium">{{ area(row.value) }}</dd>
      </div>
      <div class="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-950">
        <dt class="text-xs uppercase tracking-wide text-zinc-700 dark:text-zinc-300">Seats</dt>
        <dd class="mt-1 font-medium">{{ report.seats }}</dd>
      </div>
    </dl>
    <label class="mt-4 block text-sm font-medium">
      Square metres per person
      <input
        data-testid="capacity-density"
        class="mt-1 w-32 rounded-md border border-zinc-300 bg-white px-3 py-2 text-base font-normal text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus-visible:ring-teal-400"
        type="number"
        min="0.2"
        max="10"
        step="0.1"
        aria-label="Square metres per person"
        :value="metresPerPerson"
        @input="onDensity"
      />
    </label>
    <p class="mt-3 text-sm" data-testid="capacity-estimate">
      Planning capacity {{ report.estimate }} people
    </p>
  </section>
</template>
