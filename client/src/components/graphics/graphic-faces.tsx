import { Fragment, type CSSProperties, type ReactNode } from "react";
import {
  GRAPHIC_SIZES,
  fdrColor,
  footerHeight,
  footerNote,
  resolveHeadline,
  watermarkText,
  type ComparisonContent,
  type CoverContent,
  coverTitleFont,
  type DifferentialRow,
  type FixtureGridContent,
  type GraphicSpec,
  type GraphicTheme,
  type LineupToken,
  type PlayerCardContent,
  type PredictedLineupContent,
  type RevealToken,
  type TeamRevealContent,
  type PriceChangeContent,
  type SizeId,
} from "@shared/graphics";
import { getJerseyUrl } from "@/lib/jersey";
import badge from "@/assets/fpl-dilemmas-badge.png?inline";

// Every graphic is drawn at its exact export size with plain inline styles (no theme tokens, no Tailwind), so the
// PNG looks the same on every device. The same component draws the on-screen preview and the exported image.

const FONT = "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif";

export type GraphicData =
  | { kind: "player-card"; card: PlayerCardContent; gwLabel: string }
  | { kind: "player-comparison"; comparison: ComparisonContent }
  | { kind: "fixtures-comparison"; grid: FixtureGridContent; gwLabel: string }
  | { kind: "price-change"; prices: PriceChangeContent; dateLabel: string }
  | { kind: "top-differentials"; rows: DifferentialRow[]; gwLabel: string; subtitle: string }
  | { kind: "predicted-lineup"; lineup: PredictedLineupContent; gwLabel: string }
  | { kind: "team-reveal"; reveal: TeamRevealContent; gwLabel: string }
  | { kind: "cover"; cover: CoverContent };

interface Metrics {
  pad: number;
  title: number;
  sub: number;
  gap: number;
}

const METRICS: Record<SizeId, Metrics> = {
  square: { pad: 56, title: 58, sub: 26, gap: 22 },
  portrait: { pad: 56, title: 62, sub: 28, gap: 26 },
  landscape: { pad: 40, title: 42, sub: 22, gap: 14 },
};

const ellipsis: CSSProperties = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 };

function Jersey({ team, position, px }: { team: string; position: string; px: number }) {
  return (
    <img
      src={getJerseyUrl(team, position)}
      alt=""
      width={px}
      height={px}
      style={{ width: px, height: px, objectFit: "contain", flexShrink: 0 }}
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
  );
}

/** Title, subtitle, content area, and the reserved footer strip that holds the watermark. */
function Frame({
  spec,
  theme,
  subtitle,
  gwLabel,
  bare,
  children,
}: {
  spec: GraphicSpec;
  theme: GraphicTheme;
  subtitle: string;
  gwLabel: string | null;
  /** No title/subtitle block: the face draws its own (the cover). The watermark footer stays. */
  bare?: boolean;
  children: ReactNode;
}) {
  const { width, height } = GRAPHIC_SIZES[spec.size];
  const m = METRICS[spec.size];
  const footer = footerHeight(spec.size);
  const land = spec.size === "landscape";
  return (
    <div
      style={{
        width, height, boxSizing: "border-box", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative",
        background: `linear-gradient(160deg, ${theme.bg} 0%, ${theme.bg2} 100%)`, color: theme.text, fontFamily: FONT,
      }}
    >
      <div style={{ height: 8, background: theme.accent, flexShrink: 0 }} />
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: `${m.pad - 14}px ${m.pad}px 0` }}>
        {!bare && (
          <>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 20, flexShrink: 0 }}>
              <div style={{ fontSize: m.title, fontWeight: 900, lineHeight: 1.1, textTransform: "uppercase", letterSpacing: 0.5, ...ellipsis }}>{resolveHeadlineText(spec)}</div>
            </div>
            <div style={{ fontSize: m.sub, color: theme.muted, fontWeight: 600, marginTop: land ? 4 : 8, flexShrink: 0, ...ellipsis }}>{subtitle}</div>
          </>
        )}
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", marginTop: bare ? 0 : m.gap }}>{children}</div>
      </div>
      <div
        style={{
          height: footer, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24,
          padding: `0 ${m.pad}px`, boxSizing: "border-box",
        }}
      >
        <span style={{ fontSize: land ? 16 : 19, color: theme.muted, fontWeight: 600, ...ellipsis }}>{footerNote(spec, gwLabel)}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, opacity: 0.6 }}>
          <img src={badge} alt="" width={land ? 30 : 36} height={land ? 30 : 36} style={{ width: land ? 30 : 36, height: land ? 30 : 36 }} />
          <span style={{ fontSize: land ? 16 : 19, fontWeight: 800, letterSpacing: 1.5, color: theme.text }}>{watermarkText()}</span>
        </span>
      </div>
    </div>
  );
}

