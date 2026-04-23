import type {
  EventFeedback,
  EventFeedbackRecent,
  FeedbackKind,
  FraudEvent,
  ReputationEntry,
  ReputationListType,
} from "@/types";
import { buildFetchUrl } from "@/lib/buildApiUrl";

function appOrigin(): string {
  return typeof window !== "undefined" ? window.location.origin : "http://localhost";
}

function apiUrl(path: string): string {
  return buildFetchUrl(path, appOrigin(), { viteApiBase: import.meta.env.VITE_API_BASE });
}

function mutatingHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const k = import.meta.env.VITE_INGEST_API_KEY;
  if (k != null && String(k).trim() !== "") {
    h["X-API-Key"] = String(k).trim();
  }
  return h;
}

/** Человекочитаемая подсказка при 401 от защищённого ingest. */
function formatMutatingError(status: number, bodyText: string): string {
  const raw = (bodyText || "").trim() || String(status);
  if (status === 401 && (raw.includes("X-API-Key") || raw.toLowerCase().includes("ingest"))) {
    return `${raw} — создайте apps/web/.env.local: скопируйте из .env.example и задайте VITE_INGEST_API_KEY как INGEST_API_KEY на API; перезапустите vite.`;
  }
  return raw;
}

export async function fetchEvents(params?: {
  risk_level?: string;
  limit?: number;
  event_type?: string;
}): Promise<FraudEvent[]> {
  const search: Record<string, string> = {
    limit: String(params?.limit ?? 200),
  };
  if (params?.risk_level) search.risk_level = params.risk_level;
  if (params?.event_type) search.event_type = params.event_type;
  const url = buildFetchUrl("/v1/events", appOrigin(), {
    viteApiBase: import.meta.env.VITE_API_BASE,
    search,
  });
  const r = await fetch(url);
  if (!r.ok) throw new Error(`events: ${r.status}`);
  return r.json() as Promise<FraudEvent[]>;
}

export async function fetchEvent(id: string): Promise<FraudEvent> {
  const r = await fetch(
    buildFetchUrl(`/v1/events/${id}`, appOrigin(), {
      viteApiBase: import.meta.env.VITE_API_BASE,
    }),
  );
  if (!r.ok) throw new Error(`event: ${r.status}`);
  return r.json() as Promise<FraudEvent>;
}

export async function postEvent(body: Record<string, unknown>): Promise<FraudEvent> {
  const r = await fetch(
    buildFetchUrl("/v1/events", appOrigin(), { viteApiBase: import.meta.env.VITE_API_BASE }),
    {
      method: "POST",
      headers: mutatingHeaders(),
      body: JSON.stringify(body),
    },
  );
  if (!r.ok) {
    const t = await r.text();
    throw new Error(formatMutatingError(r.status, t) || `post: ${r.status}`);
  }
  return r.json() as Promise<FraudEvent>;
}

/** Очистка ленты: POST /v1/events/purge (DELETE на коллекции часто даёт 405 за прокси/старый API). */
export async function deleteAllEvents(): Promise<{ deleted: number }> {
  const r = await fetch(
    buildFetchUrl("/v1/events/purge", appOrigin(), { viteApiBase: import.meta.env.VITE_API_BASE }),
    {
      method: "POST",
      cache: "no-store",
      headers: mutatingHeaders(),
      body: "{}",
    },
  );
  if (!r.ok) {
    const t = await r.text();
    throw new Error(formatMutatingError(r.status, t) || `delete events: ${r.status}`);
  }
  return r.json() as Promise<{ deleted: number }>;
}

export async function fetchRecentEventFeedback(limit = 80): Promise<EventFeedbackRecent[]> {
  const r = await fetch(
    buildFetchUrl("/v1/events/feedback/recent", appOrigin(), {
      viteApiBase: import.meta.env.VITE_API_BASE,
      search: { limit: String(limit) },
    }),
  );
  if (!r.ok) throw new Error(`feedback recent: ${r.status}`);
  return r.json() as Promise<EventFeedbackRecent[]>;
}

export async function fetchReputationList(): Promise<ReputationEntry[]> {
  const r = await fetch(
    buildFetchUrl("/v1/reputation", appOrigin(), { viteApiBase: import.meta.env.VITE_API_BASE }),
  );
  if (!r.ok) throw new Error(`reputation: ${r.status}`);
  return r.json() as Promise<ReputationEntry[]>;
}

/** С карточки события API принимает только blocklist (list_type по умолчанию на сервере). */
export async function postEventSenderReputation(
  eventId: string,
  body: { label?: string | null; source?: string | null } = {},
): Promise<ReputationEntry> {
  const r = await fetch(
    buildFetchUrl(`/v1/events/${eventId}/reputation`, appOrigin(), {
      viteApiBase: import.meta.env.VITE_API_BASE,
    }),
    {
      method: "POST",
      headers: mutatingHeaders(),
      body: JSON.stringify({ list_type: "blocklist", ...body }),
    },
  );
  if (!r.ok) {
    const t = await r.text();
    throw new Error(formatMutatingError(r.status, t) || `event reputation: ${r.status}`);
  }
  return r.json() as Promise<ReputationEntry>;
}

