<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>

<template>
  <main class="mx-auto max-w-3xl px-4 py-12 sm:px-6">
    <p class="text-sm font-medium text-teal-800 dark:text-teal-300">Guide</p>
    <h1 class="mt-3 text-3xl font-semibold tracking-tight">How the hall is measured</h1>
    <div class="mt-8 grid gap-4">
      <article
        class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h2 class="font-semibold">Coordinates</h2>
        <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Lengths are metres. The world is right-handed, with +Y up. On the plan, +X is to the right
          and +Z is up the screen. Angles are stored in radians.
        </p>
      </article>
      <article
        class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h2 class="font-semibold">Map</h2>
        <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Switch to 3D or Both, then choose Map to draw the floors apart. Drag to rotate and
          right-drag to pan. Click a floor name to open that level. Find lists rooms and tables.
          Escape closes Find or the selected place card first, then shows every floor again.
        </p>
      </article>
      <article
        class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h2 class="font-semibold">Walk</h2>
        <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Choose Walk, click the hall, and use WASD. Escape returns to orbit. Doors stay open.
          Windows stay solid.
        </p>
      </article>
      <article
        class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h2 class="font-semibold">Checks and capacity</h2>
        <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Checks are planning aids, not a safety certification. The people figure is a planning
          estimate, not an approved occupancy number.
        </p>
      </article>
    </div>
    <RouterLink
      to="/projects"
      class="mt-8 inline-flex min-h-10 items-center text-sm font-medium text-teal-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:text-teal-300 dark:focus-visible:ring-teal-400"
    >
      Open the editor
    </RouterLink>
  </main>
</template>
