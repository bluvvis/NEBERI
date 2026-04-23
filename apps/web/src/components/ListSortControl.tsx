import type { SortBy, SortDir } from "@/lib/eventSort";

const OPTIONS: { by: SortBy; label: string }[] = [
  { by: "added", label: "По дате добавления" },
  { by: "score", label: "По скору" },
  { by: "visited", label: "По дате посещения" },
];

/** Heroicons 24/outline: BarsArrowUpIcon — от меньшего к большему. */
function SortAscIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12"
      />
    </svg>
  );
}

/** Heroicons 24/outline: BarsArrowDownIcon — от большего к меньшему. */
function SortDescIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0-3.75-3.75M17.25 21 21 17.25"
      />
    </svg>
  );
}

export function ListSortControl({
  by,
  dir,
  onChange,
}: {
  by: SortBy;
  dir: SortDir;
  onChange: (by: SortBy, dir: SortDir) => void;
}) {
  const current = OPTIONS.find((o) => o.by === by) ?? OPTIONS[0];

  return (
    <div className="flex flex-wrap items-stretch gap-2" role="group" aria-label="Сортировка списка">
      <div className="group/sort relative w-full min-w-0 max-w-[min(100%,20rem)] sm:min-w-[13.5rem]">
        <div
          className={[
            "flex min-h-[2.75rem] cursor-default select-none items-center rounded-xl border border-brand-line bg-brand-surface px-3 py-2 text-sm font-medium text-brand-ink transition-colors sm:h-10 sm:min-h-0 sm:py-0",
            "dark:border-brand-panel-border dark:bg-brand-ink/50 dark:text-brand-surface",
            "group-hover/sort:rounded-b-none group-hover/sort:border-b-transparent dark:group-hover/sort:border-b-transparent",
          ].join(" ")}
        >
          <span className="block truncate">{current.label}</span>
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

      <div
        className="flex h-11 w-full shrink-0 overflow-hidden rounded-xl border border-brand-line bg-brand-card sm:h-10 sm:w-auto dark:border-brand-panel-border dark:bg-brand-panel"
        role="group"
        aria-label="Направление сортировки"
      >
        <button
          type="button"
          title="От меньшего к большему"
          aria-pressed={dir === "asc"}
          onClick={() => onChange(by, "asc")}
          className={[
            "grid min-h-[2.75rem] flex-1 place-items-center transition-colors sm:h-10 sm:min-h-0 sm:w-10 sm:flex-none",
            dir === "asc"
              ? "bg-brand-red/12 text-brand-red dark:bg-brand-red/20 dark:text-brand-surface"
              : "text-brand-muted hover:bg-brand-surface hover:text-brand-ink dark:hover:bg-brand-ink/60 dark:hover:text-brand-surface",
          ].join(" ")}
        >
          <SortAscIcon className="h-5 w-5" />
        </button>
        <span className="w-px shrink-0 self-stretch bg-brand-line dark:bg-brand-panel-border" aria-hidden />
        <button
          type="button"
          title="От большего к меньшему"
          aria-pressed={dir === "desc"}
          onClick={() => onChange(by, "desc")}
          className={[
            "grid min-h-[2.75rem] flex-1 place-items-center transition-colors sm:h-10 sm:min-h-0 sm:w-10 sm:flex-none",
            dir === "desc"
              ? "bg-brand-red/12 text-brand-red dark:bg-brand-red/20 dark:text-brand-surface"
              : "text-brand-muted hover:bg-brand-surface hover:text-brand-ink dark:hover:bg-brand-ink/60 dark:hover:text-brand-surface",
          ].join(" ")}
        >
          <SortDescIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
