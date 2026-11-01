import type { VenueDocument } from "@openvenue/scene-schema";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { buildVenueGroup } from "./scene.js";

function ensureFileReader() {
  if (typeof globalThis.FileReader === "function") {
    return;
  }
  class Reader {
    result: ArrayBuffer | null = null;
    onloadend: (() => void) | null = null;
    readAsArrayBuffer(blob: Blob) {
      void blob.arrayBuffer().then((buffer) => {
        this.result = buffer;
        this.onloadend?.();
      });
    }
  }
  globalThis.FileReader = Reader as unknown as typeof FileReader;
}

/** Binary glTF of the current hall, without the editor camera or lights. */
export async function exportVenueGlb(document: VenueDocument): Promise<Uint8Array> {
  ensureFileReader();
  const exporter = new GLTFExporter();
  const data = await exporter.parseAsync(buildVenueGroup(document), { binary: true });
  if (!(data instanceof ArrayBuffer)) {
    throw new Error("The hall export was not a GLB file.");
  }
  return new Uint8Array(data);
}
