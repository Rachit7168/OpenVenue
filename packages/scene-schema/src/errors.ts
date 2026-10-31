export class VenueValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(issues.join("\n"));
    this.name = "VenueValidationError";
    this.issues = issues;
  }
}
