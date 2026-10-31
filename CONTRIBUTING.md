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

The optional API:

```bash
python3 -m venv apps/api/.venv
apps/api/.venv/bin/pip install -r apps/api/requirements.txt
apps/api/.venv/bin/python apps/api/manage.py test
docker compose up --build
```

API docs: http://localhost:8000/api/v1/docs/

The web image is separate:

```bash
docker compose --profile web up --build web
```

That serves the editor at http://localhost:8080.

## Pull requests

Branch from `main` and open a pull request. Do not merge your own branch, and do not push directly to `main`.

Keep schema changes in `packages/scene-schema` with a test for a valid file and an invalid file. Read `packages/scene-schema/MIGRATION.md` before adding a field. Unknown properties on a venue document must survive a save.

The visitor app belongs in `apps/viewer`, not in the editor.

## Code of conduct

This project uses the [Contributor Covenant](CODE_OF_CONDUCT.md).
