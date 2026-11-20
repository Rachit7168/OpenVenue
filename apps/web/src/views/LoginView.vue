<script setup lang="ts">
import { ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useToastStore } from "../stores/toast";

const auth = useAuthStore();
const toast = useToastStore();
const router = useRouter();
const route = useRoute();

const email = ref("");
const password = ref("");
const rememberMe = ref(true);
const showPassword = ref(false);
const error = ref("");
const isSubmitting = ref(false);

async function handleLogin() {
  error.value = "";
  isSubmitting.value = true;
  try {
    await auth.login({
      email: email.value,
      password: password.value,
      rememberMe: rememberMe.value,
    });
    toast.success("Welcome back!", `Signed in as ${auth.user?.name}`);
    const redirect = (route.query.redirect as string) || "/projects";
    void router.push(redirect);
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Failed to sign in.";
  } finally {
    isSubmitting.value = false;
  }
}

function handleGuestLogin() {
  auth.continueAsGuest();
  toast.info("Guest mode active", "Explore OpenVenue without saving to an account.");
  const redirect = (route.query.redirect as string) || "/projects";
  void router.push(redirect);
}

async function handleProviderLogin(provider: "github" | "google") {
  error.value = "";
  isSubmitting.value = true;
  try {
    await auth.loginWithProvider(provider);
    toast.success("Welcome!", `Signed in via ${provider === "github" ? "GitHub" : "Google"}`);
    const redirect = (route.query.redirect as string) || "/projects";
    void router.push(redirect);
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Social authentication failed.";
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <main
    class="page-grid mx-auto flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12 sm:px-6"
  >
    <div class="auth-panel rise-in">
      <div class="text-center">
        <div class="brand-mark mx-auto">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect
              x="2"
              y="2"
              width="12"
              height="12"
              rx="1.5"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <rect x="5" y="8" width="5" height="4" fill="currentColor" />
          </svg>
        </div>
        <h1 class="mt-4 text-2xl font-bold tracking-tight">Welcome back</h1>
        <p class="mt-1.5 text-sm" style="color: var(--ink-soft)">
          Sign in to manage your venues and synchronized spaces.
        </p>
      </div>

      <!-- One-click Guest Access Button -->
      <div class="mt-6">
        <button
          type="button"
          data-testid="guest-login-button"
          class="btn btn-secondary w-full"
          @click="handleGuestLogin"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          Instant Demo · Continue as Guest
        </button>
      </div>

      <!-- Social SSO Buttons -->
      <div class="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          data-testid="github-login-button"
          class="btn btn-secondary min-h-10"
          @click="handleProviderLogin('github')"
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
          data-testid="google-login-button"
          class="btn btn-secondary min-h-10"
          @click="handleProviderLogin('google')"
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
          <span
            class="px-2 text-xs uppercase"
            style="background: var(--paper-raised); color: var(--ink-soft)"
          >
            Or continue with email
          </span>
        </div>
      </div>

      <!-- Error Alert -->
      <div v-if="error" data-testid="login-error" role="alert" class="editor-alert-error mb-4">
        {{ error }}
      </div>

      <!-- Form -->
      <form class="space-y-4" @submit.prevent="handleLogin">
        <div>
          <label
            for="login-email"
            class="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Email address
          </label>
          <input
            id="login-email"
            v-model="email"
            data-testid="login-email"
            type="email"
            required
            autocomplete="email"
            placeholder="you@domain.com"
            class="field"
          />
        </div>

        <div>
          <div class="flex items-center justify-between">
            <label
              for="login-password"
              class="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Password
            </label>
            <RouterLink
              to="/forgot-password"
              class="text-xs font-medium text-teal-800 hover:underline dark:text-teal-400"
            >
              Forgot password?
            </RouterLink>
          </div>
          <div class="relative mt-1">
            <input
              id="login-password"
              v-model="password"
              data-testid="login-password"
              :type="showPassword ? 'text' : 'password'"
              required
              autocomplete="current-password"
              placeholder="••••••••"
              class="field pr-10"
            />
            <button
              type="button"
              data-testid="toggle-password"
              class="focus-ring absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
              @click="showPassword = !showPassword"
            >
              <!-- Eye icon -->
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
              <!-- Eye slash icon -->
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
        </div>

        <div class="flex items-center">
          <input
            id="remember-me"
            v-model="rememberMe"
            data-testid="login-remember"
            type="checkbox"
            class="h-4 w-4 rounded border-zinc-300 text-teal-800 focus:ring-teal-600 dark:border-zinc-700 dark:bg-zinc-950 dark:checked:bg-teal-500"
          />
          <label for="remember-me" class="ml-2 block text-xs text-zinc-700 dark:text-zinc-300">
            Remember me on this device
          </label>
        </div>

        <button
          type="submit"
          data-testid="login-submit"
          :disabled="isSubmitting"
          class="btn btn-primary w-full disabled:opacity-50"
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
          Sign in
        </button>
      </form>

      <!-- Footer -->
      <p class="mt-6 text-center text-xs" style="color: var(--ink-soft)">
        Don't have an account?
        <RouterLink
          to="/signup"
          data-testid="to-signup-link"
          class="font-medium"
          style="color: var(--accent-deep)"
        >
          Sign up free
        </RouterLink>
      </p>
    </div>
  </main>
</template>
