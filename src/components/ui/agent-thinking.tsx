import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

export type AgentThinkingVariant = "wave" | "spin" | "stars" | "infinity";
export type AgentThinkingTone = "subtle" | "default" | "primary" | "accent";

export interface AgentThinkingProps {
  variant?: AgentThinkingVariant;
  /** Status label, e.g. "AI" or "Thinking" */
  label?: string;
  /** Tone of the indicator + label */
  tone?: AgentThinkingTone;
  /** Animated highlight traveling across the label */
  shimmer?: boolean;
  /** Elapsed seconds since mount */
  showTimer?: boolean;
  /** Size modifier */
  size?: "sm" | "md" | "lg";
  className?: string;
}

const TONE_COLORS: Record<AgentThinkingTone, string> = {
  subtle: "#86868B",
  default: "#48484A",
  primary: "#1D1D1F",
  accent: "#1677FF",
};

const VARIANT_TONE: Record<AgentThinkingVariant, AgentThinkingTone> = {
  wave: "accent",
  spin: "accent",
  stars: "accent",
  infinity: "accent",
};

/* ------------------------------------------------------------------- dots */

const DOTS_GRID = 3;
const DOTS_SIZE = 3.5;
const DOTS_GAP = 2;
const DOTS_TICK_MS = 80;
const DOTS_FADE_MS = 220;
const DOTS_TRAIL = 0.3;
const DOTS_MIN_OPACITY = 0.12;
const DOTS_PHASE_STEP = 1 / 8;

const DOTS_SEED = [0.55, 0.3, 0.15, 0.85, 0.55, 0.3, 1, 0.85, 0.55];

function dotScalar(variant: "wave" | "spin", col: number, row: number) {
  const m = DOTS_GRID - 1;
  if (variant === "wave") {
    return ((col + row) / (2 * m)) * (DOTS_GRID / (DOTS_GRID + 1));
  }
  const center = m / 2;
  return (Math.atan2(row - center, col - center) / (2 * Math.PI) + 1) % 1;
}

function dotOpacities(variant: "wave" | "spin", phase: number) {
  return Array.from({ length: DOTS_GRID * DOTS_GRID }, (_, i) => {
    const s = dotScalar(variant, i % DOTS_GRID, Math.floor(i / DOTS_GRID));
    const behind = (phase - s + 1) % 1;
    const lit = Math.max(0, 1 - behind / DOTS_TRAIL) ** 1.5;
    return DOTS_MIN_OPACITY + (1 - DOTS_MIN_OPACITY) * lit;
  });
}

