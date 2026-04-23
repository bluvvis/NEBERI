/** Демо-события для POST /v1/events (порядок важен для burst-правил). */
export const demoEventPayloads: Record<string, unknown>[] = [
  // ——— «Тихий» трафик (низкий риск), разные абоненты ———
  {
    event_type: "call",
    from_msisdn: "+78120010001",
    to_msisdn: "+78120010002",
    duration_sec: 420,
    occurred_at: "2026-04-18T11:20:00+00:00",
  },
  {
    event_type: "sms",
    from_msisdn: "+79001002030",
    to_msisdn: "+79001002031",
    text: "Встреча перенесена на 19:00. Подтвердите участие ответом ДА.",
    occurred_at: "2026-04-18T11:22:00+00:00",
  },
  {
    event_type: "call",
    from_msisdn: "+74951234567",
    to_msisdn: "+74959876543",
    duration_sec: 95,
    occurred_at: "2026-04-18T14:05:00+00:00",
  },
  {
    event_type: "sms",
    from_msisdn: "+73422334455",
    to_msisdn: "+73422334456",
    text: "Договорились: созвон в 16:30, ссылку на мит скину отдельным письмом.",
    occurred_at: "2026-04-18T15:00:00+00:00",
  },
  {
    event_type: "voice_text",
    from_msisdn: "+73512700900",
    to_msisdn: "+73512700901",
    text: "Передай коллегам, что смета утверждена без замечаний, можно закрывать задачу.",
    occurred_at: "2026-04-18T15:10:00+00:00",
  },

  // ——— Средний риск без «давления срочности» ———
  {
    event_type: "sms",
    from_msisdn: "+79161110001",
    to_msisdn: "+79162220002",
    text: "Переведите на карту 500 руб для подтверждения доставки.",
    occurred_at: "2026-04-19T09:10:00+00:00",
  },
  {
    event_type: "voice_text",
    from_msisdn: "+79253334455",
    to_msisdn: "+79254445566",
    text: "Служба банка просит назвать код из смс для отмены операции.",
    occurred_at: "2026-04-19T09:18:00+00:00",
  },
  {
    event_type: "call",
    from_msisdn: "+79375556677",
    to_msisdn: "+79376667788",
    duration_sec: 2,
    occurred_at: "2026-04-19T16:40:00+00:00",
  },

  // Ночной короткий звонок → night + ultra_short (средний)
  {
    event_type: "call",
    from_msisdn: "+79851112233",
    to_msisdn: "+79852223344",
    duration_sec: 2,
    occurred_at: "2026-04-20T01:15:00+00:00",
  },

  // ——— Серия коротких вызовов на один номер (5-й триггерит burst + ночь → высокий) ———
  {
    event_type: "call",
    from_msisdn: "+79291110222",
    to_msisdn: "+79391110333",
    duration_sec: 2,
    occurred_at: "2026-04-20T15:00:00+00:00",
  },
  {
    event_type: "call",
    from_msisdn: "+79291110222",
    to_msisdn: "+79391110333",
    duration_sec: 2,
    occurred_at: "2026-04-20T15:01:00+00:00",
  },
  {
    event_type: "call",
    from_msisdn: "+79291110222",
    to_msisdn: "+79391110333",
    duration_sec: 2,
    occurred_at: "2026-04-20T15:02:00+00:00",
  },
  {
    event_type: "call",
    from_msisdn: "+79291110222",
    to_msisdn: "+79391110333",
    duration_sec: 2,
    occurred_at: "2026-04-20T15:03:00+00:00",
  },
  {
    event_type: "call",
    from_msisdn: "+79291110222",
    to_msisdn: "+79391110333",
    duration_sec: 2,
    occurred_at: "2026-04-21T03:15:00+00:00",
  },

  // ——— 8 SMS с одного номера: на 8-м срабатывает high_velocity + мошеннические фразы ———
  {
    event_type: "sms",
    from_msisdn: "+79651234567",
    to_msisdn: "+79990000001",
    text: "Пакет интернета продлён до конца месяца.",
    occurred_at: "2026-04-20T10:00:00+00:00",
  },
  {
    event_type: "sms",
    from_msisdn: "+79651234567",
    to_msisdn: "+79990000002",
    text: "Баланс пополнен. Спасибо, что с нами.",
    occurred_at: "2026-04-20T10:01:00+00:00",
  },
  {
    event_type: "sms",
    from_msisdn: "+79651234567",
    to_msisdn: "+79990000003",
    text: "Код входа в приложение: 918273 (никому не сообщайте).",
    occurred_at: "2026-04-20T10:02:00+00:00",
  },
  {
    event_type: "sms",
    from_msisdn: "+79651234567",
    to_msisdn: "+79990000004",
    text: "Акция выходного дня: скидка 10% на роуминг.",
    occurred_at: "2026-04-20T10:03:00+00:00",
  },
  {
    event_type: "sms",
    from_msisdn: "+79651234567",
    to_msisdn: "+79990000005",
    text: "Напоминание: завтра списание абонентской платы.",
    occurred_at: "2026-04-20T10:04:00+00:00",
  },
  {
    event_type: "sms",
    from_msisdn: "+79651234567",
    to_msisdn: "+79990000006",
    text: "Ваш номер успешно перенесён. Добро пожаловать!",
    occurred_at: "2026-04-20T10:05:00+00:00",
  },
  {
    event_type: "sms",
    from_msisdn: "+79651234567",
    to_msisdn: "+79990000007",
    text: "Детализация готова. Скачайте в личном кабинете.",
    occurred_at: "2026-04-20T10:06:00+00:00",
  },
  {
    event_type: "sms",
    from_msisdn: "+79651234567",
    to_msisdn: "+79990000008",
    text: "Срочно переведите на карту 10000 руб, блокировка счета",
    occurred_at: "2026-04-20T10:07:00+00:00",
  },

  // ——— Формулировки без точного совпадения с шаблоном YAML: чаще заметит ML, правила — слабее ———
  {
    event_type: "sms",
    from_msisdn: "+79001230301",
    to_msisdn: "+79001230302",
    text: "Здравствуйте, это финансовый отдел. Укажите полные реквизиты карты для возврата ошибочного списания.",
    occurred_at: "2026-04-21T08:00:00+00:00",
  },
  {
    event_type: "sms",
    from_msisdn: "+79001230303",
    to_msisdn: "+79001230304",
    text: "Операция перевода 8 700 ₽ на указанный вами номер карты ожидает подтверждения в приложении (код никому не называть).",
    occurred_at: "2026-04-21T08:01:00+00:00",
  },
  {
    event_type: "voice_text",
    from_msisdn: "+79001230305",
    to_msisdn: "+79001230306",
    text: "Алло, это линия защиты клиента: зарезервировано списание, отменить можно только по инструкции в приложении банка.",
    occurred_at: "2026-04-21T08:03:00+00:00",
  },
  {
    event_type: "sms",
    from_msisdn: "+79001230307",
    to_msisdn: "+79001230308",
    text: "Отчёт за квартал в Confluence, дедлайн согласования — пятница 18:00, без срочных действий.",
    occurred_at: "2026-04-21T08:05:00+00:00",
  },

  // ——— Яркие одиночные кейсы ———
  {
    event_type: "sms",
    from_msisdn: "+79817001020",
    to_msisdn: "+79817001021",
    text: "Прямо сейчас переведите средства, блокировка счета иначе через час.",
    occurred_at: "2026-04-21T12:00:00+00:00",
  },
  {
    event_type: "voice_text",
    from_msisdn: "+79037778899",
    to_msisdn: "+79038889900",
    text: "Срочно пройдите по ссылке в личный кабинет для отмены блокировки карты.",
    occurred_at: "2026-04-21T12:05:00+00:00",
  },
  {
    event_type: "sms",
    from_msisdn: "+79004445566",
    to_msisdn: "+79005556677",
    text: "Немедленно свяжитесь с «безопасностью»: служба безопасности банка просит назвать код из смс.",
    occurred_at: "2026-04-21T12:10:00+00:00",
  },
];

/** Максимум сценариев в пуле (для подсказок в UI). */
export const demoScenarioPoolMax = demoEventPayloads.length;

/** @deprecated Используйте demoScenarioPoolMax; оставлено для совместимости импортов. */
export const demoScenarioCount = demoScenarioPoolMax;

function shuffleInPlace<T>(items: T[]): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

/**
 * Случайный порядок и случайное число событий из пула (чтобы симуляция не была «всегда одним пакетом»).
 */
export function pickRandomDemoBatch(): Record<string, unknown>[] {
  const pool = [...demoEventPayloads];
  shuffleInPlace(pool);
  if (pool.length <= 8) return pool;
  const n = 8 + Math.floor(Math.random() * (pool.length - 7));
  return pool.slice(0, n);
}
