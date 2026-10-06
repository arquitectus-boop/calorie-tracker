/** Rule of thumb: 7700 kcal ≈ 1 kg body fat → grams = round(|diff_kcal| / 7.7) */
export function kcalToFatGrams(diffKcal: number): number {
  return Math.round(Math.abs(diffKcal) / 7.7)
}

/** Short PT label, e.g. "≈ 65 g" */
export function formatFatGrams(diffKcal: number): string {
  return `≈ ${kcalToFatGrams(diffKcal)} g`
}
