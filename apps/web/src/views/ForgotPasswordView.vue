<script setup lang="ts">
import { ref } from "vue";
import { RouterLink } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useToastStore } from "../stores/toast";

const auth = useAuthStore();
const toast = useToastStore();

const email = ref("");
const error = ref("");
const isSubmitted = ref(false);
const isSubmitting = ref(false);

async function handleReset() {
  error.value = "";
  isSubmitting.value = true;
  try {
    await auth.requestPasswordReset(email.value);
    isSubmitted.value = true;
    toast.success("Instructions sent", `Password reset email sent to ${email.value}`);
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Failed to request reset.";
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <main
    class="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-6xl items-center justify-center px-4 py-12 sm:px-6"
  >
    <div class="w-full max-w-md">
      <div
        class="overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8"
      >
        <div class="text-center">
          <div
            class="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-teal-800 text-white dark:bg-teal-500 dark:text-zinc-950"
          >
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
          </div>
          <h1 class="mt-4 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Reset password
          </h1>
          <p class="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
            Enter your account email to receive recovery instructions.
          </p>
        </div>

        <div v-if="isSubmitted" data-testid="reset-success" class="mt-6 text-center">
          <div
            class="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 class="mt-3 text-base font-semibold">Check your inbox</h2>
          <p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            If an account exists for
            <span class="font-medium text-zinc-900 dark:text-zinc-100">{{ email }}</span
            >, a password reset link has been dispatched.
          </p>
          <div class="mt-6 flex flex-col gap-2">
            <button
              type="button"
              class="focus-ring rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              @click="isSubmitted = false"
            >
              Try another email
            </button>
            <RouterLink
              to="/login"
              data-testid="back-to-login"
              class="focus-ring rounded-lg bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900 dark:bg-teal-400 dark:text-zinc-950 dark:hover:bg-teal-300"
            >
              Back to sign in
            </RouterLink>
          </div>
        </div>

        <form v-else class="mt-6 space-y-4" @submit.prevent="handleReset">
          <div
            v-if="error"
            role="alert"
            class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
          >
            {{ error }}
          </div>

          <div>
            <label
              for="reset-email"
              class="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Email address
            </label>
            <input
              id="reset-email"
              v-model="email"
              data-testid="reset-email"
              type="email"
              required
              autocomplete="email"
              placeholder="you@domain.com"
              class="focus-ring mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder-zinc-500"
            />
          </div>

          <button
            type="submit"
            data-testid="reset-submit"
            :disabled="isSubmitting"
            class="focus-ring flex w-full items-center justify-center rounded-lg bg-teal-800 py-2.5 text-sm font-medium text-white transition hover:bg-teal-900 disabled:opacity-50 dark:bg-teal-400 dark:text-zinc-950 dark:hover:bg-teal-300"
          >
            Send recovery link
          </button>

          <p class="text-center text-xs text-zinc-600 dark:text-zinc-400">
            Remembered your password?
            <RouterLink
              to="/login"
              class="font-medium text-teal-800 hover:underline dark:text-teal-400"
            >
              Sign in
            </RouterLink>
          </p>
        </form>
      </div>
    </div>
  </main>
</template>
