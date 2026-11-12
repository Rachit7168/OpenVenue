import * as THREE from "three";

/**
 * Stylized 3D visitor avatar shown at the walker position in Orbit/Isometric/Map
 * and in 3rd-person Walk mode. Origin sits on the floor (Y = 0).
 */
export function createVisitorAvatar(): THREE.Group {
  const group = new THREE.Group();
  group.name = "visitor-avatar";

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x14b8a6,
    roughness: 0.45,
    metalness: 0.1,
  });
  const headMat = new THREE.MeshStandardMaterial({
    color: 0x99f6e4,
    roughness: 0.35,
    metalness: 0.05,
  });
  const visorMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.2,
    metalness: 0.3,
  });
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x2dd4bf,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.65,
  });

  const ring = new THREE.Mesh(new THREE.RingGeometry(0.24, 0.32, 24), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  group.add(ring);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.05, 16), bodyMat);
  torso.position.y = 0.65;
  torso.castShadow = true;
  group.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), headMat);
  head.position.y = 1.42;
  head.castShadow = true;
  group.add(head);

  // Forward-facing visor along -Z (matching Three.js camera forward direction)
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.12), visorMat);
  visor.position.set(0, 1.44, -0.13);
  group.add(visor);

  return group;
}
