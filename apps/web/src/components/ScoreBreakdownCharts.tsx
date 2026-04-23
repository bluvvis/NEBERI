import type { ScoreExplanation } from "@/types";

type Props = {
  explanation: ScoreExplanation;
  mlFraudProba?: number | null;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * Шкала 0–100: три сегмента в одном скруглении — одинаковая форма у всех зон.
 */
function ThresholdRuler(props: {
  lowMax: number;
  mediumMax: number;
  effective: number;
}) {
  const { lowMax, mediumMax, effective } = props;
  const lowPct = clamp(lowMax, 0, 100);
  const midPct = clamp(mediumMax - lowMax, 0, 100);
  const highPct = Math.max(0, 100 - lowPct - midPct);
  const markerPct = clamp(effective, 0, 100);

  return (
    <div className="w-full pt-1">
      <p className="text-sm font-semibold text-brand-ink dark:text-brand-surface">Шкала риска (0–100)</p>
      <div className="relative mt-3">
        <div
          className="relative flex h-2.5 w-full overflow-hidden rounded-full bg-brand-line dark:bg-brand-panel-border"
          role="img"
          aria-label={`Зоны: низкий до ${lowMax}, средний до ${mediumMax}, выше — высокий. Итог ${effective}.`}
        >
          <div style={{ width: `${lowPct}%` }} className="h-full shrink-0 bg-brand-zone-low" />
          <div style={{ width: `${midPct}%` }} className="h-full shrink-0 bg-brand-zone-mid" />
          <div style={{ width: `${highPct}%` }} className="h-full shrink-0 bg-brand-zone-high" />
          <div
            className="pointer-events-none absolute top-1/2 z-10 h-3 w-0.5 rounded-full bg-brand-red shadow-sm ring-1 ring-brand-red/30"
            style={{ left: `${markerPct}%`, transform: "translate(-50%, -50%)" }}
            aria-hidden
          />
        </div>
      </div>
      <p className="mt-2 text-sm leading-snug text-brand-muted dark:text-brand-surface/70">
        низкий ≤{lowMax} · средний ≤{mediumMax} · выше — высокий
      </p>
    </div>
  );
}

function RulesVsBlendBars(props: { ruleScore: number; blendedExact: number }) {
  const maxScale = 100;
  const rulePct = (clamp(props.ruleScore, 0, maxScale) / maxScale) * 100;
  const blendPct = (clamp(props.blendedExact, 0, maxScale) / maxScale) * 100;
  const detailTitle = `Правила (сумма весов): ${props.ruleScore}. Смесь с ML (точнее): ${props.blendedExact.toFixed(1)}. Числа — в «Подробнее для аудита».`;

  return (
    <div className="space-y-4" title={detailTitle}>
      <div>
        <div className="mb-1.5 text-sm font-medium text-brand-muted dark:text-brand-surface/75">По правилам</div>
        <div className="h-3 overflow-hidden rounded-full bg-brand-line ring-1 ring-inset ring-brand-line/40 dark:bg-brand-panel-border dark:ring-brand-panel-border/50">
          <div
            className="h-full min-h-[100%] rounded-full bg-brand-muted transition-[width] duration-500 ease-out dark:bg-brand-zone-mid"
            style={{ width: `${rulePct}%` }}
          />
        </div>
      </div>
      <div>
        <div className="mb-1.5 text-sm font-medium text-brand-muted dark:text-brand-surface/75">По тексту и ML</div>
        <div className="h-3 overflow-hidden rounded-full bg-brand-line ring-1 ring-inset ring-brand-line/40 dark:bg-brand-panel-border dark:ring-brand-panel-border/50">
          <div
            className="h-full min-h-[100%] rounded-full bg-brand-red transition-[width] duration-500 ease-out"
            style={{ width: `${blendPct}%` }}
          />
        </div>
      </div>
      <p className="text-xs leading-snug text-brand-muted dark:text-brand-surface/60">
        Конкретные значения — внизу, в «Подробнее для аудита».
      </p>
    </div>
  );
}

function MlConfidenceBar(props: { proba: number }) {
  const pct = clamp(props.proba, 0, 1) * 100;
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm font-medium text-brand-muted dark:text-brand-surface/75">
        <span>Уверенность ML</span>
        <span className="font-mono text-brand-ink dark:text-brand-surface">{(props.proba * 100).toFixed(1)}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-brand-line ring-1 ring-inset ring-brand-line/40 dark:bg-brand-panel-border dark:ring-brand-panel-border/50">
        <div
          className="h-full min-h-[100%] rounded-full bg-brand-zone-mid transition-[width] duration-500 ease-out dark:bg-brand-zone-mid"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function BlendComposition(props: { ruleB: number; mlB: number; divB: number }) {
  const { ruleB, mlB, divB } = props;
  const total = ruleB + mlB + divB || 1;
  const pr = (ruleB / total) * 100;
  const pm = (mlB / total) * 100;
  const pd = (divB / total) * 100;

  return (
    <div className="rounded-xl border border-brand-line bg-brand-card p-4 dark:border-brand-panel-border dark:bg-brand-panel">
      <p className="text-sm font-semibold text-brand-ink dark:text-brand-surface">Из чего сложена оценка по тексту</p>
      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-brand-line ring-1 ring-inset ring-brand-line/40 dark:bg-brand-panel-border dark:ring-brand-panel-border/50">
        <div className="flex h-full min-h-0 w-full min-w-0">
          <div
            className="h-full min-h-0 bg-brand-muted dark:bg-brand-zone-mid"
            style={{ width: `${pr}%` }}
            title={`Правила: ${ruleB.toFixed(1)}`}
          />
          <div
            className="h-full min-h-0 bg-brand-zone-mid dark:bg-brand-zone-mid/80"
            style={{ width: `${pm}%` }}
            title={`ML: ${mlB.toFixed(1)}`}
          />
          {pd > 0 ? (
            <div
              className="h-full min-h-0 bg-brand-line dark:bg-brand-panel-border"
              style={{ width: `${pd}%` }}
              title={`Бонус: ${divB.toFixed(1)}`}
            />
          ) : null}
        </div>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-brand-muted dark:text-brand-surface/75">
        <li className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-brand-muted dark:bg-brand-zone-mid" />
          доля правил
        </li>
        <li className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-brand-zone-mid" />
          доля ML
        </li>
        {divB > 0 ? (
          <li className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full bg-brand-line dark:bg-brand-panel-border" />
            бонус разнообразия
          </li>
        ) : null}
      </ul>
    </div>
  );
}

export function ScoreBreakdownCharts({ explanation, mlFraudProba }: Props) {
  const c = explanation.blended_components;
  const ruleB = c ? Math.max(0, c.rule_branch ?? 0) : 0;
  const mlB = c ? Math.max(0, c.ml_branch ?? 0) : 0;
  const divB = c ? Math.max(0, c.diversity_bonus ?? 0) : 0;
  const hasBlendParts = c != null && (ruleB > 0 || mlB > 0 || divB > 0);

  return (
    <div className="mt-5 space-y-6">
      <div className="rounded-xl border border-brand-line bg-brand-card p-4 dark:border-brand-panel-border dark:bg-brand-panel">
        <ThresholdRuler
          lowMax={explanation.low_max}
          mediumMax={explanation.medium_max}
          effective={explanation.effective_for_risk_level}
        />
        <p className="mt-3 text-center text-sm text-brand-muted dark:text-brand-surface/70">
          Берётся большее из двух оценок ниже — то же значение, что в кольце в шапке карточки.
        </p>
      </div>

      <div className="rounded-xl border border-brand-line bg-brand-card p-4 dark:border-brand-panel-border dark:bg-brand-panel">
        <RulesVsBlendBars ruleScore={explanation.rule_score} blendedExact={explanation.blended_exact} />
      </div>

      {mlFraudProba != null ? (
        <div className="rounded-xl border border-brand-line bg-brand-card p-4 dark:border-brand-panel-border dark:bg-brand-panel">
          <MlConfidenceBar proba={mlFraudProba} />
        </div>
      ) : null}

      {hasBlendParts ? <BlendComposition ruleB={ruleB} mlB={mlB} divB={divB} /> : null}
    </div>
  );
}
