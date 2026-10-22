import { useMemo } from "react";
import {
  declutterLabels,
  getStat,
  labelRect,
  makeScale,
  median,
  niceDomain,
  niceTicks,
  type PlotPlayer,
  type ScaleKind,
  type StatDef,
} from "@shared/player-plot";
import { teamColor } from "@/lib/team-colors";

// One SVG used both on the page (theme "screen", follows light/dark) and for the share image
// (theme "card", fixed dark colours and larger type), so the two always look the same.

export interface PlotTheme {
  text: string;
  muted: string;
  grid: string;
  halo: string;
  median: string;
  good: string;
  bad: string;
  goodText: string;
  badText: string;
}

export const SCREEN_THEME: PlotTheme = {
  text: "var(--fpl-text-primary)",
  muted: "var(--fpl-text-secondary)",
  grid: "var(--fpl-border)",
  halo: "var(--card, #ffffff)",
  median: "#d97706",
  good: "rgba(16,185,129,0.10)",
  bad: "rgba(239,68,68,0.08)",
  goodText: "#059669",
  badText: "#dc2626",
};

export const CARD_THEME: PlotTheme = {
  text: "#f1f5f9",
  muted: "#94a3b8",
  grid: "rgba(255,255,255,0.09)",
  halo: "#0b1020",
  median: "#fbbf24",
  good: "rgba(52,211,153,0.12)",
  bad: "rgba(248,113,113,0.10)",
  goodText: "#34d399",
  badText: "#f87171",
};

interface Props {
  width: number;
  height: number;
  fontSize: number;
  players: PlotPlayer[];
  xKey: string;
  yKey: string;
  xScale: ScaleKind;
  yScale: ScaleKind;
  showMedian: boolean;
  quadrants?: { tl: string; tr: string; bl: string; br: string };
  /** Colour the top-left corner green and bottom-right red (only when those really are the good / bad corners). */
  tint?: boolean;
  theme: PlotTheme;
  highlightIds?: Set<number>;
  selectedId?: number | null;
  onSelect?: (id: number | null) => void;
  interactive?: boolean;
}

function tickText(def: StatDef | undefined, v: number): string {
  const n = Math.abs(v) >= 1000 ? v.toLocaleString("en-GB") : String(Math.round(v * 100) / 100);
  if (def?.format === "percent") return `${n}%`;
  if (def?.format === "price") return `£${n}m`;
  return n;
}

function medianText(def: StatDef | undefined, v: number): string {
  const places = def?.format === "dec2" ? 2 : 1;
  const r = Math.round(v * 10 ** places) / 10 ** places;
  return tickText(def, r);
}

function axisTitle(def: StatDef | undefined, key: string): string {
  return def?.label ?? key;
}

