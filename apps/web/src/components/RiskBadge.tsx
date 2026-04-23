import type { RiskLevel } from "@/types";

const styles: Record<RiskLevel, string> = {
  low: "bg-brand-line/80 text-brand-muted ring-1 ring-brand-line dark:bg-brand-panel-border dark:text-brand-surface/85 dark:ring-brand-panel-border",
  medium:
    "bg-brand-zone-mid/25 text-brand-ink ring-1 ring-brand-zone-mid/50 dark:bg-brand-zone-mid/20 dark:text-brand-surface dark:ring-brand-zone-mid/40",
  high:
    "bg-brand-red text-white ring-1 ring-brand-red shadow-sm motion-reduce:animate-none animate-risk-high-ring",
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  const label = level === "low" ? "Низкий" : level === "medium" ? "Средний" : "Высокий";
  const short = level === "low" ? "Н" : level === "medium" ? "С" : "В";
  return (
    <span
      title={label}
      aria-label={label}
      className={`relative inline-flex items-center overflow-hidden rounded-full px-2.5 py-1 text-sm font-semibold ring-inset max-sm:px-2 max-sm:text-xs sm:px-3 sm:text-sm ${styles[level]}`}
    >
      {level === "high" ? (
        <span
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-80 motion-reduce:animate-none animate-risk-high-sheen"
          aria-hidden
        />
      ) : null}
      <span className="relative max-sm:hidden">{label}</span>
      <span className="relative sm:hidden">{short}</span>
    </span>
  );
}
