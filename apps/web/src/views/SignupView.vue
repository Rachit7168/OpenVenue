<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useToastStore } from "../stores/toast";

const auth = useAuthStore();
const toast = useToastStore();
const router = useRouter();

const name = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const role = ref("Event Planner & Designer");
const agreeTerms = ref(true);
const showPassword = ref(false);
const error = ref("");
const isSubmitting = ref(false);

const passwordStrength = computed(() => {
  const pwd = password.value;
  if (!pwd) {
    return { score: 0, label: "Empty", colorClass: "bg-zinc-200 dark:bg-zinc-700" };
  }
  let score = 0;
  if (pwd.length >= 6) score += 1;
  if (pwd.length >= 10) score += 1;
  if (/[0-9]/.test(pwd)) score += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

  if (score <= 1) {
    return { score: 1, label: "Weak", colorClass: "bg-red-500" };
  }
  if (score === 2 || score === 3) {
    return { score: 2, label: "Good", colorClass: "bg-amber-500" };
  }
  return { score: 3, label: "Strong", colorClass: "bg-teal-500" };
});

async function handleSignup() {
  error.value = "";

  if (password.value !== confirmPassword.value) {
    error.value = "Passwords do not match.";
    return;
  }

  if (!agreeTerms.value) {
    error.value = "Please accept the terms and local-first privacy pledge to continue.";
    return;
  }

  isSubmitting.value = true;
  try {
    await auth.signup({
      name: name.value,
      email: email.value,
      password: password.value,
      role: role.value,
    });
    toast.success("Account created!", `Welcome to OpenVenue, ${name.value}`);
    void router.push("/projects");
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Failed to create account.";
  } finally {
    isSubmitting.value = false;
  }
}

