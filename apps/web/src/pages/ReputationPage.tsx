import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Toast } from "@/components/Toast";
import { deleteReputationById, fetchRecentEventFeedback, fetchReputationList, upsertReputation } from "@/lib/api";
import { EVENT_TYPE_SHORT_LABEL, type EventTypeFilterValue } from "@/lib/eventTypeUi";
import { digitsOnly, isoDateLocalYmd, maskMatchesPhoneQuery } from "@/lib/reputationFilters";
import { buildRuMsisdnE164, sanitizeRuTailInput } from "@/lib/ruPhone";
import { consumeReputationScrollRestore, prepareNavigateFromReputationToEvent } from "@/lib/sessionKeys";
import type { EventFeedbackRecent, FeedbackKind, ReputationEntry, ReputationListType } from "@/types";

const FEEDBACK_KIND_SHORT: Record<FeedbackKind, string> = {
  false_positive: "Ложная тревога",
  missed_fraud: "Пропущенное мошенничество",
  other: "Другое",
};

const FEEDBACK_INITIAL = 6;
const FEEDBACK_STEP = 6;
const REP_INITIAL = 8;
const REP_STEP = 8;

type RepDirectoryFilter = "all" | ReputationListType;

function feedbackMatchesEventType(f: EventFeedbackRecent, filter: EventTypeFilterValue): boolean {
  if (filter === "all") return true;
  const t = f.event_type;
  return t === filter;
}

