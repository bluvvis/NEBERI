import type { RiskLevel } from "@/types";
import { BRAND } from "@/lib/brand";

/**
 * Цвет дуги скор-ринга: пороги как у API (≤20 / 21–54 / ≥55), палитра серый + акцент.
 * При явном risk_level он главнее числа.
 */
export function scoreArcColor(score: number, riskLevel?: RiskLevel): string {
  if (riskLevel === "low") return BRAND.zoneLow;
  if (riskLevel === "medium") return BRAND.zoneMid;
  if (riskLevel === "high") return BRAND.red;
  const s = Math.min(100, Math.max(0, score));
  if (s <= 20) return BRAND.zoneLow;
  if (s <= 54) return BRAND.zoneMid;
  return BRAND.red;
}
