import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "react-router-dom";
import { RiskBadge } from "@/components/RiskBadge";
import { ScoreBreakdownCharts } from "@/components/ScoreBreakdownCharts";
import { ScoreRing } from "@/components/ScoreRing";
import { EventDetailSkeleton } from "@/components/EventDetailSkeleton";
import { Toast } from "@/components/Toast";
import {
  deleteReputationById,
  fetchEvent,
  fetchReputationList,
  postEventFeedback,
  postEventSenderReputation,
} from "@/lib/api";
import { EVENT_TYPE_SHORT_LABEL } from "@/lib/eventTypeUi";
import type { FeedbackKind, FraudEventType } from "@/types";
import { patchCachedEventInLists } from "@/lib/eventsQueryMerge";
import { detailPanelRiskClass } from "@/lib/riskChrome";
import { eventsFeedPath } from "@/lib/riskListQuery";
import { reputationHrefWithTail } from "@/lib/reputationNav";
import { touchVisitTime } from "@/lib/sessionKeys";

const FEEDBACK_KIND_LABEL: Record<FeedbackKind, string> = {
  false_positive: "Ложная тревога (не мошенничество)",
  missed_fraud: "Пропущенное мошенничество",
  other: "Другое",
};

function eventTypeLabel(raw: string): string {
  if (raw === "sms" || raw === "voice_text" || raw === "call") {
    return EVENT_TYPE_SHORT_LABEL[raw as FraudEventType];
  }
  return raw;
}

const panelCard =
  "rounded-2xl border border-brand-line bg-brand-card shadow-panel-light dark:border-brand-panel-border dark:bg-brand-panel dark:shadow-panel";
