import type { RiskLevel } from "@/types";

export type RiskFilter = "all" | RiskLevel;

const options: { id: RiskFilter; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "low", label: "Низкий" },
  { id: "medium", label: "Средний" },
  { id: "high", label: "Высокий" },
];

export function RiskFilterBar({
  value,
  onChange,
}: {
  value: RiskFilter;
  onChange: (v: RiskFilter) => void;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label="Фильтр по уровню риска"
    >
      <span className="text-sm font-semibold uppercase tracking-wide text-brand-muted dark:text-brand-surface/60">
        Риск
      </span>
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={[
              "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition",
              active
                ? "border-brand-red/50 bg-brand-red/12 text-brand-red shadow-sm ring-1 ring-brand-red/20 dark:border-brand-red/45 dark:bg-brand-red/20 dark:text-brand-surface dark:ring-brand-red/30"
                : "border-brand-line bg-brand-card text-brand-muted hover:border-brand-muted hover:text-brand-ink dark:border-brand-panel-border dark:bg-brand-panel dark:text-brand-surface/70 dark:hover:border-brand-muted dark:hover:text-brand-surface",
            ].join(" ")}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
