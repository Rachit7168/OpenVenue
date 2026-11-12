import json
from functools import lru_cache
from pathlib import Path

import jsonschema

SCHEMA_PATH = (
    Path(__file__).resolve().parents[3] / "packages" / "scene-schema" / "src" / "schema" / "venue.schema.json"
)


@lru_cache(maxsize=1)
def venue_schema() -> dict:
    with SCHEMA_PATH.open(encoding="utf-8") as handle:
        return json.load(handle)


def validate_venue_document(document: object) -> list[str]:
    if not isinstance(document, dict):
        return ["Document must be a JSON object."]
    validator = jsonschema.Draft202012Validator(venue_schema())
    return [issue.message for issue in sorted(validator.iter_errors(document), key=str)]
