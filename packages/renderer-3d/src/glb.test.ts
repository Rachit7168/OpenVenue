import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  assemblyGlb,
  boxGlb,
  clearModels,
  createGltfLoader,
  encodeGlb,
  loadGlbBytes,
  readWithProgress,
  rememberModel,
  validateGlb,
} from "./glb.js";
import { buildVenueGroup } from "./scene.js";
import { createEmptyVenue } from "@openvenue/scene-schema";
import { patchVenueGroup } from "./sync.js";

const ASSET = "6f1c2a40-7b2e-4c1a-9d3e-1a2b3c4d5e01";

describe("glb models", () => {
  it("rejects files that are not glTF and models that carry scripts", () => {
    expect(validateGlb(new TextEncoder().encode("<script>alert(1)</script>"))).toMatch(/not a GLB/);
    const scripted = encodeGlb({
      asset: { version: "2.0" },
      buffers: [{ uri: "javascript:alert(1)", byteLength: 0 }],
    });
    expect(validateGlb(scripted)).toMatch(/script|URI/);
    const remote = encodeGlb({
      asset: { version: "2.0" },
      extensionsUsed: ["KHR_techniques_webgl"],
    });
    expect(validateGlb(remote)).toMatch(/not allowed/);
    expect(
      validateGlb(
        encodeGlb({ asset: { version: "2.0" }, extensionsUsed: ["KHR_draco_mesh_compression"] }),
      ),
    ).toBeNull();
  });

  it("parses a generated box and reports download progress", async () => {
    const bytes = boxGlb([0.2, 0.4, 0.6]);
    expect(validateGlb(bytes)).toBeNull();
    const ratios: number[] = [];
    const read = await readWithProgress(readerOf(byteChunks()), 3, (ratio) => ratios.push(ratio));
    expect(Array.from(read)).toEqual([1, 2, 3]);
    expect(ratios.at(-1)).toBe(1);

    const model = await loadGlbBytes(bytes);
    const box = new THREE.Box3().setFromObject(model);
    expect(box.getSize(new THREE.Vector3()).x).toBeCloseTo(1);
    expect(() => assemblyGlb([])).toThrow(/at least one box/);
    const stacked = await loadGlbBytes(
      assemblyGlb([
        { center: [0, 0.5, 0], size: [1, 1, 1], color: [0.2, 0.2, 0.2] },
        { center: [0, 2, 0], size: [1, 1, 1], color: [0.8, 0.8, 0.8] },
      ]),
    );
    expect(new THREE.Box3().setFromObject(stacked).getSize(new THREE.Vector3()).y).toBeCloseTo(2.5);
    const loader = createGltfLoader("/draco/") as GLTFLoaderLike;
    expect(loader.dracoLoader).toBeTruthy();
    expect(loader.meshoptDecoder).toBeTruthy();
  });

  it("places a cached model and moves it without rebuilding the mesh", async () => {
    const model = await loadGlbBytes(boxGlb());
    rememberModel(ASSET, model);
    const document = createEmptyVenue();
    const floor = document.venue.floors[0];
    if (!floor) {
      throw new Error("missing floor");
    }
    floor.objects.push({
      id: "table-1",
      type: "table",
      name: "Side table",
      assetId: ASSET,
      transform: {
        position: { x: 4, y: 0, z: 2 },
        rotation: { x: 0, y: 0, z: 0 },
      },
      dimensions: { width: 1.2, height: 0.75, depth: 0.8 },
    });
    const group = buildVenueGroup(document);
    let placed: THREE.Object3D | undefined;
    group.traverse((child) => {
      if (child.userData.entityId === "table-1") {
        placed = child;
      }
    });
    if (!placed) {
      throw new Error("missing model");
    }
    expect(placed.userData.model).toBe(true);
    expect(placed.position.x).toBeCloseTo(4);
    expect(placed.position.y).toBeCloseTo(0.375);
    const moved = structuredClone(document);
    const table = moved.venue.floors[0]?.objects[0];
    if (!table) {
      throw new Error("missing table");
    }
    table.transform.position = { x: 6, y: 0, z: 2 };
    expect(patchVenueGroup(group, moved, "MOVE_OBJECT")).toBe(true);
    expect(placed.position.x).toBeCloseTo(6);
    clearModels();
  });
});

interface GLTFLoaderLike {
  dracoLoader?: unknown;
  meshoptDecoder?: unknown;
}

async function* byteChunks() {
  yield new Uint8Array([1, 2]);
  yield new Uint8Array([3]);
}

function readerOf(source: AsyncGenerator<Uint8Array>): {
  read: () => Promise<{ done: boolean; value?: Uint8Array }>;
} {
  return {
    async read() {
      const next = await source.next();
      return { done: Boolean(next.done), value: next.value };
    },
  };
}
