<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>

<template>
  <footer
    class="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
    role="contentinfo"
  >
    <div class="mx-auto max-w-[90rem] px-4 py-12 sm:px-6 lg:py-16">
      <div class="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
        <!-- Brand column -->
        <div class="col-span-2 lg:col-span-2">
          <div class="flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
              <rect width="32" height="32" rx="6" class="fill-teal-800 dark:fill-teal-500" />
              <rect
                x="6"
                y="6"
                width="20"
                height="20"
                rx="2"
                fill="none"
                class="stroke-teal-50"
                stroke-width="2"
              />
              <rect x="10" y="14" width="8" height="8" class="fill-teal-200" />
            </svg>
            <span class="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              OpenVenue
            </span>
          </div>
          <p class="mt-3 max-w-sm text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Open-source, local-first venue designer for events, conferences, and exhibitions.
            Precision 2D floor plans, photorealistic 3D visualization, and automated egress checks.
          </p>
          <div
            class="mt-4 flex items-center gap-2 text-xs font-medium text-teal-800 dark:text-teal-400"
          >
            <span class="inline-block h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
            Local Engine: Ready &amp; 100% Offline Capable
          </div>
        </div>

        <!-- Product links -->
        <div>
          <h3
            class="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100"
          >
            Product
          </h3>
          <ul class="mt-4 space-y-2.5 text-sm">
            <li>
              <RouterLink to="/projects" class="hover:text-zinc-900 dark:hover:text-zinc-100">
                Venue Editor
              </RouterLink>
            </li>
            <li>
              <RouterLink to="/guide" class="hover:text-zinc-900 dark:hover:text-zinc-100">
                In-App Guide
              </RouterLink>
            </li>
            <li>
              <RouterLink to="/benchmark" class="hover:text-zinc-900 dark:hover:text-zinc-100">
                Benchmarks
              </RouterLink>
            </li>
            <li>
              <RouterLink to="/login" class="hover:text-zinc-900 dark:hover:text-zinc-100">
                Sign In
              </RouterLink>
            </li>
            <li>
              <RouterLink to="/signup" class="hover:text-zinc-900 dark:hover:text-zinc-100">
                Create Account
              </RouterLink>
            </li>
          </ul>
        </div>

        <!-- Resources -->
        <div>
          <h3
            class="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100"
          >
            Resources
          </h3>
          <ul class="mt-4 space-y-2.5 text-sm">
            <li>
              <a
                href="https://github.com/Rachit7168/OpenVenue#readme"
                target="_blank"
                rel="noreferrer"
                class="hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Documentation
              </a>
            </li>
            <li>
              <a
                href="https://github.com/Rachit7168/OpenVenue/tree/main/packages/scene-schema"
                target="_blank"
                rel="noreferrer"
                class="hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Venue Schema
              </a>
            </li>
            <li>
              <a
                href="https://github.com/Rachit7168/OpenVenue/blob/main/CHANGELOG.md"
                target="_blank"
                rel="noreferrer"
                class="hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Changelog (v0.1.0)
              </a>
            </li>
            <li>
              <a
                href="https://github.com/Rachit7168/OpenVenue/blob/main/SECURITY.md"
                target="_blank"
                rel="noreferrer"
                class="hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Security Policy
              </a>
            </li>
          </ul>
        </div>

        <!-- Community & Open Source -->
        <div>
          <h3
            class="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100"
          >
            Open Source
          </h3>
          <ul class="mt-4 space-y-2.5 text-sm">
            <li>
              <a
                href="https://github.com/Rachit7168/OpenVenue"
                target="_blank"
                rel="noreferrer"
                class="hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                GitHub Repository
              </a>
            </li>
            <li>
              <a
                href="https://github.com/Rachit7168/OpenVenue/issues"
                target="_blank"
                rel="noreferrer"
                class="hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Issue Tracker
              </a>
            </li>
            <li>
              <a
                href="https://github.com/Rachit7168/OpenVenue/blob/main/CONTRIBUTING.md"
                target="_blank"
                rel="noreferrer"
                class="hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Contributing
              </a>
            </li>
            <li>
              <a
                href="https://github.com/Rachit7168/OpenVenue/blob/main/LICENSE"
                target="_blank"
                rel="noreferrer"
                class="hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Apache-2.0 License
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div
        class="mt-12 flex flex-col items-center justify-between gap-4 border-t border-zinc-200 pt-8 dark:border-zinc-800 sm:flex-row text-xs"
      >
        <p>© 2026 OpenVenue Contributors. Free and open source under Apache-2.0.</p>
        <p class="text-zinc-500">No trackers. No cookies. Your venues remain in this browser.</p>
      </div>
    </div>
  </footer>
</template>
