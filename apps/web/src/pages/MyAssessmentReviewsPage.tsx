import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";

const shell =
  "rounded-2xl border border-brand-line bg-brand-card shadow-panel-light dark:border-brand-panel-border dark:bg-brand-panel dark:shadow-panel";

export default function MyAssessmentReviewsPage() {
  const { user, bootstrapping } = useAuth();
  const location = useLocation();

  if (bootstrapping) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-brand-muted dark:text-brand-surface/60">
        Загрузка…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Link
          to="/profile"
          className="text-sm font-medium text-brand-red underline-offset-2 hover:underline dark:text-brand-surface"
        >
          ← Назад в профиль
        </Link>
      </div>

      <section className={`${shell} px-6 py-8`}>
        <h1 className="text-xl font-bold text-brand-ink dark:text-brand-surface">Оценка моих решений</h1>
        <p className="mt-3 text-sm leading-relaxed text-brand-muted dark:text-brand-surface/70">
          Здесь появится очередь разборов: более опытные специалисты смогут проверять ваши отметки по репутации и жалобам
          пользователей — в том числе ложные блокировки и пропуски. Сейчас раздел на заглушке: данные не собираются,
          уведомлений нет.
        </p>
        <ul className="mt-5 list-inside list-disc space-y-2 text-sm text-brand-muted dark:text-brand-surface/65">
          <li>Статус очереди: не подключено (MVP).</li>
          <li>История проверок: пусто.</li>
          <li>Обратная связь от ревьюера: скоро.</li>
        </ul>
        <p className="mt-6 rounded-xl border border-dashed border-brand-line bg-brand-surface/50 px-4 py-3 text-xs text-brand-muted dark:border-brand-panel-border dark:bg-brand-ink/40 dark:text-brand-surface/55">
          Когда модуль заработает, ссылки на спорные кейсы откроются из этой страницы; рейтинг специалиста в профиле
          начнёт учитывать согласованность с решениями ревьюеров.
        </p>
      </section>
    </div>
  );
}
