import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { frameVenue } from "./camera.js";

function cameras() {
  return {
    perspective: new THREE.PerspectiveCamera(45, 1, 0.05, 500),
    orthographic: new THREE.OrthographicCamera(-1, 1, 1, -1, 0.05, 500),
  };
}

describe("frameVenue", () => {
  const box = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 3, 8));

  it("places the orbit camera off the corner of the hall", () => {
    const { perspective, orthographic } = cameras();
    const framed = frameVenue({
      mode: "orbit",
      box,
      aspect: 1.5,
      perspective,
      orthographic,
      resetDirection: true,
    });
    expect(framed?.target.x).toBeCloseTo(5);
    expect(framed?.target.z).toBeCloseTo(4);
    expect(perspective.position.x).toBeGreaterThan(framed?.target.x ?? 0);
    expect(perspective.position.y).toBeGreaterThan(3);
  });

  it("looks down the isometric diagonal", () => {
    const { perspective, orthographic } = cameras();
    frameVenue({
      mode: "isometric",
      box,
      aspect: 1,
      perspective,
      orthographic,
      resetDirection: true,
    });
    const direction = orthographic.position
      .clone()
      .sub(box.getCenter(new THREE.Vector3()))
      .normalize();
    expect(direction.x).toBeCloseTo(direction.y);
    expect(direction.y).toBeCloseTo(direction.z);
    expect(orthographic.top).toBeGreaterThan(5);
  });

  it("keeps the viewing direction when fitting", () => {
    const { perspective, orthographic } = cameras();
    const center = box.getCenter(new THREE.Vector3());
    perspective.position.copy(center).add(new THREE.Vector3(0, 10, 0));
    frameVenue({
      mode: "orbit",
      box,
      aspect: 1,
      perspective,
      orthographic,
      resetDirection: false,
    });
    const offset = perspective.position.clone().sub(center);
    expect(offset.x).toBeCloseTo(0);
    expect(offset.z).toBeCloseTo(0);
    expect(offset.y).toBeGreaterThan(10);
  });
});
