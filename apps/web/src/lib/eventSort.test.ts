import { describe, expect, it } from "vitest";
import type { FraudEvent } from "@/types";
import { sortEvents } from "./eventSort";

function ev(
  id: string,
  risk: FraudEvent["risk_level"],
  created: string,
  score: number,
): FraudEvent {
  return {
    id,
    created_at: created,
    occurred_at: created,
    event_type: "call",
    from_msisdn_masked: "A",
    to_msisdn_masked: "B",
    duration_sec: null,
    text_excerpt: null,
    risk_score: score,
    risk_level: risk,
    policy_version: "1",
    reasons: [],
  };
}

describe("sortEvents", () => {
  it("sorts by added date desc (default direction)", () => {
    const a = [ev("1", "low", "2026-04-20T10:00:00Z", 10), ev("2", "low", "2026-04-21T10:00:00Z", 10)];
    const s = sortEvents(a, "added", "desc", {});
    expect(s.map((e) => e.id)).toEqual(["2", "1"]);
  });

  it("sorts by added date asc", () => {
    const a = [ev("2", "low", "2026-04-21T10:00:00Z", 10), ev("1", "low", "2026-04-20T10:00:00Z", 10)];
    const s = sortEvents(a, "added", "asc", {});
    expect(s.map((e) => e.id)).toEqual(["1", "2"]);
  });

  it("sorts by score desc", () => {
    const a = [ev("lo", "low", "2026-04-22T10:00:00Z", 10), ev("hi", "high", "2026-04-22T10:00:00Z", 90)];
    const s = sortEvents(a, "score", "desc", {});
    expect(s.map((e) => e.id)).toEqual(["hi", "lo"]);
  });

  it("sorts by score asc", () => {
    const a = [ev("hi", "high", "2026-04-22T10:00:00Z", 90), ev("lo", "low", "2026-04-22T10:00:00Z", 10)];
    const s = sortEvents(a, "score", "asc", {});
    expect(s.map((e) => e.id)).toEqual(["lo", "hi"]);
  });

  it("sorts by visit time desc (most recent first)", () => {
    const a = [
      ev("a", "low", "2026-04-22T10:00:00Z", 10),
      ev("b", "low", "2026-04-23T10:00:00Z", 10),
      ev("c", "low", "2026-04-21T10:00:00Z", 10),
    ];
    const visits = { a: 1000, b: 3000, c: 2000 };
    const s = sortEvents(a, "visited", "desc", visits);
    expect(s.map((e) => e.id)).toEqual(["b", "c", "a"]);
  });

  it("sorts by visit time asc (oldest visit first among visited)", () => {
    const a = [ev("x", "low", "2026-04-22T10:00:00Z", 5), ev("y", "low", "2026-04-22T10:00:00Z", 5)];
    const visits = { x: 5000, y: 1000 };
    const s = sortEvents(a, "visited", "asc", visits);
    expect(s.map((e) => e.id)).toEqual(["y", "x"]);
  });
});
