import type { RiskLevel } from "@/types";
import { BRAND } from "@/lib/brand";
import { scoreArcColor } from "@/lib/riskVisual";

type Props = {
  riskScore: number;
  riskLevel?: RiskLevel;
  /** По умолчанию компактное кольцо для строки ленты. */
  size?: "md" | "lg";
};

function toDisplayScore(riskScore: number): number {
  const n = typeof riskScore === "number" && Number.isFinite(riskScore) ? riskScore : Number(riskScore);
  return Math.round(Math.min(100, Math.max(0, Number.isFinite(n) ? n : 0)));
}

const SIZE_STYLES = {
  md: {
    box: "h-[3.75rem] w-[3.75rem]",
    pad: "p-[0.55rem]",
    inner: "h-[2.65rem] w-[2.65rem] text-sm",
  },
  lg: {
    box: "h-[4.75rem] w-[4.75rem] sm:h-[5.75rem] sm:w-[5.75rem]",
    pad: "p-[0.55rem] sm:p-[0.7rem]",
    inner: "h-[3.35rem] w-[3.35rem] text-base sm:h-[4.1rem] sm:w-[4.1rem] sm:text-lg",
  },
} as const;

export function ScoreRing({ riskScore, riskLevel, size = "md" }: Props) {
  const score = toDisplayScore(riskScore);
  const fill = scoreArcColor(score, riskLevel);
  const track = BRAND.line;
  const high = riskLevel === "high";
  const s = SIZE_STYLES[size];

  return (
    <div
      className={`relative isolate shrink-0 overflow-hidden rounded-full motion-reduce:animate-none animate-score-pop ${s.box} ${high ? "shadow-brand-ring-glow motion-reduce:shadow-none animate-risk-high-ring motion-reduce:animate-none" : ""}`}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(${fill} ${score * 3.6}deg, ${track} 0)`,
        }}
        aria-hidden
      />
      <div className={`absolute inset-0 flex items-center justify-center ${s.pad}`}>
        <div
          className={`flex items-center justify-center overflow-hidden rounded-full bg-brand-card px-1 font-bold leading-none text-brand-ink shadow-inner dark:bg-brand-panel dark:text-brand-surface dark:shadow-none ${s.inner}`}
        >
          <span className="min-w-0 whitespace-nowrap text-center font-mono tabular-nums">{score}</span>
        </div>
      </div>
    </div>
  );
}