export async function upsertReputation(body: {
  msisdn: string;
  list_type: ReputationListType;
  label?: string | null;
  source?: string | null;
  expires_at?: string | null;
}): Promise<ReputationEntry> {
  const r = await fetch(
    buildFetchUrl("/v1/reputation", appOrigin(), { viteApiBase: import.meta.env.VITE_API_BASE }),
    {
      method: "POST",
      headers: mutatingHeaders(),
      body: JSON.stringify(body),
    },
  );
  if (!r.ok) {
    const t = await r.text();
    throw new Error(formatMutatingError(r.status, t) || `reputation upsert: ${r.status}`);
  }
  return r.json() as Promise<ReputationEntry>;
}

export async function removeReputation(msisdn: string): Promise<{ removed: boolean }> {
  const r = await fetch(
    buildFetchUrl("/v1/reputation/remove", appOrigin(), { viteApiBase: import.meta.env.VITE_API_BASE }),
    {
      method: "POST",
      headers: mutatingHeaders(),
      body: JSON.stringify({ msisdn }),
    },
  );
  if (!r.ok) {
    const t = await r.text();
    throw new Error(formatMutatingError(r.status, t) || `reputation remove: ${r.status}`);
  }
  return r.json() as Promise<{ removed: boolean }>;
}

export async function deleteReputationById(id: string): Promise<void> {
  const r = await fetch(
    buildFetchUrl(`/v1/reputation/${id}`, appOrigin(), { viteApiBase: import.meta.env.VITE_API_BASE }),
    { method: "DELETE", headers: mutatingHeaders() },
  );
  if (!r.ok) {
    const t = await r.text();
    throw new Error(formatMutatingError(r.status, t) || `reputation delete: ${r.status}`);
  }
}

export async function postEventFeedback(
  eventId: string,
  body: { kind: FeedbackKind; note?: string | null },
): Promise<EventFeedback> {
  const r = await fetch(
    buildFetchUrl(`/v1/events/${eventId}/feedback`, appOrigin(), {
      viteApiBase: import.meta.env.VITE_API_BASE,
    }),
    {
      method: "POST",
      headers: mutatingHeaders(),
      body: JSON.stringify(body),
    },
  );
  if (!r.ok) {
    const t = await r.text();
    throw new Error(formatMutatingError(r.status, t) || `feedback: ${r.status}`);
  }
  return r.json() as Promise<EventFeedback>;
}

// ——— Auth (JWT, профиль, аватар) ———

export const NEBERI_ACCESS_TOKEN_KEY = "neberi_access_token";

export type AuthUserPublic = {
  id: string;
  nickname: string;
  phone_masked: string;
  avatar_url: string | null;
};

export type AuthTokenOut = {
  access_token: string;
  token_type?: string;
  user: AuthUserPublic;
};

/** Полный URL картинки аватара для `<img src>` (учёт VITE_API_BASE). `cacheBust` — смена после загрузки/удаления фото. */
export function resolveAuthAvatarUrl(avatarUrl: string | null | undefined, cacheBust = 0): string | undefined {
  if (!avatarUrl) return undefined;
  const base = apiUrl(avatarUrl);
  if (!cacheBust) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}_=${cacheBust}`;
}

async function readApiErrorMessage(r: Response): Promise<string> {
  const raw = ((await r.text()) || "").trim() || String(r.status);
  try {
    const j = JSON.parse(raw) as { detail?: unknown };
    const d = j.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) {
      return d
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object" && "msg" in item) return String((item as { msg: string }).msg);
          return JSON.stringify(item);
        })
        .join("; ");
    }
  } catch {
    /* не JSON */
  }
  return raw;
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function authRegister(body: {
  nickname: string;
  phone: string;
  password: string;
}): Promise<AuthTokenOut> {
  const r = await fetch(apiUrl("/v1/auth/register"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await readApiErrorMessage(r));
  return r.json() as Promise<AuthTokenOut>;
}

export async function authLogin(body: { login: string; password: string }): Promise<AuthTokenOut> {
  const r = await fetch(apiUrl("/v1/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await readApiErrorMessage(r));
  return r.json() as Promise<AuthTokenOut>;
}

export async function authGetMe(token: string): Promise<AuthUserPublic> {
  const r = await fetch(apiUrl("/v1/auth/me"), { headers: { ...authHeaders(token) } });
  if (!r.ok) throw new Error(await readApiErrorMessage(r));
  return r.json() as Promise<AuthUserPublic>;
}

export async function authPatchMe(token: string, body: { nickname: string }): Promise<AuthUserPublic> {
  const r = await fetch(apiUrl("/v1/auth/me"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await readApiErrorMessage(r));
  return r.json() as Promise<AuthUserPublic>;
}

export async function authDeleteMe(token: string, password: string): Promise<void> {
  const r = await fetch(apiUrl("/v1/auth/me"), {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ password }),
  });
  if (!r.ok) throw new Error(await readApiErrorMessage(r));
}

export async function authUploadAvatar(token: string, file: File): Promise<AuthUserPublic> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(apiUrl("/v1/auth/me/avatar"), {
    method: "POST",
    headers: { ...authHeaders(token) },
    body: fd,
  });
  if (!r.ok) throw new Error(await readApiErrorMessage(r));
  return r.json() as Promise<AuthUserPublic>;
}

export async function authDeleteAvatar(token: string): Promise<AuthUserPublic> {
  const r = await fetch(apiUrl("/v1/auth/me/avatar"), {
    method: "DELETE",
    headers: { ...authHeaders(token) },
  });
  if (!r.ok) throw new Error(await readApiErrorMessage(r));
  return r.json() as Promise<AuthUserPublic>;
}
