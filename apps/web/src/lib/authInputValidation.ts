import { buildRuMsisdnE164, digitsOnly, sanitizeRuTailInput, RU_MOBILE_TAIL_LEN } from "@/lib/ruPhone";

/** Как на бэкенде: латиница, цифры, подчёркивание, 3–32. */
export const NICKNAME_RE = /^[a-zA-Z0-9_]{3,32}$/;

/** Убирает всё, кроме латиницы, цифр и _, обрезает до 32 — кириллица и прочее не попадут в значение. */
export function sanitizeNicknameInput(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 32);
}

export function nicknameValidationMessage(nickname: string): string | null {
  const t = nickname.trim();
  if (t.length < 3) return "Никнейм: минимум 3 символа (латиница, цифры, _).";
  if (t.length > 32) return "Никнейм: максимум 32 символа.";
  if (!NICKNAME_RE.test(t)) return "Никнейм: только латиница (A–Z, a–z), цифры и подчёркивание.";
  return null;
}

/** 10 цифр хвоста после страны; для РФ мобильный обычно начинается с 9. */
export function normalizeRegisterPhoneTail(raw: string): string {
  let d = digitsOnly(raw);
  if (d.length === 11 && (d[0] === "7" || d[0] === "8")) {
    d = d.slice(1);
  }
  return sanitizeRuTailInput(d);
}

export function registerPhoneValidationMessage(tail10: string): string | null {
  const t = sanitizeRuTailInput(tail10);
  if (t.length !== RU_MOBILE_TAIL_LEN) {
    return `Телефон: нужно ровно ${RU_MOBILE_TAIL_LEN} цифр мобильного номера (после +7).`;
  }
  if (t[0] !== "9") {
    return "Телефон: российский мобильный начинается с 9 после кода страны (+7 9…).";
  }
  return null;
}

export function registerPhoneToE164(tail10: string): string {
  const msg = registerPhoneValidationMessage(tail10);
  if (msg) throw new Error(msg);
  return buildRuMsisdnE164(sanitizeRuTailInput(tail10));
}

export function formatRuTailGrouped(tail10: string): string {
  const d = sanitizeRuTailInput(tail10);
  if (!d) return "";
  const a = d.slice(0, 3);
  const b = d.slice(3, 6);
  const c = d.slice(6, 8);
  const e = d.slice(8, 10);
  return [a, b, c, e].filter(Boolean).join(" ");
}

export type ParsedLogin =
  | { ok: true; kind: "nickname"; value: string }
  | { ok: true; kind: "phone"; value: string }
  | { ok: false; message: string };

/**
 * Логин: ник (латиница…) или телефон.
 * Если в строке есть буква латиницы или _ — трактуем как ник (цифры в нике разрешены).
 * Иначе только цифры/разделители — телефон (10 цифр хвоста, с 9).
 */
/** Убирает кириллицу и прочие символы вне ника/телефона (для поля «ник или телефон»). */
export function sanitizeLoginFreeText(raw: string): string {
  return raw.replace(/[^0-9a-zA-Z_+()\s-]/gi, "").slice(0, 40);
}

export function parseLoginIdentifier(raw: string): ParsedLogin {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, message: "Введите никнейм или номер телефона." };

  if (/[a-zA-Z_]/.test(trimmed)) {
    const nick = sanitizeNicknameInput(trimmed);
    const err = nicknameValidationMessage(nick);
    if (err) return { ok: false, message: err };
    return { ok: true, kind: "nickname", value: nick };
  }

  const tail = normalizeRegisterPhoneTail(trimmed);
  const perr = registerPhoneValidationMessage(tail);
  if (perr) return { ok: false, message: perr };
  try {
    return { ok: true, kind: "phone", value: buildRuMsisdnE164(tail) };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Некорректный номер." };
  }
}
