<script setup lang="ts">
import { RouterLink } from "vue-router";
import hallStill from "../../../../docs/conference-hall.gif";
</script>

<template>
  <main class="mx-auto max-w-6xl px-4 py-12 sm:px-6">
    <p class="text-sm font-medium text-teal-800 dark:text-teal-300">Local venue document</p>
    <h1 class="mt-3 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
      Lay out a hall, then walk it.
    </h1>
    <p class="mt-4 max-w-xl text-base text-zinc-600 dark:text-zinc-400">
      The plan, the 3D hall, and the file stay in this browser. Nothing is uploaded.
    </p>
    <div class="mt-6 flex flex-wrap gap-2">
      <RouterLink
        to="/projects"
        data-testid="open-editor"
        class="inline-flex min-h-10 items-center rounded-md bg-teal-800 px-4 text-sm font-medium text-white hover:bg-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:bg-teal-400 dark:text-zinc-950 dark:hover:bg-teal-300 dark:focus-visible:ring-teal-200"
      >
        Open the editor
      </RouterLink>
      <RouterLink
        to="/guide"
        class="inline-flex min-h-10 items-center rounded-md border border-zinc-300 px-4 text-sm font-medium hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-zinc-700 dark:hover:bg-zinc-900 dark:focus-visible:ring-teal-400"
      >
        Guide
      </RouterLink>
    </div>

    <div class="mt-12 grid gap-4 md:grid-cols-4">
      <article
        class="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 md:col-span-2 md:row-span-2"
      >
        <img :src="hallStill" alt="Plan, 3D hall, and a walk toward the stage" class="w-full" />
        <div class="p-5">
          <h2 class="text-lg font-semibold">Conference hall</h2>
          <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            A 24 by 18 metre room with a stage, a door, and 200 chairs. Open it from the project
            list.
          </p>
        </div>
      </article>
      <article
        class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h2 class="font-semibold">Plan</h2>
        <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Draw walls, rooms, doors, and furniture. Lengths are metres, and +Z points up the screen.
        </p>
      </article>
      <article
        class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h2 class="font-semibold">3D</h2>
        <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          The same hall, with orbit and isometric cameras. Move, rotate, or scale a selected object.
        </p>
      </article>
      <article
        class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 md:col-span-2"
      >
        <h2 class="font-semibold">Walk</h2>
        <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Click the hall, then use WASD. Walls stop the visitor. Escape returns to orbit.
        </p>
      </article>
    </div>
  </main>
</template>
