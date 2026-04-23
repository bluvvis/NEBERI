import { describe, expect, it } from "vitest";
import { truncateForEventListExcerpt } from "./truncateListExcerpt";

describe("truncateForEventListExcerpt", () => {
  it("returns nbsp for empty", () => {
    expect(truncateForEventListExcerpt(null)).toBe("\u00A0");
    expect(truncateForEventListExcerpt("")).toBe("\u00A0");
  });

  it("returns short text unchanged", () => {
    expect(truncateForEventListExcerpt("Коротко.", 100)).toBe("Коротко.");
  });

  it("truncates long text with ellipsis", () => {
    const s = "слово ".repeat(30) + "хвост";
    const out = truncateForEventListExcerpt(s, 48);
    expect(out.endsWith("...")).toBe(true);
    expect(out.length).toBeLessThan(s.length);
  });
});
