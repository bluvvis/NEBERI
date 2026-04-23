import type { FraudEventType } from "@/types";

/** Значение фильтра в URL ленты (`etype`) и в UI. */
export type EventTypeFilterValue = "all" | FraudEventType;

export const EVENT_TYPE_FILTER_QUERY_KEY = "etype";

export const EVENT_TYPE_SHORT_LABEL: Record<FraudEventType, string> = {
  sms: "SMS",
  voice_text: "Голос (текст)",
  call: "Звонок",
};

export function eventTypeFilterFromSearch(searchParams: URLSearchParams): EventTypeFilterValue {
  const v = searchParams.get(EVENT_TYPE_FILTER_QUERY_KEY);
  if (v === "sms" || v === "voice_text" || v === "call") return v;
  return "all";
}

export function applyEventTypeFilterToSearchParams(
  prev: URLSearchParams,
  filter: EventTypeFilterValue,
): URLSearchParams {
  const next = new URLSearchParams(prev);
  if (filter === "all") next.delete(EVENT_TYPE_FILTER_QUERY_KEY);
  else next.set(EVENT_TYPE_FILTER_QUERY_KEY, filter);
  return next;
}
