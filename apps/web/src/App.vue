<script setup lang="ts">
import { RouterView } from "vue-router";
import TopBar from "./components/TopBar.vue";
import { useThemeStore } from "./stores/theme";

useThemeStore().hydrate();
</script>

<template>
  <div
    class="min-h-screen bg-zinc-100 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100"
  >
    <TopBar />
    <RouterView />
  </div>
</template>
