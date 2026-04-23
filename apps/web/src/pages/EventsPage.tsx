import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { RiskBadge } from "@/components/RiskBadge";
import { ScoreRing } from "@/components/ScoreRing";
import { StatStrip } from "@/components/StatStrip";
import { EventListSkeleton } from "@/components/EventListSkeleton";
import { RiskFilterBar, type RiskFilter } from "@/components/RiskFilterBar";
import { EventTypeFilterControl } from "@/components/EventTypeFilterControl";
import { ListSortControl } from "@/components/ListSortControl";
import { EmptyEventsState } from "@/components/EmptyEventsState";
import { Toast } from "@/components/Toast";
import { deleteAllEvents, fetchEvents, postEvent } from "@/lib/api";
import { demoScenarioPoolMax, pickRandomDemoBatch } from "@/data/demoEventPayloads";
import { sortEvents, type SortBy, type SortDir } from "@/lib/eventSort";
import {
  EVENT_VISIT_BUMP,
  EVENTS_LIST_SCROLL_Y_KEY,
  LAST_VIEWED_EVENT_ID_KEY,
  clearVisitAndLastViewedSession,
  persistEventsListScrollY,
  readVisitTimes,
} from "@/lib/sessionKeys";
import {
  applyEventsDayPhoneToSearchParams,
  applyListSortToSearchParams,
  applyRiskFilterToSearchParams,
  eventsDayFromSearch,
  eventsPhoneFromSearch,
  listSortFromSearch,
  riskFilterFromSearch,
} from "@/lib/riskListQuery";
import { digitsOnly, isoDateLocalYmd, maskMatchesPhoneQuery } from "@/lib/reputationFilters";
import {
  applyEventTypeFilterToSearchParams,
  eventTypeFilterFromSearch,
  type EventTypeFilterValue,
} from "@/lib/eventTypeUi";
import {
  lastVisitedRowClass,
  listRowRiskBarClass,
  listRowRiskShellClass,
  visitedCallLowMediumDimClass,
} from "@/lib/riskChrome";
import { truncateForEventListExcerpt } from "@/lib/truncateListExcerpt";

