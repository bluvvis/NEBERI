/** Пресеты — разная геометрия заглушек вместо одинаковых полос. */
const ROW_PRESETS = [
  { ring: "circle" as const, bars: ["h-2.5 w-[52%]", "h-2.5 w-[78%]", "h-2 w-[36%]"], date: "w-20" },
  { ring: "squircle" as const, bars: ["h-2.5 w-[88%]", "h-2 w-[44%]"], date: "w-24" },
  { ring: "circle" as const, bars: ["h-2.5 w-[62%]", "h-2.5 w-[70%]", "h-2 w-[55%]", "h-1.5 w-[40%]"], date: "w-[4.5rem]" },
  { ring: "pill" as const, bars: ["h-2.5 w-[70%]", "h-2 w-[92%]"], date: "w-16" },
  { ring: "circle" as const, bars: ["h-2.5 w-[48%]", "h-2 w-[66%]"], date: "w-[5.5rem]" },
  { ring: "squircle" as const, bars: ["h-2.5 w-[95%]", "h-2 w-[38%]", "h-2 w-[52%]"], date: "w-20" },
  { ring: "circle" as const, bars: ["h-2.5 w-[72%]", "h-2 w-[58%]"], date: "w-24" },
  { ring: "pill" as const, bars: ["h-2.5 w-[60%]", "h-2 w-[84%]", "h-1.5 w-[30%]"], date: "w-[5rem]" },
  { ring: "squircle" as const, bars: ["h-3 w-[40%]"], date: "w-28" },
  { ring: "circle" as const, bars: ["h-2 w-full max-w-[20rem]", "h-2.5 w-[34%]"], date: "w-14" },
  { ring: "pill" as const, bars: ["h-2 w-[90%]", "h-2 w-[55%]", "h-1.5 w-[70%]", "h-1.5 w-[22%]"], date: "w-[4.25rem]" },
  { ring: "circle" as const, bars: ["h-2.5 w-[76%]"], date: "w-32" },
] as const;

function RingGhost({ kind }: { kind: (typeof ROW_PRESETS)[number]["ring"] }) {
  const base = "shrink-0 skeleton-shimmer bg-brand-line/90 dark:bg-brand-panel-border";
  if (kind === "squircle") {
    return <div className={`h-14 w-14 rounded-2xl ${base}`} />;
  }
  if (kind === "pill") {
    return <div className={`h-11 w-16 rounded-full ${base}`} />;
  }
  return <div className={`h-14 w-14 rounded-full ${base}`} />;
}

export function EventListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <ul
      className="divide-y divide-brand-line dark:divide-brand-panel-border"
      aria-busy
      aria-label="Загрузка списка"
    >
      {Array.from({ length: rows }).map((_, i) => {
        const preset = ROW_PRESETS[i % ROW_PRESETS.length];
        return (
          <li
            key={i}
            style={{ animationDelay: `${(i % 6) * 55}ms` }}
            className="flex gap-4 p-4 motion-reduce:animate-none animate-fade-up sm:items-center"
          >
            <RingGhost kind={preset.ring} />
            <div className="min-w-0 flex-1 space-y-2">
              {preset.bars.map((cls, j) => (
                <div
                  key={j}
                  className={`max-w-full rounded-full bg-brand-line/90 skeleton-shimmer dark:bg-brand-panel-border ${cls}`}
                />
              ))}
            </div>
            <div
              className={`hidden h-2.5 shrink-0 rounded-md bg-brand-line/90 skeleton-shimmer dark:bg-brand-panel-border sm:block ${preset.date}`}
            />
          </li>
        );
      })}
    </ul>
  );
}
