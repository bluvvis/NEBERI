type Variant = "menuRow" | "pagePill";

const base =
  "group/doc inline-flex items-center gap-2.5 rounded-xl border font-semibold transition outline-none focus-visible:ring-2 focus-visible:ring-brand-red/40 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-card dark:focus-visible:ring-offset-brand-panel";

const variants: Record<Variant, string> = {
  menuRow:
    "w-full border-brand-line/80 bg-gradient-to-r from-brand-red/[0.07] via-brand-card to-brand-card px-3 py-2.5 text-sm text-brand-ink hover:border-brand-red/35 hover:from-brand-red/10 dark:border-brand-panel-border dark:from-brand-red/15 dark:via-brand-panel dark:to-brand-panel dark:text-brand-surface dark:hover:border-brand-red/40",
  pagePill:
    "w-full justify-center border-brand-red/25 bg-gradient-to-br from-brand-red/[0.08] to-brand-card px-4 py-3 text-base text-brand-ink shadow-sm hover:border-brand-red/40 hover:shadow-md sm:w-auto sm:justify-start sm:px-5 dark:from-brand-red/12 dark:to-brand-panel dark:text-brand-surface dark:hover:border-brand-red/45",
};

function IconBook({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
      />
    </svg>
  );
}

function IconArrowOut({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5M7.5 16.5 21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  );
}

export function OpenApiDocsLink({ variant }: { variant: Variant }) {
  return (
    <a
      href="/docs"
      target="_blank"
      rel="noopener noreferrer"
      className={`${base} ${variants[variant]}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-red/10 text-brand-red dark:bg-brand-red/20 dark:text-brand-surface">
        <IconBook className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1 text-left leading-snug">
        <span className="block">Документация API</span>
        <span className="mt-0.5 block text-xs font-medium normal-case text-brand-muted group-hover/doc:text-brand-ink/80 dark:text-brand-surface/55 dark:group-hover/doc:text-brand-surface/75">
          Swagger UI · открывается в новой вкладке
        </span>
      </span>
      <IconArrowOut className="h-4 w-4 shrink-0 text-brand-muted opacity-80 transition group-hover/doc:translate-x-0.5 group-hover/doc:-translate-y-0.5 group-hover/doc:text-brand-red dark:text-brand-surface/50 dark:group-hover/doc:text-brand-surface" />
    </a>
  );
}
