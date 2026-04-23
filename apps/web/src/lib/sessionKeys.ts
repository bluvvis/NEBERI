/** Ключ sessionStorage для подсветки последней открытой карточки в ленте. */
export const LAST_VIEWED_EVENT_ID_KEY = "neberi:lastEventId";

/** Сохранённая позиция скролла ленты (BrowserRouter — без Data Router ScrollRestoration). */
export const EVENTS_LIST_SCROLL_Y_KEY = "neberi:eventsListScrollY";

/** Возврат на /reputation после карточки события: позиция скролла страницы репутации. */
export const REPUTATION_SCROLL_Y_KEY = "neberi:reputationScrollY";
export const REPUTATION_SCROLL_RESTORE_PENDING_KEY = "neberi:reputationScrollRestorePending";

/** Перед переходом «Репутация → карточка события»: запомнить скролл для восстановления. */
export function prepareNavigateFromReputationToEvent(): void {
  try {
    sessionStorage.setItem(REPUTATION_SCROLL_Y_KEY, String(window.scrollY));
    sessionStorage.setItem(REPUTATION_SCROLL_RESTORE_PENDING_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** При монтировании страницы «Репутация»: восстановить скролл после возврата с карточки. */
export function consumeReputationScrollRestore(): void {
  try {
    if (sessionStorage.getItem(REPUTATION_SCROLL_RESTORE_PENDING_KEY) !== "1") return;
    sessionStorage.removeItem(REPUTATION_SCROLL_RESTORE_PENDING_KEY);
    const raw = sessionStorage.getItem(REPUTATION_SCROLL_Y_KEY);
    sessionStorage.removeItem(REPUTATION_SCROLL_Y_KEY);
    if (raw == null) return;
    const y = parseInt(raw, 10);
    if (!Number.isFinite(y)) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.scrollTo(0, y));
    });
  } catch {
    /* ignore */
  }
}

/** JSON: { [eventId]: timestamp } — время последнего открытия карточки (для сортировки). */
export const EVENT_VISIT_TIMES_KEY = "neberi:eventVisitTimes";

/** Событие: пользователь открыл карточку (обновить сортировку «по посещению»). */
export const EVENT_VISIT_BUMP = "neberi-visit";

/** Записать текущий вертикальный скролл окна (вызывать при уходе в карточку события). */
export function persistEventsListScrollY(): void {
  try {
    sessionStorage.setItem(EVENTS_LIST_SCROLL_Y_KEY, String(window.scrollY));
  } catch {
    /* ignore */
  }
}

export function readVisitTimes(): Record<string, number> {
  try {
    const raw = sessionStorage.getItem(EVENT_VISIT_TIMES_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw) as unknown;
    if (o && typeof o === "object" && !Array.isArray(o)) {
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
        if (typeof v === "number" && Number.isFinite(v)) {
          out[k] = v;
          continue;
        }
        if (typeof v === "string") {
          const n = Number(v);
          if (Number.isFinite(n)) out[k] = n;
        }
      }
      return out;
    }
  } catch {
    /* ignore */
  }
  return {};
}

/** Запись «открыл карточку из ленты» (ЛКМ по строке): время для сортировки + подсветка последней строки. */
export function touchVisitTime(eventId: string): void {
  try {
    sessionStorage.setItem(LAST_VIEWED_EVENT_ID_KEY, eventId);
    const m = readVisitTimes();
    m[eventId] = Date.now();
    sessionStorage.setItem(EVENT_VISIT_TIMES_KEY, JSON.stringify(m));
    window.dispatchEvent(new CustomEvent(EVENT_VISIT_BUMP));
  } catch {
    /* ignore */
  }
}

/** После очистки ленты: сброс посещений и «последней карточки», чтобы сортировка по посещению была пустой до новых просмотров. */
export function clearVisitAndLastViewedSession(): void {
  try {
    sessionStorage.removeItem(EVENT_VISIT_TIMES_KEY);
    sessionStorage.removeItem(LAST_VIEWED_EVENT_ID_KEY);
    window.dispatchEvent(new CustomEvent(EVENT_VISIT_BUMP));
  } catch {
    /* ignore */
  }
}

/** Сброс локального UI (посещения, скролл ленты, возврат на репутацию) — из профиля. */
export function clearNeberiSessionUiState(): void {
  try {
    sessionStorage.removeItem(EVENT_VISIT_TIMES_KEY);
    sessionStorage.removeItem(LAST_VIEWED_EVENT_ID_KEY);
    sessionStorage.removeItem(EVENTS_LIST_SCROLL_Y_KEY);
    sessionStorage.removeItem(REPUTATION_SCROLL_Y_KEY);
    sessionStorage.removeItem(REPUTATION_SCROLL_RESTORE_PENDING_KEY);
    window.dispatchEvent(new CustomEvent(EVENT_VISIT_BUMP));
  } catch {
    /* ignore */
  }
}
