import { useId, useMemo, useState } from "react";
import {
  colorCategory,
  colorLegend,
  declutterLabels,
  dotRadius,
  formatStatValue,
  getStat,
  labelRect,
  makeScale,
  median,
  niceDomain,
  niceTicks,
  sizeValue,
  type ColorMode,
  type PlotPlayer,
  type ScaleKind,
  type SizeMode,
  type StatDef,
  type TrendLine,
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
  /** text colour on top of a filled median tag */
  medianText: string;
  /** tick numbers and axis titles (stronger than `muted`) */
  tick: string;
  plotBg: string;
  /** bottom colour of the plot-area gradient */
  plotBg2: string;
  dotStroke: string;
  tipBg: string;
  tipBorder: string;
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
  medianText: "#ffffff",
  tick: "var(--fpl-text-primary)",
  plotBg: "color-mix(in srgb, var(--card, #ffffff) 94%, #6366f1)",
  plotBg2: "var(--card, #ffffff)",
  dotStroke: "#ffffff",
  tipBg: "var(--card, #ffffff)",
  tipBorder: "rgba(100,116,139,0.45)",
  good: "rgba(16,185,129,0.26)",
  bad: "rgba(239,68,68,0.20)",
  goodText: "#059669",
  badText: "#dc2626",
};

