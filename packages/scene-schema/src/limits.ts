export const MAX_VENUE_JSON_CHARS = 5_000_000;
export const MAX_JSON_DEPTH = 32;

/** True when objects or arrays nest deeper than maxDepth. Strings are not counted. */
export function jsonNestingExceeds(text: string, maxDepth: number): boolean {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{" || char === "[") {
      depth += 1;
      if (depth > maxDepth) {
        return true;
      }
    } else if (char === "}" || char === "]") {
      depth = Math.max(0, depth - 1);
    }
  }
  return false;
}
