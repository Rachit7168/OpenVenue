# venue.json migrations

`schemaVersion` is required on every document. This package reads **1.0.0**.

Load order:

1. Parse JSON. Treat the file as untrusted.
2. `migrateVenueDocument` walks the version chain up to `1.0.0`.
3. Ajv validates the result against `src/schema/venue.schema.json`.
4. Save with `saveVenueJson`. Do not rebuild the object field-by-field.

1.0.0 is the first version, so its migration step is the identity: the same object is returned.

## Adding a version

1. Copy the schema and bump `schemaVersion` to the new const, for example `1.1.0`.
2. Add a function that accepts a 1.0.0 document and returns a 1.1.0 document.
3. Teach `migrateVenueDocument` to run that step when it sees `1.0.0`, then validate against the new schema.
4. Add an example of the old file and a test that it migrates and still validates.
5. Do not delete properties you do not recognise. Editors, the viewer, and later live data all share this file. A field added by a newer build must survive a round-trip through an older one.

`interaction.contentRef` points at content that is **not** part of the venue schema (a menu file, or later an API resource). That content is versioned on its own. Changing a menu must not require a venue migration.

## Coordinate system

v1 stores an explicit coordinate system and only accepts one value: metres, +Y up, right-handed, radians. Plan points are `{x, z}` because Y is up. Keeping the object in the file means a future change is a migration, not a silent reinterpretation of old numbers.