export default function PlayerPlotChart({
  width,
  height,
  fontSize,
  players,
  xKey,
  yKey,
  xScale,
  yScale,
  showMedian,
  quadrants,
  tint = true,
  theme,
  highlightIds,
  selectedId,
  onSelect,
  interactive = true,
}: Props) {
  const xDef = getStat(xKey);
  const yDef = getStat(yKey);
  const ml = Math.round(fontSize * 4.2);
  const mr = Math.round(fontSize * 1.4);
  const mt = Math.round(fontSize * 1.2);
  const mb = Math.round(fontSize * 4);
  const pw = width - ml - mr;
  const ph = height - mt - mb;

  const model = useMemo(() => {
    const pts = players.filter((p) => p.values[xKey] != null && p.values[yKey] != null);
    if (pts.length === 0) return null;
    const xs = pts.map((p) => p.values[xKey] as number);
    const ys = pts.map((p) => p.values[yKey] as number);
    const xCount = pw < 420 ? 5 : 7;
    const [xLo, xHi] = niceDomain(Math.min(...xs), Math.max(...xs), xCount);
    const [yLo, yHi] = niceDomain(Math.min(...ys), Math.max(...ys), 6);
    const sx = makeScale(xScale, xLo, xHi);
    const sy = makeScale(yScale, yLo, yHi);
    const px = (v: number) => ml + sx.forward(v) * pw;
    const py = (v: number) => mt + (1 - sy.forward(v)) * ph;
    const medX = median(xs);
    const medY = median(ys);
    return { pts, xLo, xHi, yLo, yHi, px, py, medX, medY, xTicks: niceTicks(xLo, xHi, xCount), yTicks: niceTicks(yLo, yHi, 6) };
  }, [players, xKey, yKey, xScale, yScale, ml, mt, pw, ph]);

  const labels = useMemo(() => {
    if (!model) return new Map();
    const r = Math.max(4, Math.round(fontSize * 0.5));
    const points = model.pts.map((p, i) => ({
      id: p.id,
      // measured inside the plot area, so labels never run over the axis numbers
      x: model.px(p.values[xKey] as number) - ml,
      y: model.py(p.values[yKey] as number) - mt,
      w: Math.ceil(p.name.length * fontSize * 0.58) + 4,
      h: fontSize + 3,
      // highlighted and selected players always get first pick of label space; the rest by the order given
      priority: p.id === selectedId ? -2 : highlightIds?.has(p.id) ? -1 : i,
      r,
    }));
    // corner captions are text too: keep player labels off them (coordinates here are inside the plot area)
    const cap = Math.round(fontSize * 0.85);
    const capRect = (text: string, right: boolean, bottom: boolean) => {
      const w = Math.ceil(text.length * cap * 0.78) + 12;
      return { x: right ? pw - w : 0, y: bottom ? ph - cap - 12 : 0, w, h: cap + 12 };
    };
    const blocked = quadrants
      ? [capRect(quadrants.tl, false, false), capRect(quadrants.tr, true, false), capRect(quadrants.bl, false, true), capRect(quadrants.br, true, true)]
      : [];
    return declutterLabels(points, { width: pw, height: ph }, blocked, 5);
  }, [model, xKey, yKey, fontSize, pw, ph, ml, mt, highlightIds, selectedId, quadrants]);

  if (!model) {
    return (
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label="No players to plot">
        <text x={width / 2} y={height / 2} textAnchor="middle" fill={theme.muted} fontSize={fontSize + 2}>
          No players have both stats for this selection
        </text>
      </svg>
    );
  }

  const { pts, px, py, medX, medY, xTicks, yTicks } = model;
  const left = ml;
  const right = ml + pw;
  const top = mt;
  const bottom = mt + ph;
  const mx = showMedian && medX !== null ? px(medX) : null;
  const my = showMedian && medY !== null ? py(medY) : null;
  const radius = Math.max(4, Math.round(fontSize * 0.5));
  const capSize = Math.round(fontSize * 0.85);
  const hasHighlight = !!highlightIds && highlightIds.size > 0;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      role="img"
      aria-label={`Scatter plot of ${axisTitle(yDef, yKey)} against ${axisTitle(xDef, xKey)} for ${pts.length} players`}
      style={{ display: "block", fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif", touchAction: "manipulation" }}
    >
      {/* quadrant tints */}
      {quadrants && tint && mx !== null && my !== null && (
        <>
          <rect x={left} y={top} width={Math.max(0, mx - left)} height={Math.max(0, my - top)} fill={theme.good} />
          <rect x={mx} y={my} width={Math.max(0, right - mx)} height={Math.max(0, bottom - my)} fill={theme.bad} />
        </>
      )}

      {/* grid + ticks */}
      {yTicks.map((t) => (
        <g key={`y${t}`}>
          <line x1={left} x2={right} y1={py(t)} y2={py(t)} stroke={theme.grid} strokeWidth={1} />
          <text x={left - 6} y={py(t)} textAnchor="end" dominantBaseline="central" fill={theme.muted} fontSize={fontSize}>
            {tickText(yDef, t)}
          </text>
        </g>
      ))}
      {xTicks.map((t) => (
        <g key={`x${t}`}>
          <line x1={px(t)} x2={px(t)} y1={top} y2={bottom} stroke={theme.grid} strokeWidth={1} />
          <text x={px(t)} y={bottom + fontSize + 4} textAnchor="middle" fill={theme.muted} fontSize={fontSize}>
            {tickText(xDef, t)}
          </text>
        </g>
      ))}
      <rect x={left} y={top} width={pw} height={ph} fill="none" stroke={theme.grid} strokeWidth={1} />

      {/* axis titles */}
      <text x={left + pw / 2} y={height - 6} textAnchor="middle" fill={theme.muted} fontSize={fontSize} fontWeight={700} letterSpacing={0.4}>
        {axisTitle(xDef, xKey).toUpperCase()}
        {xScale === "sqrt" ? " (STRETCHED SCALE)" : ""}
      </text>
      <text
        transform={`translate(${Math.round(fontSize * 0.9)} ${top + ph / 2}) rotate(-90)`}
        textAnchor="middle"
        fill={theme.muted}
        fontSize={fontSize}
        fontWeight={700}
        letterSpacing={0.4}
      >
        {axisTitle(yDef, yKey).toUpperCase()}
        {yScale === "sqrt" ? " (STRETCHED SCALE)" : ""}
      </text>

      {/* medians */}
      {mx !== null && (
        <>
          <line x1={mx} x2={mx} y1={top} y2={bottom} stroke={theme.median} strokeWidth={1.5} strokeDasharray="6 5" />
          <text x={mx + 4} y={bottom - 4} fill={theme.median} fontSize={capSize} fontWeight={700}>
            {`${fontSize >= 12 ? "MEDIAN" : "MED"} ${medianText(xDef, medX as number)}`}
          </text>
        </>
      )}
      {my !== null && (
        <>
          <line x1={left} x2={right} y1={my} y2={my} stroke={theme.median} strokeWidth={1.5} strokeDasharray="6 5" />
          <text x={right - 4} y={my - 5} textAnchor="end" fill={theme.median} fontSize={capSize} fontWeight={700}>
            {`${fontSize >= 12 ? "MEDIAN" : "MED"} ${medianText(yDef, medY as number)}`}
          </text>
        </>
      )}

      {/* corner captions */}
      {quadrants && (
        <g fontSize={capSize} fontWeight={800} letterSpacing={0.8}>
          <text x={left + 8} y={top + capSize + 6} fill={tint ? theme.goodText : theme.muted}>{quadrants.tl.toUpperCase()}</text>
          <text x={right - 8} y={top + capSize + 6} textAnchor="end" fill={theme.muted}>{quadrants.tr.toUpperCase()}</text>
          <text x={left + 8} y={bottom - 8} fill={theme.muted}>{quadrants.bl.toUpperCase()}</text>
          <text x={right - 8} y={bottom - 8} textAnchor="end" fill={tint ? theme.badText : theme.muted}>{quadrants.br.toUpperCase()}</text>
        </g>
      )}

      {/* dots: selected and highlighted last so they sit on top */}
      {[...pts]
        .sort((a, b) => Number(a.id === selectedId || !!highlightIds?.has(a.id)) - Number(b.id === selectedId || !!highlightIds?.has(b.id)))
        .map((p) => {
          const cx = px(p.values[xKey] as number);
          const cy = py(p.values[yKey] as number);
          const isSel = p.id === selectedId;
          const isHi = !!highlightIds?.has(p.id);
          const dim = hasHighlight && !isHi && !isSel;
          return (
            <g
              key={p.id}
              opacity={dim ? 0.35 : p.available ? 1 : 0.55}
              style={interactive ? { cursor: "pointer" } : undefined}
              onPointerEnter={interactive && onSelect ? (e) => { if (e.pointerType === "mouse") onSelect(p.id); } : undefined}
              onClick={interactive && onSelect ? () => onSelect(isSel ? null : p.id) : undefined}
              data-testid={`plot-dot-${p.id}`}
            >
              {interactive && <circle cx={cx} cy={cy} r={radius + 9} fill="transparent" />}
              {(isSel || isHi) && <circle cx={cx} cy={cy} r={radius + 4} fill="none" stroke={theme.text} strokeWidth={2} />}
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill={teamColor(p.teamShort)}
                stroke="rgba(148,163,184,0.95)"
                strokeWidth={1.5}
                strokeDasharray={p.available ? undefined : "2 2"}
              />
            </g>
          );
        })}

      {/* labels */}
      {pts.map((p) => {
        const side = labels.get(p.id);
        if (!side) return null;
        const w = Math.ceil(p.name.length * fontSize * 0.58) + 4;
        const h = fontSize + 3;
        const cx = px(p.values[xKey] as number);
        const cy = py(p.values[yKey] as number);
        const rect = labelRect({ id: p.id, x: cx, y: cy, w, h, priority: 0, r: radius }, side);
        const anchor = side === "right" ? "start" : side === "left" ? "end" : "middle";
        const tx = side === "right" ? rect.x : side === "left" ? rect.x + rect.w : rect.x + rect.w / 2;
        const bold = p.id === selectedId || !!highlightIds?.has(p.id);
        const dim = hasHighlight && !bold;
        return (
          <text
            key={`l${p.id}`}
            x={tx}
            y={rect.y + rect.h / 2}
            textAnchor={anchor}
            dominantBaseline="central"
            fontSize={fontSize}
            fontWeight={bold ? 800 : 600}
            fill={theme.text}
            stroke={theme.halo}
            strokeWidth={3}
            paintOrder="stroke"
            opacity={dim ? 0.4 : 1}
            style={{ pointerEvents: "none" }}
          >
            {p.name}
          </text>
        );
      })}
    </svg>
  );
}
