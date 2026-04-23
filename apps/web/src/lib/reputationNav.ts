import { RU_MOBILE_TAIL_LEN, sanitizeRuTailInput } from "@/lib/ruPhone";

/** Ссылка на форму репутации с префиллом (ровно 10 цифр после +7). */
export function reputationHrefWithTail(tail10: string): string {
  const t = sanitizeRuTailInput(tail10);
  if (t.length !== RU_MOBILE_TAIL_LEN) return "/reputation";
  return `/reputation?tail=${encodeURIComponent(t)}`;
}
