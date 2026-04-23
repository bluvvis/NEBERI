import { useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { FraudEvent } from "@/types";
import { computeListStats, computeRiskHistogram, eventAtPeakDisplayScore } from "@/lib/eventStats";

type Props = {
  listEvents: FraudEvent[] | undefined;
  distributionSample: FraudEvent[] | undefined | null;
  /** Суффикс `?risk=…&…` для ссылки на событие с пиковым скором. */
  listQuerySuffix?: string;
};

function RiskHistogramValue({ riskHist }: { riskHist: NonNullable<ReturnType<typeof computeRiskHistogram>> }) {
  const sep = <span className="text-brand-muted/70 dark:text-brand-surface/40">·</span>;
  return (
    <span className="inline-flex max-w-full flex-nowrap items-baseline gap-x-2 overflow-x-auto whitespace-nowrap font-mono text-base font-bold tracking-tight text-brand-ink dark:text-brand-surface sm:text-xl">
      <span>{riskHist.low}</span>
      {sep}
      <span>{riskHist.medium}</span>
      {sep}
      <span className="border-b border-brand-red/55 pb-px dark:border-brand-red/50">
        {riskHist.high}
      </span>
    </span>
  );
}

export function StatStrip({ listEvents, distributionSample, listQuerySuffix = "" }: Props) {
  const listStats = useMemo(() => computeListStats(listEvents), [listEvents]);
  const riskHist = useMemo(() => {
    if (distributionSample === null) return null;
    return computeRiskHistogram(distributionSample);
  }, [distributionSample]);

  const peakEvent = useMemo(() => eventAtPeakDisplayScore(listEvents), [listEvents]);
  const peakHref =
    peakEvent && listStats.max > 0
      ? listQuerySuffix
        ? `/events/${peakEvent.id}?${listQuerySuffix}`
        : `/events/${peakEvent.id}`
      : null;

  const cards: {
    label: string;
    value: ReactNode;
    accent: string;
    mono?: boolean;
    href?: string | null;
  }[] = [
    { label: "В ленте", value: String(listStats.n), accent: "from-brand-red/8 to-transparent" },
    { label: "Средний скор", value: String(listStats.avg), accent: "from-brand-muted/12 to-transparent" },
    {
      label: "Пик скора",
      value: String(listStats.max),
      accent: "from-brand-red/10 to-transparent",
      href: peakHref,
    },
    {
      label: "Риск: низ / ср / выс",
      value: riskHist === null ? "…" : <RiskHistogramValue riskHist={riskHist} />,
      accent: "from-brand-red/8 to-transparent",
      mono: true,
    },
  ];

  const emptySample = listStats.n === 0;

  return (
    <div className="mb-8 space-y-3">
      {emptySample && (
        <p className="rounded-lg border border-dashed border-brand-line bg-brand-card px-3 py-2 text-sm text-brand-muted dark:border-brand-panel-border dark:bg-brand-panel dark:text-brand-surface/65">
          Лента пуста — добавьте события через «Симуляция» в шапке или ingest API.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => {
          const inner = (
            <>
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${c.accent} opacity-90`}
                aria-hidden
              />
              <div className="relative min-w-0">
                <p className="text-sm font-semibold uppercase tracking-wide text-brand-muted dark:text-brand-surface/55">
                  {c.label}
                </p>
                {i === 3 && riskHist !== null && riskHist.sampleSize > 0 ? (
                  <p className="mt-0.5 truncate text-xs font-normal normal-case text-brand-muted/80 dark:text-brand-surface/45">
                    топ-{riskHist.sampleSize} по API
                  </p>
                ) : null}
              </div>
              <div
                className={`relative mt-2 min-w-0 text-xl font-bold tracking-tight text-brand-ink dark:text-brand-surface sm:text-2xl ${c.mono && typeof c.value === "string" ? "font-mono text-lg sm:text-xl" : ""}`}
              >
                {c.value}
              </div>
            </>
          );

          const shellClass =
            "animate-fade-up relative block h-full overflow-hidden rounded-2xl border border-brand-line bg-brand-card p-3.5 text-left shadow-panel-light motion-reduce:animate-none dark:border-brand-panel-border dark:bg-brand-panel dark:shadow-panel sm:p-4";

          if (c.href) {
            return (
              <Link
                key={c.label}
                to={c.href}
                style={{ animationDelay: `${i * 60}ms` }}
                className={`${shellClass} cursor-pointer transition hover:border-brand-red/35 hover:shadow-md dark:hover:border-brand-red/30`}
              >
                {inner}
                <span className="relative mt-2 inline-block text-xs font-semibold text-brand-red opacity-90">
                  К событию →
                </span>
              </Link>
            );
          }

          return (
            <div key={c.label} style={{ animationDelay: `${i * 60}ms` }} className={shellClass}>
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
