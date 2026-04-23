import { Link, NavLink, Outlet } from "react-router-dom";
import { HeaderMoreMenu } from "@/components/HeaderMoreMenu";

const navClass = ({ isActive }: { isActive: boolean }) =>
  [
    "relative shrink-0 rounded-lg border px-3 py-2 text-base font-medium outline-none transition-all duration-300 ease-out",
    "focus-visible:ring-2 focus-visible:ring-brand-red/40 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-card dark:focus-visible:ring-offset-brand-ink",
    "hover:scale-[1.03] active:scale-[0.98] motion-reduce:transition-colors motion-reduce:hover:scale-100 motion-reduce:active:scale-100",
    isActive
      ? "border-brand-red/40 bg-brand-red/10 text-brand-red shadow-sm ring-1 ring-brand-red/35 dark:border-brand-red/45 dark:bg-brand-red/15 dark:text-brand-surface dark:ring-brand-red/40"
      : "border-brand-line/90 text-brand-muted hover:border-brand-muted hover:bg-brand-line/60 hover:text-brand-ink dark:border-brand-panel-border dark:text-brand-surface/70 dark:hover:border-brand-muted dark:hover:bg-brand-ink/80 dark:hover:text-brand-surface",
  ].join(" ");

export function AppShell() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="mesh-blob absolute -left-[20%] top-[8%] h-[32rem] w-[32rem] rounded-full bg-brand-red/[0.055] blur-3xl motion-reduce:animate-none dark:bg-brand-red/[0.07] [animation-duration:24s]" />
        <div
          className="mesh-blob absolute -right-[18%] top-[45%] h-[26rem] w-[38rem] rounded-full bg-brand-muted/[0.09] blur-3xl motion-reduce:animate-none dark:bg-brand-muted/[0.12] [animation-duration:19s]"
          style={{ animationDelay: "-11s" }}
        />
        <div
          className="mesh-blob absolute -left-[8%] bottom-[-5%] h-[24rem] w-[28rem] rounded-full bg-brand-red/[0.045] blur-3xl motion-reduce:animate-none dark:bg-brand-red/[0.06] [animation-duration:21s]"
          style={{ animationDelay: "-5s" }}
        />
        <div
          className="mesh-blob absolute right-[-12%] bottom-[12%] h-[20rem] w-[22rem] rounded-full bg-brand-muted/[0.07] blur-3xl motion-reduce:animate-none dark:bg-brand-muted/10 [animation-duration:28s]"
          style={{ animationDelay: "-17s" }}
        />
      </div>

      <header className="sticky top-0 z-40 border-b border-brand-line bg-brand-card/90 shadow-sm backdrop-blur-xl transition-[background-color,box-shadow] duration-500 dark:border-brand-panel-border dark:bg-brand-panel/95 dark:shadow-black/25">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-red/45 to-transparent motion-reduce:animate-none motion-reduce:opacity-70 animate-shell-header-line dark:via-brand-red/35" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-3.5">
          <Link
            to="/"
            className="group/brand flex min-w-0 items-center gap-2.5 rounded-xl p-1 -m-1 outline-none transition-transform duration-300 ease-out hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-brand-red/40 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-surface motion-reduce:transition-colors motion-reduce:hover:scale-100 sm:gap-3 dark:focus-visible:ring-offset-brand-ink"
          >
            <div
              className="flex h-9 w-10 shrink-0 items-center justify-center overflow-hidden transition-[transform,opacity] duration-300 ease-out group-hover/brand:opacity-95 sm:h-10 sm:w-[2.75rem]"
              aria-hidden
            >
              <img
                src="/mts_logo.png"
                alt=""
                className="h-7 w-auto max-h-7 object-contain object-center sm:h-8 sm:max-h-8"
                width={44}
                height={32}
                decoding="async"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-brand-muted sm:text-base dark:text-brand-surface/70">
                <span className="max-sm:hidden">Сигналы о мошенничестве</span>
                <span className="sm:hidden">NeBeri</span>
              </p>
            </div>
          </Link>
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-initial sm:justify-end">
            <nav
              className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-none sm:gap-2 [&::-webkit-scrollbar]:hidden"
              aria-label="Основная навигация"
            >
              <NavLink to="/" end className={navClass}>
                Лента
              </NavLink>
              <NavLink to="/reputation" className={navClass}>
                Репутация
              </NavLink>
            </nav>
            <div className="relative z-50 shrink-0">
              <HeaderMoreMenu />
            </div>
          </div>
        </div>
      </header>

      <main className="relative flex-1">
        <div className="min-h-[min(100vh,56rem)] motion-reduce:opacity-100">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-brand-line bg-brand-card px-2 py-3 text-center text-xs text-brand-muted transition-colors dark:border-brand-panel-border dark:bg-brand-panel dark:text-brand-surface/60 sm:py-4 sm:text-sm">
        Учебный модуль · SPA · компонентная архитектура
      </footer>
    </div>
  );
}
