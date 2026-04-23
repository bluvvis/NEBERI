import type { QueryClient } from "@tanstack/react-query";
import type { FraudEvent } from "@/types";

/** Слияние одного события в массив ленты (иммутабельно). */
export function mergeEventIntoList(list: FraudEvent[] | undefined, updated: FraudEvent): FraudEvent[] | undefined {
  if (!list?.length) return list;
  let hit = false;
  const next = list.map((row) => {
    if (row.id !== updated.id) return row;
    hit = true;
    return { ...row, ...updated };
  });
  return hit ? next : list;
}

/** Подставить свежий снимок события во все кеши ленты (пик скора, RiskBadge, репутация в строке). */
export function patchCachedEventInLists(qc: QueryClient, updated: FraudEvent): void {
  qc.setQueriesData<FraudEvent[]>({ queryKey: ["events", "list"] }, (old) => mergeEventIntoList(old, updated));
  qc.setQueriesData<FraudEvent[]>({ queryKey: ["events", "distribution"] }, (old) => mergeEventIntoList(old, updated));
}
