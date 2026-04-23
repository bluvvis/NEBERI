import { describe, expect, it } from "vitest";
import { BRAND } from "@/lib/brand";
import { scoreArcColor } from "./riskVisual";

describe("scoreArcColor", () => {
  it("aligns with API thresholds when risk_level omitted", () => {
    expect(scoreArcColor(18)).toBe(BRAND.zoneLow);
    expect(scoreArcColor(20)).toBe(BRAND.zoneLow);
    expect(scoreArcColor(21)).toBe(BRAND.zoneMid);
    expect(scoreArcColor(40)).toBe(BRAND.zoneMid);
    expect(scoreArcColor(54)).toBe(BRAND.zoneMid);
    expect(scoreArcColor(55)).toBe(BRAND.red);
  });

  it("prefers explicit risk_level over numeric edge cases", () => {
    expect(scoreArcColor(25, "low")).toBe(BRAND.zoneLow);
    expect(scoreArcColor(60, "medium")).toBe(BRAND.zoneMid);
    expect(scoreArcColor(10, "high")).toBe(BRAND.red);
  });
});
