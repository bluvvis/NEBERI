import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { UserAvatar } from "@/components/UserAvatar";
import { ShowPasswordToggle } from "@/components/ShowPasswordToggle";
import { resolveAuthAvatarUrl } from "@/lib/api";
import { nicknameValidationMessage, sanitizeNicknameInput } from "@/lib/authInputValidation";
import { clearNeberiSessionUiState } from "@/lib/sessionKeys";

const shell =
  "rounded-2xl border border-brand-line bg-brand-card shadow-panel-light dark:border-brand-panel-border dark:bg-brand-panel dark:shadow-panel";

const inputClass =
  "mt-1 w-full max-w-xs rounded-xl border border-brand-line bg-brand-surface px-3 py-2 text-sm text-brand-ink outline-none transition focus:border-brand-red/50 focus:ring-2 focus:ring-brand-red/25 dark:border-brand-panel-border dark:bg-brand-ink dark:text-brand-surface";

const SPECIALIST_RATING_VALUE = 72;

const AVATAR_MAX_BYTES = Math.floor(1.5 * 1024 * 1024);

const RATING_TOOLTIP =
  "40% — согласованность ваших отметок по репутации с решением более опытного коллеги при аудите; 30% — точность на выборке разборов; 20% — стабильность решений за 90 дней; 10% — обоснованные жалобы на ошибки (чем меньше, тем лучше). Чем выше рейтинг, тем больший вес получают ваши репорты при расчёте риска и в очереди разборов.";

