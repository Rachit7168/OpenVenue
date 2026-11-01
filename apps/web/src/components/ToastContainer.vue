<script setup lang="ts">
import { useToastStore } from "../stores/toast";

const toastStore = useToastStore();
</script>

<template>
  <div
    class="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0"
    role="region"
    aria-label="Notifications"
  >
    <div
      v-for="toast in toastStore.toasts"
      :key="toast.id"
      class="pointer-events-auto flex w-full items-start gap-3 rounded-lg border p-4 shadow-lg transition-all duration-200"
      :class="{
        'border-teal-200 bg-white text-zinc-900 dark:border-teal-900/60 dark:bg-zinc-900 dark:text-zinc-100':
          toast.type === 'success',
        'border-red-200 bg-white text-zinc-900 dark:border-red-900/60 dark:bg-zinc-900 dark:text-zinc-100':
          toast.type === 'error',
        'border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100':
          toast.type === 'info',
      }"
      data-testid="toast-item"
    >
      <div class="mt-0.5 shrink-0">
        <!-- Success Icon -->
        <svg
          v-if="toast.type === 'success'"
          class="h-5 w-5 text-teal-600 dark:text-teal-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
        <!-- Error Icon -->
        <svg
          v-else-if="toast.type === 'error'"
          class="h-5 w-5 text-red-600 dark:text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
        <!-- Info Icon -->
        <svg
          v-else
          class="h-5 w-5 text-zinc-600 dark:text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold leading-5">{{ toast.title }}</p>
        <p
          v-if="toast.description"
          class="mt-1 text-xs text-zinc-600 dark:text-zinc-400 leading-normal"
        >
          {{ toast.description }}
        </p>
      </div>

      <button
        type="button"
        class="focus-ring -mr-1 -mt-1 rounded-md p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
        aria-label="Dismiss notification"
        @click="toastStore.dismiss(toast.id)"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  </div>
</template>
