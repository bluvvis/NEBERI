import { describe, expect, it } from "vitest";
import { lastVisitedRowClass, listRowRiskBarClass, visitedCallLowMediumDimClass } from "@/lib/riskChrome";

describe("lastVisitedRowClass", () => {
  it("adds red ring only for high risk", () => {
    expect(lastVisitedRowClass("a", "a", "high")).toMatch(/ring-\[#FF0032\]/);
    expect(lastVisitedRowClass("a", "a", "low")).toBe("");
    expect(lastVisitedRowClass("a", "a", "medium")).toBe("");
    expect(lastVisitedRowClass("a", "b", "high")).toBe("");
  });
});

describe("listRowRiskBarClass", () => {
  const visits = { e1: 1, x: 1 };

  it("high: full red when not visited; gray bar when visited (как low/medium)", () => {
    expect(listRowRiskBarClass("high")).toBe("bg-brand-red");
    expect(listRowRiskBarClass("high", "e1", visits)).toMatch(/zone-low/);
  });

  it("low/medium: bar only when visited; medium uses same tint as low", () => {
    expect(listRowRiskBarClass("low")).toBe("bg-transparent");
    expect(listRowRiskBarClass("low", "x", visits)).toMatch(/zone-low/);
    expect(listRowRiskBarClass("medium", "x", visits)).toMatch(/zone-low/);
    expect(listRowRiskBarClass("low", "x", {})).toBe("bg-transparent");
  });
});

describe("visitedCallLowMediumDimClass", () => {
  it("adds subtle row bg for any visited risk level", () => {
    const visits = { x: 1 };
    expect(visitedCallLowMediumDimClass("call", "low", "x", visits)).toMatch(/bg-brand-surface/);
    expect(visitedCallLowMediumDimClass("sms", "medium", "x", visits)).toMatch(/bg-brand-surface/);
    expect(visitedCallLowMediumDimClass("call", "high", "x", visits)).toMatch(/bg-brand-surface/);
    expect(visitedCallLowMediumDimClass("call", "low", "x", visits)).not.toMatch(/saturate/);
  });
  it("does not dim unvisited or missing id", () => {
    expect(visitedCallLowMediumDimClass("call", "high", "x", {})).toBe("");
    expect(visitedCallLowMediumDimClass("call", "low", "x", {})).toBe("");
  });
});