async function handleProviderSignup(provider: "github" | "google") {
  error.value = "";
  isSubmitting.value = true;
  try {
    await auth.loginWithProvider(provider);
    toast.success(
      "Welcome!",
      `Account connected via ${provider === "github" ? "GitHub" : "Google"}`,
    );
    void router.push("/projects");
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Social signup failed.";
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
        <!-- Header -->
        <div class="text-center">
          <div
            class="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-teal-800 text-white dark:bg-teal-500 dark:text-zinc-950"
          >
            <svg width="24" height="24" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
              <rect width="32" height="32" rx="6" fill="currentColor" />
              <rect
                x="6"
                y="6"
                width="20"
                height="20"
                rx="2"
                fill="none"
                stroke="white"
                stroke-width="2"
              />
              <rect x="10" y="14" width="8" height="8" fill="white" fill-opacity="0.6" />
            </svg>
          </div>
          <h1 class="mt-4 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Create your account
          </h1>
          <p class="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
            Design event spaces with local-first precision and instant 3D.
          </p>
        </div>

        <!-- Social SSO Buttons -->
        <div class="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            data-testid="github-signup-button"
            class="focus-ring flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-750"
            @click="handleProviderSignup('github')"
          >
            <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            GitHub
          </button>
          <button
            type="button"
            data-testid="google-signup-button"
            class="focus-ring flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-750"
            @click="handleProviderSignup('google')"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Google
          </button>
        </div>

        <!-- Divider -->
        <div class="relative my-6">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-zinc-200 dark:border-zinc-800" />
          </div>
          <div class="relative flex justify-center text-xs uppercase">
            <span class="bg-white px-2 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              Or register with email
            </span>
          </div>
        </div>

        <!-- Error Alert -->
        <div
          v-if="error"
          data-testid="signup-error"
          role="alert"
          class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
        >
          {{ error }}
        </div>

        <!-- Form -->
        <form class="space-y-4" @submit.prevent="handleSignup">
          <div>
            <label
              for="signup-name"
              class="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Full name
            </label>
            <input
              id="signup-name"
              v-model="name"
              data-testid="signup-name"
              type="text"
              required
              autocomplete="name"
              placeholder="Alex Morgan"
              class="focus-ring mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder-zinc-500"
            />
          </div>

          <div>
            <label
              for="signup-email"
              class="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Email address
            </label>
            <input
              id="signup-email"
              v-model="email"
              data-testid="signup-email"
              type="email"
              required
              autocomplete="email"
              placeholder="alex@domain.com"
              class="focus-ring mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder-zinc-500"
            />
          </div>

          <div>
            <label
              for="signup-role"
              class="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Primary Role
            </label>
            <select
              id="signup-role"
              v-model="role"
              data-testid="signup-role"
              class="focus-ring mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            >
              <option value="Event Planner & Designer">Event Planner & Designer</option>
              <option value="Venue Architect / Interior Specialist">
                Venue Architect / Interior Specialist
              </option>
              <option value="Production & Stage Manager">Production & Stage Manager</option>
              <option value="Independent Creator">Independent Creator</option>
            </select>
          </div>

          <div>
            <label
              for="signup-password"
              class="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Password
            </label>
            <div class="relative mt-1">
              <input
                id="signup-password"
                v-model="password"
                data-testid="signup-password"
                :type="showPassword ? 'text' : 'password'"
                required
                autocomplete="new-password"
                placeholder="At least 6 characters"
                class="focus-ring block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 pr-10 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder-zinc-500"
              />
              <button
                type="button"
                data-testid="toggle-password"
                class="focus-ring absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                @click="showPassword = !showPassword"
              >
                <svg
                  v-if="!showPassword"
                  class="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                  />
                </svg>
              </button>
            </div>

            <!-- Password strength bar -->
            <div v-if="password" class="mt-2">
              <div
                class="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400"
              >
                <span>Password strength</span>
                <span
                  class="font-medium"
                  :class="
                    passwordStrength.score >= 2
                      ? 'text-teal-600 dark:text-teal-400'
                      : 'text-zinc-500'
                  "
                >
                  {{ passwordStrength.label }}
                </span>
              </div>
              <div class="mt-1 flex gap-1">
                <div
                  class="h-1 flex-1 rounded-full transition-colors"
                  :class="
                    passwordStrength.score >= 1
                      ? passwordStrength.colorClass
                      : 'bg-zinc-200 dark:bg-zinc-700'
                  "
                />
                <div
                  class="h-1 flex-1 rounded-full transition-colors"
                  :class="
                    passwordStrength.score >= 2
                      ? passwordStrength.colorClass
                      : 'bg-zinc-200 dark:bg-zinc-700'
                  "
                />
                <div
                  class="h-1 flex-1 rounded-full transition-colors"
                  :class="
                    passwordStrength.score >= 3
                      ? passwordStrength.colorClass
                      : 'bg-zinc-200 dark:bg-zinc-700'
                  "
                />
              </div>
            </div>
          </div>

          <div>
            <label
              for="signup-confirm-password"
              class="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Confirm password
            </label>
            <input
              id="signup-confirm-password"
              v-model="confirmPassword"
              data-testid="signup-confirm-password"
              type="password"
              required
              autocomplete="new-password"
              placeholder="Re-enter password"
              class="focus-ring mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder-zinc-500"
            />
          </div>

          <div class="flex items-start">
            <input
              id="agree-terms"
              v-model="agreeTerms"
              data-testid="signup-terms"
              type="checkbox"
              required
              class="mt-0.5 h-4 w-4 rounded border-zinc-300 text-teal-800 focus:ring-teal-600 dark:border-zinc-700 dark:bg-zinc-950 dark:checked:bg-teal-500"
            />
            <label
              for="agree-terms"
              class="ml-2 block text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed"
            >
              I agree to the Apache-2.0 terms and understand all venue data remains stored locally
              on this machine.
            </label>
          </div>

          <button
            type="submit"
            data-testid="signup-submit"
            :disabled="isSubmitting"
            class="focus-ring flex w-full items-center justify-center rounded-lg bg-teal-800 py-2.5 text-sm font-medium text-white transition hover:bg-teal-900 disabled:opacity-50 dark:bg-teal-400 dark:text-zinc-950 dark:hover:bg-teal-300"
          >
            <svg
              v-if="isSubmitting"
              class="mr-2 h-4 w-4 animate-spin text-current"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Create account
          </button>
        </form>

        <!-- Footer -->
        <p class="mt-6 text-center text-xs text-zinc-600 dark:text-zinc-400">
          Already have an account?
          <RouterLink
            to="/login"
            data-testid="to-login-link"
            class="font-medium text-teal-800 hover:underline dark:text-teal-400"
          >
            Sign in
          </RouterLink>
        </p>
      </div>
    </div>
  </main>
</template>
