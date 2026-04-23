import { headerMoreMenuIconClass, headerMoreMenuRowClass } from "@/lib/headerMoreMenuStyles";

type Variant = "menuRow" | "pagePill";

const pagePill =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand-red/25 bg-gradient-to-br from-brand-red/[0.08] to-brand-card px-4 py-3 text-base font-semibold text-brand-ink shadow-sm transition outline-none hover:border-brand-red/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand-red/40 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-card sm:w-auto sm:justify-start sm:px-5 dark:from-brand-red/12 dark:to-brand-panel dark:text-brand-surface dark:hover:border-brand-red/45 dark:focus-visible:ring-offset-brand-panel";

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

function IconCode({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22 12l-4.75 5.25m-10.5 0L2 12l4.75-5.25" />
    </svg>
  );
}

export function OpenApiDocsLink({ variant }: { variant: Variant }) {
  if (variant === "menuRow") {
    return (
      <a href="/docs" target="_blank" rel="noopener noreferrer" className={headerMoreMenuRowClass}>
        <IconCode className={headerMoreMenuIconClass} />
        OpenAPI
      </a>
    );
  }

  return (
    <a
      href="/docs"
      target="_blank"
      rel="noopener noreferrer"
      className={`${pagePill} dark:text-brand-surface`}
    >
      <IconBook className="h-5 w-5 shrink-0 text-brand-red dark:text-brand-surface" />
      <span className="min-w-0 flex-1 text-left">Документация API</span>
      <IconArrowOut className="h-4 w-4 shrink-0 text-brand-muted opacity-80 dark:text-brand-surface/50" />
    </a>
  );
}