export default function ProfilePage() {
  const location = useLocation();
  const { user, avatarCacheBust, bootstrapping, logout, deleteAccount, patchNickname, uploadAvatar, removeAvatar } =
    useAuth();
  const hasIngestKey = Boolean(
    import.meta.env.VITE_INGEST_API_KEY != null && String(import.meta.env.VITE_INGEST_API_KEY).trim() !== "",
  );
  const [clearArmed, setClearArmed] = useState(false);
  const [toast, setToast] = useState<{ text: string; tone: "ok" | "err" } | null>(null);
  const [nickDraft, setNickDraft] = useState("");
  const [nickSaving, setNickSaving] = useState(false);
  const [nickErr, setNickErr] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeletePwd, setShowDeletePwd] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const avatarSrc = resolveAuthAvatarUrl(user?.avatar_url ?? null, avatarCacheBust);
  const nickClientErr = nicknameValidationMessage(nickDraft);

  useEffect(() => {
    if (user) setNickDraft(user.nickname);
  }, [user?.id, user?.nickname]);

  const onClearSessionClick = () => {
    if (!clearArmed) {
      setClearArmed(true);
      return;
    }
    clearNeberiSessionUiState();
    setClearArmed(false);
    setToast({ text: "Локальные данные ленты сброшены в этом окне браузера.", tone: "ok" });
    window.setTimeout(() => setToast(null), 3500);
  };

  const onPickAvatar = () => fileRef.current?.click();

  const onAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !user) return;
    if (f.size > AVATAR_MAX_BYTES) {
      setToast({
        text: "Файл больше 1,5 МБ. Сожмите изображение или выберите другое (PNG или JPEG).",
        tone: "err",
      });
      window.setTimeout(() => setToast(null), 5000);
      return;
    }
    setAvatarBusy(true);
    setToast(null);
    try {
      await uploadAvatar(f);
      setToast({ text: "Фото профиля обновлено.", tone: "ok" });
      window.setTimeout(() => setToast(null), 3500);
    } catch (err) {
      setToast({ text: err instanceof Error ? err.message : "Не удалось загрузить фото", tone: "err" });
      window.setTimeout(() => setToast(null), 5000);
    } finally {
      setAvatarBusy(false);
    }
  };

  const onRemoveAvatar = async () => {
    if (!user?.avatar_url) return;
    setAvatarBusy(true);
    setToast(null);
    try {
      await removeAvatar();
      setToast({ text: "Фото удалено.", tone: "ok" });
      window.setTimeout(() => setToast(null), 3500);
    } catch (err) {
      setToast({ text: err instanceof Error ? err.message : "Не удалось удалить фото", tone: "err" });
      window.setTimeout(() => setToast(null), 5000);
    } finally {
      setAvatarBusy(false);
    }
  };

  const onSaveNickname = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const v = nickDraft.trim();
    const client = nicknameValidationMessage(v);
    if (client) {
      setNickErr(client);
      return;
    }
    setNickErr(null);
    setNickSaving(true);
    try {
      await patchNickname(v);
      setToast({ text: "Никнейм сохранён.", tone: "ok" });
      window.setTimeout(() => setToast(null), 3500);
    } catch (err) {
      setNickErr(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setNickSaving(false);
    }
  };

  const onDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteErr(null);
    setDeleteBusy(true);
    try {
      await deleteAccount(deletePassword);
      setDeleteArmed(false);
      setDeletePassword("");
      setToast({ text: "Аккаунт удалён.", tone: "ok" });
      window.setTimeout(() => setToast(null), 4000);
    } catch (err) {
      setDeleteErr(err instanceof Error ? err.message : "Не удалось удалить");
    } finally {
      setDeleteBusy(false);
    }
  };

  if (bootstrapping) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-brand-muted dark:text-brand-surface/60">
        Загрузка профиля…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {toast ? (
        <div
          role="status"
          className={[
            "mb-4 rounded-xl border px-4 py-3 text-sm font-medium",
            toast.tone === "ok"
              ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100"
              : "border-brand-red/40 bg-brand-red/10 text-brand-red dark:text-brand-surface",
          ].join(" ")}
        >
          {toast.text}
        </div>
      ) : null}

      <section className={shell}>
        <div className="border-b border-brand-line bg-gradient-to-br from-brand-surface/80 to-transparent px-6 py-8 dark:border-brand-panel-border dark:from-brand-ink/40">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <UserAvatar src={avatarSrc} alt={user.nickname} size="lg" />
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold tracking-tight text-brand-ink dark:text-brand-surface">{user.nickname}</h1>
              <p className="mt-1 text-sm text-brand-muted dark:text-brand-surface/75">{user.phone_masked}</p>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={onAvatarFile} />
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <button
                  type="button"
                  onClick={onPickAvatar}
                  disabled={avatarBusy}
                  className="rounded-xl border border-brand-line bg-brand-surface px-4 py-2 text-sm font-semibold text-brand-ink transition hover:border-brand-muted disabled:opacity-60 dark:border-brand-panel-border dark:bg-brand-ink dark:text-brand-surface"
                >
                  {avatarBusy ? "Подождите…" : "Обновить фото"}
                </button>
                {user.avatar_url ? (
                  <button
                    type="button"
                    onClick={onRemoveAvatar}
                    disabled={avatarBusy}
                    className="rounded-xl px-4 py-2 text-sm font-medium text-brand-muted underline-offset-2 hover:text-brand-ink hover:underline dark:hover:text-brand-surface"
                  >
                    Убрать фото
                  </button>
                ) : null}
              </div>
              <p className="mt-2 text-xs text-brand-muted dark:text-brand-surface/55">PNG или JPEG, до 1,5 МБ.</p>
            </div>
          </div>
        </div>

        <ul className="divide-y divide-brand-line dark:divide-brand-panel-border">
          <li className="px-6 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-brand-ink dark:text-brand-surface">Рейтинг специалиста</p>
                <p className="mt-1 text-xs text-brand-muted dark:text-brand-surface/60">
                  Наведите курсор на значение — как считается рейтинг и как он влияет на вес ваших репортов.
                </p>
                <div className="group relative mt-3 max-w-full">
                  <p id="profile-rating-expl" className="sr-only">
                    {RATING_TOOLTIP}
                  </p>
                  <button
                    type="button"
                    title="Согласованность с ревью, точность аудита, стабильность решений, жалобы на ошибки."
                    className="inline-flex w-full max-w-md items-baseline gap-1.5 rounded-xl border border-brand-line bg-brand-surface px-4 py-2.5 text-left transition hover:border-brand-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/35 dark:border-brand-panel-border dark:bg-brand-ink sm:inline-flex sm:w-auto sm:max-w-none"
                    aria-describedby="profile-rating-expl"
                  >
                    <span className="text-2xl font-bold tabular-nums text-brand-ink dark:text-brand-surface sm:text-3xl">{SPECIALIST_RATING_VALUE}</span>
                    <span className="text-sm font-medium text-brand-muted dark:text-brand-surface/65">/ 100</span>
                  </button>
                  <p className="mt-2 text-xs leading-relaxed text-brand-ink dark:text-brand-surface sm:hidden" aria-hidden="true">
                    {RATING_TOOLTIP}
                  </p>
                  <div
                    role="tooltip"
                    aria-hidden="true"
                    className="pointer-events-none invisible absolute left-0 top-full z-30 mt-2 hidden w-[min(100vw-2.5rem,24rem)] rounded-xl border border-brand-line bg-brand-card p-3 text-left text-xs leading-relaxed text-brand-ink opacity-0 shadow-xl transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 dark:border-brand-panel-border dark:bg-brand-panel dark:text-brand-surface sm:block"
                  >
                    {RATING_TOOLTIP}
                  </div>
                </div>
              </div>
              <div className="shrink-0 lg:pl-4">
                <p className="text-sm font-semibold text-brand-ink dark:text-brand-surface">Проверка моих решений</p>
                <p className="mt-1 max-w-sm text-xs text-brand-muted dark:text-brand-surface/60">
                  Очередь ревью от старших специалистов по вашим оценкам пользователей.
                </p>
                <Link
                  to="/profile/reviews"
                  className="mt-3 inline-flex w-full max-w-md justify-center rounded-xl border border-brand-line bg-brand-surface px-4 py-2.5 text-sm font-semibold text-brand-ink transition hover:border-brand-muted dark:border-brand-panel-border dark:bg-brand-ink dark:text-brand-surface sm:inline-flex sm:w-auto sm:max-w-none"
                >
                  Перейти к оценке моих решений
                </Link>
              </div>
            </div>
          </li>

          <li className="px-6 py-5">
            <p className="text-sm font-semibold text-brand-ink dark:text-brand-surface">Никнейм</p>
            <p className="mt-1 text-xs text-brand-muted dark:text-brand-surface/60">Латиница, цифры и подчёркивание, 3–32 символа.</p>
            <form className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={onSaveNickname}>
              <div className="flex-1">
                <label className="sr-only" htmlFor="profile-nick">
                  Новый никнейм
                </label>
                <input
                  id="profile-nick"
                  className={[inputClass, nickClientErr ? "border-brand-red/50" : ""].join(" ")}
                  value={nickDraft}
                  onChange={(e) => {
                    setNickDraft(sanitizeNicknameInput(e.target.value));
                    setNickErr(null);
                  }}
                  spellCheck={false}
                />
              </div>
              <button
                type="submit"
                disabled={
                  nickSaving ||
                  nickDraft.trim() === user.nickname ||
                  Boolean(nickClientErr) ||
                  nickDraft.trim().length < 3
                }
                className="shrink-0 rounded-xl bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {nickSaving ? "Сохранение…" : "Сохранить"}
              </button>
            </form>
            {nickClientErr ? <p className="mt-2 text-xs text-brand-red dark:text-brand-surface/90">{nickClientErr}</p> : null}
            {nickErr ? <p className="mt-2 text-sm text-brand-red dark:text-brand-surface">{nickErr}</p> : null}
          </li>

          <li className="px-6 py-5">
            <p className="text-sm font-semibold text-brand-ink dark:text-brand-surface">Действия в API (лента, репутация)</p>
            <p className="mt-1 text-xs text-brand-muted dark:text-brand-surface/60">
              Запись и симуляции — только с ключом <span className="font-mono text-[0.65rem]">X-API-Key</span> в сборке фронта.
            </p>
            <p
              className={`mt-3 inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${
                hasIngestKey
                  ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                  : "bg-brand-red/10 text-brand-red dark:text-brand-surface"
              }`}
            >
              {hasIngestKey ? "Ключ в сборке — запись разрешена" : "Без ключа — только просмотр"}
            </p>
          </li>

          <li className="px-6 py-5">
            <p className="text-sm font-semibold text-brand-ink dark:text-brand-surface">Локальные данные ленты</p>
            <p className="mt-1 text-xs text-brand-muted dark:text-brand-surface/60">
              Подсветка карточек и сортировка — в sessionStorage этой вкладки (не связано с аккаунтом).
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onClearSessionClick}
                className={[
                  "rounded-xl px-4 py-2 text-sm font-semibold transition",
                  clearArmed
                    ? "border-2 border-brand-red bg-brand-red/10 text-brand-red dark:text-brand-surface"
                    : "border border-brand-line bg-brand-surface text-brand-ink dark:border-brand-panel-border dark:bg-brand-ink dark:text-brand-surface",
                ].join(" ")}
              >
                {clearArmed ? "Подтвердить сброс" : "Сбросить локальные данные"}
              </button>
              {clearArmed ? (
                <button
                  type="button"
                  onClick={() => setClearArmed(false)}
                  className="rounded-xl border border-brand-line px-3 py-2 text-sm font-medium text-brand-muted dark:border-brand-panel-border"
                >
                  Отмена
                </button>
              ) : null}
            </div>
          </li>

          <li className="px-6 py-5">
            <p className="text-sm font-semibold text-brand-ink dark:text-brand-surface">Сессия</p>
            <button
              type="button"
              onClick={() => logout()}
              className="mt-3 rounded-xl border border-brand-line bg-brand-surface px-4 py-2 text-sm font-semibold text-brand-ink transition hover:border-brand-muted dark:border-brand-panel-border dark:bg-brand-ink dark:text-brand-surface"
            >
              Выйти из аккаунта
            </button>
          </li>

          <li className="px-6 py-5">
            <p className="text-sm font-semibold text-brand-ink dark:text-brand-surface">Удаление аккаунта</p>
            <p className="mt-1 text-xs text-brand-muted dark:text-brand-surface/60">
              Безвозвратно: профиль, фото и настройки на сервере. Потребуется пароль.
            </p>
            {!deleteArmed ? (
              <button
                type="button"
                onClick={() => {
                  setDeleteArmed(true);
                  setDeleteErr(null);
                  setDeletePassword("");
                  setShowDeletePwd(false);
                }}
                className="mt-3 rounded-xl border-2 border-brand-red/40 bg-brand-red/5 px-4 py-2 text-sm font-semibold text-brand-red dark:text-brand-surface"
              >
                Удалить аккаунт…
              </button>
            ) : (
              <form className="mt-4 max-w-md space-y-3" onSubmit={onDeleteAccount}>
                <div>
                  <label className="text-sm font-medium text-brand-ink dark:text-brand-surface" htmlFor="del-pw">
                    Пароль для подтверждения
                  </label>
                  <input
                    id="del-pw"
                    type={showDeletePwd ? "text" : "password"}
                    autoComplete="current-password"
                    className={inputClass}
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    required
                  />
                  <ShowPasswordToggle id="profile-del-show-pwd" checked={showDeletePwd} onChange={setShowDeletePwd} />
                </div>
                {deleteErr ? <p className="text-sm text-brand-red dark:text-brand-surface">{deleteErr}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={deleteBusy}
                    className="rounded-xl bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {deleteBusy ? "Удаляем…" : "Удалить навсегда"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteArmed(false);
                      setDeletePassword("");
                      setDeleteErr(null);
                      setShowDeletePwd(false);
                    }}
                    className="rounded-xl border border-brand-line px-4 py-2 text-sm font-medium dark:border-brand-panel-border"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            )}
          </li>
        </ul>
      </section>

      <p className="mt-6 text-center text-xs text-brand-muted dark:text-brand-surface/45">
        Лента и репутация — в шапке; меню «Ещё» — тема и документация.
      </p>
    </div>
  );
}
