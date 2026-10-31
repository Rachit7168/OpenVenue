import { VenueValidationError } from "./errors.js";

/** Version written by this package. Older versions are migrated up to this before validation. */
export const CURRENT_SCHEMA_VERSION = "1.0.0";

/**
 * 1.0.0 is the first published version, so the chain is the identity.
 * A later version adds a step here, accepts the previous version, and returns
 * a document whose schemaVersion is CURRENT_SCHEMA_VERSION. Steps must not
 * delete unknown properties.
 */
export function migrateVenueDocument(input: unknown): unknown {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new VenueValidationError(["Document must be a JSON object"]);
  }

  const version = (input as { schemaVersion?: unknown }).schemaVersion;
  if (typeof version !== "string") {
    throw new VenueValidationError(["/schemaVersion must be a string"]);
  }

  if (version === CURRENT_SCHEMA_VERSION) {
    return input;
  }

  throw new VenueValidationError([
    `Unsupported schemaVersion "${version}". This build reads ${CURRENT_SCHEMA_VERSION} only.`,
  ]);
}
