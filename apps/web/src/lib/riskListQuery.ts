import type { RiskFilter } from "@/components/RiskFilterBar";
import type { SortBy, SortDir } from "@/lib/eventSort";

/** Query-параметр ленты: `/?risk=high` и т.п. */
export const EVENTS_RISK_QUERY_KEY = "risk";

/** Сортировка: `/?by=score&dir=asc` (по умолчанию by=added&dir=desc — в URL не пишем). */
export const EVENTS_SORT_BY_KEY = "by";
export const EVENTS_SORT_DIR_KEY = "dir";

/** День события в ленте: `?day=2026-04-18` (локальная дата по `occurred_at`). */
export const EVENTS_DAY_QUERY_KEY = "day";
/** Подстрока цифр — совпадение с `from` или `to` в маске. */
export const EVENTS_PHONE_QUERY_KEY = "phone";

export function riskFilterFromSearch(searchParams: URLSearchParams): RiskFilter {
  const v = searchParams.get(EVENTS_RISK_QUERY_KEY);
  if (v === "low" || v === "medium" || v === "high") return v;
  return "all";
}

export function applyRiskFilterToSearchParams(
  prev: URLSearchParams,
  filter: RiskFilter,
): URLSearchParams {
  const next = new URLSearchParams(prev);
  if (filter === "all") next.delete(EVENTS_RISK_QUERY_KEY);
  else next.set(EVENTS_RISK_QUERY_KEY, filter);
  return next;
}

export function listSortFromSearch(searchParams: URLSearchParams): { by: SortBy; dir: SortDir } {
  const by = searchParams.get(EVENTS_SORT_BY_KEY);
  const dir = searchParams.get(EVENTS_SORT_DIR_KEY);
  const validBy: SortBy = by === "score" || by === "visited" ? by : "added";
  const validDir: SortDir = dir === "asc" ? "asc" : "desc";
  return { by: validBy, dir: validDir };
}

export function applyListSortToSearchParams(
  prev: URLSearchParams,
  by: SortBy,
  dir: SortDir,
): URLSearchParams {
  const next = new URLSearchParams(prev);
  if (by === "added" && dir === "desc") {
    next.delete(EVENTS_SORT_BY_KEY);
    next.delete(EVENTS_SORT_DIR_KEY);
  } else {
    next.set(EVENTS_SORT_BY_KEY, by);
    next.set(EVENTS_SORT_DIR_KEY, dir);
  }
  return next;
}

/** Путь ленты с сохранённым фильтром (`location.search` = `?risk=high` или пусто). */
export function eventsFeedPath(locationSearch: string): string {
  return locationSearch ? `/${locationSearch}` : "/";
}

export function eventsDayFromSearch(searchParams: URLSearchParams): string {
  const v = (searchParams.get(EVENTS_DAY_QUERY_KEY) ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return "";
}

export function eventsPhoneFromSearch(searchParams: URLSearchParams): string {
  return (searchParams.get(EVENTS_PHONE_QUERY_KEY) ?? "").trim();
}

export function applyEventsDayPhoneToSearchParams(
  prev: URLSearchParams,
  day: string,
  phone: string,
): URLSearchParams {
  const next = new URLSearchParams(prev);
  const d = day.trim();
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) next.delete(EVENTS_DAY_QUERY_KEY);
  else next.set(EVENTS_DAY_QUERY_KEY, d);
  const p = phone.trim();
  if (!p) next.delete(EVENTS_PHONE_QUERY_KEY);
  else next.set(EVENTS_PHONE_QUERY_KEY, p);
  return next;
}
