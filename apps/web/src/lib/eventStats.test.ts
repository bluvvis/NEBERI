import { describe, expect, it } from "vitest";
import { computeListStats, computeRiskHistogram } from "./eventStats";
import type { FraudEvent } from "@/types";

const base = (over: Partial<FraudEvent>): FraudEvent => ({
  id: "00000000-0000-4000-8000-000000000001",
  created_at: "2026-01-01T00:00:00Z",
  occurred_at: "2026-01-01T00:00:00Z",
  event_type: "sms",
  from_msisdn_masked: "+79***001",
  to_msisdn_masked: "+79***002",
  duration_sec: null,
  text_excerpt: null,
  risk_score: 10,
  risk_level: "low",
  policy_version: "1",
  reasons: [],
  ...over,
});

describe("computeListStats", () => {
  it("returns zeros for empty", () => {
    expect(computeListStats(undefined)).toEqual({ n: 0, avg: 0, max: 0 });
    expect(computeListStats([])).toEqual({ n: 0, avg: 0, max: 0 });
  });

  it("computes avg and max", () => {
    const list = [base({ risk_score: 10 }), base({ risk_score: 30 }), base({ risk_score: 20 })];
    expect(computeListStats(list)).toEqual({ n: 3, avg: 20, max: 30 });
  });

  it("uses effective_for_risk_level when present", () => {
    const list = [
      base({
        risk_score: 40,
        score_explanation: {
          rule_score: 56,
          blended_score: 40,
          blended_exact: 40.4,
          blended_base: 38.0,
          diversity_bonus: 0,
          keyword_pattern_hits: 0,
          rules_fired_count: 2,
          ml_fraud_proba: 0.1,
          ml_blend_weight: 0.42,
          effective_for_risk_level: 56,
          low_max: 20,
          medium_max: 54,
          fairness_notes: [],
        },
      }),
      base({ risk_score: 10 }),
    ];
    expect(computeListStats(list)).toEqual({ n: 2, avg: 33, max: 56 });
  });
});

describe("computeRiskHistogram", () => {
  it("counts levels", () => {
    const list = [
      base({ risk_level: "high" }),
      base({ risk_level: "high" }),
      base({ risk_level: "medium" }),
      base({ risk_level: "low" }),
    ];
    expect(computeRiskHistogram(list)).toEqual({
      high: 2,
      medium: 1,
      low: 1,
      sampleSize: 4,
    });
  });
});
