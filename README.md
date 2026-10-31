# OpenVenue

[![CI](https://github.com/Rachit7168/OpenVenue/actions/workflows/ci.yml/badge.svg)](https://github.com/Rachit7168/OpenVenue/actions/workflows/ci.yml)

OpenVenue is a local-first designer for event spaces. You lay out halls, stages, and zones, then later let visitors walk the same file.

The editor, the visitor view, and a future live layer all read one `venue.json`.

## Status

You can create a project and see its floor plan: rooms, walls, objects, zones, and the entrance. Drag to pan and scroll to zoom. Projects stay in this browser. The 3D view is not built yet. The visitor app (`apps/viewer`) stays separate from the editor.

The roadmap is the [issue list](https://github.com/Rachit7168/OpenVenue/issues).

## Quick start

Node.js 22 and pnpm 10.20.0:

```bash
corepack enable
corepack prepare pnpm@10.20.0 --activate
pnpm install
pnpm dev
```

Open http://localhost:5173. **New project** asks for a name, hall size, ceiling height, and either an empty hall or a rectangular room. The list stays after a reload. Open a project to rename it, save JSON, or load a file. **Open JSON** checks the file against the schema and keeps the current venue if it is invalid. Use **Light** / **Dark** in the top bar to switch theme. The default is dark.

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

| Path                    | Role                                        |
| ----------------------- | ------------------------------------------- |
| `apps/web`              | Vue 3 editor shell                          |
| `apps/viewer`           | Future read-only visitor app                |
| `apps/api`              | Optional Django API                         |
| `packages/scene-schema` | `venue.json` schema, types, validator       |
| `packages/geometry`     | Plan math, snapping, walls, and rooms       |
| `packages/editor-core`  | Undoable commands                           |
| `packages/scene-engine` | Document store for the 2D plan and later 3D |
| `packages/renderer-2d`  | Plan viewport: pan, zoom, and grid          |

## License

[Apache-2.0](LICENSE). See [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
