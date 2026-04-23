/** Российский мобильный: только +7 и 10 цифр после (ввод без «8»). */

export const RU_MOBILE_TAIL_LEN = 10;

export function digitsOnly(s: string): string {
  return (s || "").replace(/\D/g, "");
}

/** Оставить в поле ввода максимум 10 цифр (хвост после +7). */
export function sanitizeRuTailInput(raw: string): string {
  return digitsOnly(raw).slice(0, RU_MOBILE_TAIL_LEN);
}

/** +7 + ровно 10 цифр → строка для API. */
export function buildRuMsisdnE164(tail10: string): string {
  const t = sanitizeRuTailInput(tail10);
  if (t.length !== RU_MOBILE_TAIL_LEN) {
    throw new Error(`Нужно ${RU_MOBILE_TAIL_LEN} цифр после +7`);
  }
  return `+7${t}`;
}
