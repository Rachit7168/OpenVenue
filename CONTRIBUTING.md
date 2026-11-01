# Contributing

OpenVenue is Apache-2.0. Issues and pull requests are welcome.

## Setup

You need Node.js 22 and pnpm 10.20.0 (Corepack can install that version). Python 3.12 is only needed for the optional API.

```bash
corepack enable
corepack prepare pnpm@10.20.0 --activate
pnpm install
pnpm dev
```

The editor is at http://localhost:5173. It creates an empty venue in the browser. Save downloads `venue.json`. Open loads a file and rejects it if it does not match the schema.

```bash
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

`packages/scene-schema/src/generated/venue.ts` is generated. After a schema change, run `pnpm generate` and commit the result.

The optional API needs `DJANGO_SECRET_KEY`. Debug stays off unless you set `DJANGO_DEBUG=1`.

Unix:

```bash
python3 -m venv apps/api/.venv
apps/api/.venv/bin/pip install -r apps/api/requirements.txt
DJANGO_SECRET_KEY=dev-only-change-me DJANGO_DEBUG=1 apps/api/.venv/bin/python apps/api/manage.py test
docker compose up --build
```

Windows (`cmd`):

```bat
py -3 -m venv apps\api\.venv
apps\api\.venv\Scripts\pip install -r apps\api\requirements.txt
set DJANGO_SECRET_KEY=dev-only-change-me
set DJANGO_DEBUG=1
apps\api\.venv\Scripts\python apps\api\manage.py test
docker compose up --build
```

API docs: http://localhost:8000/api/v1/docs/

The web image is separate:

```bash
docker compose --profile web up --build web
```

That serves the editor at http://localhost:8080.

## Contributing rules

1. **Target the `dev` branch only**: All contributions, feature branches, and bug fixes must target `dev`. Pull requests opened against `main` will be rejected by CI.
2. **Releases to `main`**: The `main` branch is strictly reserved for production releases, created by merging `dev` into `main`.
3. **No direct pushes**: Direct pushes to `main` and `dev` are blocked. All changes must go through pull requests.
4. **Automated checks**: Ensure all tests, linter checks, and formatting pass before opening a PR.
5. **Address review feedback**: Respond to review comments (including automated AI reviews like Sourcery) directly on your PR branch.

## Pull requests & development workflows

All contributions must target the `dev` branch. Choose the workflow below that fits your setup:

### Workflow A: Fork & Pull Request (Recommended for community contributors)

1. **Fork the repository**:
   Click **Fork** at [https://github.com/Rachit7168/OpenVenue](https://github.com/Rachit7168/OpenVenue) to create your personal fork.

2. **Clone your fork locally**:

   ```bash
   git clone https://github.com/<your-username>/OpenVenue.git
   cd OpenVenue
   ```

3. **Configure upstream remote**:

   ```bash
   git remote add upstream https://github.com/Rachit7168/OpenVenue.git
   git fetch upstream
   ```

4. **Create a feature branch based on `upstream/dev`**:

   ```bash
   git checkout -b feature/your-feature-name upstream/dev
   ```

5. **Run verification before committing**:

   ```bash
   pnpm format:check
   pnpm lint
   pnpm typecheck
   pnpm test
   ```

6. **Push to your fork**:

   ```bash
   git push -u origin feature/your-feature-name
   ```

7. **Submit a Pull Request**:
   - Open a pull request from `<your-username>:feature/your-feature-name` into `Rachit7168/OpenVenue:dev`.
   - Ensure the base branch is **`dev`** (NOT `main`). Pull requests targeting `main` will be blocked by CI.

---

### Workflow B: Direct branch workflow (for maintainers with write access)

1. **Update your local `dev` branch**:

   ```bash
   git checkout dev
   git pull origin dev
   ```

2. **Create a new branch from `dev`**:

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Run verification**:

   ```bash
   pnpm format:check
   pnpm lint
   pnpm typecheck
   pnpm test
   ```

4. **Push branch and open a PR into `dev`**:
   ```bash
   git push -u origin feature/your-feature-name
   gh pr create --base dev --head feature/your-feature-name
   ```

---

### General PR guidelines

- Keep schema changes in `packages/scene-schema` with a test for a valid file and an invalid file. Read `packages/scene-schema/MIGRATION.md` before adding a field. Unknown properties on a venue document must survive a save.
- The visitor app belongs in `apps/viewer`, not in the editor.
- Always run `pnpm format:check` to ensure Prettier compliance before opening a PR.

## Code of conduct

This project uses the [Contributor Covenant](CODE_OF_CONDUCT.md).
