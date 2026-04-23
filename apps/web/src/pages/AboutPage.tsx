import { Link } from "react-router-dom";

const sections = [
  {
    title: "Проблема",
    body:
      "Рост мошеннических звонков и SMS, социальная инженерия. Классические фильтры часто дают мало объяснимости для абонента и интеграторов — сложно понять, почему сработал сигнал.",
  },
  {
    title: "Сегменты",
    body:
      "B2B: продуктовые команды оператора (BSS/OSS, антифрод-платформа). Косвенно — конечный абонент получает сигнал или подсказку через каналы оператора.",
  },
  {
    title: "Ценность",
    body:
      "Мы помогаем командам телекома и интеграторам в потоке событий связи в реальном времени быстро оценить риск и объяснить «почему» через NeBeri API, политику правил и консоль — снижение потерь, доверие к сигналам, скорость реакции.",
  },
  {
    title: "MVP",
    body:
      "REST-приём событий, risk score (правила + опционально TF-IDF+LR по тексту sms/voice_text), rule_score и ml_fraud_proba в ответе, reasons с references из YAML, версия политики. Идемпотентность, rate limit, Prometheus. Обучение: research/train_export.py (--dataset combined для UCI+RU) → ml_models/. В веб-консоли «Симуляция» — демо-события.",
  },
  {
    title: "Риски",
    body:
      "Ложные срабатывания, регуляторика ПДн, зависимость от качества текстов и ASR. Демо-модуль не заменяет промышленный антифрод — это учебный контур для курса и интеграционных экспериментов.",
  },
] as const;

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-muted dark:text-brand-surface/55">
        О продукте
      </p>
      <h1
        className="font-brand inline-block origin-left scale-x-[1.12] text-3xl font-bold tracking-tight text-brand-ink dark:text-brand-surface sm:scale-x-[1.1] sm:text-4xl"
        translate="no"
      >
        NeBeri
      </h1>
      <p className="mt-4 text-base leading-relaxed text-brand-muted dark:text-brand-surface/70">
        Учебный антифрод/антиспам-модуль для телекома: скоринг по YAML-политике, объяснимые причины и веб-консоль
        поверх REST API.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to="/"
          className="rounded-xl bg-brand-red px-5 py-3 text-base font-semibold text-white shadow-md shadow-brand-btn transition hover:opacity-90"
        >
          К ленте событий
        </Link>
        <a
          href="/docs"
          className="rounded-xl border border-brand-line bg-brand-card px-5 py-3 text-base font-semibold text-brand-ink transition hover:border-brand-muted dark:border-brand-panel-border dark:bg-brand-panel dark:text-brand-surface dark:hover:border-brand-muted"
        >
          OpenAPI
        </a>
      </div>

      <div className="mt-14 space-y-8">
        {sections.map((s, i) => (
          <section
            key={s.title}
            style={{ animationDelay: `${i * 50}ms` }}
            className="rounded-2xl border border-brand-line bg-brand-card p-6 shadow-panel-light motion-reduce:animate-none animate-fade-up dark:border-brand-panel-border dark:bg-brand-panel dark:shadow-panel"
          >
            <h2 className="text-sm font-bold uppercase tracking-wide text-brand-red">{s.title}</h2>
            <p className="mt-3 text-base leading-relaxed text-brand-muted dark:text-brand-surface/75">{s.body}</p>
          </section>
        ))}
      </div>

      <p className="mt-10 text-center text-sm text-brand-muted dark:text-brand-surface/50">
        Структура страницы согласована с черновиком Lean Canvas в репозитории.
      </p>
    </div>
  );
}