function resolveHeadlineText(spec: GraphicSpec): string {
  return resolveHeadline(spec);
}

function panel(theme: GraphicTheme, extra: CSSProperties = {}): CSSProperties {
  return { background: theme.panel, border: `1px solid ${theme.panelBorder}`, borderRadius: 20, ...extra };
}

function FixtureBox({ items, theme, font }: { items: Array<{ opponent: string; isHome: boolean; difficulty: number }>; theme: GraphicTheme; font: number }) {
  if (!items.length) {
    return (
      <div style={{ ...panel(theme, { borderRadius: 12 }), flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: theme.muted, fontSize: font, fontWeight: 700 }}>—</div>
    );
  }
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      {items.map((f, i) => {
        const c = fdrColor(f.difficulty);
        return (
          <div key={i} style={{ flex: 1, background: c.bg, color: c.fg, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: font, fontWeight: 800, ...ellipsis, padding: "0 6px" }}>
            {f.opponent} {f.isHome ? "(H)" : "(A)"}
          </div>
        );
      })}
    </div>
  );
}

// ---------- Player Card ----------

function PlayerCardFace({ spec, theme, card, gwLabel }: { spec: GraphicSpec; theme: GraphicTheme; card: PlayerCardContent; gwLabel: string }) {
  const land = spec.size === "landscape";
  const tall = spec.size === "portrait";
  const jersey = land ? 120 : tall ? 190 : 150;
  const nameFont = land ? 48 : tall ? 84 : 72;
  const tileValue = land ? 34 : tall ? 46 : 42;
  const tileLabel = land ? 16 : 20;
  const gap = land ? 14 : 20;

  const identity = (
    <div style={{ display: "flex", alignItems: "center", gap: 22, minWidth: 0 }}>
      <Jersey team={card.teamShort} position={card.position} px={jersey} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: nameFont, fontWeight: 900, lineHeight: 1.05, ...ellipsis }}>{card.name}</div>
        <div style={{ fontSize: land ? 22 : 28, color: theme.muted, fontWeight: 700, marginTop: 6, ...ellipsis }}>{card.teamName} · {card.position}</div>
        {land && <div style={{ fontSize: 38, fontWeight: 900, color: theme.accent, lineHeight: 1.1, marginTop: 4 }}>{card.price}</div>}
        {card.news && <div style={{ fontSize: land ? 16 : 20, color: theme.bad, fontWeight: 700, marginTop: 6, ...ellipsis }}>⚠ {card.news}</div>}
      </div>
      {!land && (
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 60, fontWeight: 900, color: theme.accent, lineHeight: 1 }}>{card.price}</div>
          <div style={{ fontSize: 18, color: theme.muted, fontWeight: 700, letterSpacing: 1.5, marginTop: 4 }}>PRICE</div>
        </div>
      )}
    </div>
  );

  const xpts = (
    <div style={{ ...panel(theme), padding: land ? "14px 22px" : "20px 28px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
        <span style={{ fontSize: land ? 18 : 24, fontWeight: 800, color: theme.muted, letterSpacing: 1 }}>EXPECTED POINTS · {gwLabel}</span>
        <span style={{ fontSize: land ? 48 : tall ? 80 : 72, fontWeight: 900, color: card.xpts.total === null ? theme.muted : theme.accent, lineHeight: 1 }}>
          {card.xpts.total === null ? "—" : card.xpts.total.toFixed(1)}
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: land ? 10 : 16 }}>
        {card.xpts.perGameweek.map((g) => (
          <div key={g.gameweek} style={{ flex: 1, textAlign: "center", background: theme.panel, borderRadius: 12, padding: land ? "6px 0" : "10px 0", minWidth: 0 }}>
            <div style={{ fontSize: land ? 14 : 18, color: theme.muted, fontWeight: 700 }}>GW{g.gameweek}</div>
            <div style={{ fontSize: land ? 22 : 30, fontWeight: 800 }}>{g.value === null ? "—" : g.value.toFixed(1)}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const tiles = (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: land ? 10 : 14 }}>
      {card.tiles.map((t) => (
        <div key={t.label} style={{ ...panel(theme, { borderRadius: 16 }), padding: land ? "10px 12px" : "16px 18px", minWidth: 0 }}>
          <div style={{ fontSize: tileValue, fontWeight: 900, lineHeight: 1.1, ...ellipsis }}>{t.value}</div>
          <div style={{ fontSize: tileLabel, color: theme.muted, fontWeight: 700, marginTop: 4, ...ellipsis }}>{t.label}</div>
        </div>
      ))}
    </div>
  );

  const fixtures = (
    <div style={{ display: "flex", gap: land ? 6 : 8, flex: 1, minHeight: land ? 64 : 96, maxHeight: land ? 150 : 200 }}>
      {card.fixtures.map((g) => (
        <div key={g.gameweek} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <div style={{ fontSize: land ? 14 : 18, color: theme.muted, fontWeight: 700, textAlign: "center" }}>GW{g.gameweek}</div>
          <FixtureBox items={g.items} theme={theme} font={card.fixtures.length > 6 ? (land ? 14 : 18) : land ? 16 : 24} />
        </div>
      ))}
    </div>
  );

  return (
    <Frame spec={spec} theme={theme} subtitle={`Player card · ${gwLabel}`} gwLabel={gwLabel}>
      {land ? (
        <div style={{ display: "flex", gap: 22, flex: 1, minHeight: 0 }}>
          <div style={{ flex: "0 0 46%", display: "flex", flexDirection: "column", gap, minWidth: 0 }}>
            {identity}
            {xpts}
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap, minWidth: 0 }}>
            {tiles}
            {fixtures}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap, flex: 1, minHeight: 0 }}>
          {identity}
          {xpts}
          {tiles}
          {fixtures}
        </div>
      )}
    </Frame>
  );
}