export const CARD_THEME: PlotTheme = {
  text: "#f1f5f9",
  muted: "#94a3b8",
  grid: "rgba(255,255,255,0.09)",
  halo: "#0b1020",
  median: "#fbbf24",
  medianText: "#0b1020",
  tick: "#e2e8f0",
  plotBg: "rgba(129,140,248,0.10)",
  plotBg2: "rgba(255,255,255,0.02)",
  dotStroke: "rgba(255,255,255,0.92)",
  tipBg: "#111a33",
  tipBorder: "rgba(255,255,255,0.25)",
  good: "rgba(52,211,153,0.28)",
  bad: "rgba(248,113,113,0.22)",
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
  /** Colour dots by this instead of the club (club colours when omitted). */
  colorMode?: ColorMode;
  /** Scale dot size by this stat (same size when omitted). */
  sizeMode?: SizeMode;
  /** The person's own squad: gold ring and bold label. */
  mineIds?: Set<number>;
  /** A straight trend line through the plotted players. */
  trend?: TrendLine | null;
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

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

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
  colorMode = "club",
  sizeMode = "none",
  mineIds,
  trend = null,
  selectedId,
  onSelect,
  interactive = true,
}: Props) {
  const xDef = getStat(xKey);
  const yDef = getStat(yKey);
  const ml = Math.round(fontSize * 4.2);
  const mr = Math.round(fontSize * 1.4);
  const mt = Math.round(fontSize * 2.2); // room for the vertical-median tag above the plot
  const mb = Math.round(fontSize * 4);
  const pw = width - ml - mr;
  const ph = height - mt - mb;
  const capSize = Math.round(fontSize * 0.95);
  const radius = Math.max(6, Math.round(fontSize * 0.7));
  const uid = useId().replace(/:/g, "");
  const [hoverId, setHoverId] = useState<number | null>(null);
  // the starred name is a little wider
  const labelText = (p: PlotPlayer) => (mineIds?.has(p.id) ? `★ ${p.name}` : p.name);
  const labelWidth = (p: PlotPlayer) => Math.ceil(labelText(p).length * fontSize * 0.58) + 4;
  const tagWidth = (text: string) => Math.ceil(text.length * capSize * 0.66) + 12;
  const tagHeight = capSize + 7;
  const medianLabel = (def: StatDef | undefined, v: number) => `${fontSize >= 12 ? "MEDIAN" : "MED"} ${medianText(def, v)}`;

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
    const r = radius;
    const points = model.pts.map((p, i) => ({
      id: p.id,
      // measured inside the plot area, so labels never run over the axis numbers
      x: model.px(p.values[xKey] as number) - ml,
      y: model.py(p.values[yKey] as number) - mt,
      w: labelWidth(p),
      h: fontSize + 3,
      // highlighted and selected players always get first pick of label space; the rest by the order given
      priority: p.id === selectedId ? -3 : mineIds?.has(p.id) ? -2 : highlightIds?.has(p.id) ? -1 : i,
      r,
    }));
    // corner captions are text too: keep player labels off them (coordinates here are inside the plot area)
    const cap = capSize;
    const capRect = (text: string, right: boolean, bottom: boolean) => {
      const w = Math.ceil(text.length * cap * 0.78) + 12;
      return { x: right ? pw - w : 0, y: bottom ? ph - cap - 12 : 0, w, h: cap + 12 };
    };
    const blocked = quadrants
      ? [capRect(quadrants.tl, false, false), capRect(quadrants.tr, true, false), capRect(quadrants.bl, false, true), capRect(quadrants.br, true, true)]
      : [];
    // the horizontal-median tag sits inside the plot at the right-hand end
    if (showMedian && model.medY !== null) {
      const tw = tagWidth(medianLabel(yDef, model.medY));
      blocked.push({ x: pw - tw - 6, y: model.py(model.medY) - mt - tagHeight - 4, w: tw + 6, h: tagHeight + 4 });
    }
    return declutterLabels(points, { width: pw, height: ph }, blocked, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, xKey, yKey, fontSize, pw, ph, ml, mt, highlightIds, mineIds, selectedId, quadrants, showMedian, radius]);

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
  const hasHighlight = !!highlightIds && highlightIds.size > 0;
  const legend = new Map(colorLegend(colorMode).map((l) => [l.key, l.color]));
  const dotColor = (p: PlotPlayer) => {
    const cat = colorCategory(p, colorMode);
    return (cat !== null && legend.get(cat)) || teamColor(p.teamShort);
  };
  const sizes = sizeMode === "none" ? [] : pts.map((p) => sizeValue(p, sizeMode)).filter((v): v is number => v !== null);
  const sizeMin = sizes.length ? Math.min(...sizes) : 0;
  const sizeMax = sizes.length ? Math.max(...sizes) : 0;
  const rOf = (p: PlotPlayer) => dotRadius(sizeValue(p, sizeMode), sizeMin, sizeMax, radius);
  // trend line sampled across the x range, so it also bends correctly on a stretched axis
  const trendPath = (() => {
    if (!trend) return null;
    const pieces: string[] = [];
    const steps = 60;
    let drawing = false;
    for (let i = 0; i <= steps; i++) {
      const xv = model.xLo + ((model.xHi - model.xLo) * i) / steps;
      const yv = trend.intercept + trend.slope * xv;
      if (yv < model.yLo || yv > model.yHi) {
        drawing = false;
        continue;
      }
      pieces.push(`${drawing ? "L" : "M"}${px(xv).toFixed(1)} ${py(yv).toFixed(1)}`);
      drawing = true;
    }
    return pieces.length > 1 ? pieces.join(" ") : null;
  })();

  const activeId = hoverId ?? selectedId ?? null;
  const active = activeId !== null ? pts.find((p) => p.id === activeId) ?? null : null;
  const dotWeight = (p: PlotPlayer) => Number(p.id === activeId) * 4 + Number(p.id === selectedId || !!highlightIds?.has(p.id)) * 2 + Number(!!mineIds?.has(p.id));

  // hover card: beside the dot, flipped when it would leave the chart
  const tip = (() => {
    if (!interactive || !active) return null;
    const rows: Array<[string, string]> = [
      [clip(axisTitle(xDef, xKey), 40), formatStatValue(xDef, active.values[xKey])],
      [clip(axisTitle(yDef, yKey), 40), formatStatValue(yDef, active.values[yKey])],
    ];
    const sub = `${active.teamShort} · ${active.position} · £${active.price.toFixed(1)}m${active.available ? "" : " · doubtful/out"}`;
    const tf = fontSize;
    const w = Math.ceil(Math.max(active.name.length * (tf + 1) * 0.6, sub.length * tf * 0.56, ...rows.map(([l, v]) => (l.length + v.length) * tf * 0.58 + 22))) + 22;
    const h = Math.round(tf * 1.5 * (2 + rows.length)) + 14;
    const cx = px(active.values[xKey] as number);
    const cy = py(active.values[yKey] as number);
    const gap = rOf(active) + 14;
    let x = cx + gap;
    if (x + w > width - 4) x = cx - gap - w;
    x = Math.max(4, x);
    let y = cy - h / 2;
    y = Math.max(4, Math.min(height - h - 4, y));
    return { x, y, w, h, tf, rows, sub };
  })();

  const xMedLabel = mx !== null ? medianLabel(xDef, medX as number) : "";
  const yMedLabel = my !== null ? medianLabel(yDef, medY as number) : "";
  const xTagW = tagWidth(xMedLabel);
  const yTagW = tagWidth(yMedLabel);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      role="img"
      aria-label={`Scatter plot of ${axisTitle(yDef, yKey)} against ${axisTitle(xDef, xKey)} for ${pts.length} players`}
      style={{ display: "block", fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif", touchAction: "manipulation" }}
    >
      <defs>
        <clipPath id={`${uid}-plot`}>
          <rect x={left} y={top} width={pw} height={ph} rx={12} />
        </clipPath>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={theme.plotBg} />
          <stop offset="1" stopColor={theme.plotBg2} />
        </linearGradient>
        <filter id={`${uid}-shadow`} x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#0f172a" floodOpacity="0.32" />
        </filter>
        {/* strongest in the corner, fading toward the median lines */}
        <linearGradient id={`${uid}-good`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={theme.good} stopOpacity={1} />
          <stop offset="1" stopColor={theme.good} stopOpacity={0.2} />
        </linearGradient>
        <linearGradient id={`${uid}-bad`} x1="1" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={theme.bad} stopOpacity={1} />
          <stop offset="1" stopColor={theme.bad} stopOpacity={0.2} />
        </linearGradient>
      </defs>

      {/* plot background, so the chart stands apart from the card around it */}
      <rect x={left} y={top} width={pw} height={ph} rx={12} fill={`url(#${uid}-bg)`} />

      {/* quadrant tints */}
      {quadrants && tint && mx !== null && my !== null && (
        <g clipPath={`url(#${uid}-plot)`}>
          <rect x={left} y={top} width={Math.max(0, mx - left)} height={Math.max(0, my - top)} fill={`url(#${uid}-good)`} />
          <rect x={mx} y={my} width={Math.max(0, right - mx)} height={Math.max(0, bottom - my)} fill={`url(#${uid}-bad)`} />
        </g>
      )}

      {/* grid + ticks */}
      {yTicks.map((t) => (
        <g key={`y${t}`}>
          <line x1={left} x2={right} y1={py(t)} y2={py(t)} stroke={theme.grid} strokeWidth={1} strokeDasharray="1 5" strokeLinecap="round" />
          <text x={left - 8} y={py(t)} textAnchor="end" dominantBaseline="central" fill={theme.tick} fillOpacity={0.78} fontSize={fontSize} fontWeight={500}>
            {tickText(yDef, t)}
          </text>
        </g>
      ))}
      {xTicks.map((t) => (
        <g key={`x${t}`}>
          <line x1={px(t)} x2={px(t)} y1={top} y2={bottom} stroke={theme.grid} strokeWidth={1} strokeDasharray="1 5" strokeLinecap="round" />
          <text x={px(t)} y={bottom + fontSize + 6} textAnchor="middle" fill={theme.tick} fillOpacity={0.78} fontSize={fontSize} fontWeight={500}>
            {tickText(xDef, t)}
          </text>
        </g>
      ))}
      <rect x={left} y={top} width={pw} height={ph} rx={12} fill="none" stroke={theme.grid} strokeWidth={1.25} />

      {/* axis titles */}
      <text x={left + pw / 2} y={height - 6} textAnchor="middle" fill={theme.tick} fillOpacity={0.9} fontSize={fontSize} fontWeight={800} letterSpacing={0.8}>
        {axisTitle(xDef, xKey).toUpperCase()}
        {xScale === "sqrt" ? " (STRETCHED SCALE)" : ""}
      </text>
      <text
        transform={`translate(${Math.round(fontSize * 0.9)} ${top + ph / 2}) rotate(-90)`}
        textAnchor="middle"
        fill={theme.tick}
        fillOpacity={0.9}
        fontSize={fontSize}
        fontWeight={800}
        letterSpacing={0.8}
      >
        {axisTitle(yDef, yKey).toUpperCase()}
        {yScale === "sqrt" ? " (STRETCHED SCALE)" : ""}
      </text>

      {/* medians: dashed lines inside the plot, value tags on the edge so they never sit on a player */}
      {mx !== null && (
        <>
          <line x1={mx} x2={mx} y1={top} y2={bottom} stroke={theme.median} strokeWidth={1.5} strokeDasharray="6 5" />
          <g transform={`translate(${Math.max(left, Math.min(right - xTagW, mx - xTagW / 2))} ${top - tagHeight - 3})`}>
            <rect width={xTagW} height={tagHeight} rx={tagHeight / 2} fill={theme.median} />
            <text x={xTagW / 2} y={tagHeight / 2} textAnchor="middle" dominantBaseline="central" fill={theme.medianText} fontSize={capSize} fontWeight={800} letterSpacing={0.3}>
              {xMedLabel}
            </text>
          </g>
        </>
      )}
      {my !== null && (
        <>
          <line x1={left} x2={right} y1={my} y2={my} stroke={theme.median} strokeWidth={1.5} strokeDasharray="6 5" />
          <g transform={`translate(${right - yTagW - 6} ${my - tagHeight - 4})`}>
            <rect width={yTagW} height={tagHeight} rx={tagHeight / 2} fill={theme.median} />
            <text x={yTagW / 2} y={tagHeight / 2} textAnchor="middle" dominantBaseline="central" fill={theme.medianText} fontSize={capSize} fontWeight={800} letterSpacing={0.3}>
              {yMedLabel}
            </text>
          </g>
        </>
      )}

      {/* corner captions */}
      {quadrants && (
        <g fontSize={capSize} fontWeight={800} letterSpacing={0.8} stroke={theme.halo} strokeWidth={3} strokeLinejoin="round" paintOrder="stroke">
          <text x={left + 10} y={top + capSize + 8} fill={tint ? theme.goodText : theme.muted}>{quadrants.tl.toUpperCase()}</text>
          <text x={right - 10} y={top + capSize + 8} textAnchor="end" fill={theme.muted}>{quadrants.tr.toUpperCase()}</text>
          <text x={left + 10} y={bottom - 10} fill={theme.muted}>{quadrants.bl.toUpperCase()}</text>
          <text x={right - 10} y={bottom - 10} textAnchor="end" fill={tint ? theme.badText : theme.muted}>{quadrants.br.toUpperCase()}</text>
        </g>
      )}

      {/* trend line */}
      {trend && trendPath && (
        <g>
          <path d={trendPath} fill="none" stroke="#8b5cf6" strokeWidth={2.5} strokeDasharray="8 5" strokeLinecap="round" opacity={0.9} />
          <text x={right - 6} y={top + capSize * 2 + 16} textAnchor="end" fill="#8b5cf6" fontSize={capSize} fontWeight={800} letterSpacing={0.6} stroke={theme.halo} strokeWidth={3} paintOrder="stroke">
            {`TREND · R² ${trend.r2.toFixed(2)}`}
          </text>
        </g>
      )}

      {/* dots: the pointed-at, selected and highlighted ones last so they sit on top */}
      {[...pts]
        .sort((a, b) => dotWeight(a) - dotWeight(b))
        .map((p) => {
          const cx = px(p.values[xKey] as number);
          const cy = py(p.values[yKey] as number);
          const isSel = p.id === selectedId || p.id === hoverId;
          const isHi = !!highlightIds?.has(p.id);
          const isMine = !!mineIds?.has(p.id);
          const dim = hasHighlight && !isHi && !isSel && !isMine;
          const r = rOf(p);
          return (
            <g
              key={p.id}
              opacity={dim ? 0.35 : p.available ? 1 : 0.55}
              style={interactive ? { cursor: "pointer" } : undefined}
              onPointerEnter={interactive ? (e) => { if (e.pointerType === "mouse") setHoverId(p.id); } : undefined}
              onPointerLeave={interactive ? (e) => { if (e.pointerType === "mouse") setHoverId((h) => (h === p.id ? null : h)); } : undefined}
              onClick={interactive && onSelect ? () => onSelect(p.id === selectedId ? null : p.id) : undefined}
              data-testid={`plot-dot-${p.id}`}
            >
              {interactive && <circle cx={cx} cy={cy} r={r + 9} fill="transparent" />}
              {(isSel || isHi) && <circle cx={cx} cy={cy} r={r + (isMine ? 7 : 4)} fill="none" stroke={theme.text} strokeWidth={2} />}
              {isMine && <circle cx={cx} cy={cy} r={r + 3} fill="none" stroke="#f59e0b" strokeWidth={2} />}
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={dotColor(p)}
                stroke={theme.dotStroke}
                strokeWidth={1.75}
                strokeDasharray={p.available ? undefined : "2 2"}
                filter={interactive && p.available ? `url(#${uid}-shadow)` : undefined}
              />
              {/* soft gloss, so the dots read as little beads rather than flat discs */}
              {p.available && <ellipse cx={cx - r * 0.22} cy={cy - r * 0.38} rx={r * 0.5} ry={r * 0.3} fill="#ffffff" opacity={0.3} style={{ pointerEvents: "none" }} />}
            </g>
          );
        })}

      {/* labels (a short leader line when the label had to be lifted off its dot) */}
      {pts.map((p) => {
        const side = labels.get(p.id);
        if (!side) return null;
        const w = labelWidth(p);
        const h = fontSize + 3;
        const cx = px(p.values[xKey] as number);
        const cy = py(p.values[yKey] as number);
        const r = rOf(p);
        const rect = labelRect({ id: p.id, x: cx, y: cy, w, h, priority: 0, r }, side);
        const toRight = side === "right" || side === "aboveRight" || side === "belowRight";
        const toLeft = side === "left" || side === "aboveLeft" || side === "belowLeft";
        const anchor = toRight ? "start" : toLeft ? "end" : "middle";
        const tx = toRight ? rect.x : toLeft ? rect.x + rect.w : rect.x + rect.w / 2;
        const bold = p.id === selectedId || p.id === hoverId || !!highlightIds?.has(p.id) || !!mineIds?.has(p.id);
        const dim = hasHighlight && !bold;
        const diagonal = side.startsWith("above") && side !== "above" ? true : side.startsWith("below") && side !== "below";
        let leader: { x1: number; y1: number; x2: number; y2: number } | null = null;
        if (diagonal) {
          const ex = toRight ? rect.x - 1 : rect.x + rect.w + 1;
          const ey = side.startsWith("above") ? rect.y + rect.h - 2 : rect.y + 2;
          const len = Math.hypot(ex - cx, ey - cy) || 1;
          leader = { x1: cx + ((ex - cx) / len) * r, y1: cy + ((ey - cy) / len) * r, x2: ex, y2: ey };
        }
        return (
          <g key={`l${p.id}`} opacity={dim ? 0.4 : 1} style={{ pointerEvents: "none" }}>
            {leader && <line {...leader} stroke={theme.muted} strokeWidth={1} strokeLinecap="round" opacity={0.8} />}
            <text
              x={tx}
              y={rect.y + rect.h / 2}
              textAnchor={anchor}
              dominantBaseline="central"
              fontSize={fontSize}
              fontWeight={bold ? 800 : 600}
              fill={theme.text}
              stroke={theme.halo}
              strokeWidth={4}
              strokeLinejoin="round"
              paintOrder="stroke"
            >
              {labelText(p)}
            </text>
          </g>
        );
      })}

      {/* hover card */}
      {tip && active && (
        <g transform={`translate(${tip.x} ${tip.y})`} style={{ pointerEvents: "none" }}>
          <rect width={tip.w} height={tip.h} rx={14} fill={theme.tipBg} stroke={theme.tipBorder} strokeWidth={1} style={{ filter: "drop-shadow(0 8px 18px rgba(15,23,42,0.30))" }} />
          <rect width={tip.w - 28} height={3.5} x={14} y={0} rx={1.75} fill={dotColor(active)} />
          <circle cx={tip.w - 16} cy={tip.tf * 1.5 - 3} r={5} fill={dotColor(active)} stroke={theme.dotStroke} strokeWidth={1.5} />
          <text x={14} y={tip.tf * 1.5 + 2} fill={theme.text} fontSize={tip.tf + 2} fontWeight={800}>{active.name}</text>
          <text x={14} y={tip.tf * 3 + 2} fill={theme.muted} fontSize={tip.tf} fontWeight={600}>{tip.sub}</text>
          {tip.rows.map(([label, value], i) => (
            <g key={label}>
              <text x={14} y={tip.tf * 4.5 + 2 + i * tip.tf * 1.5} fill={theme.muted} fontSize={tip.tf}>{label}</text>
              <text x={tip.w - 12} y={tip.tf * 4.5 + 2 + i * tip.tf * 1.5} textAnchor="end" fill={theme.text} fontSize={tip.tf} fontWeight={800}>{value}</text>
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}
