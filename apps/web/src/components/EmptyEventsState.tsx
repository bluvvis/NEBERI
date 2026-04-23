type Props = {
  scenarioPoolMax: number;
};

export function EmptyEventsState({ scenarioPoolMax }: Props) {
  return (
    <div className="border-t border-brand-line bg-brand-surface px-4 py-10 dark:border-brand-panel-border dark:bg-brand-panel/50 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-4 text-left">
        <div className="flex gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-brand-line bg-brand-card text-brand-muted shadow-sm dark:border-brand-panel-border dark:bg-brand-panel dark:text-brand-surface/50"
            aria-hidden
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.792m-18.18 0v1.5c0 .414.336.75.75.75h16.5a.75.75 0 00.75-.75v-1.5m-19.5 0A2.25 2.25 0 005.25 9h13.5a2.25 2.25 0 012.25 2.25v.75m-19.5 0V18A2.25 2.25 0 005.25 20.25h13.5A2.25 2.25 0 0021 18v-4.5m-19.5 0h19.5"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-brand-ink dark:text-brand-surface">Лента пуста</h3>
            <p className="mt-1 text-base leading-relaxed text-brand-muted dark:text-brand-surface/70">
              Нажмите <span className="font-semibold text-brand-ink dark:text-brand-surface">«Симуляция»</span> в шапке
              — в пуле до{" "}
              <span className="font-mono text-brand-ink dark:text-brand-surface">{scenarioPoolMax}</span> сценариев;
              каждый запуск отправляет случайное число событий в случайном порядке.
            </p>
          </div>
        </div>
        <p className="border-l-[3px] border-brand-red py-0.5 pl-4 text-sm text-brand-muted dark:text-brand-surface/60">
          Если только подняли Docker или очистили базу — это нормально.
        </p>
      </div>
    </div>
  );
}
