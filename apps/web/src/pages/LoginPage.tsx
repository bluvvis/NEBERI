import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { ShowPasswordToggle } from "@/components/ShowPasswordToggle";
import { parseLoginIdentifier, sanitizeLoginFreeText } from "@/lib/authInputValidation";

const shell =
  "rounded-2xl border border-brand-line bg-brand-card shadow-panel-light dark:border-brand-panel-border dark:bg-brand-panel dark:shadow-panel";

const inputClass =
  "mt-1 w-full rounded-xl border border-brand-line bg-brand-surface px-3 py-2.5 text-sm text-brand-ink outline-none transition placeholder:text-brand-muted/70 focus:border-brand-red/50 focus:ring-2 focus:ring-brand-red/25 dark:border-brand-panel-border dark:bg-brand-ink dark:text-brand-surface dark:placeholder:text-brand-surface/45";

const labelClass = "block text-sm font-medium text-brand-ink dark:text-brand-surface";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/profile";

  const [loginField, setLoginField] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = parseLoginIdentifier(loginField);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    setSubmitting(true);
    try {
      await login(parsed.value, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось войти");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className={`${shell} px-6 py-8`}>
        <h1 className="text-xl font-bold tracking-tight text-brand-ink dark:text-brand-surface">Вход</h1>
        <p className="mt-2 text-sm text-brand-muted dark:text-brand-surface/65">
          Никнейм — латиница, цифры и «_» (как при регистрации). Телефон — 10 цифр после +7 без букв в поле (можно с
          пробелами и скобками).
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className={labelClass} htmlFor="auth-login">
              Никнейм или телефон
            </label>
            <input
              id="auth-login"
              name="login"
              autoComplete="username"
              className={inputClass}
              value={loginField}
              onChange={(e) => setLoginField(sanitizeLoginFreeText(e.target.value))}
              placeholder="operator_1 или +7 900 123 45 67"
              required
              spellCheck={false}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="auth-password">
              Пароль
            </label>
            <input
              id="auth-password"
              name="password"
              type={showPwd ? "text" : "password"}
              autoComplete="current-password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <ShowPasswordToggle id="login-show-pwd" checked={showPwd} onChange={setShowPwd} />
          </div>

          {error ? (
            <p className="rounded-lg border border-brand-red/35 bg-brand-red/10 px-3 py-2 text-sm text-brand-red dark:text-brand-surface" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-brand-red px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-red/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Входим…" : "Войти"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-brand-muted dark:text-brand-surface/60">
          Нет аккаунта?{" "}
          <Link to="/register" className="font-semibold text-brand-red underline-offset-2 hover:underline" state={location.state}>
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
}
