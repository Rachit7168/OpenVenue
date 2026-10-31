# OpenVenue

[![CI](https://github.com/Rachit7168/OpenVenue/actions/workflows/ci.yml/badge.svg)](https://github.com/Rachit7168/OpenVenue/actions/workflows/ci.yml)

OpenVenue is a local-first designer for event spaces. You lay out halls, stages, and zones, then later let visitors walk the same file.

The editor, the visitor view, and a future live layer all read one `venue.json`. Phase 1 is that file, plus a shell that can create it, save it, and load it.

## Status

Foundation only. You can create, validate, save, and load a venue document. Walls, the 2D canvas, and the 3D view are not built yet. The visitor app (`apps/viewer`) is a placeholder so it stays separate from the editor.

The roadmap is the [issue list](https://github.com/Rachit7168/OpenVenue/issues).

## Quick start

Node.js 22 and pnpm 10.20.0:

```bash
corepack enable
corepack prepare pnpm@10.20.0 --activate
pnpm install
pnpm dev
```

Open http://localhost:5173. The workspace starts from an empty venue (one ground floor and an entrance spawn). **Save JSON** downloads the file. **Open JSON** checks it against the schema and keeps the current venue if the file is invalid. Use **Light** / **Dark** in the top bar to switch theme. The default is dark.

```bash
pnpm build
pnpm test
pnpm lint
```

## Venue file

The schema is `packages/scene-schema/src/schema/venue.schema.json` (draft 2020-12, version 1.0.0).

- Lengths are metres. The world is right-handed, +Y up, angles in radians. Plan points are `{x, z}`.
- Every entity id is a UUID.
- Zones carry an `interaction` (`info-panel`, `link`, `menu`, `session-list`, or `none`). The menu itself is a `contentRef` outside the geometry file.
- `spawnPoints` mark where a visitor starts. Optional `navigation` holds walkable areas and waypoints.
- Unknown properties are kept when you save. See [packages/scene-schema/MIGRATION.md](packages/scene-schema/MIGRATION.md).

Examples:

- [examples/empty-venue.json](examples/empty-venue.json)
- [examples/venue-with-zone.json](examples/venue-with-zone.json)

## Optional API

The editor does not call the API. Django is there for later project sync. It uses a custom user model (UUID primary key), PostgreSQL when `POSTGRES_HOST` is set, Redis settings for later, and OpenAPI docs.

```bash
docker compose up --build
```

- Health: http://localhost:8000/api/v1/health/
- Docs: http://localhost:8000/api/v1/docs/

The Compose password and secret are for local development only. See [SECURITY.md](SECURITY.md).

To run the editor from Docker instead of Vite:

```bash
docker compose --profile web up --build web
```

http://localhost:8080

Dockerfiles: [apps/api/Dockerfile](apps/api/Dockerfile) and [apps/web/Dockerfile](apps/web/Dockerfile).

## Layout

| Path                                       | Role                                  |
| ------------------------------------------ | ------------------------------------- |
| `apps/web`                                 | Vue 3 editor shell                    |
| `apps/viewer`                              | Future read-only visitor app          |
| `apps/api`                                 | Optional Django API                   |
| `packages/scene-schema`                    | `venue.json` schema, types, validator |
| `packages/geometry` and the other packages | Reserved for later phases             |

## License

[Apache-2.0](LICENSE). See [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
