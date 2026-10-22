import { polarPoint, type RadarAxisDef, type RadarSeries } from "@shared/compare-radar";

// One SVG used on the page (theme "screen", follows light/dark) and in the share image (theme "card", fixed dark
// colours, larger type), so they always match.

export interface RadarTheme {
  text: string;
  muted: string;
  grid: string;
  halo: string;
}

export const RADAR_SCREEN_THEME: RadarTheme = {
  text: "var(--fpl-text-primary)",
  muted: "var(--fpl-text-secondary)",
  grid: "var(--fpl-border)",
  halo: "var(--card, #ffffff)",
};

export const RADAR_CARD_THEME: RadarTheme = {
  text: "#f1f5f9",
  muted: "#94a3b8",
  grid: "rgba(255,255,255,0.16)",
  halo: "#0b1020",
};

/** Distinct on light and dark backgrounds; one per compared player (MAX_COMPARE_PLAYERS is 5). */
export const RADAR_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#a855f7"];

interface Props {
  size: number;
  fontSize: number;
  axes: RadarAxisDef[];
  series: RadarSeries[];
  colors: string[];
  names: string[];
  theme: RadarTheme;
}

const RINGS = [0.25, 0.5, 0.75, 1];

export default function CompareRadarChart({ size, fontSize, axes, series, colors, names, theme }: Props) {
  const n = axes.length;
  // `size` is the height; the width adds room either side of the ring for the longest axis labels
  const pad = fontSize * 8.5;
  const width = size + pad * 2;
  const cx = width / 2;
  const cy = size / 2;
  const radius = size / 2 - fontSize * 2.2;
  const pointsFor = (s: RadarSeries) =>
    s.scaled.map((v, i) => polarPoint(cx, cy, Math.max(v, 0.02) * radius, i, n));

  return (
    <svg
      viewBox={`0 0 ${width} ${size}`}
      width="100%"
      role="img"
      aria-label={`Radar chart comparing ${names.join(", ")} on ${axes.map((a) => a.label).join(", ")}`}
      style={{ display: "block", maxWidth: width }}
      data-testid="compare-radar"
    >
      {RINGS.map((r) => (
        <polygon
          key={r}
          points={axes.map((_, i) => { const p = polarPoint(cx, cy, r * radius, i, n); return `${p.x},${p.y}`; }).join(" ")}
          fill="none"
          stroke={theme.grid}
          strokeWidth={r === 1 ? 1.5 : 1}
        />
      ))}
      {axes.map((_, i) => {
        const p = polarPoint(cx, cy, radius, i, n);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={theme.grid} strokeWidth={1} />;
      })}
      {series.map((s, k) => {
        const pts = pointsFor(s);
        return (
          <g key={s.id}>
            <polygon
              points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
              fill={colors[k]}
              fillOpacity={0.18}
              stroke={colors[k]}
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
            {pts.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={s.raw[i] === null ? 0 : fontSize * 0.32}
                fill={colors[k]}
                stroke={theme.halo}
                strokeWidth={1.5}
              />
            ))}
          </g>
        );
      })}
      {axes.map((a, i) => {
        const p = polarPoint(cx, cy, radius + fontSize * 1.2, i, n);
        const anchor = Math.abs(p.x - cx) < radius * 0.12 ? "middle" : p.x > cx ? "start" : "end";
        return (
          <text
            key={a.key}
            x={p.x}
            y={p.y}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize={fontSize}
            fontWeight={700}
            fill={theme.text}
          >
            {a.short}
          </text>
        );
      })}
    </svg>
  );
}
