import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { entityIdOf, poseFromMesh } from "./pick.js";

describe("picking", () => {
  it("reads the furniture id from a child mesh", () => {
    const group = new THREE.Group();
    group.userData.entityId = "table-1";
    const mesh = new THREE.Mesh();
    group.add(mesh);
    expect(entityIdOf(mesh)).toBe("table-1");
    expect(entityIdOf(new THREE.Mesh())).toBeNull();
  });

  it("turns a centred, scaled mesh into a floor pose", () => {
    const mesh = new THREE.Mesh();
    mesh.position.set(4, 1, 2);
    mesh.rotation.y = Math.PI / 2;
    mesh.scale.set(2, 1, 1);
    const pose = poseFromMesh(mesh, { width: 1.2, height: 0.75, depth: 0.8 });
    expect(pose.position).toEqual({ x: 4, y: 1 - 0.75 / 2, z: 2 });
    expect(pose.rotation.y).toBeCloseTo(Math.PI / 2);
    expect(pose.dimensions.width).toBeCloseTo(2.4);
    expect(pose.dimensions.height).toBeCloseTo(0.75);
    expect(pose.dimensions.depth).toBeCloseTo(0.8);
  });
});
