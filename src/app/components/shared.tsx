import React from "react";

// ─── Color Palette ─────────────────────────────────────────────────────────
export const C = {
  bgBase: "#040c1c",
  bgCard: "#071428",
  bgCardHover: "#0c1e3a",
  bgElevated: "#0d1f3c",
  cyan: "#06b6d4",
  blue: "#3b82f6",
  green: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
  purple: "#8b5cf6",
  textPrimary: "#e2e8f0",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  borderSubtle: "rgba(6,182,212,0.15)",
  borderActive: "rgba(6,182,212,0.5)",
};

// ─── Source Badge ────────────────────────────────────────────────────────────
const sourceMap: Record<string, { label: string; color: string }> = {
  demo_assumption: { label: "demo mode", color: "#f59e0b" },
  literature: { label: "文献数据", color: "#3b82f6" },
  market_research: { label: "市场调研", color: "#10b981" },
  official: { label: "官方数据", color: "#06b6d4" },
  mixed: { label: "混合口径", color: "#a78bfa" },
};

export function SourceBadge({ type }: { type: string }) {
  const s = sourceMap[type] || { label: type, color: "#94a3b8" };
  return (
    <span
      style={{
        fontSize: "10px",
        fontWeight: 500,
        color: s.color,
        border: `1px solid ${s.color}40`,
        borderRadius: "4px",
        padding: "1px 6px",
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
export function StatCard({
  label,
  value,
  unit,
  accent = C.cyan,
  sub,
  icon,
}: {
  label: string;
  value: string | number;
  unit?: string;
  accent?: string;
  sub?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: C.bgCard,
        border: `1px solid ${C.borderSubtle}`,
        borderRadius: "12px",
        padding: "16px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "2px",
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
        }}
      />
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
        {icon && (
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: `${accent}20`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: accent,
            }}
          >
            {icon}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "11px", fontWeight: 500, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {label}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginTop: "4px" }}>
            <span style={{ fontSize: "24px", fontWeight: 700, color: accent }}>{value}</span>
            {unit && <span style={{ fontSize: "12px", fontWeight: 500, color: C.textMuted }}>{unit}</span>}
          </div>
          {sub && <div style={{ fontSize: "11px", color: C.textMuted, marginTop: "2px" }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}

// ─── Data Card ───────────────────────────────────────────────────────────────
export function DataCard({
  children,
  className,
  glowing,
  accent = C.cyan,
  style: extraStyle,
}: {
  children: React.ReactNode;
  className?: string;
  glowing?: boolean;
  accent?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{
        background: C.bgCard,
        border: glowing ? `1px solid ${accent}60` : `1px solid ${C.borderSubtle}`,
        borderRadius: "14px",
        overflow: "hidden",
        boxShadow: glowing ? `0 0 24px ${accent}18` : "none",
        ...extraStyle,
      }}
    >
      {children}
    </div>
  );
}

export function RevealBlock({
  show,
  children,
  delayMs = 0,
  offsetY = 12,
}: {
  show: boolean;
  children: React.ReactNode;
  delayMs?: number;
  offsetY?: number;
}) {
  const [shouldRender, setShouldRender] = React.useState(show);
  const [entered, setEntered] = React.useState(false);

  React.useEffect(() => {
    let enterTimer: number | undefined;
    let exitTimer: number | undefined;

    if (show) {
      setShouldRender(true);
      enterTimer = window.setTimeout(() => setEntered(true), delayMs);
    } else {
      setEntered(false);
      exitTimer = window.setTimeout(() => setShouldRender(false), 220);
    }

    return () => {
      if (enterTimer !== undefined) window.clearTimeout(enterTimer);
      if (exitTimer !== undefined) window.clearTimeout(exitTimer);
    };
  }, [show, delayMs]);

  if (!shouldRender) return null;

  return (
    <div
      style={{
        opacity: entered ? 1 : 0,
        transform: entered ? "translateY(0px) scale(1)" : `translateY(${offsetY}px) scale(0.985)`,
        filter: entered ? "blur(0px)" : "blur(4px)",
        transition:
          "opacity 380ms cubic-bezier(0.22, 1, 0.36, 1), transform 460ms cubic-bezier(0.22, 1, 0.36, 1), filter 460ms ease",
        willChange: "opacity, transform, filter",
      }}
    >
      {children}
    </div>
  );
}

// ─── Card Header ─────────────────────────────────────────────────────────────
export function CardHeader({
  title,
  subtitle,
  accent = C.cyan,
  right,
}: {
  title: string;
  subtitle?: string;
  accent?: string;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: "14px 16px 12px",
        borderBottom: `1px solid ${C.borderSubtle}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "3px", height: "16px", background: accent, borderRadius: "2px", flexShrink: 0 }} />
          <span style={{ fontSize: "14px", fontWeight: 600, color: C.textPrimary }}>{title}</span>
        </div>
        {subtitle && (
          <div style={{ fontSize: "11px", color: C.textMuted, marginTop: "2px", paddingLeft: "11px" }}>
            {subtitle}
          </div>
        )}
      </div>
      {right}
    </div>
  );
}

// ─── Module Header ───────────────────────────────────────────────────────────
export function ModuleHeader({
  step,
  title,
  description,
  deliverables,
  accentColor,
  statusLabel,
  statusColor,
}: {
  step: number;
  title: string;
  description: string;
  deliverables?: string[];
  accentColor: string;
  statusLabel?: string;
  statusColor?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "16px",
        marginBottom: "20px",
      }}
    >
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "12px",
          background: `${accentColor}20`,
          border: `1px solid ${accentColor}50`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: "18px", fontWeight: 700, color: accentColor }}>0{step}</span>
      </div>
      <div style={{ flex: 1 }}>
        <h1 style={{ fontSize: "20px", fontWeight: 700, color: C.textPrimary, margin: 0 }}>{title}</h1>
        <p style={{ fontSize: "13px", color: C.textSecondary, margin: "2px 0 0" }}>{description}</p>
        {deliverables && deliverables.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: C.textMuted,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              本页产出
            </span>
            {deliverables.map((item) => (
              <span
                key={item}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "4px 10px",
                  borderRadius: "999px",
                  background: `${accentColor}16`,
                  border: `1px solid ${accentColor}35`,
                  color: accentColor,
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                {item}
              </span>
            ))}
          </div>
        )}
      </div>
      {statusLabel && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 12px",
            background: `${statusColor || accentColor}18`,
            border: `1px solid ${statusColor || accentColor}40`,
            borderRadius: "20px",
          }}
        >
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: statusColor || accentColor,
            }}
            className="animate-pulse"
          />
          <span style={{ fontSize: "12px", fontWeight: 500, color: statusColor || accentColor }}>
            {statusLabel}
          </span>
        </div>
      )}
    </div>
  );
}

export function MetaChip({
  label,
  value,
  color = C.textMuted,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      style={{
        padding: "6px 10px",
        borderRadius: "8px",
        border: `1px solid ${C.borderSubtle}`,
        background: C.bgCardHover,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: "10px",
          color: C.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: "2px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "12px",
          fontWeight: 600,
          color,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export function EvidenceListItem({
  title,
  detail,
  right,
}: {
  title: string;
  detail: string;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: "10px",
        border: `1px solid ${C.borderSubtle}`,
        background: C.bgCardHover,
        display: "flex",
        gap: "12px",
        alignItems: "flex-start",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "12px", fontWeight: 600, color: C.textPrimary }}>
          {title}
        </div>
        <div style={{ fontSize: "11px", color: C.textMuted, lineHeight: 1.5, marginTop: "3px" }}>
          {detail}
        </div>
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  );
}

// ─── Score Ring ───────────────────────────────────────────────────────────────
export function ScoreRing({ score, size = 80, accent = C.cyan }: { score: number; size?: number; accent?: string }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`${accent}20`} strokeWidth="4" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={accent}
        strokeWidth="4"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ filter: `drop-shadow(0 0 4px ${accent})` }}
      />
      <text
        x={size / 2}
        y={size / 2 + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={accent}
        style={{ fontSize: "16px", fontWeight: 700 }}
      >
        {score}
      </text>
    </svg>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
export function ProgressBar({ value, max = 100, accent = C.cyan, height = 6 }: {
  value: number; max?: number; accent?: string; height?: number;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ height: `${height}px`, background: `${accent}20`, borderRadius: "4px", overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${accent}80, ${accent})`,
          borderRadius: "4px",
          transition: "width 1s ease",
        }}
      />
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
export function Badge({ label, color = C.cyan }: { label: string; color?: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: "6px",
        background: `${color}18`,
        border: `1px solid ${color}40`,
        color: color,
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.04em",
      }}
    >
      {label}
    </span>
  );
}