export function DotsIndicator({ variant = "wave" }: { variant?: "wave" | "spin" }) {
  const [opacities, setOpacities] = useState<number[]>(DOTS_SEED);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let phase = 0;
    const id = window.setInterval(() => {
      phase = (phase + DOTS_PHASE_STEP) % 1;
      setOpacities(dotOpacities(variant, phase));
    }, DOTS_TICK_MS);
    return () => window.clearInterval(id);
  }, [variant]);

  return (
    <span
      aria-hidden
      className="grid shrink-0"
      style={{
        gridTemplateColumns: `repeat(${DOTS_GRID}, ${DOTS_SIZE}px)`,
        gap: DOTS_GAP,
      }}
    >
      {opacities.map((opacity, i) => (
        <span
          key={i}
          className="rounded-[1px] bg-current"
          style={{
            width: DOTS_SIZE,
            height: DOTS_SIZE,
            opacity,
            transition: `opacity ${DOTS_FADE_MS}ms ease`,
          }}
        />
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ stars */

const STAR_PERIOD_S = 1.6;
const STAR_COUNT = 5;
const STAR_LAYOUT = [
  { x: 50, y: 46, scale: 1 },
  { x: 18, y: 22, scale: 0.55 },
  { x: 82, y: 26, scale: 0.45 },
  { x: 78, y: 76, scale: 0.55 },
  { x: 22, y: 78, scale: 0.4 },
];
const STAR_PATH = "M12 0C13 7 17 11 24 12C17 13 13 17 12 24C11 17 7 13 0 12C7 11 11 7 12 0Z";

export function StarsIndicator({ size = 15 }: { size?: number }) {
  const box = size * 1.35;
  return (
    <span
      aria-hidden
      className="bui-agent-thinking-stars relative inline-block shrink-0"
      style={{ width: box, height: box }}
    >
      {STAR_LAYOUT.slice(0, STAR_COUNT).map((star, i) => {
        const starSize = size * star.scale;
        return (
          <svg
            key={i}
            viewBox="0 0 24 24"
            className="bui-agent-thinking-star absolute"
            style={{
              width: starSize,
              height: starSize,
              left: `${star.x}%`,
              top: `${star.y}%`,
              marginLeft: -starSize / 2,
              marginTop: -starSize / 2,
              animationDuration: `${STAR_PERIOD_S}s`,
              animationDelay: `${(i * STAR_PERIOD_S * 0.7) / STAR_COUNT}s`,
            }}
          >
            <path d={STAR_PATH} fill="currentColor" />
          </svg>
        );
      })}
    </span>
  );
}

/* --------------------------------------------------------------- infinity */

const INFINITY_WIDTH = 26;
const INFINITY_TRAIL = 12;
const INFINITY_STROKE = 2.5;
const INFINITY_DURATION_S = 1.2;
const INFINITY_PATH =
  "M28 14C33 5 47 5 47 14C47 23 33 23 28 14C23 5 9 5 9 14C9 23 23 23 28 14Z";

export function InfinityIndicator({ width = INFINITY_WIDTH }: { width?: number }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 56 28"
      className="shrink-0"
      style={{ width, height: width / 2, margin: "0 -2px" }}
    >
      <path
        d={INFINITY_PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth={INFINITY_STROKE}
        opacity={0.2}
      />
      <path
        d={INFINITY_PATH}
        pathLength={100}
        fill="none"
        stroke="currentColor"
        strokeWidth={INFINITY_STROKE}
        strokeLinecap="round"
        strokeDasharray={`${INFINITY_TRAIL} ${100 - INFINITY_TRAIL}`}
        className="bui-agent-thinking-comet"
        style={{ animationDuration: `${INFINITY_DURATION_S}s` }}
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ timer */

function ElapsedTimer() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = performance.now();
    const id = window.setInterval(
      () => setElapsed((performance.now() - started) / 1000),
      100,
    );
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className="font-mono text-[10px] text-slate-400 tabular-nums">
      {elapsed.toFixed(1)}s
    </span>
  );
}

/* ----------------------------------------------------------------- loader */

export function AgentThinking({
  variant = "stars",
  label,
  tone = "accent",
  shimmer = true,
  showTimer = false,
  size = "sm",
  className = "",
}: AgentThinkingProps) {
  const color = TONE_COLORS[tone ?? VARIANT_TONE[variant]];
  const iconSize = size === "sm" ? 14 : size === "lg" ? 20 : 16;

  return (
    <div
      role="status"
      className={`inline-flex items-center gap-1.5 ${className}`}
      style={{ color, "--bui-agent-thinking-tone": color } as CSSProperties}
    >
      {(variant === "wave" || variant === "spin") && <DotsIndicator variant={variant} />}
      {variant === "stars" && <StarsIndicator size={iconSize} />}
      {variant === "infinity" && <InfinityIndicator width={size === "sm" ? 22 : 28} />}
      {label && (
        <span
          aria-label={label}
          className={`text-[11px] font-bold tracking-wider select-none font-mono ${
            shimmer ? "bui-agent-thinking-label" : ""
          }`}
        >
          {label}
        </span>
      )}
      {showTimer && <ElapsedTimer />}
    </div>
  );
}
