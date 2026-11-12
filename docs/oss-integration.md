# OSS Integration Design: Rooms, Booths, and Schedule Mapping

This document outlines how OpenVenue (`venue.json`) integrates with external open-source event management systems (such as Pretalx, Eventyay, Indico, or custom Django/API backends) without coupling live schedule or exhibitor data into the core geometry file.

## Design Principles

1. **Geometry stays decoupled**: `venue.json` stores spatial layout, dimensions, zones, and interaction anchors. Live schedules, speaker bios, and sponsor tiers remain in the external event system or API.
2. **Reference by stable UUIDs and `contentRef`**: OpenVenue entities carry immutable UUIDs (`id`) and optional `interaction` pointers (`contentRef`), while `additionalProperties: true` in `venue.schema.json` allows external integrations to attach non-breaking foreign keys if needed.
3. **Read-only viewer safety**: Visitor viewers resolve `contentRef` over read-only HTTPS/JSON endpoints with strict origin/protocol checks (no inline script execution).

---

## 1. Room-to-Session & Booth-to-Exhibitor Mapping

### Rooms & Stages → Sessions

- **OpenVenue side**:
  - A `Room` or `Zone` (e.g., `"Main Auditorium"`, `"Workshop Room B"`) or a `SceneObject` (`type: "stage"`) defines the physical space.
  - Set `interaction.type = "session-list"` and `interaction.contentRef` to an API path or static JSON feed, e.g.:
    ```json
    {
      "interaction": {
        "type": "session-list",
        "contentRef": "/api/v1/events/{eventSlug}/rooms/{roomId}/sessions/"
      }
    }
    ```
- **External OSS system side**:
  - Maintain a mapping table: `(venue_id, openvenue_entity_id) -> external_room_id`.
  - When a visitor clicks the room or stage in the 3D viewer, the viewer fetches the `contentRef` endpoint and renders the current & upcoming sessions, speaker names, and time slots.

### Booths & Zones → Exhibitors / Sponsors

- **OpenVenue side**:
  - A `SceneObject` with `type: "booth"` or a `Zone` representing a sponsor pavilion sets `interaction.type = "info-panel"` (or `"link"` / `"menu"` for food stalls).
  - `contentRef` points to the exhibitor profile resource:
    ```json
    {
      "interaction": {
        "type": "info-panel",
        "contentRef": "/api/v1/events/{eventSlug}/exhibitors/{entityId}/"
      }
    }
    ```
- **External OSS system side**:
  - Maps the `entityId` (UUID) to the exhibitor/sponsor record (tier, logo URL, description, staff contact, external links).
  - Booth branding (banners/logos) can be loaded as sanitized textures or displayed in the click overlay without modifying `venue.json`.

---

## 2. Check-In Entrances & Volunteer Areas

### Check-In Entrances

- **Spatial representation**:
  - Represented using `SpawnPoint` entities with `role: "visitor"` (main/VIP/accessible check-in entrances) and nearby `Zone` polygons labeled `"Check-in"`.
  - Multiple check-in `SpawnPoint` entries allow deep-linking visitors to their assigned gate (e.g., `?spawn=<uuid>`).
- **Operational overlay**:
  - External check-in systems can expose queue status or badge-desk availability via `Zone.interaction.contentRef` (`type: "info-panel"`), allowing organizers and visitors to see wait times or gate assignments.

### Volunteer & Staff Areas

- **Spatial representation**:
  - `SpawnPoint` with `role: "staff"` marks volunteer check-in, backstage, or AV control entry points.
  - `Zone` polygons with custom metadata (e.g., `x-access: "staff"` or `interaction.type: "info-panel"`) delineate volunteer lounges, storage, and backstage corridors.
- **Visibility rules**:
  - Public visitor viewers hide or lock `role: "staff"` spawn points and staff-only overlays unless an authenticated staff token is present.

---

## 3. Venue API and Scene Metadata

### Resource Model (`apps/api`)

The optional Django API (`apps/api`) acts as the bridge between the local-first `venue.json` and external OSS event systems:

| Endpoint                             | Purpose                                                                                                         |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/venues/{id}/`           | Returns scene metadata (`name`, `version`, `updatedAt`) and download URL for `venue.json`.                      |
| `GET /api/v1/venues/{id}/mappings/`  | Returns the binding list between OpenVenue UUIDs and external room/exhibitor IDs.                               |
| `PUT /api/v1/venues/{id}/mappings/`  | Organizer endpoint to bind/unbind a room or booth UUID to an external resource.                                 |
| `GET /api/v1/events/{slug}/overlay/` | Aggregated live status (active session per room, booth status, gate wait times) keyed by OpenVenue entity UUID. |

### Scene Metadata Conventions

- **Preserving unknown properties**: `venue.schema.json` allows `additionalProperties: true`. External integrations may store lightweight, non-sensitive linkage hints under an `x-oss` namespace if offline export is needed:
  ```json
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Keynote Hall",
    "x-oss": {
      "provider": "pretalx",
      "externalRoomId": "hall-a"
    }
  }
  ```
- OpenVenue's editor preserves unknown properties automatically during save/export (`packages/scene-schema/MIGRATION.md`).

---

## 4. Auth and Permissions Between Systems

### Principle of Least Privilege

| Role                  | Editor (`venue.json`)  | Mapping Config | Live Schedule / Public Info | Staff / Volunteer Areas |
| --------------------- | ---------------------- | -------------- | --------------------------- | ----------------------- |
| **Anonymous Visitor** | Read-only (via Viewer) | No access      | Read-only                   | Hidden                  |
| **Volunteer / Staff** | Read-only              | Read-only      | Read-only                   | Visible (staff view)    |
| **Event Organizer**   | Read / Write           | Read / Write   | Managed in OSS              | Full access             |

### Integration Auth Flow

1. **Public Read Path (Visitor Viewer)**:
   - Unauthenticated `GET` requests for `venue.json` and public `contentRef` resources (sessions, public booths).
   - CORS is restricted to configured viewer origins; responses must be JSON/media (never executable HTML/JS).
2. **Organizer Mapping Sync (Server-to-Server / OAuth2)**:
   - OpenVenue API authenticates organizers via JWT / OAuth2 tokens issued by the host event platform (or Django session/token auth).
   - Syncing room/exhibitor lists from Pretalx/Eventyay uses scoped read-only API tokens stored server-side in `apps/api` (never exposed in `venue.json` or browser storage).
3. **Staff Overlay Access**:
   - Requests for staff-only `contentRef` endpoints or `role: "staff"` spawn overlays require a valid bearer token with `venue:staff` scope; unauthorized requests return `403` and the viewer omits those overlays gracefully.
4. **Content Sanitization**:
   - All strings rendered from `contentRef` payloads (session titles, booth descriptions, links) must be rendered as plain text or sanitized markdown, and `link` interactions must validate `https:` / `http:` protocols before navigation.
