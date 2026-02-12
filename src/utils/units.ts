export type VolumeUnit = "ml" | "oz";

export const ML_PER_OZ = 29.5735;

export function normalizeUnit(unit?: string): VolumeUnit {
  return unit === "oz" ? "oz" : "ml";
}

export function toMl(value: number, unit: VolumeUnit): number {
  if (!Number.isFinite(value)) return 0;
  return unit === "oz" ? value * ML_PER_OZ : value;
}

export function fromMl(valueMl: number, unit: VolumeUnit): number {
  if (!Number.isFinite(valueMl)) return 0;
  return unit === "oz" ? valueMl / ML_PER_OZ : valueMl;
}

export function roundVolume(value: number, unit: VolumeUnit): number {
  if (unit === "oz") {
    return Math.round(value * 10) / 10;
  }
  return Math.round(value);
}

export function formatVolume(
  valueMl: number,
  unit: VolumeUnit
): string {
  const converted = fromMl(valueMl, unit);
  const rounded = roundVolume(converted, unit);
  return `${rounded} ${unit}`;
}
