import { cpSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, "dist");
const required = {
  "index.html": ["Getting started", "pnpm dev"],
  "schema.html": ["1.0.0", "metres"],
  "assets.html": ["Apache-2.0", "32 MB"],
  "changelog.html": ["0.1.0"],
};

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(join(root, "site"), dist, { recursive: true });

for (const [file, phrases] of Object.entries(required)) {
  const text = readFileSync(join(dist, file), "utf8");
  for (const phrase of phrases) {
    if (!text.includes(phrase)) {
      throw new Error(`${file} is missing “${phrase}”`);
    }
  }
}

const notes = readFileSync(join(root, "../../CHANGELOG.md"), "utf8");
if (!notes.includes("## 0.1.0")) {
  throw new Error("CHANGELOG.md is missing the 0.1.0 section");
}
