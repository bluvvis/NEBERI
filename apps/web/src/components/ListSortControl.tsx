import type { SortBy, SortDir } from "@/lib/eventSort";

const OPTIONS: { by: SortBy; label: string }[] = [
  { by: "added", label: "По дате добавления" },
  { by: "score", label: "По скору" },
  { by: "visited", label: "По дате посещения" },
];

/** Одна стрелка: asc — вверх, desc — вниз (поворот на 180°). */
function SortDirChevron({ className, dir }: { className?: string; dir: SortDir }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden
      style={{ transform: dir === "desc" ? "rotate(180deg)" : undefined }}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m0 0 4.5-4.5M12 19l-4.5-4.5" />
    </svg>
  );
}

export function ListSortControl({
  by,
  dir,
  onChange,
  className = "",
}: {
  by: SortBy;
  dir: SortDir;
  onChange: (by: SortBy, dir: SortDir) => void;
  className?: string;
}) {
  const current = OPTIONS.find((o) => o.by === by) ?? OPTIONS[0];

  return (
    <div className={["flex min-w-0 items-stretch gap-2", className].filter(Boolean).join(" ")} role="group" aria-label="Сортировка списка">
      <div className="group/sort relative min-w-0 flex-1 lg:min-w-[13.5rem] lg:max-w-[13.5rem] lg:flex-none">
        <div
          className={[
            "box-border flex h-10 min-h-[2.75rem] w-full cursor-default select-none items-center rounded-xl border border-brand-line bg-brand-surface px-3 text-sm font-medium text-brand-ink transition-colors sm:min-h-0",
            "dark:border-brand-panel-border dark:bg-brand-ink/50 dark:text-brand-surface",
            "group-hover/sort:rounded-b-none group-hover/sort:border-b-transparent dark:group-hover/sort:border-b-transparent",
          ].join(" ")}
        >
          <span className="block min-w-0 truncate">{current.label}</span>
        </div>
        <ul
          className={[
            "absolute left-0 right-0 top-full z-50 -mt-px rounded-b-xl border border-t-0 border-brand-line bg-brand-card py-1 shadow-lg",
            "invisible opacity-0 transition-opacity duration-150",
            "group-hover/sort:visible group-hover/sort:opacity-100",
            "dark:border-brand-panel-border dark:bg-brand-panel dark:shadow-black/40",
          ].join(" ")}
          role="listbox"
          aria-label="Тип сортировки"
        >
          {OPTIONS.map((o) => (
            <li key={o.by}>
              <button
                type="button"
                role="option"
                aria-selected={by === o.by}
                className={[
                  "w-full px-3 py-2.5 text-left text-sm font-medium transition-colors",
                  by === o.by
                    ? "bg-brand-red/10 text-brand-red dark:bg-brand-red/15 dark:text-brand-surface"
                    : "text-brand-ink hover:bg-brand-surface dark:text-brand-surface dark:hover:bg-brand-ink/80",
                ].join(" ")}
                onClick={() => onChange(o.by, dir)}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        title={dir === "asc" ? "Сортировка: по возрастанию (нажмите — по убыванию)" : "Сортировка: по убыванию (нажмите — по возрастанию)"}
        aria-label={dir === "asc" ? "Переключить на убывание" : "Переключить на возрастание"}
        onClick={() => onChange(by, dir === "asc" ? "desc" : "asc")}
        className={[
          "grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-brand-line bg-brand-card text-brand-muted transition-colors hover:bg-brand-surface hover:text-brand-ink",
          "dark:border-brand-panel-border dark:bg-brand-panel dark:hover:bg-brand-ink/60 dark:hover:text-brand-surface",
        ].join(" ")}
      >
        <SortDirChevron dir={dir} className="h-5 w-5 transition-transform duration-200 motion-reduce:transition-none" />
      </button>
    </div>
  );
}