export default function EventsPage() {
  const qc = useQueryClient();
  const scrollRestoreDoneRef = useRef(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const riskFilter = riskFilterFromSearch(searchParams);
  const eventTypeFilter = eventTypeFilterFromSearch(searchParams);
  const { by: sortBy, dir: sortDir } = listSortFromSearch(searchParams);
  const setRiskFilter = useCallback(
    (next: RiskFilter) => {
      setSearchParams((prev) => applyRiskFilterToSearchParams(prev, next));
    },
    [setSearchParams],
  );
  const setListSort = useCallback(
    (by: SortBy, dir: SortDir) => {
      setSearchParams((prev) => applyListSortToSearchParams(prev, by, dir));
    },
    [setSearchParams],
  );
  const setEventTypeFilter = useCallback(
    (next: EventTypeFilterValue) => {
      setSearchParams((prev) => applyEventTypeFilterToSearchParams(prev, next));
    },
    [setSearchParams],
  );
  const [toast, setToast] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const [purgeArmed, setPurgeArmed] = useState(false);
  const [lastVisitedId, setLastVisitedId] = useState<string | null>(null);
  const [visitTick, setVisitTick] = useState(0);

  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    const bump = () => setVisitTick((t) => t + 1);
    window.addEventListener(EVENT_VISIT_BUMP, bump);
    return () => window.removeEventListener(EVENT_VISIT_BUMP, bump);
  }, []);

  const eventListQuerySuffix = useMemo(() => searchParams.toString(), [searchParams]);

  const listQuery = useQuery({
    queryKey: ["events", "list", riskFilter, eventTypeFilter],
    queryFn: () =>
      fetchEvents({
        limit: 200,
        ...(riskFilter !== "all" ? { risk_level: riskFilter } : {}),
        ...(eventTypeFilter !== "all" ? { event_type: eventTypeFilter } : {}),
      }),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const distributionQuery = useQuery({
    queryKey: ["events", "distribution"],
    queryFn: () => fetchEvents({ limit: 200 }),
    staleTime: 15_000,
    enabled: riskFilter !== "all",
    placeholderData: keepPreviousData,
  });

  const listData = listQuery.data;
  const isLoading = listQuery.isLoading;

  const visitTimesMap = useMemo(() => {
    void visitTick;
    return readVisitTimes();
  }, [listData, visitTick]);

  const sortedList = useMemo(() => {
    if (!listData?.length) return [];
    return sortEvents(listData, sortBy, sortDir, visitTimesMap);
  }, [listData, sortBy, sortDir, visitTimesMap]);

  const dayFromUrl = eventsDayFromSearch(searchParams);
  const phoneFromUrl = eventsPhoneFromSearch(searchParams);
  const phoneDigitsUrl = useMemo(() => digitsOnly(phoneFromUrl), [phoneFromUrl]);

  const listForDisplay = useMemo(() => {
    if (!sortedList.length) return [];
    if (!dayFromUrl && !phoneDigitsUrl) return sortedList;
    return sortedList.filter((e) => {
      if (dayFromUrl && isoDateLocalYmd(e.occurred_at) !== dayFromUrl) return false;
      if (
        phoneDigitsUrl &&
        !maskMatchesPhoneQuery(e.from_msisdn_masked, phoneDigitsUrl) &&
        !maskMatchesPhoneQuery(e.to_msisdn_masked, phoneDigitsUrl)
      ) {
        return false;
      }
      return true;
    });
  }, [sortedList, dayFromUrl, phoneDigitsUrl]);

  const [draftDay, setDraftDay] = useState(dayFromUrl);
  const [draftPhone, setDraftPhone] = useState(phoneFromUrl);
  useEffect(() => {
    setDraftDay(dayFromUrl);
    setDraftPhone(phoneFromUrl);
  }, [dayFromUrl, phoneFromUrl]);

  const applyDayPhoneFilters = useCallback(() => {
    setSearchParams((prev) => applyEventsDayPhoneToSearchParams(prev, draftDay, draftPhone));
  }, [setSearchParams, draftDay, draftPhone]);

  const clearDayPhoneFilters = useCallback(() => {
    setDraftDay("");
    setDraftPhone("");
    setSearchParams((prev) => applyEventsDayPhoneToSearchParams(prev, "", ""));
  }, [setSearchParams]);

  useEffect(() => {
    const syncLastVisited = () => {
      try {
        setLastVisitedId(sessionStorage.getItem(LAST_VIEWED_EVENT_ID_KEY));
      } catch {
        setLastVisitedId(null);
      }
    };
    syncLastVisited();
    window.addEventListener(EVENT_VISIT_BUMP, syncLastVisited);
    return () => window.removeEventListener(EVENT_VISIT_BUMP, syncLastVisited);
  }, [listData]);

  useEffect(() => {
    if (isLoading || scrollRestoreDoneRef.current) return;
    scrollRestoreDoneRef.current = true;
    try {
      const raw = sessionStorage.getItem(EVENTS_LIST_SCROLL_Y_KEY);
      if (raw == null) return;
      const y = parseInt(raw, 10);
      if (!Number.isFinite(y)) {
        sessionStorage.removeItem(EVENTS_LIST_SCROLL_Y_KEY);
        return;
      }
      sessionStorage.removeItem(EVENTS_LIST_SCROLL_Y_KEY);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => window.scrollTo(0, y));
      });
    } catch {
      /* ignore */
    }
  }, [isLoading, listData]);

  const isFetching = listQuery.isFetching || distributionQuery.isFetching;
  const error = listQuery.error;

  const distributionForStrip =
    riskFilter === "all"
      ? listData
      : distributionQuery.isFetching && !distributionQuery.data
        ? null
        : distributionQuery.data;

  const seed = useMutation({
    mutationFn: async () => {
      const batch = pickRandomDemoBatch();
      for (const p of batch) {
        await postEvent(p);
      }
      return batch.length;
    },
    onSuccess: (added) => {
      try {
        sessionStorage.removeItem(LAST_VIEWED_EVENT_ID_KEY);
      } catch {
        /* ignore */
      }
      setLastVisitedId(null);
      qc.invalidateQueries({ queryKey: ["events"] });
      setToast({ text: `Добавлено событий: ${added}`, tone: "success" });
    },
    onError: (e) => {
      setToast({ text: e instanceof Error ? e.message : "Ошибка симуляции", tone: "error" });
    },
  });

  const purge = useMutation({
    mutationFn: deleteAllEvents,
    onSuccess: (res) => {
      clearVisitAndLastViewedSession();
      setLastVisitedId(null);
      qc.invalidateQueries({ queryKey: ["events"] });
      setToast({ text: `Удалено: ${res.deleted}`, tone: "success" });
    },
    onError: (e) => {
      setToast({ text: e instanceof Error ? e.message : "Не удалось очистить ленту", tone: "error" });
    },
  });

  function onPurgeClick() {
    if (!purgeArmed) {
      setPurgeArmed(true);
      return;
    }
    if (
      !window.confirm(
        "Удалить все события из базы (демо)? Действие необратимо для текущего окружения.",
      )
    ) {
      setPurgeArmed(false);
      return;
    }
    setPurgeArmed(false);
    purge.mutate();
  }

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
      <Toast
        message={toast?.text ?? null}
        tone={toast?.tone ?? "success"}
        onDismiss={dismissToast}
      />

      <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-muted dark:text-brand-surface/55">
            Консоль сервиса
          </p>
          <h1
            className="font-brand inline-block origin-left scale-x-[1.08] text-3xl font-bold tracking-tight text-brand-ink dark:text-brand-surface max-[380px]:text-[1.65rem] sm:scale-x-[1.12] sm:text-5xl"
            translate="no"
          >
            NeBeri
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-brand-muted sm:text-base dark:text-brand-surface/75">
            Правила и ML по тексту события. В карточке — графики и кратко; технические детали и реквизиты —{" "}
            {"в\u00A0блоке "}
            <span className="whitespace-nowrap font-semibold text-brand-red">«Подробнее для аудита».</span>
          </p>
          {isFetching && !isLoading && (
            <p className="mt-3 text-sm font-medium text-brand-red" aria-live="polite">
              Обновление…
            </p>
          )}
        </div>
        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            type="button"
            onClick={() => seed.mutate()}
            disabled={seed.isPending}
            title={`Случайный набор из пула до ${demoScenarioPoolMax} демо-событий`}
            className="min-h-[2.75rem] rounded-xl bg-brand-red px-4 py-3 text-base font-semibold text-white shadow-md shadow-brand-btn transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50 motion-reduce:active:scale-100 sm:min-h-0 sm:px-5"
          >
            {seed.isPending ? "Отправка…" : "Симуляция"}
          </button>
          <button
            type="button"
            onClick={onPurgeClick}
            disabled={purge.isPending}
            className={[
              "min-h-[2.75rem] rounded-xl border px-4 py-3 text-base font-semibold transition disabled:opacity-50 sm:min-h-0",
              purgeArmed
                ? "border-brand-red/50 bg-brand-red/10 text-brand-red dark:border-brand-red/45 dark:bg-brand-red/15 dark:text-brand-surface"
                : "border-brand-line bg-brand-card text-brand-ink hover:border-brand-muted dark:border-brand-panel-border dark:bg-brand-panel dark:text-brand-surface dark:hover:border-brand-muted",
            ].join(" ")}
          >
            {purge.isPending ? "Удаление…" : purgeArmed ? "Подтвердить очистку" : "Очистить ленту"}
          </button>
          {purgeArmed ? (
            <button
              type="button"
              onClick={() => setPurgeArmed(false)}
              className="min-h-[2.75rem] rounded-xl border border-brand-line px-3 py-3 text-sm font-semibold text-brand-muted dark:border-brand-panel-border dark:text-brand-surface/75 sm:min-h-0"
            >
              Отмена
            </button>
          ) : null}
        </div>
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-brand-red/35 bg-brand-red/10 px-4 py-3 text-base text-brand-ink dark:text-brand-surface">
          Не удалось загрузить API. Запущен backend на :8000? ({String(error)})
        </div>
      )}

      <StatStrip listEvents={listData} distributionSample={distributionForStrip} listQuerySuffix={eventListQuerySuffix} />

      <div className="overflow-hidden rounded-2xl border border-brand-line bg-brand-card shadow-panel-light dark:border-brand-panel-border dark:bg-brand-panel dark:shadow-panel">
        <div className="flex flex-col gap-4 border-b border-brand-line px-3 py-3 dark:border-brand-panel-border sm:px-4 sm:py-4 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-base font-bold text-brand-ink dark:text-brand-surface">Последние события</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end lg:gap-5">
            <RiskFilterBar value={riskFilter} onChange={setRiskFilter} />
            <EventTypeFilterControl value={eventTypeFilter} onChange={setEventTypeFilter} />
            <ListSortControl by={sortBy} dir={sortDir} onChange={setListSort} />
          </div>
        </div>
        <details className="group/dayfil border-b border-brand-line dark:border-brand-panel-border">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-semibold text-brand-muted transition hover:text-brand-ink dark:text-brand-surface/70 dark:hover:text-brand-surface sm:px-4 [&::-webkit-details-marker]:hidden">
            <span>День и номер</span>
            <svg
              className="h-4 w-4 shrink-0 text-brand-muted transition-transform duration-200 group-open/dayfil:-rotate-180 dark:text-brand-surface/60"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden
            >
              <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" />
            </svg>
          </summary>
          <div className="flex flex-col gap-3 px-3 pb-4 sm:flex-row sm:flex-wrap sm:items-end sm:px-4">
            <label className="block min-w-[10rem] flex-1 sm:max-w-[12rem]">
              <span className="text-xs font-medium text-brand-muted">День (по времени события)</span>
              <input
                type="date"
                value={draftDay}
                onChange={(e) => setDraftDay(e.target.value)}
                className="mt-1 w-full rounded-xl border border-brand-line bg-brand-surface px-3 py-2 text-sm text-brand-ink dark:border-brand-panel-border dark:bg-brand-ink dark:text-brand-surface"
              />
            </label>
            <label className="block min-w-0 flex-1 sm:min-w-[12rem] sm:max-w-[18rem]">
              <span className="text-xs font-medium text-brand-muted">Цифры в номере</span>
              <input
                value={draftPhone}
                onChange={(e) => setDraftPhone(e.target.value)}
                placeholder="отпр. / получ."
                title="Подстрока цифр в маске отправителя или получателя"
                className="mt-1 w-full min-w-0 rounded-xl border border-brand-line bg-brand-surface px-3 py-2 text-sm text-brand-ink placeholder:text-xs dark:border-brand-panel-border dark:bg-brand-ink dark:text-brand-surface"
                inputMode="numeric"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={applyDayPhoneFilters}
                className="rounded-xl bg-brand-red px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Применить
              </button>
              <button
                type="button"
                onClick={clearDayPhoneFilters}
                className="rounded-xl border border-brand-line px-4 py-2 text-sm font-semibold text-brand-muted transition hover:bg-brand-surface dark:border-brand-panel-border dark:hover:bg-brand-ink"
              >
                Сбросить
              </button>
            </div>
          </div>
        </details>
        {isLoading && <EventListSkeleton />}
        {!isLoading && !listData?.length && <EmptyEventsState scenarioPoolMax={demoScenarioPoolMax} />}
        {!isLoading && Boolean(sortedList.length) && !listForDisplay.length && (
          <p className="px-4 py-6 text-center text-sm text-brand-muted dark:text-brand-surface/70">
            Нет событий по выбранному дню или номеру.
          </p>
        )}
        {!isLoading && Boolean(listForDisplay.length) && (
          <ul className="w-full min-w-0 divide-y divide-brand-line dark:divide-brand-panel-border">
            {listForDisplay.map((e, i) => {
              return (
                <li
                  key={e.id}
                  style={{ animationDelay: `${Math.min(i, 14) * 42}ms` }}
                  className={[
                    "relative w-full min-w-0 motion-reduce:animate-none animate-list-row",
                    lastVisitedRowClass(e.id, lastVisitedId, e.risk_level),
                  ].join(" ")}
                >
                  <span
                    aria-hidden
                    className={[
                      "pointer-events-none absolute left-0 top-0 z-0 h-full w-1",
                      listRowRiskBarClass(e.risk_level, e.id, visitTimesMap),
                    ].join(" ")}
                  />
                  <Link
                    to={eventListQuerySuffix ? `/events/${e.id}?${eventListQuerySuffix}` : `/events/${e.id}`}
                    onClick={() => persistEventsListScrollY()}
                    className={[
                      "group relative z-[1] grid w-full max-w-full min-w-0 grid-cols-1 gap-2.5 px-3 py-3.5 transition-[background-color,box-shadow,transform] ease-out sm:h-[7.125rem] sm:max-h-[7.125rem] sm:grid-cols-[3.75rem_minmax(0,1fr)_10.5rem] sm:items-stretch sm:gap-x-3 sm:gap-y-0 sm:overflow-x-auto sm:overflow-y-clip sm:px-4 sm:py-2.5 sm:pr-3",
                      "duration-200 hover:z-[2] hover:-translate-y-0.5 hover:bg-brand-surface hover:shadow-md motion-reduce:hover:translate-y-0 dark:hover:bg-brand-ink/35",
                      listRowRiskShellClass(e.risk_level),
                      visitedCallLowMediumDimClass(e.event_type, e.risk_level, e.id, visitTimesMap),
                    ].join(" ")}
                  >
                    <div className="flex shrink-0 items-center justify-start sm:h-full sm:min-h-0">
                      <ScoreRing riskScore={e.risk_score} riskLevel={e.risk_level} />
                    </div>
                    <div className="flex min-h-0 min-w-0 flex-col overflow-hidden sm:h-full sm:min-h-0">
                      <div className="flex min-h-9 shrink-0 flex-nowrap items-center gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <span className="shrink-0 rounded-md border border-brand-line bg-brand-surface px-2 py-0.5 font-mono text-xs tabular-nums text-brand-muted dark:border-brand-panel-border dark:bg-brand-ink dark:text-brand-surface/70">
                          {e.event_type}
                        </span>
                        <RiskBadge level={e.risk_level} />
                        <span className="shrink-0 font-mono text-xs tabular-nums text-brand-muted dark:text-brand-surface/50">
                          v{e.policy_version}
                        </span>
                        {e.ml_fraud_proba != null && (
                          <span
                            title="Вероятность «мошеннический текст» по модели (0–100%)"
                            className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                              e.ml_fraud_proba >= 0.45
                                ? "border-brand-red/40 bg-brand-red/10 text-brand-red dark:border-brand-red/50 dark:bg-brand-red/15 dark:text-brand-surface"
                                : "border-brand-line bg-brand-surface text-brand-muted dark:border-brand-panel-border dark:bg-brand-ink dark:text-brand-surface/60"
                            }`}
                          >
                            ML {(e.ml_fraud_proba * 100).toFixed(1)}%
                          </span>
                        )}
                        {e.caller_reputation && (
                          <span
                            title={
                              e.caller_reputation.list_type === "blocklist"
                                ? "Номер в блок-листе репутации (вес в сумме правил)"
                                : "Номер в списке доверенных (вес в сумме правил)"
                            }
                            className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                              e.caller_reputation.list_type === "blocklist"
                                ? "border-brand-red/40 bg-brand-red/10 text-brand-red dark:border-brand-red/50 dark:bg-brand-red/15 dark:text-brand-surface"
                                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/45 dark:bg-emerald-500/15 dark:text-emerald-200"
                            }`}
                          >
                            Реп {e.caller_reputation.list_type === "blocklist" ? "блок" : "доверие"}{" "}
                            <span className="font-mono tabular-nums normal-case">
                              {e.caller_reputation.weight > 0 ? "+" : ""}
                              {e.caller_reputation.weight}
                            </span>
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex h-5 min-h-5 max-h-5 min-w-0 shrink-0 items-center gap-x-1.5 overflow-hidden text-sm font-medium leading-none text-brand-ink dark:text-brand-surface">
                        <span className="min-w-0 truncate">
                          {e.from_msisdn_masked} → {e.to_msisdn_masked}
                        </span>
                        {e.duration_sec != null ? (
                          <span className="shrink-0 whitespace-nowrap font-normal text-brand-muted tabular-nums">
                            · {e.duration_sec} с
                          </span>
                        ) : null}
                      </div>
                      <p
                        className="mt-1 line-clamp-2 h-[2.625rem] w-full min-w-0 shrink-0 overflow-hidden break-words text-sm leading-snug text-brand-muted dark:text-brand-surface/60"
                        title={e.text_excerpt && e.text_excerpt.length > 0 ? e.text_excerpt : undefined}
                      >
                        {truncateForEventListExcerpt(e.text_excerpt)}
                      </p>
                    </div>
                    <div className="flex w-full min-w-0 flex-row items-center justify-between gap-2 sm:h-full sm:w-[10.5rem] sm:max-w-[10.5rem] sm:flex-col sm:items-end sm:justify-center sm:gap-0.5 sm:self-stretch sm:text-right">
                      <span className="min-w-0 truncate text-xs tabular-nums text-brand-muted dark:text-brand-surface/55">
                        {new Date(e.occurred_at).toLocaleString("ru-RU")}
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-brand-red opacity-0 transition group-hover:opacity-100">
                        Подробнее →
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
