import Ajv2020, { type ErrorObject, type ValidateFunction } from "ajv/dist/2020";
import addFormats from "ajv-formats";
import schema from "./schema/venue.schema.json" with { type: "json" };
import { VenueValidationError } from "./errors.js";
import { jsonNestingExceeds, MAX_JSON_DEPTH, MAX_VENUE_JSON_CHARS } from "./limits.js";
import { migrateVenueDocument } from "./migrate.js";
import { venueReferenceIssues } from "./references.js";
import type { VenueDocument } from "./generated/venue.js";

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const validateSchema: ValidateFunction<VenueDocument> = ajv.compile<VenueDocument>(schema);

export interface ValidVenue {
  valid: true;
  document: VenueDocument;
}

export interface InvalidVenue {
  valid: false;
  issues: string[];
}

export type VenueValidationResult = ValidVenue | InvalidVenue;

export function formatSchemaErrors(errors: ErrorObject[] | null | undefined): string[] {
  if (!errors || errors.length === 0) {
    return ["Document does not match the venue schema"];
  }

  return errors.map((error) => {
    const path = error.instancePath.length > 0 ? error.instancePath : "/";
    return `${path} ${error.message ?? "is invalid"}`;
  });
}

/** Migrate then validate. Does not clone, so unknown properties stay on the object. */
export function validateVenue(input: unknown): VenueValidationResult {
  let migrated: unknown;
  try {
    migrated = migrateVenueDocument(input);
  } catch (error) {
    if (error instanceof VenueValidationError) {
      return { valid: false, issues: error.issues };
    }
    throw error;
  }

  if (!validateSchema(migrated)) {
    return { valid: false, issues: formatSchemaErrors(validateSchema.errors) };
  }

  const references = venueReferenceIssues(migrated);
  if (references.length > 0) {
    return { valid: false, issues: references };
  }

  return { valid: true, document: migrated };
}

export function assertVenueDocument(input: unknown): VenueDocument {
  const result = validateVenue(input);
  if (!result.valid) {
    throw new VenueValidationError(result.issues);
  }
  return result.document;
}

export function loadVenueJson(text: string): VenueDocument {
  if (text.length > MAX_VENUE_JSON_CHARS) {
    throw new VenueValidationError([`Document is larger than ${MAX_VENUE_JSON_CHARS} characters`]);
  }
  if (jsonNestingExceeds(text, MAX_JSON_DEPTH)) {
    throw new VenueValidationError([`Document nesting is deeper than ${MAX_JSON_DEPTH} levels`]);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text, (key, value: unknown) => {
      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        throw new VenueValidationError(["Document contains a forbidden property"]);
      }
      return value;
    }) as unknown;
  } catch (error) {
    if (error instanceof VenueValidationError) {
      throw error;
    }
    throw new VenueValidationError(["Document is not valid JSON"]);
  }
  return assertVenueDocument(parsed);
}

/** Pretty JSON with a trailing newline. Unknown properties are kept. */
export function saveVenueJson(document: VenueDocument): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}

export { schema as venueSchema };
