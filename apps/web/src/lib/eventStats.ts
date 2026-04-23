import type { FraudEvent } from "@/types";

/**
 * Число для кольца и метрик ленты.
 * В `EventOut` поле `risk_score` уже пересчитано на бэке (max правила/смесь + живая дельта репутации),
 * а `score_explanation.effective_for_risk_level` — снимок на момент ingest без дельты блок/доверие.
 */
export function displayNumericScore(e: FraudEvent): number {
  return e.risk_score;
}

/** Агрегаты по текущему списку (например, с учётом фильтра). */
export function computeListStats(events: FraudEvent[] | undefined) {
  const list = events ?? [];
  const n = list.length;
  if (n === 0) {
    return { n: 0, avg: 0, max: 0 };
  }
  let sum = 0;
  let max = 0;
  for (const e of list) {
    const v = displayNumericScore(e);
    sum += v;
    if (v > max) max = v;
  }
  const avg = Math.round((sum / n) * 10) / 10;
  const maxR = Math.round(max * 10) / 10;
  return { n, avg, max: maxR };
}

/** Распределение по уровню риска в выборке (обычно полный топ-N с API, без фильтра). */
export function computeRiskHistogram(events: FraudEvent[] | undefined) {
  const list = events ?? [];
  let high = 0;
  let medium = 0;
  let low = 0;
  for (const e of list) {
    if (e.risk_level === "high") high += 1;
    else if (e.risk_level === "medium") medium += 1;
    else low += 1;
  }
  return { high, medium, low, sampleSize: list.length };
}

/** Событие с максимальным отображаемым скором; при равенстве — более раннее по `occurred_at`. */
export function eventAtPeakDisplayScore(events: FraudEvent[] | undefined): FraudEvent | null {
  const list = events ?? [];
  if (!list.length) return null;
  let best: FraudEvent | null = null;
  let bestScore = -1;
  let bestTime = Number.POSITIVE_INFINITY;
  for (const e of list) {
    const v = displayNumericScore(e);
    const t = new Date(e.occurred_at).getTime();
    if (v > bestScore || (v === bestScore && t < bestTime)) {
      bestScore = v;
      bestTime = t;
      best = e;
    }
  }
  return best;
}
