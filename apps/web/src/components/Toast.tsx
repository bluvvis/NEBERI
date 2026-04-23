import { useEffect } from "react";

type ToastTone = "success" | "error";

export function Toast({
  message,
  tone,
  onDismiss,
}: {
  message: string | null;
  tone: ToastTone;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(onDismiss, 4200);
    return () => window.clearTimeout(t);
  }, [message, onDismiss]);

  if (!message) return null;

  const isOk = tone === "success";

  return (
    <div
      role="status"
      className={`fixed bottom-6 left-1/2 z-[100] w-[min(92vw,26rem)] -translate-x-1/2 motion-reduce:animate-none animate-toast-in ${
        isOk
          ? "border border-brand-line/90 bg-brand-card/95 text-brand-ink shadow-[0_12px_40px_-8px_rgba(29,32,35,0.18),0_0_0_1px_rgba(255,0,50,0.12)] backdrop-blur-md dark:border-brand-panel-border dark:bg-brand-panel/95 dark:text-brand-surface dark:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,0,50,0.18)]"
          : "border border-brand-red/45 bg-brand-red/[0.12] text-brand-ink shadow-lg backdrop-blur-md dark:border-brand-red/50 dark:bg-brand-red/20 dark:text-brand-surface"
      } overflow-hidden rounded-2xl`}
    >
      <div
        className={`pointer-events-none absolute inset-y-0 left-0 w-1 ${isOk ? "bg-brand-red" : "bg-brand-red/80"}`}
        aria-hidden
      />
      <div className="relative flex items-start gap-3 px-4 py-3.5 pl-5">
        <p className="min-w-0 flex-1 text-[0.9375rem] leading-snug tracking-tight">{message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-brand-muted transition hover:bg-brand-surface/80 hover:text-brand-ink dark:text-brand-surface/65 dark:hover:bg-brand-ink/60 dark:hover:text-brand-surface"
          aria-label="Закрыть"
        >
          ×
        </button>
      </div>
    </div>
  );
}
