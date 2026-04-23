const bar = "rounded-md bg-brand-line/90 skeleton-shimmer dark:bg-brand-panel-border";

export function EventDetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className={`mb-5 h-5 w-40 ${bar}`} />
      <div className="overflow-hidden rounded-2xl border border-brand-line bg-brand-card p-6 dark:border-brand-panel-border dark:bg-brand-panel">
        <div className="flex flex-wrap gap-6">
          <div className={`h-[3.75rem] w-[3.75rem] shrink-0 rounded-full ${bar}`} />
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className={`h-8 w-48 max-w-full rounded-lg ${bar}`} />
              <div className={`h-8 w-24 rounded-full ${bar}`} />
            </div>
            <div className={`h-5 w-full max-w-md rounded ${bar}`} />
            <div className={`h-5 w-2/3 max-w-sm rounded ${bar}`} />
            <div className={`mt-6 h-24 w-full rounded-xl ${bar}`} />
          </div>
        </div>
        <div className="mt-10 border-t border-brand-line pt-8 dark:border-brand-panel-border">
          <div className={`h-5 w-48 rounded ${bar}`} />
          <ul className="mt-4 space-y-3">
            {[0, 1, 2].map((i) => (
              <li
                key={i}
                style={{ animationDelay: `${i * 80}ms` }}
                className="rounded-xl border border-brand-line bg-brand-surface p-4 motion-reduce:animate-none animate-fade-up dark:border-brand-panel-border dark:bg-brand-ink/50"
              >
                <div className={`h-4 w-full max-w-xl rounded ${bar}`} />
                <div className={`mt-3 h-4 w-24 rounded ${bar}`} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
