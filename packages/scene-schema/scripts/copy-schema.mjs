import { copyFile, mkdir } from "node:fs/promises";

await mkdir("dist/schema", { recursive: true });
await copyFile("src/schema/venue.schema.json", "dist/schema/venue.schema.json");
