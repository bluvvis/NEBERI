import { describe, expect, it } from "vitest";
import { mergeEventIntoList } from "@/lib/eventsQueryMerge";
import type { FraudEvent } from "@/types";

const base = (over: Partial<FraudEvent>): FraudEvent =>
  ({
    id: "a",
    created_at: "2026-01-01T00:00:00Z",
    occurred_at: "2026-01-01T00:00:00Z",
    event_type: "call",
    from_msisdn_masked: "+7***",
    to_msisdn_masked: "+7***",
    duration_sec: 10,
    text_excerpt: null,
    risk_score: 10,
    risk_level: "low",
    policy_version: "1",
    reasons: [],
    ...over,
  }) as unknown as FraudEvent;

describe("mergeEventIntoList", () => {
  it("replaces matching row with merged fields", () => {
    const list = [base({ id: "x", risk_score: 10 }), base({ id: "y", risk_score: 20 })];
    const upd = base({ id: "x", risk_score: 88, risk_level: "high" });
    const out = mergeEventIntoList(list, upd)!;
    expect(out[0].risk_score).toBe(88);
    expect(out[0].risk_level).toBe("high");
    expect(out[1].risk_score).toBe(20);
  });
  it("returns same reference when id missing", () => {
    const list = [base({ id: "z" })];
    const out = mergeEventIntoList(list, base({ id: "missing" }));
    expect(out).toBe(list);
  });
});