const sideCard =
  "rounded-2xl border border-brand-line bg-brand-card/95 p-4 shadow-panel-light dark:border-brand-panel-border dark:bg-brand-panel/95 dark:shadow-panel";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { search, state: navState } = useLocation();
  const fromReputation = (navState as { returnTo?: string } | null | undefined)?.returnTo === "/reputation";
  const feedPath = eventsFeedPath(search);
  const backPath = fromReputation ? "/reputation" : feedPath;
  const backLabel = fromReputation ? "Репутация" : "Все события";
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [fbKind, setFbKind] = useState<FeedbackKind>("false_positive");
  const [fbNote, setFbNote] = useState("");
  const [fbError, setFbError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const [justBlockedRepId, setJustBlockedRepId] = useState<string | null>(null);
  const [fbArmed, setFbArmed] = useState(false);
  const [blockArmed, setBlockArmed] = useState(false);
  const dismissToast = useCallback(() => setToast(null), []);
  const { data, isLoading, error } = useQuery({
    queryKey: ["event", id],
    queryFn: () => fetchEvent(id!),
    enabled: Boolean(id),
    staleTime: 45_000,
  });

  const pullEventIntoFeedCaches = useCallback(async () => {
    if (!id) return;
    await qc.invalidateQueries({ queryKey: ["event", id] });
    const fresh = await qc.fetchQuery({
      queryKey: ["event", id],
      queryFn: () => fetchEvent(id),
    });
    patchCachedEventInLists(qc, fresh);
  }, [id, qc]);

  const repListForUndo = useQuery({
    queryKey: ["reputation", "list"],
    queryFn: fetchReputationList,
    enabled: Boolean(
      id &&
        data &&
        data.sender_reputation_supported &&
        (data.caller_reputation?.list_type === "blocklist" || justBlockedRepId !== null),
    ),
  });

  const feedbackMut = useMutation({
    mutationFn: (input: { kind: FeedbackKind; note?: string }) =>
      postEventFeedback(id!, { kind: input.kind, note: input.note }),
    onSuccess: async (_data, vars) => {
      setFbError(null);
      setFbArmed(false);
      setFbNote("");
      try {
        await pullEventIntoFeedCaches();
      } catch {
        void qc.invalidateQueries({ queryKey: ["event", id] });
        void qc.invalidateQueries({ queryKey: ["events", "list"] });
      }
      void qc.invalidateQueries({ queryKey: ["reputation", "list"] });
      void qc.invalidateQueries({ queryKey: ["eventFeedback", "recent"] });
      setToast({
        text:
          vars.kind === "missed_fraud"
            ? "Отзыв сохранён. При «пропущенном мошенничестве» номер может быть занесён в блок-лист (если +7 и 10 цифр)."
            : "Отзыв сохранён.",
        tone: "success",
      });
    },
    onError: (e: Error) => {
      setFbArmed(false);
      setFbError(e.message);
    },
  });

  const senderRepMut = useMutation({
    mutationFn: () => postEventSenderReputation(id!, { source: "event_card" }),
    onSuccess: async (entry) => {
      setBlockArmed(false);
      setJustBlockedRepId(entry.id);
      try {
        await pullEventIntoFeedCaches();
      } catch {
        void qc.invalidateQueries({ queryKey: ["event", id] });
        void qc.invalidateQueries({ queryKey: ["events", "list"] });
      }
      void qc.invalidateQueries({ queryKey: ["reputation", "list"] });
      setToast({ text: `Отправитель ${entry.msisdn_masked} в блок-листе.`, tone: "success" });
    },
    onError: (e: Error) => {
      setBlockArmed(false);
      setToast({ text: e.message, tone: "error" });
    },
  });

  const undoBlockMut = useMutation({
    mutationFn: (repId: string) => deleteReputationById(repId),
    onSuccess: async () => {
      setJustBlockedRepId(null);
      try {
        await pullEventIntoFeedCaches();
      } catch {
        void qc.invalidateQueries({ queryKey: ["event", id] });
        void qc.invalidateQueries({ queryKey: ["events", "list"] });
      }
      void qc.invalidateQueries({ queryKey: ["reputation", "list"] });
      setToast({ text: "Блокировка отменена.", tone: "success" });
    },
    onError: (e: Error) => setToast({ text: e.message, tone: "error" }),
  });

  async function copyId(uuid: string) {
    try {
      await navigator.clipboard.writeText(uuid);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  useLayoutEffect(() => {
    if (!id) return;
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [id, data?.id]);

  /** Сразу по `id` из URL — иначе при быстром «назад» до конца fetch визит не попадёт в sessionStorage. */
  useLayoutEffect(() => {
    if (!id || fromReputation) return;
    touchVisitTime(id);
  }, [id, fromReputation]);

  /** Подтверждение с сервера: если id в ответе отличается от маршрута — поправить метку последнего визита. */
  useEffect(() => {
    if (!id || !data?.id || data.id !== id || fromReputation) return;
    touchVisitTime(data.id);
  }, [id, data?.id, fromReputation]);

  useEffect(() => {
    if (data?.caller_reputation?.list_type === "allowlist") setJustBlockedRepId(null);
  }, [data?.caller_reputation?.list_type]);

  useEffect(() => {
    setFbArmed(false);
    setBlockArmed(false);
  }, [id]);

  useEffect(() => {
    setFbArmed(false);
  }, [fbKind]);

  const alreadyBlocklistedForUndo = data?.caller_reputation?.list_type === "blocklist";
  const blockRepId = useMemo(() => {
    if (!data || !alreadyBlocklistedForUndo) return null;
    if (justBlockedRepId) return justBlockedRepId;
    const rows = repListForUndo.data ?? [];
    const row = rows.find(
      (r) => r.msisdn_masked === data.from_msisdn_masked && r.list_type === "blocklist",
    );
    return row?.id ?? null;
  }, [data, alreadyBlocklistedForUndo, justBlockedRepId, repListForUndo.data]);

  if (isLoading) {
    return <EventDetailSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-brand-red dark:text-brand-red">
        Событие не найдено или ошибка сети.
        <div className="mt-6">
          <Link to={backPath} className="text-base font-medium text-brand-red underline-offset-2 hover:underline">
            ← {backLabel}
          </Link>
        </div>
      </div>
    );
  }

  const alreadyBlocklisted = data.caller_reputation?.list_type === "blocklist";
  const blockBtnDisabled =
    !data.sender_reputation_supported || senderRepMut.isPending || alreadyBlocklisted;
  const repPrefillHref = data.from_msisdn_prefill_tail
    ? reputationHrefWithTail(data.from_msisdn_prefill_tail)
    : "/reputation";

  return (
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-4 sm:py-6 lg:px-8">
      <Toast message={toast?.text ?? null} tone={toast?.tone ?? "success"} onDismiss={dismissToast} />
      <Link
        to={backPath}
        className="mb-6 inline-flex items-center gap-2 text-base font-medium text-brand-red transition hover:opacity-80"
      >
        <span aria-hidden>←</span> {backLabel}
      </Link>

      {data.caller_reputation ? (
        <div
          className={`mb-6 rounded-xl border px-4 py-3 text-base leading-relaxed ${
            data.caller_reputation.list_type === "blocklist"
              ? "border-brand-red/35 bg-brand-red/10 text-brand-ink dark:bg-brand-red/15 dark:text-brand-surface"
              : "border-emerald-500/35 bg-emerald-500/10 text-brand-ink dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-brand-surface"
          }`}
          role="status"
        >
          <p className="font-semibold">
            {data.caller_reputation.list_type === "blocklist" ? (
              <>
                <span className="max-sm:hidden">Номер в блок-листе репутации</span>
                <span className="sm:hidden">Блок-лист</span>
              </>
            ) : (
              <>
                <span className="max-sm:hidden">Номер в списке доверенных</span>
                <span className="sm:hidden">Доверенные</span>
              </>
            )}
          </p>
          <p className="mt-1 text-sm text-brand-muted dark:text-brand-surface/80">
            <span className="max-sm:hidden">К сумме весов правил: </span>
            <span className="sm:hidden">Вес: </span>
            <span className="font-mono font-semibold text-brand-ink dark:text-brand-surface">
              {data.caller_reputation.weight > 0 ? "+" : ""}
              {data.caller_reputation.weight}
            </span>
            {data.caller_reputation.label ? (
              <span className="max-sm:hidden">
                {" "}
                · <span>{data.caller_reputation.label}</span>
              </span>
            ) : null}
            {data.caller_reputation.source ? (
              <span className="ml-1 hidden font-mono text-xs opacity-80 sm:inline">({data.caller_reputation.source})</span>
            ) : null}
          </p>
        </div>
      ) : null}

      {data.risk_level === "high" ? (
        <div
          className="mb-6 flex items-center gap-2 rounded-xl border border-brand-red/35 bg-brand-red/10 px-4 py-3 text-base font-semibold text-brand-ink motion-reduce:animate-none animate-risk-high-ring dark:bg-brand-red/15 dark:text-brand-surface"
          role="status"
        >
          <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-red/60 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-red" />
          </span>
          <span className="max-sm:hidden">Высокий риск — проверьте в первую очередь</span>
          <span className="sm:hidden">Высокий риск</span>
        </div>
      ) : null}

      <div className="grid min-w-0 gap-6 sm:gap-8 lg:grid-cols-12 lg:items-start">
        <aside className="flex min-w-0 flex-col items-center gap-5 lg:col-span-3 lg:items-start">
          <ScoreRing riskScore={data.risk_score} riskLevel={data.risk_level} size="lg" />
          <div
            className={`w-full max-w-md text-center lg:text-left ${sideCard} border-brand-line/90 shadow-md dark:border-brand-panel-border`}
          >
            <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
              <h1 className="text-2xl font-bold tracking-tight text-brand-ink dark:text-brand-surface">Событие</h1>
              <RiskBadge level={data.risk_level} />
            </div>
            <p className="mt-3">
              <span className="inline-flex rounded-md border border-brand-line bg-brand-surface px-2.5 py-1 font-mono text-xs font-semibold uppercase tracking-wide text-brand-muted dark:border-brand-panel-border dark:bg-brand-ink dark:text-brand-surface/75">
                {eventTypeLabel(data.event_type)}
              </span>
            </p>
            <p className="mt-4 break-words text-lg font-semibold leading-snug text-brand-ink dark:text-brand-surface">
              <span className="font-mono tracking-tight">{data.from_msisdn_masked}</span>
              <span className="mx-1.5 text-brand-muted">→</span>
              <span className="font-mono tracking-tight">{data.to_msisdn_masked}</span>
              {data.duration_sec != null && (
                <span className="mt-1 block text-base font-normal text-brand-muted sm:mt-0 sm:ml-2 sm:inline">
                  · {data.duration_sec} с
                </span>
              )}
            </p>
            <p className="mt-2 text-base font-medium text-brand-muted dark:text-brand-surface/80">
              {new Date(data.occurred_at).toLocaleString("ru-RU", {
                dateStyle: "long",
                timeStyle: "short",
              })}
            </p>
            {data.text_excerpt ? (
              <blockquote className="mt-5 rounded-xl border border-brand-line/80 bg-brand-surface/90 p-4 text-left text-base leading-relaxed text-brand-ink shadow-inner dark:border-brand-panel-border dark:bg-brand-ink/80 dark:text-brand-surface">
                <span className="block break-words">{data.text_excerpt}</span>
              </blockquote>
            ) : null}
          </div>
        </aside>

        <div
          className={`relative min-w-0 overflow-hidden p-4 sm:p-6 lg:col-span-6 ${panelCard} ${detailPanelRiskClass(data.risk_level)}`}
        >
          {data.score_explanation ? (
            <section aria-labelledby="score-explain-heading">
              <h2 id="score-explain-heading" className="text-lg font-bold text-brand-ink dark:text-brand-surface">
                Как получился скор
              </h2>
              <p className="mt-2 text-base leading-relaxed text-brand-muted dark:text-brand-surface/75">
                Две оценки: по правилам и по тексту (ML). Для цветной метки берётся{" "}
                <strong className="font-semibold text-brand-ink dark:text-brand-surface">большая</strong> из двух — то
                же число, что в кольце слева.
              </p>
              <ScoreBreakdownCharts
                explanation={data.score_explanation}
                mlFraudProba={data.ml_fraud_proba ?? undefined}
              />
              <details className="mt-6 rounded-xl border border-brand-line bg-brand-card open:border-brand-red/25 dark:border-brand-panel-border dark:bg-brand-panel dark:open:border-brand-red/30">
                <summary className="cursor-pointer list-none px-4 py-3.5 text-base font-semibold text-brand-red transition hover:opacity-80 [&::-webkit-details-marker]:hidden">
                  Подробнее для аудита <span className="text-brand-muted">▼</span>
                </summary>
                <div className="border-t border-brand-line px-4 pb-5 pt-4 dark:border-brand-panel-border">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-brand-muted">Реквизиты</h3>
                  <dl className="mt-3 grid gap-3 text-base sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <dt className="text-sm text-brand-muted">ID</dt>
                      <dd className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="break-all font-mono text-sm text-brand-ink dark:text-brand-surface">
                          {data.id}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyId(data.id)}
                          className="rounded-lg border border-brand-line bg-brand-card px-3 py-1.5 text-sm font-medium text-brand-ink transition hover:border-brand-red/50 hover:bg-brand-surface dark:border-brand-panel-border dark:bg-brand-panel dark:text-brand-surface dark:hover:border-brand-red/40"
                        >
                          {copied ? "Скопировано" : "Копировать ID"}
                        </button>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-brand-muted">Тип</dt>
                      <dd className="mt-1 font-mono text-brand-ink dark:text-brand-surface">{data.event_type}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-brand-muted">Политика</dt>
                      <dd className="mt-1 font-mono text-brand-ink dark:text-brand-surface">{data.policy_version}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-sm text-brand-muted">Время (ISO)</dt>
                      <dd className="mt-1 font-mono text-sm text-brand-ink dark:text-brand-surface">{data.occurred_at}</dd>
                    </div>
                  </dl>

                  <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-brand-muted">
                    Числа и настройки ML
                  </h3>
                  <dl className="mt-3 grid gap-3 text-base sm:grid-cols-2">
                    <div>
                      <dt className="text-sm text-brand-muted">Правила (сумма весов)</dt>
                      <dd className="mt-1 font-mono text-brand-ink dark:text-brand-surface">
                        {data.score_explanation.rule_score}{" "}
                        <span className="text-brand-muted">· сработало {data.score_explanation.rules_fired_count ?? 0}</span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-brand-muted">Смесь → округление</dt>
                      <dd className="mt-1 font-mono text-brand-ink dark:text-brand-surface">
                        {data.score_explanation.blended_exact.toFixed(1)} → {data.score_explanation.blended_score}
                        {data.score_explanation.blended_base != null ? (
                          <span className="ml-2 text-sm font-normal text-brand-muted">
                            (база {data.score_explanation.blended_base.toFixed(1)}
                            {data.score_explanation.diversity_bonus != null &&
                            data.score_explanation.diversity_bonus > 0
                              ? ` + бонус ${data.score_explanation.diversity_bonus.toFixed(1)}`
                              : ""}
                            )
                          </span>
                        ) : null}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-brand-muted">Совпадений с шаблонами</dt>
                      <dd className="mt-1 font-mono text-brand-ink dark:text-brand-surface">
                        {data.score_explanation.keyword_pattern_hits ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-brand-muted">Итог для уровня</dt>
                      <dd className="mt-1 font-mono text-brand-ink dark:text-brand-surface">
                        max(правила, смесь) = {data.score_explanation.effective_for_risk_level}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-brand-muted">Пороги low / med / high</dt>
                      <dd className="mt-1 font-mono text-sm text-brand-ink dark:text-brand-surface">
                        ≤{data.score_explanation.low_max} · ≤{data.score_explanation.medium_max} · выше
                      </dd>
                    </div>
                    {data.score_explanation.ml_blend_weight != null && data.ml_fraud_proba != null ? (
                      <div className="sm:col-span-2">
                        <dt className="text-sm text-brand-muted">ML в смеси</dt>
                        <dd className="mt-1 font-mono text-sm text-brand-ink dark:text-brand-surface">
                          p(fraud)={data.ml_fraud_proba.toFixed(3)}, вес={data.score_explanation.ml_blend_weight}
                          {data.ml_model_version ? (
                            <span className="ml-2 text-brand-muted">({data.ml_model_version})</span>
                          ) : null}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                  {(data.score_explanation.fairness_notes?.length ?? 0) > 0 ? (
                    <ul className="mt-5 space-y-2 border-t border-brand-line pt-4 text-sm leading-relaxed text-brand-muted dark:border-brand-panel-border dark:text-brand-surface/80">
                      {data.score_explanation.fairness_notes?.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </details>
            </section>
          ) : null}

          <section
            className={`relative border-t border-brand-line pt-8 dark:border-brand-panel-border ${data.score_explanation ? "mt-10" : ""}`}
          >
            <h2 className="text-base font-bold uppercase tracking-wide text-brand-muted">Сработавшие правила</h2>
            <ul className="mt-4 space-y-4">
              {data.reasons.length === 0 && (
                <li className="text-base text-brand-muted dark:text-brand-surface/70">
                  Правила не сработали — риск низкий.
                </li>
              )}
              {data.reasons.map((r, i) => (
                <li
                  key={`${r.rule_id}-${i}`}
                  style={{ animationDelay: `${i * 70}ms` }}
                  className="rounded-xl border border-brand-line bg-brand-card px-4 py-4 motion-reduce:animate-none animate-list-row dark:border-brand-panel-border dark:bg-brand-panel"
                >
                  <p className="text-base font-medium leading-relaxed text-brand-ink dark:text-brand-surface">
                    {r.message}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-brand-line pt-3 dark:border-brand-panel-border">
                    <span className="font-mono text-xs text-brand-muted">{r.rule_id}</span>
                    <span
                      className={`font-mono text-sm font-bold ${
                        r.weight < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-brand-red"
                      }`}
                    >
                      {r.weight > 0 ? "+" : ""}
                      {r.weight}
                    </span>
                  </div>
                  {r.references && r.references.length > 0 && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-medium text-brand-red underline-offset-2 hover:underline">
                        Источники ({r.references.length})
                      </summary>
                      <ul className="mt-2 space-y-1.5 pl-1">
                        {r.references.map((ref) => (
                          <li key={ref.url}>
                            <a
                              href={ref.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-brand-red underline-offset-2 hover:underline"
                            >
                              {ref.title}
                              {ref.kind ? (
                                <span className="ml-1 font-mono text-xs text-brand-muted">({ref.kind})</span>
                              ) : null}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-4 lg:col-span-3">
          <section className={sideCard} aria-labelledby="sender-rep-heading">
            <h2 id="sender-rep-heading" className="text-base font-bold text-brand-ink dark:text-brand-surface">
              Репутация отправителя
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-brand-muted dark:text-brand-surface/75">
              Блок с карточки. Доверенные — только в разделе «Репутация».
            </p>
            {data.sender_reputation_supported ? (
              <div className="mt-4 space-y-3">
                {alreadyBlocklisted ? (
                  <div className="space-y-2 rounded-xl border border-brand-red/40 bg-brand-red/12 px-3 py-3 dark:border-brand-red/35 dark:bg-brand-red/18">
                    <p className="text-sm font-semibold text-brand-ink dark:text-brand-surface">В блок-листе</p>
                    {blockRepId ? (
                      <button
                        type="button"
                        disabled={undoBlockMut.isPending}
                        onClick={() => undoBlockMut.mutate(blockRepId)}
                        className="w-full rounded-lg border border-brand-red/50 bg-brand-card px-3 py-2 text-sm font-semibold text-brand-red transition hover:bg-brand-red/10 disabled:opacity-50 dark:bg-brand-ink dark:text-brand-surface dark:hover:bg-brand-red/20"
                      >
                        {undoBlockMut.isPending ? "Отмена…" : "Отменить действие"}
                      </button>
                    ) : repListForUndo.isFetching ? (
                      <p className="text-xs text-brand-muted dark:text-brand-surface/65">Загрузка…</p>
                    ) : (
                      <p className="text-xs text-brand-muted dark:text-brand-surface/65">
                        Отмена недоступна — обновите страницу или удалите запись в «Репутация».
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      disabled={blockBtnDisabled}
                      onClick={() => {
                        if (!blockArmed) {
                          setBlockArmed(true);
                          return;
                        }
                        senderRepMut.mutate();
                      }}
                      className={[
                        "w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50",
                        blockArmed
                          ? "border-2 border-brand-red bg-brand-red/15 text-brand-red ring-2 ring-brand-red/20 dark:text-brand-surface"
                          : "bg-brand-red text-white hover:opacity-90",
                      ].join(" ")}
                    >
                      {senderRepMut.isPending ? "Отправка…" : blockArmed ? "Подтвердить в блок" : "В блок-лист"}
                    </button>
                    {blockArmed ? (
                      <button
                        type="button"
                        disabled={senderRepMut.isPending}
                        onClick={() => setBlockArmed(false)}
                        className="w-full rounded-lg border border-brand-line px-3 py-2 text-sm font-semibold text-brand-muted dark:border-brand-panel-border dark:text-brand-surface/75"
                      >
                        Отмена
                      </button>
                    ) : null}
                  </div>
                )}
                <p className="text-sm text-brand-muted dark:text-brand-surface/70">
                  Доверенные:{" "}
                  <Link
                    to={repPrefillHref}
                    className="font-semibold text-brand-red underline-offset-2 hover:underline"
                  >
                    «Репутация»
                  </Link>
                  {data.from_msisdn_prefill_tail ? " — номер подставится." : "."}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-brand-muted dark:text-brand-surface/70">
                Номер отправителя не подходит для операции с карточки (нужен российский мобильный{" "}
                <span className="font-mono">+7</span> и 10 цифр). Добавьте вручную в «Репутация».
              </p>
            )}
          </section>

          <section className={sideCard} aria-labelledby="feedback-heading">
            <h2 id="feedback-heading" className="text-base font-bold text-brand-ink dark:text-brand-surface">
              Обратная связь
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-brand-muted dark:text-brand-surface/70">
              Разметка для аудита. Тип «Пропущенное мошенничество» может занести отправителя в блок-лист (при +7 и 10
              цифрах).
            </p>
            {(data.feedbacks?.length ?? 0) > 0 ? (
              <ul className="mt-4 space-y-3">
                {(data.feedbacks ?? []).map((f) => (
                  <li
                    key={f.id}
                    className="rounded-xl border border-brand-line bg-brand-surface/80 px-3 py-2.5 dark:border-brand-panel-border dark:bg-brand-ink/60"
                  >
                    <p className="text-sm font-medium text-brand-ink dark:text-brand-surface">
                      {FEEDBACK_KIND_LABEL[f.kind]}
                    </p>
                    {f.note ? (
                      <p className="mt-1 text-xs leading-relaxed text-brand-muted dark:text-brand-surface/75">
                        {f.note}
                      </p>
                    ) : null}
                    <p className="mt-1 font-mono text-[0.65rem] text-brand-muted">
                      {new Date(f.created_at).toLocaleString("ru-RU")}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-brand-muted dark:text-brand-surface/65">Пока нет записей.</p>
            )}
            <form
              className="mt-4 rounded-xl border border-brand-line bg-brand-surface/80 p-3 dark:border-brand-panel-border dark:bg-brand-ink/70"
              onSubmit={(ev) => {
                ev.preventDefault();
                if (!id || feedbackMut.isPending) return;
                if (!fbArmed) {
                  setFbArmed(true);
                  return;
                }
                feedbackMut.mutate({ kind: fbKind, note: fbNote.trim() || undefined });
              }}
            >
              <label className="block">
                <span className="text-xs font-medium text-brand-muted">Тип</span>
                <select
                  value={fbKind}
                  onChange={(e) => setFbKind(e.target.value as FeedbackKind)}
                  className="mt-1 w-full rounded-lg border border-brand-line bg-brand-card px-2 py-2 text-sm text-brand-ink dark:border-brand-panel-border dark:bg-brand-panel dark:text-brand-surface"
                >
                  {(Object.keys(FEEDBACK_KIND_LABEL) as FeedbackKind[]).map((k) => (
                    <option key={k} value={k}>
                      {FEEDBACK_KIND_LABEL[k]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-2 block">
                <span className="text-xs font-medium text-brand-muted">Комментарий</span>
                <textarea
                  value={fbNote}
                  onChange={(e) => setFbNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    if (e.shiftKey) return;
                    if (e.nativeEvent.isComposing) return;
                    e.preventDefault();
                    if (!id || feedbackMut.isPending) return;
                    if (!fbArmed) {
                      setFbArmed(true);
                      return;
                    }
                    feedbackMut.mutate({ kind: fbKind, note: fbNote.trim() || undefined });
                  }}
                  rows={3}
                  className="mt-1 w-full resize-y rounded-lg border border-brand-line bg-brand-card px-2 py-2 text-sm text-brand-ink dark:border-brand-panel-border dark:bg-brand-panel dark:text-brand-surface"
                />
                <p className="mt-0.5 text-[0.65rem] text-brand-muted dark:text-brand-surface/55">
                  Enter — шаг подтверждения или отправка; Shift+Enter — новая строка.
                </p>
              </label>
              {fbError ? (
                <p className="mt-2 text-xs text-brand-red" role="alert">
                  {fbError}
                </p>
              ) : null}
              <div className="mt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={feedbackMut.isPending}
                  className={[
                    "w-full rounded-lg px-3 py-2 text-sm font-semibold transition disabled:opacity-50",
                    fbArmed
                      ? "border-2 border-brand-red bg-brand-red/15 text-brand-red ring-2 ring-brand-red/20 dark:text-brand-surface"
                      : "bg-brand-red text-white hover:opacity-90",
                  ].join(" ")}
                >
                  {feedbackMut.isPending ? "Отправка…" : fbArmed ? "Подтвердить отправку" : "Сохранить отзыв"}
                </button>
                {fbArmed ? (
                  <button
                    type="button"
                    disabled={feedbackMut.isPending}
                    onClick={() => setFbArmed(false)}
                    className="w-full rounded-lg border border-brand-line px-3 py-2 text-sm font-semibold text-brand-muted dark:border-brand-panel-border dark:text-brand-surface/75"
                  >
                    Отмена
                  </button>
                ) : null}
              </div>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}
