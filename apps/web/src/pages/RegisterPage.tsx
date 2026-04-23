import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { ShowPasswordToggle } from "@/components/ShowPasswordToggle";
import {
  formatRuTailGrouped,
  nicknameValidationMessage,
  registerPhoneToE164,
  registerPhoneValidationMessage,
  sanitizeNicknameInput,
} from "@/lib/authInputValidation";

const shell =
  "rounded-2xl border border-brand-line bg-brand-card shadow-panel-light dark:border-brand-panel-border dark:bg-brand-panel dark:shadow-panel";

const inputClass =
  "mt-1 w-full rounded-xl border border-brand-line bg-brand-surface px-3 py-2.5 text-sm text-brand-ink outline-none transition placeholder:text-brand-muted/70 focus:border-brand-red/50 focus:ring-2 focus:ring-brand-red/25 dark:border-brand-panel-border dark:bg-brand-ink dark:text-brand-surface dark:placeholder:text-brand-surface/45";

const labelClass = "block text-sm font-medium text-brand-ink dark:text-brand-surface";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/profile";

  const [nickname, setNickname] = useState("");
  const [phoneTail, setPhoneTail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nickErr = useMemo(() => nicknameValidationMessage(nickname), [nickname]);
  const phoneErr = useMemo(() => registerPhoneValidationMessage(phoneTail), [phoneTail]);

  const formOk =
    !nickErr &&
    !phoneErr &&
    password.length >= 8 &&
    password === password2;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (nickErr || phoneErr) {
      setError(nickErr || phoneErr || "Проверьте поля формы.");
      return;
    }
    if (password !== password2) {
      setError("Пароли не совпадают");
      return;
    }
    if (password.length < 8) {
      setError("Пароль не короче 8 символов");
      return;
    }
    setSubmitting(true);
    try {
      const phoneE164 = registerPhoneToE164(phoneTail);
      await register(nickname, phoneE164, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось зарегистрироваться");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className={`${shell} px-6 py-8`}>
        <h1 className="text-xl font-bold tracking-tight text-brand-ink dark:text-brand-surface">Регистрация</h1>
        <p className="mt-2 text-sm text-brand-muted dark:text-brand-surface/65">
          Никнейм — только латиница, цифры и «_», 3–32 символа. Телефон — российский мобильный: ровно 10 цифр после +7
          (первая из десяти — 9).
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className={labelClass} htmlFor="reg-nick">
              Никнейм
            </label>
            <input
              id="reg-nick"
              name="nickname"
              autoComplete="username"
              className={[
                inputClass,
                nickErr ? "border-brand-red/50 dark:border-brand-red/40" : "",
              ].join(" ")}
              value={nickname}
              onChange={(e) => setNickname(sanitizeNicknameInput(e.target.value))}
              placeholder="operator_1"
              required
              minLength={3}
              maxLength={32}
              spellCheck={false}
            />
            {nickErr ? <p className="mt-1 text-xs text-brand-red dark:text-brand-surface/90">{nickErr}</p> : null}
          </div>
          <div>
            <label className={labelClass} htmlFor="reg-phone-tail">
              Телефон (РФ)
            </label>
            <div className="mt-1 flex max-w-full items-stretch gap-0 overflow-hidden rounded-xl border border-brand-line bg-brand-surface focus-within:border-brand-red/50 focus-within:ring-2 focus-within:ring-brand-red/25 dark:border-brand-panel-border dark:bg-brand-ink">
              <span className="flex shrink-0 items-center border-r border-brand-line px-3 text-sm font-semibold text-brand-muted dark:border-brand-panel-border dark:text-brand-surface/70">
                +7
              </span>
              <input
                id="reg-phone-tail"
                name="phone"
                type="text"
                inputMode="numeric"
                autoComplete="tel-national"
                className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-sm text-brand-ink outline-none dark:text-brand-surface"
                value={formatRuTailGrouped(phoneTail)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setPhoneTail(raw);
                }}
                placeholder="900 123 45 67"
                aria-label="10 цифр мобильного номера после +7"
              />
            </div>
            <p className="mt-1 text-xs text-brand-muted dark:text-brand-surface/55">
              Вводите только цифры, без «8» в начале: после +7 должно быть 10 цифр, первая — 9.
            </p>
            {phoneErr ? <p className="mt-1 text-xs text-brand-red dark:text-brand-surface/90">{phoneErr}</p> : null}
          </div>
          <div>
            <label className={labelClass} htmlFor="reg-password">
              Пароль
            </label>
            <input
              id="reg-password"
              name="password"
              type={showPwd ? "text" : "password"}
              autoComplete="new-password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <ShowPasswordToggle id="reg-show-pwd" checked={showPwd} onChange={setShowPwd} />
          </div>
          <div>
            <label className={labelClass} htmlFor="reg-password2">
              Пароль ещё раз
            </label>
            <input
              id="reg-password2"
              name="password2"
              type={showPwd2 ? "text" : "password"}
              autoComplete="new-password"
              className={inputClass}
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
              minLength={8}
            />
            <ShowPasswordToggle id="reg-show-pwd2" checked={showPwd2} onChange={setShowPwd2} />
          </div>

          {error ? (
            <p className="rounded-lg border border-brand-red/35 bg-brand-red/10 px-3 py-2 text-sm text-brand-red dark:text-brand-surface" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting || !formOk}
            className="w-full rounded-xl bg-brand-red px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-red/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Создаём аккаунт…" : "Создать аккаунт"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-brand-muted dark:text-brand-surface/60">
          Уже есть аккаунт?{" "}
          <Link to="/login" className="font-semibold text-brand-red underline-offset-2 hover:underline" state={location.state}>
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
