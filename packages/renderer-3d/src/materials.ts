import * as THREE from "three";

export const MATERIAL_NAMES = ["concrete", "wood", "carpet", "glass"] as const;

export type MaterialName = (typeof MATERIAL_NAMES)[number];

const presets: Record<MaterialName, THREE.MeshStandardMaterial> = {
  concrete: new THREE.MeshStandardMaterial({
    color: "#a8a29e",
    roughness: 0.92,
    metalness: 0.04,
  }),
  wood: new THREE.MeshStandardMaterial({ color: "#b08968", roughness: 0.58, metalness: 0 }),
  carpet: new THREE.MeshStandardMaterial({ color: "#166534", roughness: 1, metalness: 0 }),
  glass: new THREE.MeshStandardMaterial({
    color: "#dbeafe",
    roughness: 0.08,
    metalness: 0.05,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
  }),
};

/** Shared surface. Unknown names use carpet so an empty room stays the usual green. */
export function materialPreset(name: string | undefined): THREE.MeshStandardMaterial {
  const key = name?.trim().toLowerCase();
  if (key === "concrete" || key === "wood" || key === "carpet" || key === "glass") {
    return presets[key];
  }
  return presets.carpet;
}
