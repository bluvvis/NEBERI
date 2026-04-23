import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  NEBERI_ACCESS_TOKEN_KEY,
  type AuthUserPublic,
  authDeleteAvatar,
  authDeleteMe,
  authGetMe,
  authLogin,
  authPatchMe,
  authRegister,
  authUploadAvatar,
} from "@/lib/api";

type AuthContextValue = {
  token: string | null;
  user: AuthUserPublic | null;
  /** Инкремент при смене файла аватара — сброс кэша браузера по URL. */
  avatarCacheBust: number;
  bootstrapping: boolean;
  login: (loginStr: string, password: string) => Promise<void>;
  register: (nickname: string, phone: string, password: string) => Promise<void>;
  logout: () => void;
  deleteAccount: (password: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  patchNickname: (nickname: string) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  removeAvatar: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(NEBERI_ACCESS_TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(readStoredToken);
  const [user, setUser] = useState<AuthUserPublic | null>(null);
  const [avatarCacheBust, setAvatarCacheBust] = useState(0);
  const [bootstrapping, setBootstrapping] = useState(() => Boolean(readStoredToken()));
  /** После login/register не показываем «загрузка» — пользователь уже в ответе, /me только подтверждает. */
  const skipBootstrapSpinnerRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!token) {
        setUser(null);
        setBootstrapping(false);
        return;
      }
      const quiet = skipBootstrapSpinnerRef.current;
      skipBootstrapSpinnerRef.current = false;
      if (!quiet) setBootstrapping(true);
      try {
        const me = await authGetMe(token);
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) {
          setUser(null);
          setToken(null);
          localStorage.removeItem(NEBERI_ACCESS_TOKEN_KEY);
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = useCallback(async (loginStr: string, password: string) => {
    const out = await authLogin({ login: loginStr.trim(), password });
    skipBootstrapSpinnerRef.current = true;
    localStorage.setItem(NEBERI_ACCESS_TOKEN_KEY, out.access_token);
    setToken(out.access_token);
    setUser(out.user);
  }, []);

  const register = useCallback(async (nickname: string, phone: string, password: string) => {
    const out = await authRegister({ nickname: nickname.trim(), phone: phone.trim(), password });
    skipBootstrapSpinnerRef.current = true;
    localStorage.setItem(NEBERI_ACCESS_TOKEN_KEY, out.access_token);
    setToken(out.access_token);
    setUser(out.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(NEBERI_ACCESS_TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const deleteAccount = useCallback(
    async (password: string) => {
      if (!token) throw new Error("Нет активной сессии");
      await authDeleteMe(token, password);
      localStorage.removeItem(NEBERI_ACCESS_TOKEN_KEY);
      setToken(null);
      setUser(null);
    },
    [token],
  );

  const refreshUser = useCallback(async () => {
    if (!token) return;
    const me = await authGetMe(token);
    setUser(me);
  }, [token]);

  const patchNickname = useCallback(
    async (nickname: string) => {
      if (!token) throw new Error("Нет активной сессии");
      const me = await authPatchMe(token, { nickname });
      setUser(me);
    },
    [token],
  );

  const uploadAvatar = useCallback(
    async (file: File) => {
      if (!token) throw new Error("Нет активной сессии");
      const me = await authUploadAvatar(token, file);
      setUser(me);
      setAvatarCacheBust((n) => n + 1);
    },
    [token],
  );

  const removeAvatar = useCallback(async () => {
    if (!token) throw new Error("Нет активной сессии");
    const me = await authDeleteAvatar(token);
    setUser(me);
    setAvatarCacheBust((n) => n + 1);
  }, [token]);

  const value = useMemo(
    () => ({
      token,
      user,
      avatarCacheBust,
      bootstrapping,
      login,
      register,
      logout,
      deleteAccount,
      refreshUser,
      patchNickname,
      uploadAvatar,
      removeAvatar,
    }),
    [
      token,
      user,
      avatarCacheBust,
      bootstrapping,
      login,
      register,
      logout,
      deleteAccount,
      refreshUser,
      patchNickname,
      uploadAvatar,
      removeAvatar,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth должен вызываться внутри AuthProvider");
  return v;
}
