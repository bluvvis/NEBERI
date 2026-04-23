/** Цифры из строки (для сопоставления с замаскированным номером). */
export function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

/** Совпадение по подстроке цифр в маске (например **12 34 и запрос 1234). */
export function maskMatchesPhoneQuery(masked: string, queryDigits: string): boolean {
  if (!queryDigits) return true;
  const m = digitsOnly(masked);
  return m.includes(queryDigits);
}

/** Локальная дата `YYYY-MM-DD` для ISO-времени. */
export function isoDateLocalYmd(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}
