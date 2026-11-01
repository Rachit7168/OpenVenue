## Summary

-

## Branch target checklist

- [ ] **Target branch is `dev`**: This pull request is opened against `dev` (NOT `main`). Pull requests opened against `main` are rejected unless they are official releases.

## Test plan

- [ ] `pnpm install && pnpm build && pnpm test && pnpm lint && pnpm format:check`
- [ ] `pnpm dev` — create, save, and load an empty venue in dark and light mode
- [ ] `docker compose up --build` — API docs load at http://localhost:8000/api/v1/docs/