// ---------- Player Comparison ----------

function ComparisonFace({ spec, theme, comparison }: { spec: GraphicSpec; theme: GraphicTheme; comparison: ComparisonContent }) {
  const land = spec.size === "landscape";
  const cols = comparison.columns.length;
  const rows = comparison.rows.length;
  const labelWidth = land ? 220 : cols > 2 ? 230 : 280;
  const valueFont = Math.max(land ? 20 : 26, Math.min(land ? 30 : 44, Math.floor((land ? 330 : spec.size === "portrait" ? 860 : 700) / Math.max(rows, 1) * 0.62)));
  const labelFont = Math.round(valueFont * 0.62);
  const nameFont = cols > 2 ? (land ? 26 : 34) : land ? 32 : 44;
  const jersey = land ? 64 : cols > 2 ? 100 : 120;
  return (
    <Frame spec={spec} theme={theme} subtitle={comparison.columns.map((c) => c.name).join(" vs ")} gwLabel={null}>
      <div style={{ display: "flex", gap: 12, alignItems: "stretch", flexShrink: 0 }}>
        <div style={{ width: labelWidth, flexShrink: 0 }} />
        {comparison.columns.map((c) => (
          <div key={c.id} style={{ ...panel(theme), flex: 1, minWidth: 0, display: "flex", flexDirection: land || cols > 2 ? "column" : "row", alignItems: "center", justifyContent: "center", gap: land ? 4 : 12, padding: land ? "8px 6px" : "14px 10px" }}>
            <Jersey team={c.teamShort} position={c.position} px={jersey} />
            <div style={{ textAlign: land || cols > 2 ? "center" : "left", minWidth: 0, maxWidth: "100%" }}>
              <div style={{ fontSize: nameFont, fontWeight: 900, lineHeight: 1.05, ...ellipsis }}>{c.name}</div>
              <div style={{ fontSize: land ? 15 : 20, color: theme.muted, fontWeight: 700 }}>{c.teamShort} · {c.position}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", marginTop: land ? 8 : 14 }}>
        {comparison.rows.map((r, i) => (
          <div key={r.key} style={{ flex: 1, maxHeight: land ? 56 : 104, display: "flex", alignItems: "center", gap: 12, borderTop: i === 0 ? "none" : `1px solid ${theme.panelBorder}`, minHeight: 0 }}>
            <div style={{ width: labelWidth, flexShrink: 0, fontSize: labelFont, color: theme.muted, fontWeight: 700, ...ellipsis }}>{r.label}</div>
            {r.values.map((v, k) => {
              const best = r.best.includes(k);
              return (
                <div key={k} style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "center" }}>
                  <span
                    style={{
                      fontSize: valueFont, fontWeight: 900, padding: "2px 18px", borderRadius: 999, lineHeight: 1.25,
                      background: best ? theme.accent : "transparent", color: best ? theme.bg : theme.text,
                    }}
                  >
                    {v}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Frame>
  );
}

// ---------- Fixtures Comparison ----------

function FixturesFace({ spec, theme, grid, gwLabel }: { spec: GraphicSpec; theme: GraphicTheme; grid: FixtureGridContent; gwLabel: string }) {
  const land = spec.size === "landscape";
  const many = grid.gameweeks.length > 5;
  const font = many ? (land ? 15 : 20) : land ? 20 : 28;
  const nameWidth = land ? 200 : 250;
  const nameFont = land ? 24 : 34;
  return (
    <Frame spec={spec} theme={theme} subtitle={`${gwLabel} · colours are the official FPL difficulty (1 easiest, 5 hardest)`} gwLabel={gwLabel}>
      {grid.rows.length === 0 ? (
        <div style={{ ...panel(theme), flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, color: theme.muted, fontWeight: 700 }}>Pick at least two teams</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: land ? 8 : 12, flex: 1, minHeight: 0 }}>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <div style={{ width: nameWidth, flexShrink: 0 }} />
            {grid.gameweeks.map((gw) => (
              <div key={gw} style={{ flex: 1, textAlign: "center", fontSize: land ? 16 : 22, fontWeight: 800, color: theme.muted, minWidth: 0 }}>GW{gw}</div>
            ))}
          </div>
          {grid.rows.map((r) => {
            const avg = r.avgFdr === null ? null : fdrColor(r.avgFdr);
            return (
              <div key={r.teamId} style={{ display: "flex", gap: 8, flex: 1, minHeight: 0, maxHeight: land ? 150 : 240 }}>
                <div style={{ ...panel(theme), width: nameWidth, flexShrink: 0, boxSizing: "border-box", padding: "8px 14px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 6, marginRight: -0 }}>
                  <div style={{ fontSize: Math.round(nameFont * Math.min(1, 10 / Math.max(r.name.length, 1))), fontWeight: 900, lineHeight: 1.05, overflowWrap: "anywhere" }}>{r.name}</div>
                  {avg && r.avgFdr !== null && (
                    <div style={{ alignSelf: "flex-start", fontSize: land ? 15 : 20, fontWeight: 800, background: avg.bg, color: avg.fg, borderRadius: 999, padding: "2px 12px" }}>
                      Avg {r.avgFdr.toFixed(2)}
                    </div>
                  )}
                </div>
                {r.cells.map((c) => (
                  <div key={c.gameweek} style={{ flex: 1, display: "flex", minWidth: 0 }}>
                    {c.status === "fixtures" ? (
                      <FixtureBox items={c.fixtures} theme={theme} font={font} />
                    ) : (
                      <div style={{ ...panel(theme, { borderRadius: 12 }), flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: theme.muted, fontSize: font - 4, fontWeight: 800, letterSpacing: 1 }}>
                        {c.status === "tbc" ? "TBC" : "BLANK"}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </Frame>
  );
}

// ---------- Price Change ----------

function PriceList({ title, color, rows, more, theme, land }: { title: string; color: string; rows: PriceChangeContent["risers"]; more: number; theme: GraphicTheme; land: boolean }) {
  return (
    <div style={{ ...panel(theme), flex: 1, minWidth: 0, display: "flex", flexDirection: "column", padding: land ? "12px 16px" : "20px 22px" }}>
      <div style={{ fontSize: land ? 20 : 28, fontWeight: 900, color, letterSpacing: 1.5, marginBottom: land ? 4 : 10 }}>{title}</div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {rows.length === 0 ? (
          <div style={{ color: theme.muted, fontSize: land ? 18 : 24, fontWeight: 700, paddingTop: 12 }}>None</div>
        ) : (
          rows.map((r, i) => (
            <div key={i} style={{ flex: 1, maxHeight: land ? 56 : 90, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderTop: i === 0 ? "none" : `1px solid ${theme.panelBorder}`, minHeight: 0 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: land ? 22 : 32, fontWeight: 900, lineHeight: 1.1, ...ellipsis }}>{r.name}</div>
                <div style={{ fontSize: land ? 14 : 19, color: theme.muted, fontWeight: 600, ...ellipsis }}>{r.team} · {r.position}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: land ? 22 : 32, fontWeight: 900 }}>{r.price}</div>
                <div style={{ fontSize: land ? 14 : 19, color, fontWeight: 800 }}>{r.change}</div>
              </div>
            </div>
          ))
        )}
        {more > 0 && <div style={{ color: theme.muted, fontSize: land ? 14 : 20, fontWeight: 700, paddingTop: 6 }}>+{more} more</div>}
      </div>
    </div>
  );
}

function PriceFace({ spec, theme, prices, dateLabel }: { spec: GraphicSpec; theme: GraphicTheme; prices: PriceChangeContent; dateLabel: string }) {
  const land = spec.size === "landscape";
  const empty = prices.date === null || (prices.risers.length === 0 && prices.fallers.length === 0);
  return (
    <Frame spec={spec} theme={theme} subtitle={dateLabel} gwLabel={null}>
      {empty ? (
        <div style={{ ...panel(theme), flex: 1, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 40, fontSize: land ? 24 : 32, color: theme.muted, fontWeight: 700 }}>
          No confirmed price changes recorded for this day.
        </div>
      ) : (
        <div style={{ display: "flex", gap: land ? 14 : 20, flex: 1, minHeight: 0 }}>
          <PriceList title="RISERS ▲" color={theme.good} rows={prices.risers} more={prices.moreRisers} theme={theme} land={land} />
          <PriceList title="FALLERS ▼" color={theme.bad} rows={prices.fallers} more={prices.moreFallers} theme={theme} land={land} />
        </div>
      )}
    </Frame>
  );
}

// ---------- Top Differentials ----------

function DifferentialsFace({ spec, theme, rows, gwLabel, subtitle }: { spec: GraphicSpec; theme: GraphicTheme; rows: DifferentialRow[]; gwLabel: string; subtitle: string }) {
  const land = spec.size === "landscape";
  const nameFont = land ? 26 : spec.size === "portrait" ? 42 : 38;
  const jersey = land ? 44 : 76;
  return (
    <Frame spec={spec} theme={theme} subtitle={subtitle} gwLabel={gwLabel}>
      {rows.length === 0 ? (
        <div style={{ ...panel(theme), flex: 1, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 40, fontSize: land ? 24 : 32, color: theme.muted, fontWeight: 700 }}>
          No players match these filters.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: land ? 8 : 12, flex: 1, minHeight: 0 }}>
          {rows.map((r) => (
            <div key={r.id} style={{ ...panel(theme), flex: 1, maxHeight: land ? 84 : 150, display: "flex", alignItems: "center", gap: land ? 14 : 22, padding: land ? "0 18px" : "0 28px", minHeight: 0 }}>
              <div style={{ fontSize: land ? 28 : 46, fontWeight: 900, color: theme.accent, width: land ? 36 : 58, flexShrink: 0 }}>{r.rank}</div>
              <Jersey team={r.teamShort} position={r.position} px={jersey} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: nameFont, fontWeight: 900, lineHeight: 1.05, ...ellipsis }}>{r.name}{r.doubtful ? " ⚠" : ""}</div>
                <div style={{ fontSize: land ? 15 : 22, color: theme.muted, fontWeight: 700, ...ellipsis }}>{r.teamShort} · {r.position} · {r.price}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: land ? 28 : 46, fontWeight: 900, color: theme.accent, lineHeight: 1 }}>{r.xpts.toFixed(1)}</div>
                <div style={{ fontSize: land ? 13 : 18, color: theme.muted, fontWeight: 700 }}>xPts · {r.ownership} owned</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Frame>
  );
}


// ---------- Predicted Lineup ----------

const AMBER = "#fbbf24";

function LineupTokenView({ p, jersey, nameFont, minFont }: { p: LineupToken; jersey: number; nameFont: number; minFont: number }) {
  const warn = p.flag !== null;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0, flex: 1, maxWidth: jersey * 2.1 }}>
      <Jersey team={p.teamShort} position={p.position} px={jersey} />
      <div
        style={{
          maxWidth: "100%", boxSizing: "border-box", marginTop: 2, padding: "2px 12px", borderRadius: 999, fontSize: nameFont, fontWeight: 800, lineHeight: 1.25,
          background: "rgba(0,0,0,0.62)", color: "#ffffff", border: warn ? `2px solid ${AMBER}` : "2px solid transparent", ...ellipsis,
        }}
      >
        {warn ? "⚠ " : ""}{p.name}
      </div>
      <div style={{ fontSize: minFont, fontWeight: 800, color: warn ? AMBER : "#ffffff", textShadow: "0 1px 3px rgba(0,0,0,0.7)", marginTop: 2 }}>
        {p.xMins}&apos;{p.chance !== null ? ` · ${p.chance}%` : ""}
      </div>
    </div>
  );
}

function Pitch<T extends { id: number }>({ rows, renderToken }: { rows: Array<{ position: string; players: T[] }>; renderToken: (p: T) => ReactNode }) {
  const line = "rgba(255,255,255,0.45)";
  // attack at the top: forwards first, goalkeeper at the bottom
  const ordered = [...rows].reverse();
  return (
    <div
      style={{
        position: "relative", flex: 1, minHeight: 0, borderRadius: 20, overflow: "hidden", border: `3px solid ${line}`,
        background: "repeating-linear-gradient(180deg, #1e7a3b 0px, #1e7a3b 70px, #23893f 70px, #23893f 140px)",
      }}
    >
      <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 3, background: line }} />
      <div style={{ position: "absolute", left: "50%", top: "50%", width: 150, height: 150, marginLeft: -75, marginTop: -75, borderRadius: "50%", border: `3px solid ${line}`, boxSizing: "border-box" }} />
      <div style={{ position: "absolute", left: "27%", right: "27%", top: 0, height: "14%", border: `3px solid ${line}`, borderTop: "none", boxSizing: "border-box" }} />
      <div style={{ position: "absolute", left: "27%", right: "27%", bottom: 0, height: "14%", border: `3px solid ${line}`, borderBottom: "none", boxSizing: "border-box" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "space-around", padding: "8px 14px" }}>
        {ordered.map((r) => (
          <div key={r.position} style={{ display: "flex", justifyContent: "space-evenly", alignItems: "flex-start", gap: 6 }}>
            {r.players.map((p) => (
              <Fragment key={p.id}>{renderToken(p)}</Fragment>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function fixtureText(lineup: PredictedLineupContent): string {
  return lineup.fixtures.map((f) => `${f.opponent} (${f.isHome ? "H" : "A"})`).join(", ");
}

function LineupFace({ spec, theme, lineup, gwLabel }: { spec: GraphicSpec; theme: GraphicTheme; lineup: PredictedLineupContent; gwLabel: string }) {
  const land = spec.size === "landscape";
  const tall = spec.size === "portrait";
  const jersey = land ? 56 : tall ? 116 : 74;
  const nameFont = land ? 17 : tall ? 27 : 23;
  const minFont = land ? 15 : tall ? 24 : 20;
  const subtitle = lineup.blank
    ? `${lineup.teamName} · ${gwLabel}`
    : `${lineup.teamName} vs ${fixtureText(lineup)} · ${gwLabel}${lineup.formation ? ` · ${lineup.formation}` : ""}`;
  const message = lineup.blank
    ? `No fixture for ${lineup.teamName} in ${gwLabel}.`
    : !lineup.complete
      ? `Not enough expected-minutes data for ${lineup.teamName} in ${gwLabel} yet.`
      : null;

  const pitch = <Pitch rows={lineup.rows} renderToken={(p) => <LineupTokenView p={p} jersey={jersey} nameFont={nameFont} minFont={minFont} />} />;
  const bench = lineup.bench.length > 0 && (
    <div style={{ ...panel(theme), padding: land ? "12px 16px" : "14px 22px", flexShrink: 0 }}>
      <div style={{ fontSize: land ? 15 : 19, fontWeight: 800, letterSpacing: 1.5, color: theme.muted, marginBottom: land ? 6 : 10 }}>ALSO IN CONTENTION</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: land ? 6 : 10, flexDirection: land ? "column" : "row" }}>
        {lineup.bench.map((p) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, background: theme.panel, borderRadius: 999, padding: land ? "4px 12px" : "6px 16px", fontSize: land ? 16 : 22, fontWeight: 800 }}>
            <span>{p.flag ? "⚠ " : ""}{p.name}</span>
            <span style={{ color: p.flag ? AMBER : theme.muted, fontWeight: 700 }}>{p.position} · {p.xMins}&apos;{p.chance !== null ? ` · ${p.chance}%` : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
  const note = (
    <div style={{ fontSize: land ? 14 : 18, color: theme.muted, fontWeight: 600, lineHeight: 1.3, flexShrink: 0 }}>
      Based on our expected minutes, which include injury news. Not official team news. Minutes are capped at 90.
    </div>
  );

  return (
    <Frame spec={spec} theme={theme} subtitle={subtitle} gwLabel={gwLabel}>
      {message ? (
        <div style={{ ...panel(theme), flex: 1, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 40, fontSize: land ? 24 : 32, color: theme.muted, fontWeight: 700 }}>
          {message}
        </div>
      ) : land ? (
        <div style={{ display: "flex", gap: 18, flex: 1, minHeight: 0 }}>
          <div style={{ flex: "0 0 62%", display: "flex", minWidth: 0, minHeight: 0 }}>
            {pitch}
          </div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
            <div style={{ ...panel(theme), padding: "12px 16px", flexShrink: 0 }}>
              <div style={{ fontSize: 34, fontWeight: 900, color: theme.accent, lineHeight: 1 }}>{lineup.formation}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: theme.muted, marginTop: 4 }}>{lineup.doubleGameweek ? "Double gameweek: likeliest XI across both matches" : "Most likely formation"}</div>
            </div>
            {bench}
            <div style={{ flex: 1 }} />
            {note}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, minHeight: 0 }}>
          {pitch}
          {bench}
          {note}
        </div>
      )}
    </Frame>
  );
}

// ---------- Team Reveal ----------

function RevealTokenView({ p, jersey, nameFont, fixFont }: { p: RevealToken; jersey: number; nameFont: number; fixFont: number }) {
  const badge = p.isCaptain ? { text: "C", bg: "#facc15", fg: "#713f12" } : p.isVice ? { text: "V", bg: "#e5e7eb", fg: "#111827" } : null;
  const badgePx = Math.round(jersey * 0.42);
  const first = p.fixtures[0];
  const double = p.fixtures.length > 1;
  const c = first ? fdrColor(first.difficulty) : null;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0, flex: 1, maxWidth: jersey * 2.2 }}>
      <div style={{ position: "relative", width: jersey, height: jersey }}>
        <Jersey team={p.teamShort} position={p.position} px={jersey} />
        {badge && (
          <div style={{ position: "absolute", left: -badgePx * 0.35, top: 0, width: badgePx, height: badgePx, borderRadius: "50%", background: badge.bg, color: badge.fg, border: "3px solid #ffffff", boxSizing: "border-box", fontSize: Math.round(badgePx * 0.55), fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {badge.text}
          </div>
        )}
      </div>
      <div style={{ maxWidth: "100%", boxSizing: "border-box", marginTop: 2, padding: "1px 10px", borderRadius: "8px 8px 0 0", fontSize: nameFont, fontWeight: 800, lineHeight: 1.25, background: "rgba(255,255,255,0.96)", color: "#111827", ...ellipsis }}>{p.name}</div>
      <div
        style={{
          maxWidth: "100%", boxSizing: "border-box", padding: "1px 8px", borderRadius: "0 0 8px 8px", fontSize: double ? Math.round(fixFont * 0.8) : fixFont, fontWeight: 800, lineHeight: 1.25, textAlign: "center",
          background: c ? c.bg : "rgba(0,0,0,0.6)", color: c ? c.fg : "#ffffff", ...ellipsis,
        }}
      >
        {first ? p.fixtures.map((f) => `${f.opponent} (${f.isHome ? "H" : "A"})`).join(" · ") : "No game"}
      </div>
    </div>
  );
}

function RevealFace({ spec, theme, reveal, gwLabel }: { spec: GraphicSpec; theme: GraphicTheme; reveal: TeamRevealContent; gwLabel: string }) {
  const land = spec.size === "landscape";
  const tall = spec.size === "portrait";
  const jersey = land ? 52 : tall ? 104 : 66;
  const nameFont = land ? 15 : tall ? 24 : 20;
  const fixFont = land ? 13 : tall ? 20 : 17;
  const manager = spec.manager.trim();
  const subtitle = [manager, gwLabel, reveal.formation].filter(Boolean).join(" · ");
  const token = (p: RevealToken) => <RevealTokenView p={p} jersey={jersey} nameFont={nameFont} fixFont={fixFont} />;
  const pitch = <Pitch rows={reveal.rows} renderToken={token} />;
  const captain = reveal.rows.flatMap((r) => r.players).concat(reveal.bench).find((p) => p.isCaptain);
  const vice = reveal.rows.flatMap((r) => r.players).concat(reveal.bench).find((p) => p.isVice);

  const chip = reveal.chipLabel && (
    <span style={{ background: theme.accent, color: theme.bg, borderRadius: 999, padding: land ? "4px 14px" : "6px 18px", fontSize: land ? 16 : 22, fontWeight: 900, letterSpacing: 1 }}>
      {reveal.chipLabel.toUpperCase()}
    </span>
  );
  const value = (
    <span style={{ ...panel(theme, { borderRadius: 999 }), padding: land ? "4px 14px" : "6px 18px", fontSize: land ? 16 : 22, fontWeight: 800 }}>
      <span style={{ color: theme.muted }}>Squad value </span>{reveal.squadValue}
    </span>
  );
  const bench = (
    <div style={{ ...panel(theme), padding: land ? "10px 12px" : "10px 14px", flexShrink: 0 }}>
      <div style={{ fontSize: land ? 14 : 18, fontWeight: 800, letterSpacing: 1.5, color: theme.muted, marginBottom: land ? 4 : 6 }}>BENCH</div>
      <div style={{ display: "flex", flexWrap: land ? "wrap" : "nowrap", gap: land ? 8 : 10, justifyContent: "space-around" }}>
        {reveal.bench.map((p) => (
          <div key={p.id} style={{ flex: land ? "0 0 46%" : 1, minWidth: 0, display: "flex", justifyContent: "center" }}>{token(p)}</div>
        ))}
      </div>
    </div>
  );

  return (
    <Frame spec={spec} theme={theme} subtitle={subtitle} gwLabel={gwLabel}>
      {!reveal.complete ? (
        <div style={{ ...panel(theme), flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 40, textAlign: "center", fontSize: land ? 22 : 30, color: theme.muted, fontWeight: 700 }}>
          <div style={{ color: theme.text, fontWeight: 900 }}>Finish your squad to reveal it</div>
          {reveal.problems.map((m) => (<div key={m}>{m}</div>))}
        </div>
      ) : land ? (
        <div style={{ display: "flex", gap: 18, flex: 1, minHeight: 0 }}>
          <div style={{ flex: "0 0 62%", display: "flex", minWidth: 0, minHeight: 0 }}>{pitch}</div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, flexShrink: 0 }}>{chip}{value}</div>
            {bench}
            <div style={{ flex: 1 }} />
            {(captain || vice) && (
              <div style={{ fontSize: 15, fontWeight: 700, color: theme.muted, flexShrink: 0 }}>
                {captain ? `Captain: ${captain.name}` : ""}{captain && vice ? " · " : ""}{vice ? `Vice: ${vice.name}` : ""}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, minHeight: 0 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, flexShrink: 0 }}>
            {chip}{value}
            {(captain || vice) && (
              <span style={{ fontSize: 20, fontWeight: 700, color: theme.muted }}>
                {captain ? `C: ${captain.name}` : ""}{captain && vice ? " · " : ""}{vice ? `V: ${vice.name}` : ""}
              </span>
            )}
          </div>
          {pitch}
          {bench}
        </div>
      )}
    </Frame>
  );
}

// ---------- Cover Generator ----------

function CoverFace({ spec, theme, cover }: { spec: GraphicSpec; theme: GraphicTheme; cover: CoverContent }) {
  const land = spec.size === "landscape";
  const tall = spec.size === "portrait";
  const n = cover.players.length;
  const jersey = land ? (n === 1 ? 250 : n === 2 ? 190 : 150) : tall ? (n === 1 ? 400 : n === 2 ? 320 : 270) : n === 1 ? 330 : n === 2 ? 270 : 220;
  const font = coverTitleFont(cover.headline, spec.size);

  const text = (
    <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: land ? 14 : 22 }}>
      {cover.tag && (
        <div style={{ alignSelf: "flex-start", background: theme.accent, color: theme.bg, borderRadius: 999, padding: land ? "6px 20px" : "8px 28px", fontSize: land ? 22 : 32, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase" }}>
          {cover.tag}
        </div>
      )}
      <div style={{ fontSize: font, fontWeight: 900, lineHeight: 1.0, letterSpacing: -1, textTransform: "uppercase", overflowWrap: "anywhere", textShadow: "0 4px 24px rgba(0,0,0,0.25)" }}>
        {cover.headline}
      </div>
      <div style={{ width: land ? 110 : 160, height: land ? 10 : 14, borderRadius: 8, background: theme.accent }} />
      {cover.subtitle && (
        <div style={{ fontSize: land ? 28 : tall ? 44 : 38, fontWeight: 700, lineHeight: 1.25, color: theme.muted }}>{cover.subtitle}</div>
      )}
    </div>
  );

  const players = n > 0 && (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: land ? "center" : "space-evenly", gap: land ? 8 : 16, flexShrink: 0 }}>
      {cover.players.map((p) => (
        <div key={p.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0 }}>
          <Jersey team={p.teamShort} position={p.position} px={jersey} />
          <div style={{ marginTop: -4, background: "#ffffff", color: "#111827", borderRadius: 10, padding: land ? "3px 14px" : "5px 20px", fontSize: land ? 20 : tall ? 34 : 28, fontWeight: 900, textTransform: "uppercase", maxWidth: jersey * 1.5, ...ellipsis }}>
            {p.name}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Frame spec={spec} theme={theme} subtitle="" gwLabel={null} bare>
      {/* decorative stripes behind everything */}
      <div style={{ position: "absolute", right: land ? 40 : -60, top: -120, width: land ? 300 : 460, height: 1900, background: theme.accent, opacity: 0.1, transform: "rotate(18deg)", zIndex: 0 }} />
      <div style={{ position: "absolute", right: land ? 360 : 340, top: -120, width: land ? 80 : 120, height: 1900, background: theme.accent, opacity: 0.06, transform: "rotate(18deg)", zIndex: 0 }} />
      <div style={{ position: "relative", zIndex: 1, flex: 1, minHeight: 0, display: "flex", flexDirection: land ? "row" : "column", alignItems: land ? "center" : "stretch", gap: land ? 24 : 18, paddingBottom: land ? 8 : 16 }}>
        <div style={{ flex: land ? "1 1 58%" : 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>{text}</div>
        {land ? (players ? <div style={{ flex: "1 1 42%", minWidth: 0 }}>{players}</div> : null) : players}
      </div>
    </Frame>
  );
}

// ---------- entry point ----------

export function GraphicCanvas({ spec, theme, data }: { spec: GraphicSpec; theme: GraphicTheme; data: GraphicData }) {
  switch (data.kind) {
    case "player-card": return <PlayerCardFace spec={spec} theme={theme} card={data.card} gwLabel={data.gwLabel} />;
    case "player-comparison": return <ComparisonFace spec={spec} theme={theme} comparison={data.comparison} />;
    case "fixtures-comparison": return <FixturesFace spec={spec} theme={theme} grid={data.grid} gwLabel={data.gwLabel} />;
    case "price-change": return <PriceFace spec={spec} theme={theme} prices={data.prices} dateLabel={data.dateLabel} />;
    case "predicted-lineup": return <LineupFace spec={spec} theme={theme} lineup={data.lineup} gwLabel={data.gwLabel} />;
    case "team-reveal": return <RevealFace spec={spec} theme={theme} reveal={data.reveal} gwLabel={data.gwLabel} />;
    case "cover": return <CoverFace spec={spec} theme={theme} cover={data.cover} />;
    case "top-differentials": return <DifferentialsFace spec={spec} theme={theme} rows={data.rows} gwLabel={data.gwLabel} subtitle={data.subtitle} />;
  }
}
