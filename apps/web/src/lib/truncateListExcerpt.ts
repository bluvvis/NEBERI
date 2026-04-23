const ELLIPSIS = "...";

/** Лимит символов под ~2 строки text-sm в средней колонке ленты. */
export const EVENT_LIST_EXCERPT_MAX_CHARS = 58;

/**
 * Превью в ленте: фиксированная высота + line-clamp в CSS; здесь — жёсткий лимит символов,
 * чтобы «...» было видно до обрезки по высоте. При превышении — обрезка по последнему пробелу + «...».
 */
export function truncateForEventListExcerpt(
  raw: string | null | undefined,
  maxChars: number = EVENT_LIST_EXCERPT_MAX_CHARS,
): string {
  if (raw == null || raw === "") return "\u00A0";
  const t = raw.replace(/\s+/g, " ").trim();
  if (t.length <= maxChars) return t;
  let cut = t.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > Math.floor(maxChars * 0.5)) {
    cut = cut.slice(0, lastSpace);
  }
  return cut.trimEnd() + ELLIPSIS;
}
