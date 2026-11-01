import { benchmarkVenue } from "@openvenue/editor-core";
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { buildVenueGroup } from "./scene.js";

function elapsed(run: () => THREE.Group): { ms: number; group: THREE.Group } {
  const start = performance.now();
  const group = run();
  return { ms: performance.now() - start, group };
}

function release(group: THREE.Group) {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
    }
  });
}

describe("benchmark scenes", () => {
  it("builds 500 table meshes and one instanced run of 2,000 chairs", () => {
    buildVenueGroup(benchmarkVenue(500, "table"));
    const tables = elapsed(() => buildVenueGroup(benchmarkVenue(500, "table")));
    const chairs = elapsed(() => buildVenueGroup(benchmarkVenue(2000, "chair")));
    let meshes = 0;
    let instances = 0;
    tables.group.traverse((child) => {
      if (child instanceof THREE.Mesh && !(child instanceof THREE.InstancedMesh)) {
        meshes += 1;
      }
    });
    chairs.group.traverse((child) => {
      if (child instanceof THREE.InstancedMesh) {
        instances += child.count;
      }
    });
    expect(meshes).toBeGreaterThanOrEqual(500);
    expect(instances).toBe(2000);
    expect(tables.ms).toBeLessThan(5_000);
    expect(chairs.ms).toBeLessThan(5_000);
    release(tables.group);
    release(chairs.group);
  });
});
