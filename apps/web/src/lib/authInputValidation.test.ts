import { describe, expect, it } from "vitest";
import {
  nicknameValidationMessage,
  normalizeRegisterPhoneTail,
  parseLoginIdentifier,
  registerPhoneValidationMessage,
  sanitizeNicknameInput,
} from "@/lib/authInputValidation";

describe("sanitizeNicknameInput", () => {
  it("drops non-latin letters", () => {
    expect(sanitizeNicknameInput("иванoperator")).toBe("operator");
    expect(sanitizeNicknameInput("иван_operator")).toBe("_operator");
    expect(sanitizeNicknameInput("Op_12")).toBe("Op_12");
  });
});

describe("nicknameValidationMessage", () => {
  it("accepts valid nick", () => {
    expect(nicknameValidationMessage("abc")).toBeNull();
    expect(nicknameValidationMessage("Op_999")).toBeNull();
  });
  it("rejects short or invalid", () => {
    expect(nicknameValidationMessage("ab")).toMatch(/минимум/);
    expect(nicknameValidationMessage("bad-nick")).toMatch(/латиница/);
  });
});

describe("register phone tail", () => {
  it("normalizes 8 and 7 prefixes", () => {
    expect(normalizeRegisterPhoneTail("89001234567")).toBe("9001234567");
    expect(normalizeRegisterPhoneTail("+7 900 123 45 67")).toBe("9001234567");
  });
  it("requires 10 digits and leading 9", () => {
    expect(registerPhoneValidationMessage("8001234567")).toMatch(/9/);
    expect(registerPhoneValidationMessage("900123456")).toMatch(/10/);
    expect(registerPhoneValidationMessage("9001234567")).toBeNull();
  });
});

describe("parseLoginIdentifier", () => {
  it("parses nickname with letters", () => {
    expect(parseLoginIdentifier("my_user_1")).toEqual({ ok: true, kind: "nickname", value: "my_user_1" });
  });
  it("parses phone when no letters", () => {
    expect(parseLoginIdentifier("+7 900 123 45 67")).toEqual({ ok: true, kind: "phone", value: "+79001234567" });
  });
  it("rejects cyrillic-only as phone path", () => {
    const r = parseLoginIdentifier("гость");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/10|цифр|Телефон/i);
  });
});
