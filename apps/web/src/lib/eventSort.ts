import type { FraudEvent } from "@/types";

export type SortBy = "added" | "score" | "visited";
export type SortDir = "asc" | "desc";

function cmpNum(a: number, b: number, dir: SortDir): number {
  return dir === "asc" ? a - b : b - a;
}

/** Сортировка ленты на клиенте. `visitTimes` — из sessionStorage (touch при открытии карточки). */
export function sortEvents(
  events: FraudEvent[],
  by: SortBy,
  dir: SortDir,
  visitTimes: Record<string, number>,
): FraudEvent[] {
  const copy = [...events];
  const tVisit = (id: string) => visitTimes[id] ?? 0;

  copy.sort((a, b) => {
    let primary = 0;
    if (by === "added") {
      primary = cmpNum(new Date(a.created_at).getTime(), new Date(b.created_at).getTime(), dir);
    } else if (by === "score") {
      primary = cmpNum(a.risk_score, b.risk_score, dir);
    } else {
      primary = cmpNum(tVisit(a.id), tVisit(b.id), dir);
    }
    if (primary !== 0) return primary;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  return copy;
}
