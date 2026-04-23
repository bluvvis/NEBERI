import { describe, expect, it } from "vitest";
import { reputationHrefWithTail } from "./reputationNav";

describe("reputationHrefWithTail", () => {
  it("encodes full tail", () => {
    expect(reputationHrefWithTail("9001112299")).toBe("/reputation?tail=9001112299");
  });

  it("falls back to base path if not 10 digits", () => {
    expect(reputationHrefWithTail("900")).toBe("/reputation");
  });
});