export default function ReputationPage() {
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [tailDigits, setTailDigits] = useState("");
  const [label, setLabel] = useState("");
  const [source, setSource] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const dismissToast = useCallback(() => setToast(null), []);

  const [phoneFilter, setPhoneFilter] = useState("");
  const [dayFilter, setDayFilter] = useState("");
  const [fbEventType, setFbEventType] = useState<EventTypeFilterValue>("all");
  const [repListFilter, setRepListFilter] = useState<RepDirectoryFilter>("all");
  const [fbVisible, setFbVisible] = useState(FEEDBACK_INITIAL);
  const [repVisible, setRepVisible] = useState(REP_INITIAL);
  const [armedBlock, setArmedBlock] = useState(false);
  const [armedAllow, setArmedAllow] = useState(false);
  const [removeArmId, setRemoveArmId] = useState<string | null>(null);

  useLayoutEffect(() => {
    consumeReputationScrollRestore();
  }, []);

  useEffect(() => {
    setFbVisible(FEEDBACK_INITIAL);
  }, [phoneFilter, dayFilter, fbEventType]);

  useEffect(() => {
    setRepVisible(REP_INITIAL);
    setRemoveArmId(null);
  }, [phoneFilter, dayFilter, repListFilter]);

  useEffect(() => {
    const raw = searchParams.get("tail") ?? searchParams.get("digits");
    if (raw == null || raw === "") return;
    const t = sanitizeRuTailInput(raw);
    if (t.length === 0) return;
    setTailDigits(t);
    navigate("/reputation", { replace: true });
  }, [searchParams, navigate]);

  useEffect(() => {
    setArmedBlock(false);
    setArmedAllow(false);
  }, [tailDigits]);

  const listQ = useQuery({
    queryKey: ["reputation", "list"],
    queryFn: fetchReputationList,
  });

  const feedbackQ = useQuery({
    queryKey: ["eventFeedback", "recent"],
    queryFn: () => fetchRecentEventFeedback(200),
  });

  const phoneDigits = useMemo(() => digitsOnly(phoneFilter), [phoneFilter]);

  const filteredFeedback = useMemo(() => {
    const rows = feedbackQ.data ?? [];
    return rows.filter((f) => {
      if (!maskMatchesPhoneQuery(f.from_msisdn_masked, phoneDigits)) return false;
      if (dayFilter && isoDateLocalYmd(f.created_at) !== dayFilter) return false;
      if (!feedbackMatchesEventType(f, fbEventType)) return false;
      return true;
    });
  }, [feedbackQ.data, phoneDigits, dayFilter, fbEventType]);

  const filteredRep = useMemo(() => {
    const rows = listQ.data ?? [];
    return rows.filter((r) => {
      if (!maskMatchesPhoneQuery(r.msisdn_masked, phoneDigits)) return false;
      if (dayFilter && isoDateLocalYmd(r.updated_at) !== dayFilter) return false;
      if (repListFilter !== "all" && r.list_type !== repListFilter) return false;
      return true;
    });
  }, [listQ.data, phoneDigits, dayFilter, repListFilter]);

  const submitReputation = useCallback(
    async (listType: ReputationListType) => {
      const msisdn = buildRuMsisdnE164(tailDigits);
      return upsertReputation({
        msisdn,
        list_type: listType,
        label: label.trim() || undefined,
        source: source.trim() || undefined,
      });
    },
    [tailDigits, label, source],
  );

  const upsertBlockM = useMutation({
    mutationFn: () => submitReputation("blocklist"),
    onSuccess: (data: ReputationEntry) => {
      setFormError(null);
      setArmedBlock(false);
      setTailDigits("");
      setLabel("");
      setSource("");
      void qc.invalidateQueries({ queryKey: ["reputation", "list"] });
      void qc.invalidateQueries({ queryKey: ["events"] });
      const msg = `Номер ${data.msisdn_masked} сохранён в блок-листе.`;
      setToast({ text: msg, tone: "success" });
    },
    onError: (e: Error) => {
      const msg = e.message || "Ошибка сохранения";
      setFormError(msg);
      setToast({ text: msg, tone: "error" });
    },
  });

  const upsertAllowM = useMutation({
    mutationFn: () => submitReputation("allowlist"),
    onSuccess: (data: ReputationEntry) => {
      setFormError(null);
      setArmedAllow(false);
      setTailDigits("");
      setLabel("");
      setSource("");
      void qc.invalidateQueries({ queryKey: ["reputation", "list"] });
      void qc.invalidateQueries({ queryKey: ["events"] });
      const msg = `Номер ${data.msisdn_masked} сохранён в списке доверенных.`;
      setToast({ text: msg, tone: "success" });
    },
    onError: (e: Error) => {
      const msg = e.message || "Ошибка сохранения";
      setFormError(msg);
      setToast({ text: msg, tone: "error" });
    },
  });

  const removeM = useMutation({
    mutationFn: (id: string) => deleteReputationById(id),
    onSuccess: () => {
      setRemoveArmId(null);
      void qc.invalidateQueries({ queryKey: ["reputation", "list"] });
      void qc.invalidateQueries({ queryKey: ["events"] });
      setToast({ text: "Запись удалена из репутации.", tone: "success" });
    },
    onError: (e: Error) => setToast({ text: e.message, tone: "error" }),
  });

  const busy = upsertBlockM.isPending || upsertAllowM.isPending;
  const loadingRecords = listQ.isLoading || feedbackQ.isLoading;
  const hasRep = Boolean(listQ.data?.length);
  const hasFb = Boolean(feedbackQ.data?.length);
  const recordsEmpty = !loadingRecords && !hasRep && !hasFb;

  const visibleFeedback = filteredFeedback.slice(0, fbVisible);
  const visibleRep = filteredRep.slice(0, repVisible);

  const filterFieldClass =
    "mt-1.5 w-full rounded-xl border border-brand-line bg-brand-surface px-3 py-2 text-base text-brand-ink outline-none dark:border-brand-panel-border dark:bg-brand-ink dark:text-brand-surface";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Toast message={toast?.text ?? null} tone={toast?.tone ?? "success"} onDismiss={dismissToast} />
      <Link
        to="/"
        className="mb-5 inline-flex items-center gap-2 text-base font-medium text-brand-red transition hover:opacity-80"
      >
        <span aria-hidden>←</span> Лента событий
      </Link>

      <h1 className="text-2xl font-bold tracking-tight text-brand-ink dark:text-brand-surface">Репутация номеров</h1>
      <p className="mt-2 text-sm leading-relaxed text-brand-muted dark:text-brand-surface/75">
        Российский мобильный: <span className="font-mono font-semibold text-brand-ink dark:text-brand-surface">+7</span> и{" "}
        <span className="font-mono font-semibold text-brand-ink dark:text-brand-surface">10 цифр</span>. При приёме
        события: блок <span className="font-mono">+18</span>, доверие <span className="font-mono">−12</span> к сумме
        весов правил. С карточки события — ссылка с префиллом поля номера.
      </p>

      <form
        className="mt-8 rounded-2xl border border-brand-line bg-brand-card p-5 shadow-panel-light dark:border-brand-panel-border dark:bg-brand-panel dark:shadow-panel"
        onSubmit={(ev) => ev.preventDefault()}
      >
        <h2 className="text-lg font-bold text-brand-ink dark:text-brand-surface">Добавить или обновить</h2>
        <label className="mt-4 block">
          <span className="text-sm font-medium text-brand-muted">Номер</span>
          <div className="mt-1.5 flex max-w-md items-stretch overflow-hidden rounded-xl border border-brand-line bg-brand-surface dark:border-brand-panel-border dark:bg-brand-ink">
            <span className="flex shrink-0 items-center border-r border-brand-line bg-brand-card px-3 font-mono text-base font-semibold text-brand-ink dark:border-brand-panel-border dark:bg-brand-panel dark:text-brand-surface">
              +7
            </span>
            <input
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="9001234567"
              value={tailDigits}
              onChange={(e) => {
                setFormError(null);
                setTailDigits(sanitizeRuTailInput(e.target.value));
              }}
              maxLength={10}
              className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 font-mono text-base text-brand-ink outline-none ring-0 dark:text-brand-surface"
            />
          </div>
          <p className="mt-1.5 text-xs text-brand-muted dark:text-brand-surface/55">Только цифры, без +7 и без ведущей 8.</p>
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-brand-muted">Метка (необязательно)</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className={filterFieldClass}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-brand-muted">Источник (необязательно)</span>
            <input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className={filterFieldClass}
            />
          </label>
        </div>
        {formError ? (
          <p className="mt-3 text-sm text-brand-red dark:text-brand-red" role="alert">
            {formError}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (!armedBlock) {
                setArmedBlock(true);
                setArmedAllow(false);
                return;
              }
              upsertBlockM.mutate();
            }}
            className={[
              "rounded-xl px-5 py-2.5 text-base font-semibold shadow-md transition disabled:opacity-50",
              armedBlock
                ? "border-2 border-brand-red bg-brand-red/15 text-brand-red ring-2 ring-brand-red/25 dark:text-brand-surface"
                : "bg-brand-red text-white hover:opacity-90",
            ].join(" ")}
          >
            {upsertBlockM.isPending ? "Сохранение…" : armedBlock ? "Подтвердить в блок" : "В блок-лист"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (!armedAllow) {
                setArmedAllow(true);
                setArmedBlock(false);
                return;
              }
              upsertAllowM.mutate();
            }}
            className={[
              "rounded-xl border px-5 py-2.5 text-base font-semibold shadow-sm transition disabled:opacity-50",
              armedAllow
                ? "border-emerald-600/50 bg-emerald-500/15 text-emerald-800 ring-2 ring-emerald-500/25 dark:border-emerald-400/45 dark:bg-emerald-500/15 dark:text-emerald-100"
                : "border-brand-line bg-brand-card text-brand-muted hover:bg-brand-surface dark:border-brand-panel-border dark:bg-brand-panel dark:text-brand-surface/75 dark:hover:bg-brand-ink",
            ].join(" ")}
          >
            {upsertAllowM.isPending ? "Сохранение…" : armedAllow ? "Подтвердить в доверенные" : "В доверенные"}
          </button>
          {(armedBlock || armedAllow) && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setArmedBlock(false);
                setArmedAllow(false);
              }}
              className="rounded-xl border border-brand-line px-4 py-2.5 text-sm font-semibold text-brand-muted dark:border-brand-panel-border dark:text-brand-surface/75"
            >
              Отмена
            </button>
          )}
        </div>
      </form>

      <section className="mt-10">
        <h2 className="text-lg font-bold text-brand-ink dark:text-brand-surface">Текущие записи</h2>
        <p className="mt-1 text-sm text-brand-muted dark:text-brand-surface/65">
          Справочник: один номер — одна строка. Списки — порциями; фильтры в свёртке ниже.
        </p>

        {loadingRecords && <p className="mt-4 text-brand-muted">Загрузка…</p>}
        {(listQ.error || feedbackQ.error) && (
          <p className="mt-4 text-brand-red">
            Ошибка:{" "}
            {String((listQ.error as Error | undefined)?.message || (feedbackQ.error as Error | undefined)?.message)}
          </p>
        )}

        {recordsEmpty && (
          <p className="mt-4 text-base text-brand-muted dark:text-brand-surface/70">Пока пусто.</p>
        )}

        {!recordsEmpty && (
          <details className="mt-6 rounded-2xl border border-brand-line bg-brand-card shadow-panel-light open:shadow-md dark:border-brand-panel-border dark:bg-brand-panel dark:shadow-panel">
            <summary className="cursor-pointer list-none px-4 py-3.5 text-sm font-semibold text-brand-ink transition hover:text-brand-red dark:text-brand-surface dark:hover:text-brand-surface [&::-webkit-details-marker]:hidden">
              Фильтры и поиск{" "}
              <span className="font-normal text-brand-muted dark:text-brand-surface/60">(номер, день, тип)</span>
            </summary>
            <div className="grid gap-4 border-t border-brand-line px-4 pb-4 pt-3 dark:border-brand-panel-border sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-brand-muted">Поиск по номеру (маска, любые цифры подряд)</span>
                <input
                  value={phoneFilter}
                  onChange={(e) => setPhoneFilter(e.target.value)}
                  placeholder="например 90012"
                  className={filterFieldClass}
                  inputMode="numeric"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-brand-muted">День записи</span>
                <input
                  type="date"
                  value={dayFilter}
                  onChange={(e) => setDayFilter(e.target.value)}
                  className={filterFieldClass}
                />
                <p className="mt-1 text-xs text-brand-muted dark:text-brand-surface/55">
                  Для отзывов — день создания отзыва; для справочника — день обновления записи.
                </p>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-brand-muted">Тип события (только отзывы)</span>
                <select
                  value={fbEventType}
                  onChange={(e) => setFbEventType(e.target.value as EventTypeFilterValue)}
                  className={filterFieldClass}
                >
                  <option value="all">Все типы</option>
                  <option value="sms">{EVENT_TYPE_SHORT_LABEL.sms}</option>
                  <option value="voice_text">{EVENT_TYPE_SHORT_LABEL.voice_text}</option>
                  <option value="call">{EVENT_TYPE_SHORT_LABEL.call}</option>
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-brand-muted">Справочник: тип списка</span>
                <select
                  value={repListFilter}
                  onChange={(e) => setRepListFilter(e.target.value as RepDirectoryFilter)}
                  className={filterFieldClass}
                >
                  <option value="all">Все записи</option>
                  <option value="blocklist">Только блок-лист</option>
                  <option value="allowlist">Только доверенные</option>
                </select>
              </label>
            </div>
          </details>
        )}

        {hasFb && (
          <div className="mt-8">
            <h3 className="text-base font-bold text-brand-ink dark:text-brand-surface">Отзывы по событиям</h3>
            {filteredFeedback.length === 0 ? (
              <p className="mt-3 text-sm text-brand-muted dark:text-brand-surface/70">Нет строк по текущим фильтрам.</p>
            ) : (
              <>
                <p className="mt-1 text-xs text-brand-muted dark:text-brand-surface/55">
                  Показано {visibleFeedback.length} из {filteredFeedback.length}
                </p>
                <ul className="mt-3 space-y-3">
                  {visibleFeedback.map((f) => (
                    <li
                      key={f.id}
                      className="rounded-xl border border-brand-line bg-brand-card p-4 motion-reduce:animate-none animate-list-row dark:border-brand-panel-border dark:bg-brand-panel"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-mono text-base font-semibold text-brand-ink dark:text-brand-surface">
                          {f.from_msisdn_masked}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md border border-brand-line bg-brand-surface px-2 py-0.5 font-mono text-xs text-brand-muted dark:border-brand-panel-border dark:bg-brand-ink dark:text-brand-surface/70">
                            {EVENT_TYPE_SHORT_LABEL[f.event_type]}
                          </span>
                          <Link
                            to={`/events/${f.event_id}`}
                            state={{ returnTo: "/reputation" }}
                            onClick={() => prepareNavigateFromReputationToEvent()}
                            className="text-sm font-medium text-brand-red underline-offset-2 hover:underline"
                          >
                            К событию →
                          </Link>
                        </div>
                      </div>
                      <p className="mt-2 text-sm font-medium text-brand-ink dark:text-brand-surface">
                        {FEEDBACK_KIND_SHORT[f.kind]}
                      </p>
                      {f.note ? (
                        <p className="mt-1.5 text-sm leading-relaxed text-brand-muted dark:text-brand-surface/75">
                          {f.note}
                        </p>
                      ) : null}
                      <p className="mt-2 font-mono text-xs text-brand-muted">
                        {new Date(f.created_at).toLocaleString("ru-RU")}
                      </p>
                    </li>
                  ))}
                </ul>
                {filteredFeedback.length > fbVisible ? (
                  <button
                    type="button"
                    onClick={() =>
                      setFbVisible((n) => Math.min(n + FEEDBACK_STEP, filteredFeedback.length))
                    }
                    className="mt-4 rounded-xl border border-brand-line bg-brand-card px-4 py-2 text-sm font-semibold text-brand-muted transition hover:bg-brand-surface dark:border-brand-panel-border dark:bg-brand-panel dark:text-brand-surface/80 dark:hover:bg-brand-ink"
                  >
                    Показать ещё
                  </button>
                ) : null}
              </>
            )}
          </div>
        )}

        {hasRep && (
          <div className="mt-8">
            <h3 className="text-base font-bold text-brand-ink dark:text-brand-surface">Справочник репутации</h3>
            {filteredRep.length === 0 ? (
              <p className="mt-3 text-sm text-brand-muted dark:text-brand-surface/70">Нет строк по текущим фильтрам.</p>
            ) : (
              <>
                <p className="mt-1 text-xs text-brand-muted dark:text-brand-surface/55">
                  Показано {visibleRep.length} из {filteredRep.length}
                </p>
                <ul className="mt-3 space-y-3">
                  {visibleRep.map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-col gap-3 rounded-xl border border-brand-line bg-brand-card p-4 dark:border-brand-panel-border dark:bg-brand-panel sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-lg font-semibold text-brand-ink dark:text-brand-surface">
                          {row.msisdn_masked}
                        </p>
                        <p className="mt-1 text-sm text-brand-muted">
                          <span
                            className={
                              row.list_type === "blocklist"
                                ? "font-semibold text-brand-red"
                                : "font-semibold text-emerald-600 dark:text-emerald-400"
                            }
                          >
                            {row.list_type === "blocklist" ? "Блок-лист" : "Доверенные"}
                          </span>
                          {row.label ? <span className="ml-2">· {row.label}</span> : null}
                          {row.source ? <span className="ml-2 font-mono text-xs opacity-80">({row.source})</span> : null}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                        {removeArmId === row.id ? (
                          <>
                            <button
                              type="button"
                              disabled={removeM.isPending}
                              onClick={() => removeM.mutate(row.id)}
                              className="rounded-lg border border-brand-red/50 bg-brand-red/10 px-3 py-2 text-sm font-semibold text-brand-red dark:hover:bg-brand-red/20"
                            >
                              {removeM.isPending ? "Удаление…" : "Подтвердить удаление"}
                            </button>
                            <button
                              type="button"
                              disabled={removeM.isPending}
                              onClick={() => setRemoveArmId(null)}
                              className="rounded-lg border border-brand-line px-3 py-2 text-sm font-medium text-brand-muted dark:border-brand-panel-border"
                            >
                              Отмена
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={removeM.isPending}
                            onClick={() => setRemoveArmId(row.id)}
                            className="rounded-lg border border-brand-line px-3 py-2 text-sm font-medium text-brand-red transition hover:bg-brand-red/10 dark:border-brand-panel-border dark:hover:bg-brand-red/15"
                          >
                            Удалить
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                {filteredRep.length > repVisible ? (
                  <button
                    type="button"
                    onClick={() =>
                      setRepVisible((n) => Math.min(n + REP_STEP, filteredRep.length))
                    }
                    className="mt-4 rounded-xl border border-brand-line bg-brand-card px-4 py-2 text-sm font-semibold text-brand-muted transition hover:bg-brand-surface dark:border-brand-panel-border dark:bg-brand-panel dark:text-brand-surface/80 dark:hover:bg-brand-ink"
                  >
                    Показать ещё
                  </button>
                ) : null}
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
