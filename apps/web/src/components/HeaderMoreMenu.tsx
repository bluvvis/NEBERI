import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { UserAvatar } from "@/components/UserAvatar";
import { OpenApiDocsLink } from "@/components/OpenApiDocsLink";
import { resolveAuthAvatarUrl } from "@/lib/api";
import { headerMoreMenuIconClass, headerMoreMenuRowClass } from "@/lib/headerMoreMenuStyles";
import { useTheme } from "@/theme/ThemeProvider";

function IconDoc({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

function IconMoon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
    </svg>
  );
}

function IconSun({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" d="M12 3v2.25m6.364.886-1.591 1.591M21 12h-2.25m-.886 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
    </svg>
  );
}

/** Как у неактивных «Лента» / «Репутация»: серый текст, те же отступы на мобилке. */
const moreTriggerClass = [
  "flex cursor-default select-none items-center gap-1.5 rounded-xl border border-brand-line bg-brand-surface px-3 py-2 text-sm font-semibold outline-none transition-colors",
  "text-brand-muted hover:bg-brand-line/60 hover:text-brand-ink dark:border-brand-panel-border dark:bg-brand-ink/50 dark:text-brand-surface/70 dark:hover:bg-brand-ink dark:hover:text-brand-surface",
  "max-sm:px-2.5 max-sm:py-1.5",
  "focus-visible:ring-2 focus-visible:ring-brand-red/40 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-card dark:focus-visible:ring-offset-brand-ink",
].join(" ");

export function HeaderMoreMenu() {
  const { theme, toggleTheme } = useTheme();
  const { user, avatarCacheBust } = useAuth();
  const isDark = theme === "dark";

  return (
    <div className="group/more relative overflow-visible outline-none">
      <div className={moreTriggerClass}>
        <span>Ещё</span>
        <svg
          className="h-4 w-4 shrink-0 text-brand-muted transition-transform duration-200 group-hover/more:-rotate-180 motion-reduce:transition-none dark:text-brand-surface/60"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.94a.75.75 0 0 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" />
        </svg>
      </div>

      <div className="invisible absolute right-0 top-full z-[100] -mt-1 pt-2 opacity-0 transition-opacity duration-150 group-hover/more:visible group-hover/more:opacity-100">
        <div className="min-w-[min(100vw-1.5rem,18rem)] overflow-visible rounded-xl bg-brand-card px-1 pb-2 pt-1.5 shadow-xl dark:bg-brand-panel dark:shadow-black/45 sm:min-w-[14rem]">
          <Link to="/about" className={headerMoreMenuRowClass}>
            <IconDoc className={headerMoreMenuIconClass} />
            О продукте
          </Link>
          <OpenApiDocsLink variant="menuRow" />
          {user ? (
            <Link to="/profile" className={headerMoreMenuRowClass}>
              <UserAvatar src={resolveAuthAvatarUrl(user.avatar_url, avatarCacheBust)} alt="" size="xs" />
              <span className="min-w-0 truncate">{user.nickname}</span>
            </Link>
          ) : (
            <Link to="/login" className={headerMoreMenuRowClass}>
              <UserAvatar src={undefined} alt="" size="xs" />
              <span>Войти</span>
            </Link>
          )}
          <div className="mx-5 mt-1 h-px shrink-0 bg-brand-line/55 dark:bg-brand-surface/12" aria-hidden />
          <button
            type="button"
            onClick={() => toggleTheme()}
            className="flex min-h-[2.75rem] w-full items-center gap-3 rounded-lg px-3 pb-0.5 pt-2 text-left text-sm font-medium leading-snug text-brand-ink transition-colors hover:bg-brand-surface/90 dark:text-brand-surface dark:hover:bg-brand-ink/80"
          >
            {isDark ? <IconSun className={headerMoreMenuIconClass} /> : <IconMoon className={headerMoreMenuIconClass} />}
            {isDark ? "Светлая тема" : "Тёмная тема"}
          </button>
        </div>
      </div>
    </div>
  );
}
