import { Link, NavLink, Outlet } from "react-router-dom";
import { HeaderMoreMenu } from "@/components/HeaderMoreMenu";

const navClass = ({ isActive }: { isActive: boolean }) =>
  [
    "relative rounded-lg px-3 py-2 text-base font-medium outline-none transition-all duration-300 ease-out",
    "focus-visible:ring-2 focus-visible:ring-brand-red/40 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-card dark:focus-visible:ring-offset-brand-ink",
    "hover:scale-[1.03] active:scale-[0.98] motion-reduce:transition-colors motion-reduce:hover:scale-100 motion-reduce:active:scale-100",
    isActive
      ? "bg-brand-red/10 text-brand-red ring-1 ring-brand-red/35 shadow-sm dark:bg-brand-red/15 dark:text-brand-surface dark:ring-brand-red/40"
      : "text-brand-muted hover:bg-brand-line/60 hover:text-brand-ink dark:text-brand-surface/70 dark:hover:bg-brand-panel-border dark:hover:text-brand-surface",
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
        <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5">
          <Link
            to="/"
            className="group/brand flex min-w-0 items-center gap-3 rounded-xl p-1 -m-1 outline-none transition-transform duration-300 ease-out hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-brand-red/40 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-surface motion-reduce:transition-colors motion-reduce:hover:scale-100 dark:focus-visible:ring-offset-brand-ink"
          >
            <div
              className="flex h-10 w-[2.75rem] shrink-0 items-center justify-center overflow-hidden transition-[transform,opacity] duration-300 ease-out group-hover/brand:opacity-95"
              aria-hidden
            >
              <img
                src="/mts_logo.png"
                alt=""
                className="h-8 w-auto max-h-8 object-contain object-center"
                width={44}
                height={32}
                decoding="async"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-medium text-brand-muted dark:text-brand-surface/70">
                Сигналы о мошенничестве
              </p>
            </div>
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <nav className="flex flex-wrap items-center gap-1 sm:gap-2" aria-label="Основная навигация">
              <NavLink to="/" end className={navClass}>
                Лента
              </NavLink>
              <NavLink to="/reputation" className={navClass}>
                Репутация
              </NavLink>
              <HeaderMoreMenu />
            </nav>
          </div>
        </div>
      </header>

      <main className="relative flex-1">
        <div className="min-h-[min(100vh,56rem)] motion-reduce:opacity-100">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-brand-line bg-brand-card py-4 text-center text-sm text-brand-muted transition-colors dark:border-brand-panel-border dark:bg-brand-panel dark:text-brand-surface/60">
        Учебный модуль · SPA · компонентная архитектура
      </footer>
    </div>
  );
}
