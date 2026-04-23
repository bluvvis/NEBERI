import type { RiskLevel } from "@/types";

/**
 * Вертикальная полоска на `<li>`: один класс фона (без двух `bg-*` в разметке).
 * Уже открывали — high чуть приглушённый красный, low/medium — зона.
 */
export function listRowRiskBarClass(
  level: RiskLevel,
  eventId?: string,
  visitTimes?: Record<string, number>,
): string {
  const visited =
    eventId != null && visitTimes != null && typeof visitTimes[eventId] === "number" && Number.isFinite(visitTimes[eventId]);
  if (level === "high") {
    if (!visited) return "bg-brand-red";
    /** После просмотра high — серая полоска как у low/medium; красная обводка «только что» — в lastVisitedRowClass. */
    return "bg-brand-zone-low/90 dark:bg-brand-zone-low/70";
  }
  if (!visited) return "bg-transparent";
  /** После просмотра low/medium — одинаковый светло-серый акцент. */
  if (level === "low" || level === "medium") return "bg-brand-zone-low/90 dark:bg-brand-zone-low/70";
  return "bg-transparent";
}

/** Лёгкий фон строки по уровню риска (полоска рисуется отдельно на `<li>`). */
export function listRowRiskShellClass(level: RiskLevel): string {
  if (level === "high") {
    return "bg-gradient-to-r from-brand-red/[0.07] via-brand-red/[0.02] to-transparent dark:from-brand-red/12 dark:via-brand-red/5";
  }
  return "";
}

/**
 * Последняя открытая строка (вешать на `<li>`, не на `<Link>` — у ссылки overflow и inset-ring обрезается).
 * Красная обводка только при высоком риске.
 */
export function lastVisitedRowClass(eventId: string, lastId: string | null, riskLevel: RiskLevel): string {
  if (!lastId || eventId !== lastId) return "";
  if (riskLevel === "high") {
    return "rounded-none ring-2 ring-inset ring-[#FF0032]/80 ring-offset-0 dark:ring-[#FF0032]/70";
  }
  return "";
}

/**
 * Уже открывали карточку — лёгкий фон на `<Link>` (все уровни риска, без filter на родителе).
 */
export function visitedCallLowMediumDimClass(
  _eventType: string,
  _riskLevel: RiskLevel,
  eventId: string,
  visitTimes: Record<string, number>,
): string {
  if (!visitTimes[eventId]) return "";
  return "bg-brand-surface/55 dark:bg-brand-ink/40";
}

/** Карточка детали: акцент high без смены толщины border (только ring + тень). */
export function detailPanelRiskClass(level: RiskLevel): string {
  if (level !== "high") return "";
  return "ring-1 ring-brand-red/40 shadow-[0_14px_44px_-14px_rgba(255,0,50,0.22)] dark:ring-brand-red/35 dark:shadow-[0_18px_48px_-14px_rgba(0,0,0,0.5)]";
}
