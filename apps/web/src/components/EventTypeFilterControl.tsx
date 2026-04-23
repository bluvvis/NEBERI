import { EVENT_TYPE_SHORT_LABEL, type EventTypeFilterValue } from "@/lib/eventTypeUi";

const OPTIONS: { id: EventTypeFilterValue; label: string }[] = [
  { id: "all", label: "Все типы" },
  { id: "sms", label: EVENT_TYPE_SHORT_LABEL.sms },
  { id: "voice_text", label: EVENT_TYPE_SHORT_LABEL.voice_text },
  { id: "call", label: EVENT_TYPE_SHORT_LABEL.call },
];

export function EventTypeFilterControl({
  value,
  onChange,
  className = "",
}: {
  value: EventTypeFilterValue;
  onChange: (v: EventTypeFilterValue) => void;
  className?: string;
}) {
  const current = OPTIONS.find((o) => o.id === value) ?? OPTIONS[0];

  return (
    <div
      className={["group/etype relative min-w-0 outline-none lg:min-w-[13.5rem] lg:max-w-[13.5rem] lg:flex-none", className].filter(Boolean).join(" ")}
      role="group"
      aria-label="Тип события"
    >
      <div
        className={[
          "box-border flex h-10 min-h-[2.75rem] w-full cursor-default select-none items-center rounded-xl border border-brand-line bg-brand-surface px-3 text-sm font-medium text-brand-ink transition-colors sm:min-h-0",
          "dark:border-brand-panel-border dark:bg-brand-ink/50 dark:text-brand-surface",
          "group-hover/etype:rounded-b-none group-hover/etype:border-b-transparent dark:group-hover/etype:border-b-transparent",
        ].join(" ")}
      >
        <span className="block min-w-0 truncate">Тип: {current.label}</span>
      </div>
      <ul
        className={[
          "absolute left-0 right-0 top-full z-50 -mt-px rounded-b-xl border border-t-0 border-brand-line bg-brand-card py-1 shadow-lg",
          "invisible opacity-0 transition-opacity duration-150",
          "group-hover/etype:visible group-hover/etype:opacity-100",
          "dark:border-brand-panel-border dark:bg-brand-panel dark:shadow-black/40",
        ].join(" ")}
      >
        {OPTIONS.map((o) => (
          <li key={o.id}>
            <button
              type="button"
              onClick={() => onChange(o.id)}
              className={[
                "flex w-full items-center px-3 py-2.5 text-left text-sm font-medium transition-colors",
                o.id === value
                  ? "bg-brand-red/10 font-semibold text-brand-red dark:bg-brand-red/15 dark:text-brand-surface"
                  : "text-brand-ink hover:bg-brand-surface dark:text-brand-surface dark:hover:bg-brand-ink/80",
              ].join(" ")}
            >
              {o.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
