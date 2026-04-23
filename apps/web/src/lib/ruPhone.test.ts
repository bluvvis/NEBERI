import { describe, expect, it } from "vitest";
import { buildRuMsisdnE164, sanitizeRuTailInput } from "@/lib/ruPhone";

describe("sanitizeRuTailInput", () => {
  it("strips non-digits and caps at 10", () => {
    expect(sanitizeRuTailInput("900 123-45-67")).toBe("9001234567");
    expect(sanitizeRuTailInput("9001234567899")).toBe("9001234567");
  });
});

describe("buildRuMsisdnE164", () => {
  it("builds +7 number", () => {
    expect(buildRuMsisdnE164("9001234567")).toBe("+79001234567");
  });
  it("rejects short tail", () => {
    expect(() => buildRuMsisdnE164("900123456")).toThrow();
  });
});
