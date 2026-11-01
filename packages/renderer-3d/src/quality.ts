export type QualityMode = "simple" | "high";

export interface QualityOptions {
  shadows: boolean;
  pixelRatioCap: number;
  fillIntensity: number;
  ambientIntensity: number;
}

/** Simple skips shadows and the fill light so a large hall stays light on weak GPUs. */
export function qualityOptions(mode: QualityMode): QualityOptions {
  if (mode === "high") {
    return { shadows: true, pixelRatioCap: 2, fillIntensity: 0.18, ambientIntensity: 0.32 };
  }
  return { shadows: false, pixelRatioCap: 1, fillIntensity: 0, ambientIntensity: 0.7 };
}
