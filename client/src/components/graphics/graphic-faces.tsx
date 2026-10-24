import { Fragment, type CSSProperties, type ReactNode } from "react";
import {
  GRAPHIC_SIZES,
  fdrColor,
  footerHeight,
  footerNote,
  resolveHeadline,
  watermarkText,
  type ComparisonContent,
  type AvailabilityRow,
  type CaptainPickRow,
  type GraphicData,
  type CoverContent,
  type LeaderRow,
  type TeamOfTheWeekContent,
  type TotwToken,
  type TransferRow,
  type NewsQuoteContent,
  coverTitleFont,
  quoteFont,
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
import { contrastRatio, formatGoals } from "@shared/graphics";
import { TEAM_METRICS, type TableContent, type TeamHistoryContent, type TeamProjectionsContent } from "@shared/graphics-teams";
import type { PlayerHistoryContent, PlayerProjectionRow, PlayerProjectionsContent, TopScorersContent } from "@shared/graphics-players";
import type { MatchFormEntry, MatchPredictionsContent, MatchPreviewContent, MatchPreviewSide, MatchReportContent, MatchResultsContent } from "@shared/graphics-matches";
import { getJerseyUrl } from "@/lib/jersey";
import badge from "@/assets/fpl-dilemmas-badge.png?inline";

// Every graphic is drawn at its exact export size with plain inline styles (no theme tokens, no Tailwind), so the
// PNG looks the same on every device. The same component draws the on-screen preview and the exported image.

const FONT = "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif";

export type { GraphicData };

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
        <span
          style={
            spec.handle
              ? { fontSize: land ? 13 : 15, lineHeight: 1.2, color: theme.muted, fontWeight: 600, minWidth: 0, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }
              : { fontSize: land ? 16 : 19, color: theme.muted, fontWeight: 600, ...ellipsis }
          }
        >
          {footerNote(spec, gwLabel)}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: land ? 14 : 20, flexShrink: 0 }}>
          {spec.handle && (
            <span style={{ fontSize: land ? 16 : 19, fontWeight: 800, color: theme.text, opacity: 0.85 }}>@{spec.handle}</span>
          )}
          <span style={{ display: "flex", alignItems: "center", gap: 10, opacity: 0.6 }}>
            <img src={badge} alt="" width={land ? 30 : 36} height={land ? 30 : 36} style={{ width: land ? 30 : 36, height: land ? 30 : 36 }} />
            <span style={{ fontSize: land ? 16 : 19, fontWeight: 800, letterSpacing: 1.5, color: theme.text }}>{watermarkText()}</span>
          </span>
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
      {p.chance !== null && (
        <div style={{ fontSize: minFont, fontWeight: 800, color: warn ? AMBER : "#ffffff", textShadow: "0 1px 3px rgba(0,0,0,0.7)", marginTop: 2 }}>
          {p.chance}%
        </div>
      )}
    </div>
  );
}

function Pitch<T extends { id: number }>({ rows, renderToken }: { rows: Array<{ position: string; players: T[] }>; renderToken: (p: T) => ReactNode }) {
  const line = "rgba(255,255,255,0.45)";
  // goalkeeper at the top, then defenders, midfielders and the attack at the bottom (rows come in that order)
  const ordered = rows;
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
  // An edited lineup is the poster's own view: say so loudly, so nobody takes it for our prediction.
  const editedBanner = lineup.edited && (
    <div
      data-testid="lineup-edited-banner"
      style={{
        flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 14, background: AMBER, color: "#1f1300",
        padding: land ? "8px 14px" : "10px 20px", fontSize: land ? 18 : tall ? 30 : 26, fontWeight: 900, letterSpacing: 1.5, textAlign: "center", lineHeight: 1.15,
      }}
    >
      ✎ USER-EDITED LINEUP · NOT OUR PREDICTION
    </div>
  );
  const bench = !lineup.edited && lineup.bench.length > 0 && (
    <div style={{ ...panel(theme), padding: land ? "12px 16px" : "14px 22px", flexShrink: 0 }}>
      <div style={{ fontSize: land ? 15 : 19, fontWeight: 800, letterSpacing: 1.5, color: theme.muted, marginBottom: land ? 6 : 10 }}>ALSO IN CONTENTION</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: land ? 6 : 10, flexDirection: land ? "column" : "row" }}>
        {lineup.bench.map((p) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, background: theme.panel, borderRadius: 999, padding: land ? "4px 12px" : "6px 16px", fontSize: land ? 16 : 22, fontWeight: 800 }}>
            <span>{p.flag ? "⚠ " : ""}{p.name}</span>
            <span style={{ color: p.flag ? AMBER : theme.muted, fontWeight: 700 }}>{p.role ?? p.position}{p.chance !== null ? ` · ${p.chance}%` : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
  const note = (
    <div style={{ fontSize: land ? 14 : 18, color: theme.muted, fontWeight: 600, lineHeight: 1.3, flexShrink: 0 }}>
      {lineup.edited
        ? `Edited by ${spec.handle ? `@${spec.handle}` : "the poster"}: their own view, not our prediction${lineup.modelFormation ? ` (our model's formation: ${lineup.modelFormation})` : ""}. ⚠ marks injury news from FPL.`
        : "Based on our expected minutes, which include injury news. Not official team news. Players sit in their usual position (FotMob)."}
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
            {editedBanner}
            <div style={{ ...panel(theme), padding: "12px 16px", flexShrink: 0 }}>
              <div style={{ fontSize: 34, fontWeight: 900, color: theme.accent, lineHeight: 1 }}>{lineup.formation}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: theme.muted, marginTop: 4 }}>{lineup.edited ? "Formation chosen by the poster" : lineup.doubleGameweek ? "Double gameweek: likeliest XI across both matches" : "Most likely formation"}</div>
            </div>
            {bench}
            <div style={{ flex: 1 }} />
            {note}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, minHeight: 0 }}>
          {editedBanner}
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

// ---------- Player News Quote ----------

function NewsFace({ spec, theme, news }: { spec: GraphicSpec; theme: GraphicTheme; news: NewsQuoteContent }) {
  const land = spec.size === "landscape";
  const tall = spec.size === "portrait";
  const font = quoteFont(news.quote, spec.size);
  const toneBg = news.tone === "ok" ? theme.good : news.tone === "warn" ? "#fbbf24" : theme.bad;
  const pill = (
    <span style={{ background: toneBg, color: "#0b1020", borderRadius: 999, padding: land ? "6px 18px" : "8px 26px", fontSize: land ? 20 : 30, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {news.statusLabel}{news.chance !== null ? ` · ${news.chance}%` : ""}
    </span>
  );
  const player = (
    <div style={{ display: "flex", flexDirection: land ? "column" : "row", alignItems: "center", gap: land ? 8 : 24, textAlign: land ? "center" : "left", minWidth: 0 }}>
      <Jersey team={news.player.teamShort} position={news.player.position} px={land ? 190 : tall ? 170 : 130} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: land ? 34 : tall ? 54 : 46, fontWeight: 900, lineHeight: 1.05, textTransform: "uppercase", overflowWrap: "anywhere" }}>{news.player.fullName}</div>
        <div style={{ fontSize: land ? 20 : 28, fontWeight: 700, color: theme.muted, marginTop: 6 }}>{news.player.teamName} · {news.player.position}</div>
      </div>
    </div>
  );
  const quote = (
    <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div aria-hidden="true" style={{ position: "absolute", left: -10, top: land ? -40 : -70, fontSize: land ? 260 : 380, lineHeight: 1, fontWeight: 900, color: theme.accent, opacity: 0.28, fontFamily: "Georgia, 'Times New Roman', serif" }}>“</div>
      <div style={{ position: "relative", fontSize: font, fontWeight: 800, lineHeight: 1.25, overflowWrap: "anywhere" }}>
        {news.kind === "custom" ? `“${news.quote}”` : news.kind === "official" ? news.quote : "No news to show for this player yet."}
      </div>
      {news.source && (
        <div style={{ position: "relative", marginTop: land ? 14 : 26, fontSize: land ? 20 : tall ? 32 : 28, fontWeight: 700, color: theme.muted }}>— {news.source}</div>
      )}
    </div>
  );

  return (
    <Frame spec={spec} theme={theme} subtitle="" gwLabel={null} bare>
      <div style={{ position: "relative", zIndex: 1, flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: land ? 10 : 22, paddingBottom: land ? 8 : 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexShrink: 0 }}>
          <div style={{ fontSize: land ? 22 : 32, fontWeight: 900, letterSpacing: 4, textTransform: "uppercase", color: theme.accent, ...ellipsis }}>{resolveHeadlineText(spec)}</div>
          {pill}
        </div>
        {land ? (
          <div style={{ display: "flex", gap: 28, flex: 1, minHeight: 0, alignItems: "center" }}>
            <div style={{ flex: "0 0 30%", minWidth: 0 }}>{player}</div>
            <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex" }}>{quote}</div>
          </div>
        ) : (
          <>
            {quote}
            <div style={{ ...panel(theme), padding: "18px 26px", flexShrink: 0 }}>{player}</div>
          </>
        )}
      </div>
    </Frame>
  );
}

// ---------- Captain Picks ----------

function CaptainFace({ spec, theme, rows, gwLabel, subtitle }: { spec: GraphicSpec; theme: GraphicTheme; rows: CaptainPickRow[]; gwLabel: string; subtitle: string }) {
  const land = spec.size === "landscape";
  const nameFont = land ? 26 : spec.size === "portrait" ? 42 : 38;
  const jersey = land ? 44 : 76;
  return (
    <Frame spec={spec} theme={theme} subtitle={subtitle} gwLabel={gwLabel}>
      {rows.length === 0 ? (
        <div style={{ ...panel(theme), flex: 1, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 40, fontSize: land ? 24 : 32, color: theme.muted, fontWeight: 700 }}>
          No projections for this gameweek yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: land ? 8 : 12, flex: 1, minHeight: 0 }}>
          {rows.map((r) => (
            <div key={r.id} style={{ ...panel(theme), flex: 1, maxHeight: land ? 84 : 150, display: "flex", alignItems: "center", gap: land ? 12 : 20, padding: land ? "0 16px" : "0 26px", minHeight: 0 }}>
              <div style={{ fontSize: land ? 28 : 46, fontWeight: 900, color: theme.accent, width: land ? 34 : 54, flexShrink: 0 }}>{r.rank}</div>
              <Jersey team={r.teamShort} position={r.position} px={jersey} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: nameFont, fontWeight: 900, lineHeight: 1.05, ...ellipsis }}>{r.name}{r.doubtful ? " ⚠" : ""}</div>
                <div style={{ fontSize: land ? 14 : 21, color: theme.muted, fontWeight: 700, ...ellipsis }}>{r.teamShort} · {r.position} · {r.price} · {r.ownership} owned</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, width: land ? 104 : 168, flexShrink: 0 }}>
                {(r.fixtures.length ? r.fixtures : [null]).slice(0, 2).map((f, i) => {
                  const c = f ? fdrColor(f.difficulty) : null;
                  return (
                    <div key={i} style={{ background: c ? c.bg : theme.panel, color: c ? c.fg : theme.muted, borderRadius: 10, textAlign: "center", fontSize: land ? 15 : 22, fontWeight: 800, padding: land ? "2px 0" : "4px 0" }}>
                      {f ? `${f.opponent} (${f.isHome ? "H" : "A"})` : "No game"}
                    </div>
                  );
                })}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0, minWidth: land ? 84 : 130 }}>
                <div style={{ fontSize: land ? 28 : 46, fontWeight: 900, color: theme.accent, lineHeight: 1 }}>{r.xpts.toFixed(1)}</div>
                <div style={{ fontSize: land ? 12 : 17, color: theme.muted, fontWeight: 700 }}>xPts · cap {r.captainPoints.toFixed(1)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Frame>
  );
}

// ---------- Fixture Ticker ----------

function TickerTable({ rows, gameweeks, theme, font }: { rows: FixtureGridContent["rows"]; gameweeks: number[]; theme: GraphicTheme; font: number }) {
  return (
    <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
        <div style={{ width: Math.round(font * 3.1), flexShrink: 0 }} />
        {gameweeks.map((gw) => (
          <div key={gw} style={{ flex: 1, minWidth: 0, textAlign: "center", fontSize: Math.round(font * 0.85), fontWeight: 800, color: theme.muted }}>GW{gw}</div>
        ))}
        <div style={{ width: Math.round(font * 2.6), flexShrink: 0, textAlign: "center", fontSize: Math.round(font * 0.85), fontWeight: 800, color: theme.muted }}>AVG</div>
      </div>
      {rows.map((r) => {
        const avg = r.avgFdr === null ? null : fdrColor(r.avgFdr);
        return (
          <div key={r.teamId} style={{ display: "flex", gap: 3, flex: 1, minHeight: 0, maxHeight: 64 }}>
            <div style={{ width: Math.round(font * 3.1), flexShrink: 0, display: "flex", alignItems: "center", fontSize: Math.round(font * 1.1), fontWeight: 900 }}>{r.short}</div>
            {r.cells.map((c) => (
              <div key={c.gameweek} style={{ flex: 1, minWidth: 0, display: "flex", gap: 2 }}>
                {c.status === "fixtures" ? (
                  c.fixtures.map((f, i) => {
                    const col = fdrColor(f.difficulty);
                    return (
                      <div key={i} style={{ flex: 1, minWidth: 0, background: col.bg, color: col.fg, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: c.fixtures.length > 1 ? Math.round(font * 0.72) : font, fontWeight: 800 }}>
                        {f.isHome ? f.opponent : f.opponent.toLowerCase()}
                      </div>
                    );
                  })
                ) : (
                  <div style={{ flex: 1, background: theme.panel, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: Math.round(font * 0.8), fontWeight: 800, color: theme.muted }}>
                    {c.status === "tbc" ? "TBC" : "–"}
                  </div>
                )}
              </div>
            ))}
            <div style={{ width: Math.round(font * 2.6), flexShrink: 0, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: Math.round(font * 0.95), fontWeight: 900, background: avg ? avg.bg : theme.panel, color: avg ? avg.fg : theme.muted }}>
              {r.avgFdr === null ? "–" : r.avgFdr.toFixed(1)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TickerFace({ spec, theme, grid, gwLabel }: { spec: GraphicSpec; theme: GraphicTheme; grid: FixtureGridContent; gwLabel: string }) {
  const land = spec.size === "landscape";
  const font = land ? 17 : spec.size === "portrait" ? 23 : 19;
  const half = Math.ceil(grid.rows.length / 2);
  return (
    <Frame spec={spec} theme={theme} subtitle={`${gwLabel} · easiest run first · CAPS = home, lower case = away`} gwLabel={gwLabel}>
      {land ? (
        <div style={{ display: "flex", gap: 22, flex: 1, minHeight: 0 }}>
          <TickerTable rows={grid.rows.slice(0, half)} gameweeks={grid.gameweeks} theme={theme} font={font} />
          <TickerTable rows={grid.rows.slice(half)} gameweeks={grid.gameweeks} theme={theme} font={font} />
        </div>
      ) : (
        <TickerTable rows={grid.rows} gameweeks={grid.gameweeks} theme={theme} font={font} />
      )}
    </Frame>
  );
}

// ---------- Transfer Trends ----------

function TrendList({ title, color, rows, theme, land, tall }: { title: string; color: string; rows: TransferRow[]; theme: GraphicTheme; land: boolean; tall: boolean }) {
  return (
    <div style={{ ...panel(theme), flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", padding: land ? "10px 14px" : "16px 22px" }}>
      <div style={{ fontSize: land ? 19 : 28, fontWeight: 900, color, letterSpacing: 1.5, marginBottom: land ? 2 : 8, flexShrink: 0 }}>{title}</div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {rows.length === 0 ? (
          <div style={{ color: theme.muted, fontSize: land ? 18 : 24, fontWeight: 700, paddingTop: 12 }}>No transfers yet</div>
        ) : (
          rows.map((r, i) => (
            <div key={r.id} style={{ flex: 1, maxHeight: land ? 56 : tall ? 100 : 86, display: "flex", alignItems: "center", gap: land ? 8 : 14, borderTop: i === 0 ? "none" : `1px solid ${theme.panelBorder}`, minHeight: 0 }}>
              <div style={{ width: land ? 20 : 36, fontSize: land ? 18 : 30, fontWeight: 900, color: theme.accent, flexShrink: 0 }}>{r.rank}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: land ? 20 : tall ? 34 : 30, fontWeight: 900, lineHeight: 1.1, ...ellipsis }}>{r.name}</div>
                <div style={{ fontSize: land ? 12 : 18, color: theme.muted, fontWeight: 600, ...ellipsis }}>{r.teamShort} · {r.position} · {r.price} · {r.ownership}</div>
              </div>
              <div style={{ fontSize: land ? 22 : tall ? 38 : 32, fontWeight: 900, color, flexShrink: 0 }}>{r.countLabel}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function TrendsFace({ spec, theme, trends, gwLabel, subtitle }: { spec: GraphicSpec; theme: GraphicTheme; trends: { ins: TransferRow[]; outs: TransferRow[] }; gwLabel: string; subtitle: string }) {
  const land = spec.size === "landscape";
  const tall = spec.size === "portrait";
  return (
    <Frame spec={spec} theme={theme} subtitle={subtitle} gwLabel={gwLabel}>
      <div style={{ display: "flex", flexDirection: tall ? "column" : "row", gap: land ? 12 : 18, flex: 1, minHeight: 0 }}>
        <TrendList title="MOST IN ▲" color={theme.good} rows={trends.ins} theme={theme} land={land} tall={tall} />
        <TrendList title="MOST OUT ▼" color={theme.bad} rows={trends.outs} theme={theme} land={land} tall={tall} />
      </div>
    </Frame>
  );
}

// ---------- Team of the Week ----------

function TotwTokenView({ p, jersey, nameFont, ptsFont }: { p: TotwToken; jersey: number; nameFont: number; ptsFont: number }) {
  const badgePx = Math.round(jersey * 0.42);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0, flex: 1, maxWidth: jersey * 2.2 }}>
      <div style={{ position: "relative", width: jersey, height: jersey }}>
        <Jersey team={p.teamShort} position={p.position} px={jersey} />
        {p.isCaptain && (
          <div style={{ position: "absolute", left: -badgePx * 0.35, top: 0, width: badgePx, height: badgePx, borderRadius: "50%", background: "#facc15", color: "#713f12", border: "3px solid #ffffff", boxSizing: "border-box", fontSize: Math.round(badgePx * 0.55), fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>C</div>
        )}
      </div>
      <div style={{ maxWidth: "100%", boxSizing: "border-box", marginTop: 2, padding: "1px 10px", borderRadius: "8px 8px 0 0", fontSize: nameFont, fontWeight: 800, lineHeight: 1.25, background: "rgba(255,255,255,0.96)", color: "#111827", ...ellipsis }}>{p.name}</div>
      <div style={{ maxWidth: "100%", boxSizing: "border-box", padding: "1px 12px", borderRadius: "0 0 8px 8px", fontSize: ptsFont, fontWeight: 900, lineHeight: 1.25, background: "#7c3aed", color: "#ffffff", textAlign: "center" }}>{p.points} pts</div>
    </div>
  );
}

function TotwFace({ spec, theme, totw, gwLabel }: { spec: GraphicSpec; theme: GraphicTheme; totw: TeamOfTheWeekContent; gwLabel: string }) {
  const land = spec.size === "landscape";
  const tall = spec.size === "portrait";
  const jersey = land ? 56 : tall ? 118 : 80;
  const nameFont = land ? 16 : tall ? 26 : 22;
  const ptsFont = land ? 15 : tall ? 24 : 20;
  const captain = totw.rows.flatMap((r) => r.players).find((p) => p.isCaptain);
  const pitch = <Pitch rows={totw.rows} renderToken={(p) => <TotwTokenView p={p} jersey={jersey} nameFont={nameFont} ptsFont={ptsFont} />} />;
  const summary = (
    <div style={{ ...panel(theme), padding: land ? "12px 16px" : "14px 24px", flexShrink: 0, display: "flex", flexDirection: land ? "column" : "row", alignItems: land ? "flex-start" : "center", justifyContent: "space-between", gap: land ? 4 : 20 }}>
      <div>
        <div style={{ fontSize: land ? 40 : 54, fontWeight: 900, color: theme.accent, lineHeight: 1 }}>{totw.total} pts</div>
        <div style={{ fontSize: land ? 14 : 20, fontWeight: 700, color: theme.muted, marginTop: 4 }}>XI total, captain counted twice</div>
      </div>
      <div style={{ textAlign: land ? "left" : "right", fontSize: land ? 15 : 22, fontWeight: 700, color: theme.muted }}>
        {totw.formation && <div style={{ fontSize: land ? 26 : 36, fontWeight: 900, color: theme.text }}>{totw.formation}</div>}
        {captain && <div>Captain: {captain.name}</div>}
      </div>
    </div>
  );
  return (
    <Frame spec={spec} theme={theme} subtitle={`${gwLabel} · best legal XI by actual points`} gwLabel={gwLabel}>
      {!totw.complete ? (
        <div style={{ ...panel(theme), flex: 1, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 40, fontSize: land ? 24 : 32, color: theme.muted, fontWeight: 700 }}>
          Not enough players have points for {gwLabel} yet.
        </div>
      ) : land ? (
        <div style={{ display: "flex", gap: 18, flex: 1, minHeight: 0 }}>
          <div style={{ flex: "0 0 62%", display: "flex", minWidth: 0, minHeight: 0 }}>{pitch}</div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>{summary}</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, minHeight: 0 }}>
          {pitch}
          {summary}
        </div>
      )}
    </Frame>
  );
}

// ---------- Stat Leaders ----------

function LeadersFace({ spec, theme, rows, gwLabel, subtitle }: { spec: GraphicSpec; theme: GraphicTheme; rows: LeaderRow[]; gwLabel: string; subtitle: string }) {
  const land = spec.size === "landscape";
  const nameFont = land ? 26 : spec.size === "portrait" ? 42 : 38;
  const jersey = land ? 44 : 76;
  return (
    <Frame spec={spec} theme={theme} subtitle={subtitle} gwLabel={gwLabel}>
      {rows.length === 0 ? (
        <div style={{ ...panel(theme), flex: 1, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 40, fontSize: land ? 24 : 32, color: theme.muted, fontWeight: 700 }}>
          No players match these filters yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: land ? 8 : 12, flex: 1, minHeight: 0 }}>
          {rows.map((r) => (
            <div key={r.id} style={{ ...panel(theme), position: "relative", overflow: "hidden", flex: 1, maxHeight: land ? 84 : 150, minHeight: 0 }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.max(4, r.share * 100)}%`, background: theme.accent, opacity: 0.22 }} />
              <div style={{ position: "relative", height: "100%", display: "flex", alignItems: "center", gap: land ? 14 : 22, padding: land ? "0 18px" : "0 28px" }}>
                <div style={{ fontSize: land ? 28 : 46, fontWeight: 900, color: theme.accent, width: land ? 36 : 58, flexShrink: 0 }}>{r.rank}</div>
                <Jersey team={r.teamShort} position={r.position} px={jersey} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: nameFont, fontWeight: 900, lineHeight: 1.05, ...ellipsis }}>{r.name}</div>
                  <div style={{ fontSize: land ? 15 : 22, color: theme.muted, fontWeight: 700, ...ellipsis }}>{r.teamShort} · {r.position} · {r.price}</div>
                </div>
                <div style={{ fontSize: land ? 34 : 56, fontWeight: 900, lineHeight: 1, flexShrink: 0 }}>{r.valueLabel}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Frame>
  );
}

// ---------- Availability Watch ----------

function AvailabilityFace({ spec, theme, rows, gwLabel, subtitle }: { spec: GraphicSpec; theme: GraphicTheme; rows: AvailabilityRow[]; gwLabel: string; subtitle: string }) {
  const land = spec.size === "landscape";
  const nameFont = land ? 26 : spec.size === "portrait" ? 42 : 38;
  const jersey = land ? 44 : 76;
  const tone = (t: AvailabilityRow["tone"]) => (t === "ok" ? theme.good : t === "warn" ? "#fbbf24" : theme.bad);
  return (
    <Frame spec={spec} theme={theme} subtitle={subtitle} gwLabel={gwLabel}>
      {rows.length === 0 ? (
        <div style={{ ...panel(theme), flex: 1, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 40, fontSize: land ? 24 : 32, color: theme.muted, fontWeight: 700 }}>
          No injury or suspension news on the most-owned players right now.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: land ? 8 : 12, flex: 1, minHeight: 0 }}>
          {rows.map((r) => (
            <div key={r.id} style={{ ...panel(theme), flex: 1, maxHeight: land ? 84 : 150, display: "flex", alignItems: "center", gap: land ? 12 : 20, padding: land ? "0 16px" : "0 26px", minHeight: 0 }}>
              <div style={{ fontSize: land ? 28 : 46, fontWeight: 900, color: theme.accent, width: land ? 34 : 54, flexShrink: 0 }}>{r.rank}</div>
              <Jersey team={r.teamShort} position={r.position} px={jersey} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: nameFont, fontWeight: 900, lineHeight: 1.05, ...ellipsis }}>{r.name}</div>
                <div style={{ fontSize: land ? 14 : 21, color: theme.muted, fontWeight: 700, ...ellipsis }}>{r.teamShort} · {r.position} · {r.ownership} owned</div>
                {r.news && <div style={{ fontSize: land ? 13 : 20, color: theme.text, opacity: 0.85, fontWeight: 600, marginTop: land ? 1 : 4, ...ellipsis }}>{r.news}</div>}
              </div>
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                <div style={{ background: tone(r.tone), color: "#0b1020", borderRadius: 999, padding: land ? "3px 14px" : "6px 22px", fontSize: land ? 15 : 24, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap" }}>
                  {r.statusLabel}{r.chance !== null ? ` · ${r.chance}%` : ""}
                </div>
                {r.added && <div style={{ fontSize: land ? 11 : 16, color: theme.muted, fontWeight: 600, marginTop: land ? 2 : 4 }}>{r.added}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Frame>
  );
}


// ---------- Match graphics ----------

const MATCH_RED = "#ef4444";
const MATCH_YELLOW = "#facc15";

function EmptyNote({ theme, land, children }: { theme: GraphicTheme; land: boolean; children: ReactNode }) {
  return (
    <div style={{ ...panel(theme), flex: 1, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 40, fontSize: land ? 24 : 32, color: theme.muted, fontWeight: 700 }}>
      {children}
    </div>
  );
}

/** "Sat 24 Oct · 17:30" -> two short lines. */
function KickoffLabel({ label, theme, font, align = "left" }: { label: string; theme: GraphicTheme; font: number; align?: "left" | "center" | "right" }) {
  const [day, time] = label.split(" · ");
  return (
    <div style={{ textAlign: align, color: theme.muted, fontWeight: 700, fontSize: font, lineHeight: 1.2, flexShrink: 0 }}>
      <div>{day}</div>
      {time && <div style={{ color: theme.text, opacity: 0.85 }}>{time}</div>}
    </div>
  );
}

/** One colour per side, used for that team's goals and win %: the theme accent for home, sky blue (darker on the light theme) for away. Never green. */
function sideColors(theme: GraphicTheme): { home: string; away: string } {
  const lightBackground = contrastRatio(theme.bg, "#ffffff") < 2;
  return { home: theme.accent, away: lightBackground ? "#0e7490" : "#38bdf8" };
}

function ProbBar({ probs, theme, label, big }: { probs: { home: number; draw: number; away: number }; theme: GraphicTheme; label: number; big?: boolean }) {
  const side = sideColors(theme);
  const parts = [
    { key: "home", value: probs.home, color: side.home },
    { key: "draw", value: probs.draw, color: theme.muted },
    { key: "away", value: probs.away, color: side.away },
  ];
  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: label, fontWeight: 800, marginBottom: big ? 8 : 3 }}>
        {parts.map((p) => (
          <span key={p.key} style={{ color: p.color }}>{p.value}%</span>
        ))}
      </div>
      <div style={{ display: "flex", height: big ? 20 : 10, borderRadius: 999, overflow: "hidden", gap: 2 }}>
        {parts.map((p) => (
          <div key={p.key} style={{ flex: Math.max(p.value, 1), background: p.color, opacity: p.key === "draw" ? 0.55 : 1 }} />
        ))}
      </div>
    </div>
  );
}

function PredictionsFace({ spec, theme, predictions, gwLabel, subtitle }: { spec: GraphicSpec; theme: GraphicTheme; predictions: MatchPredictionsContent; gwLabel: string; subtitle: string }) {
  const land = spec.size === "landscape";
  const tall = spec.size === "portrait";
  const teamFont = land ? 24 : tall ? 34 : 32;
  const jersey = land ? 34 : tall ? 56 : 50;
  const xgFont = land ? 28 : tall ? 44 : 38;
  const csFont = land ? 18 : tall ? 25 : 23;
  const small = land ? 13 : 17;
  const side = sideColors(theme);
  const xgText = (v: number | null) => (v === null ? "–" : formatGoals(v));
  const csText = (v: number | null) => (v === null ? "–" : `${Math.round(v)}%`);
  return (
    <Frame spec={spec} theme={theme} subtitle={subtitle} gwLabel={gwLabel}>
      {predictions.rows.length === 0 ? (
        <EmptyNote theme={theme} land={land}>No fixtures left to predict in {gwLabel}.</EmptyNote>
      ) : (
        <>
          <div style={{ fontSize: land ? 13 : 17, color: theme.muted, fontWeight: 700, marginBottom: land ? 6 : 10, flexShrink: 0 }}>
            Big number: expected goals · CS: clean-sheet chance · Bar: home win / draw / away win
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: land ? 6 : 10, flex: 1, minHeight: 0 }}>
            {predictions.rows.map((r) => (
              <div key={r.id} style={{ ...panel(theme, { borderRadius: 16 }), flex: 1, maxHeight: land ? 80 : tall ? 124 : 110, minHeight: 0, display: "flex", alignItems: "center", gap: land ? 12 : 16, padding: land ? "0 16px" : "0 20px" }} data-testid={`prediction-${r.id}`}>
                <div style={{ width: land ? 96 : 118, flexShrink: 0 }}>
                  <KickoffLabel label={r.kickoffLabel} theme={theme} font={small} />
                </div>
                <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: land ? 8 : 10 }}>
                  <span style={{ fontSize: teamFont, fontWeight: 900, ...ellipsis }}>{r.home.short}</span>
                  <Jersey team={r.home.short} position="MID" px={jersey} />
                </div>
                <div style={{ width: land ? 190 : tall ? 270 : 240, flexShrink: 0, textAlign: "center" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", whiteSpace: "nowrap", textAlign: "center" }}>
                    <span style={{ fontSize: xgFont, fontWeight: 900, lineHeight: 1, color: side.home }}>{xgText(r.home.xg)}</span>
                    <span style={{ fontSize: xgFont, fontWeight: 900, lineHeight: 1, padding: "0 0.25em" }}>–</span>
                    <span style={{ fontSize: xgFont, fontWeight: 900, lineHeight: 1, color: side.away }}>{xgText(r.away.xg)}</span>
                    <span style={{ fontSize: csFont, fontWeight: 800, color: theme.muted, marginTop: land ? 2 : 4 }}>CS {csText(r.home.cs)}</span>
                    <span />
                    <span style={{ fontSize: csFont, fontWeight: 800, color: theme.muted, marginTop: land ? 2 : 4 }}>CS {csText(r.away.cs)}</span>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "flex-start", gap: land ? 8 : 10 }}>
                  <Jersey team={r.away.short} position="MID" px={jersey} />
                  <span style={{ fontSize: teamFont, fontWeight: 900, ...ellipsis }}>{r.away.short}</span>
                </div>
                <div style={{ width: land ? 190 : tall ? 250 : 220, flexShrink: 0 }}>
                  {r.probs ? (
                    <ProbBar probs={r.probs} theme={theme} label={land ? 15 : 19} />
                  ) : (
                    <div style={{ fontSize: small, color: theme.muted, fontWeight: 700, textAlign: "center" }}>No market odds yet</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Frame>
  );
}

function ResultsFace({ spec, theme, results, gwLabel, subtitle }: { spec: GraphicSpec; theme: GraphicTheme; results: MatchResultsContent; gwLabel: string; subtitle: string }) {
  const land = spec.size === "landscape";
  const tall = spec.size === "portrait";
  const teamFont = land ? 24 : tall ? 34 : 32;
  const jersey = land ? 34 : tall ? 56 : 50;
  const scoreFont = land ? 34 : tall ? 52 : 46;
  const small = land ? 13 : 17;
  const scorerFont = tall ? 19 : 17;
  const showScorers = !land;
  const scorerLine = (names: string[]) => names.join(", ");
  return (
    <Frame spec={spec} theme={theme} subtitle={subtitle} gwLabel={gwLabel}>
      {results.rows.length === 0 ? (
        <EmptyNote theme={theme} land={land}>No finished matches in {gwLabel} yet.</EmptyNote>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: land ? 6 : 10, flex: 1, minHeight: 0 }}>
          {results.rows.map((r) => {
            const homeWon = r.outcome === "home";
            const awayWon = r.outcome === "away";
            return (
              <div key={r.id} style={{ ...panel(theme, { borderRadius: 16 }), flex: 1, maxHeight: land ? 80 : tall ? 124 : 110, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 2, padding: land ? "0 16px" : "0 20px" }} data-testid={`result-${r.id}`}>
                <div style={{ display: "flex", alignItems: "center", gap: land ? 12 : 16 }}>
                  <div style={{ width: land ? 96 : 118, flexShrink: 0 }}>
                    <KickoffLabel label={r.kickoffLabel} theme={theme} font={small} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: land ? 8 : 10, opacity: awayWon ? 0.72 : 1 }}>
                    <span style={{ fontSize: teamFont, fontWeight: homeWon ? 900 : 700, ...ellipsis }}>{r.home.short}</span>
                    <Jersey team={r.home.short} position="MID" px={jersey} />
                  </div>
                  <div style={{ width: land ? 130 : tall ? 190 : 170, flexShrink: 0, textAlign: "center", fontSize: scoreFont, fontWeight: 900, color: theme.accent, lineHeight: 1, whiteSpace: "nowrap" }}>
                    {r.home.score} – {r.away.score}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "flex-start", gap: land ? 8 : 10, opacity: homeWon ? 0.72 : 1 }}>
                    <Jersey team={r.away.short} position="MID" px={jersey} />
                    <span style={{ fontSize: teamFont, fontWeight: awayWon ? 900 : 700, ...ellipsis }}>{r.away.short}</span>
                  </div>
                  {/* balances the kick-off column so the score sits in the middle */}
                  <div style={{ width: land ? 96 : 118, flexShrink: 0 }} />
                </div>
                {showScorers && (r.homeScorers.length > 0 || r.awayScorers.length > 0) && (
                  <div style={{ display: "flex", gap: 16, paddingLeft: 134, paddingRight: 134, fontSize: scorerFont, fontWeight: 600, color: theme.muted, lineHeight: 1.2 }}>
                    <div style={{ flex: 1, textAlign: "right", ...ellipsis }}>{scorerLine(r.homeScorers)}</div>
                    <div style={{ width: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1, textAlign: "left", ...ellipsis }}>{scorerLine(r.awayScorers)}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Frame>
  );
}

function FormChips({ form, theme, size }: { form: MatchFormEntry[]; theme: GraphicTheme; size: number }) {
  const color = { W: theme.good, D: theme.muted, L: theme.bad } as const;
  if (!form.length) return <div style={{ fontSize: size * 0.7, color: theme.muted, fontWeight: 700 }}>No results yet</div>;
  return (
    <div style={{ display: "flex", gap: size * 0.18 }}>
      {form.map((f, i) => (
        <div key={i} title={`${f.score} ${f.isHome ? "v" : "at"} ${f.opponent}`} style={{ width: size, height: size, borderRadius: size * 0.3, background: color[f.result], color: "#0b1020", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.55, fontWeight: 900 }}>
          {f.result}
        </div>
      ))}
    </div>
  );
}

function PreviewColumn({ side, theme, land, tall }: { side: MatchPreviewSide; theme: GraphicTheme; land: boolean; tall: boolean }) {
  const last = side.form[side.form.length - 1];
  return (
    <div style={{ ...panel(theme), flex: 1, minWidth: 0, padding: land ? "12px 16px" : "20px 22px", display: "flex", flexDirection: "column", gap: land ? 8 : tall ? 18 : 12 }}>
      <div style={{ fontSize: land ? 14 : 19, fontWeight: 800, color: theme.muted, letterSpacing: 1, textTransform: "uppercase" }}>{side.short} form</div>
      <FormChips form={side.form} theme={theme} size={land ? 28 : tall ? 50 : 44} />
      {tall && side.form.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {[...side.form].reverse().map((f, i) => (
            <div key={i} style={{ fontSize: 19, color: i === 0 ? theme.text : theme.muted, fontWeight: 600 }}>
              {f.result} · {f.score} {f.isHome ? "v" : "at"} {f.opponent}
            </div>
          ))}
        </div>
      )}
      {last && !land && !tall && (
        <div style={{ fontSize: 17, color: theme.muted, fontWeight: 600, marginTop: -6 }}>Last: {last.score} {last.isHome ? "v" : "at"} {last.opponent}</div>
      )}
      <div style={{ fontSize: land ? 14 : 19, fontWeight: 800, color: theme.muted, letterSpacing: 1, textTransform: "uppercase", marginTop: land ? 2 : 6 }}>Top xPts</div>
      {side.topPlayers.length === 0 ? (
        <div style={{ fontSize: land ? 14 : 20, color: theme.muted, fontWeight: 700 }}>No projections yet</div>
      ) : (
        side.topPlayers.map((p) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: land ? 8 : 12 }}>
            <Jersey team={side.short} position={p.position} px={land ? 28 : tall ? 54 : 46} />
            <div style={{ flex: 1, minWidth: 0, fontSize: land ? 18 : tall ? 28 : 26, fontWeight: 800, ...ellipsis }}>{p.name}</div>
            <div style={{ fontSize: land ? 20 : tall ? 32 : 28, fontWeight: 900, color: theme.accent }}>{p.xpts.toFixed(1)}</div>
          </div>
        ))
      )}
    </div>
  );
}

function PreviewFace({ spec, theme, preview, gwLabel }: { spec: GraphicSpec; theme: GraphicTheme; preview: MatchPreviewContent; gwLabel: string }) {
  const land = spec.size === "landscape";
  const tall = spec.size === "portrait";
  const jersey = land ? 84 : tall ? 170 : 130;
  const nameFont = land ? 28 : tall ? 46 : 38;
  const xgFont = land ? 56 : tall ? 88 : 72;
  const csFont = land ? 20 : tall ? 34 : 28;
  const xg = (v: number | null) => (v === null ? "–" : formatGoals(v));
  const side = sideColors(theme);
  const cs = (v: number | null) => (v === null ? "–" : `${Math.round(v)}%`);
  return (
    <Frame spec={spec} theme={theme} subtitle={`${gwLabel} · ${preview.kickoffLabel}`} gwLabel={gwLabel}>
      <div style={{ display: "flex", flexDirection: "column", gap: land ? 10 : tall ? 22 : 16, flex: 1, minHeight: 0 }}>
        <div style={{ ...panel(theme), display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: land ? "10px 20px" : "22px 28px", flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <Jersey team={preview.home.short} position="MID" px={jersey} />
            <div style={{ fontSize: nameFont, fontWeight: 900, maxWidth: "100%", textAlign: "center", lineHeight: 1.05, overflowWrap: "anywhere" }}>{preview.home.name}</div>
          </div>
          <div style={{ flexShrink: 0, textAlign: "center" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", whiteSpace: "nowrap", textAlign: "center" }}>
              <span style={{ fontSize: xgFont, fontWeight: 900, lineHeight: 1, color: side.home }}>{xg(preview.home.xg)}</span>
              <span style={{ fontSize: xgFont, fontWeight: 900, lineHeight: 1, padding: "0 0.25em" }}>–</span>
              <span style={{ fontSize: xgFont, fontWeight: 900, lineHeight: 1, color: side.away }}>{xg(preview.away.xg)}</span>
              <span style={{ fontSize: csFont, fontWeight: 800, marginTop: land ? 4 : 10 }}>CS {cs(preview.home.cs)}</span>
              <span />
              <span style={{ fontSize: csFont, fontWeight: 800, marginTop: land ? 4 : 10 }}>CS {cs(preview.away.cs)}</span>
            </div>
            <div style={{ fontSize: land ? 14 : 20, fontWeight: 700, color: theme.muted, marginTop: land ? 6 : 10 }}>Expected goals · CS: clean-sheet chance</div>
          </div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <Jersey team={preview.away.short} position="MID" px={jersey} />
            <div style={{ fontSize: nameFont, fontWeight: 900, maxWidth: "100%", textAlign: "center", lineHeight: 1.05, overflowWrap: "anywhere" }}>{preview.away.name}</div>
          </div>
        </div>
        <div style={{ ...panel(theme), padding: land ? "10px 20px" : "18px 28px", flexShrink: 0 }}>
          {preview.probs ? (
            <>
              <div style={{ fontSize: land ? 13 : 18, fontWeight: 800, color: theme.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: land ? 4 : 10 }}>
                {preview.home.short} win · draw · {preview.away.short} win (market odds)
              </div>
              <ProbBar probs={preview.probs} theme={theme} label={land ? 18 : tall ? 30 : 26} big={!land} />
            </>
          ) : (
            <div style={{ fontSize: land ? 16 : 22, fontWeight: 700, color: theme.muted, textAlign: "center" }}>No market odds open for this match yet</div>
          )}
        </div>
        <div style={{ display: "flex", gap: land ? 12 : 18, flex: 1, minHeight: 0 }}>
          <PreviewColumn side={preview.home} theme={theme} land={land} tall={tall} />
          <PreviewColumn side={preview.away} theme={theme} land={land} tall={tall} />
        </div>
      </div>
    </Frame>
  );
}

function ReportList({ title, rows, theme, font, empty }: { title: string; rows: ReactNode[]; theme: GraphicTheme; font: number; empty: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: font * 0.72, fontWeight: 800, color: theme.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{title}</div>
      {rows.length === 0 ? (
        <div style={{ fontSize: font, color: theme.muted, fontWeight: 600 }}>{empty}</div>
      ) : (
        rows.map((r, i) => (
          <div key={i} style={{ fontSize: font, fontWeight: 700, lineHeight: 1.3, ...ellipsis }}>{r}</div>
        ))
      )}
    </div>
  );
}

function ReportFace({ spec, theme, report, gwLabel }: { spec: GraphicSpec; theme: GraphicTheme; report: MatchReportContent; gwLabel: string }) {
  const land = spec.size === "landscape";
  const tall = spec.size === "portrait";
  const jersey = land ? 76 : tall ? 150 : 116;
  const nameFont = land ? 26 : tall ? 42 : 36;
  const scoreFont = land ? 64 : tall ? 110 : 90;
  const font = land ? 20 : tall ? 25 : 22;
  const card = (c: MatchReportContent["cards"][number], i: number) => (
    <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: font * 0.6, height: font * 0.85, borderRadius: 3, background: c.kind === "red" ? MATCH_RED : MATCH_YELLOW, display: "inline-block" }} />
      {c.name} <span style={{ color: theme.muted }}>· {c.teamShort}</span>
    </span>
  );
  const sideRows = (home: string[], away: string[]) => [...home.map((n) => <span key={`h${n}`}>{n} <span style={{ color: theme.muted }}>· {report.home.short}</span></span>), ...away.map((n) => <span key={`a${n}`}>{n} <span style={{ color: theme.muted }}>· {report.away.short}</span></span>)];
  const goals = <ReportList title="Goals" rows={sideRows(report.goals.home, report.goals.away)} theme={theme} font={font} empty="No goals" />;
  const assists = <ReportList title="Assists" rows={sideRows(report.assists.home, report.assists.away)} theme={theme} font={font} empty="No assists" />;
  const maxCards = land ? 4 : tall ? 10 : 6;
  const maxDefensive = land ? 3 : tall ? 6 : 5;
  const shownCards = report.cards.slice(0, maxCards).map(card);
  if (report.cards.length > maxCards) shownCards.push(<span key="more" style={{ color: theme.muted }}>+{report.cards.length - maxCards} more</span>);
  const cards = <ReportList title="Cards" rows={shownCards} theme={theme} font={font} empty="No cards" />;
  const bonus = (
    <ReportList
      title="Bonus points"
      rows={report.bonus.map((b, i) => (
        <span key={i}><span style={{ color: theme.accent, fontWeight: 900 }}>{b.points}</span> {b.name} <span style={{ color: theme.muted }}>· {b.teamShort}</span></span>
      ))}
      theme={theme}
      font={font}
      empty="None awarded"
    />
  );
  const shownDefensive = report.defensive.slice(0, maxDefensive);
  const defensive = (
    <div style={{ minWidth: 0 }}>
      <ReportList
        title="Defensive contributions"
        rows={shownDefensive.map((d, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: theme.accent, fontWeight: 900, minWidth: font * 1.2 }}>{d.value}</span>
            <span>{d.name} <span style={{ color: theme.muted }}>· {d.teamShort}</span></span>
            {d.earned && <span style={{ background: theme.good, color: "#0b1020", borderRadius: 999, padding: `0 ${font * 0.4}px`, fontSize: font * 0.75, fontWeight: 900 }}>+2</span>}
          </span>
        ))}
        theme={theme}
        font={font}
        empty="None recorded"
      />
      {shownDefensive.some((d) => d.earned) && <div style={{ fontSize: font * 0.72, color: theme.muted, fontWeight: 600, marginTop: 4 }}>+2 = earned the points</div>}
    </div>
  );
  const notes = report.notes.length > 0 ? <ReportList title="Penalties" rows={report.notes} theme={theme} font={font} empty="" /> : null;
  return (
    <Frame spec={spec} theme={theme} subtitle={`${gwLabel} · ${report.kickoffLabel} · full time`} gwLabel={gwLabel}>
      <div style={{ display: "flex", flexDirection: "column", gap: land ? 10 : tall ? 22 : 16, flex: 1, minHeight: 0 }}>
        <div style={{ ...panel(theme), display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: land ? "10px 20px" : "22px 28px", flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <Jersey team={report.home.short} position="MID" px={jersey} />
            <div style={{ fontSize: nameFont, fontWeight: 900, maxWidth: "100%", textAlign: "center", lineHeight: 1.05, overflowWrap: "anywhere" }}>{report.home.name}</div>
          </div>
          <div style={{ flexShrink: 0, fontSize: scoreFont, fontWeight: 900, color: theme.accent, lineHeight: 1, whiteSpace: "nowrap" }}>{report.home.score} – {report.away.score}</div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <Jersey team={report.away.short} position="MID" px={jersey} />
            <div style={{ fontSize: nameFont, fontWeight: 900, maxWidth: "100%", textAlign: "center", lineHeight: 1.05, overflowWrap: "anywhere" }}>{report.away.name}</div>
          </div>
        </div>
        <div style={{ ...panel(theme), flex: 1, minHeight: 0, overflow: "hidden", padding: land ? "12px 20px" : "22px 28px", display: "grid", gridTemplateColumns: land ? "1fr 1fr 1fr" : "1fr 1fr", columnGap: 28, rowGap: land ? 8 : 18, alignContent: "start" }}>
          {goals}
          {assists}
          {cards}
          {bonus}
          {defensive}
          {notes}
        </div>
      </div>
    </Frame>
  );
}


// ---------- Player graphics ----------

function ProjectionRowView({ r, theme, land, partLabels }: { r: PlayerProjectionRow; theme: GraphicTheme; land: boolean; partLabels: string[] }) {
  const nameFont = land ? 26 : 38;
  const jersey = land ? 44 : 76;
  return (
    <div style={{ ...panel(theme), flex: 1, maxHeight: land ? 84 : 150, display: "flex", alignItems: "center", gap: land ? 12 : 20, padding: land ? "0 16px" : "0 26px", minHeight: 0 }} data-testid={`projection-${r.id}`}>
      <div style={{ fontSize: land ? 28 : 46, fontWeight: 900, color: theme.accent, width: land ? 34 : 54, flexShrink: 0 }}>{r.rank}</div>
      <Jersey team={r.teamShort} position={r.position} px={jersey} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: nameFont, fontWeight: 900, lineHeight: 1.05, ...ellipsis }}>{r.name}{r.doubtful ? " ⚠" : ""}</div>
        <div style={{ fontSize: land ? 14 : 21, color: theme.muted, fontWeight: 700, ...ellipsis }}>{r.teamShort} · {r.price} · {r.ownership}</div>
      </div>
      <div style={{ display: "flex", gap: land ? 14 : 22, flexShrink: 0 }}>
        {r.parts.map((v, i) => (
          <div key={i} style={{ textAlign: "center", minWidth: land ? 62 : 96 }}>
            <div style={{ fontSize: land ? 22 : 34, fontWeight: 800, lineHeight: 1 }}>{v.toFixed(1)}</div>
            <div style={{ fontSize: land ? 11 : 16, color: theme.muted, fontWeight: 700, marginTop: 2, whiteSpace: "nowrap" }}>{partLabels[i]}</div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: "right", flexShrink: 0, minWidth: land ? 84 : 130 }}>
        <div style={{ fontSize: land ? 28 : 46, fontWeight: 900, color: theme.accent, lineHeight: 1 }}>{r.xpts.toFixed(1)}</div>
        <div style={{ fontSize: land ? 12 : 17, color: theme.muted, fontWeight: 700 }}>xPts</div>
      </div>
    </div>
  );
}

function ProjectionsFace({ spec, theme, projections, gwLabel, subtitle }: { spec: GraphicSpec; theme: GraphicTheme; projections: PlayerProjectionsContent; gwLabel: string; subtitle: string }) {
  const land = spec.size === "landscape";
  const tall = spec.size === "portrait";
  const empty = projections.groups.every((g) => g.rows.length === 0);
  return (
    <Frame spec={spec} theme={theme} subtitle={subtitle} gwLabel={gwLabel}>
      {empty ? (
        <EmptyNote theme={theme} land={land}>No projections for {gwLabel} yet.</EmptyNote>
      ) : projections.single ? (
        <div style={{ display: "flex", flexDirection: "column", gap: land ? 8 : 12, flex: 1, minHeight: 0 }}>
          {projections.groups[0].rows.map((r) => (
            <ProjectionRowView key={r.id} r={r} theme={theme} land={land} partLabels={projections.partLabels} />
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: land ? "repeat(4, 1fr)" : "1fr 1fr", gridAutoRows: "1fr", gap: land ? 12 : 18, flex: 1, minHeight: 0 }}>
          {projections.groups.map((g) => (
            <div key={g.position} style={{ ...panel(theme), minWidth: 0, minHeight: 0, padding: land ? "12px 14px" : "18px 22px", display: "flex", flexDirection: "column", gap: land ? 6 : tall ? 12 : 8, overflow: "hidden" }} data-testid={`projection-group-${g.position}`}>
              <div style={{ fontSize: land ? 15 : 22, fontWeight: 900, letterSpacing: 2, color: theme.accent }}>{g.position}</div>
              {g.rows.length === 0 ? (
                <div style={{ fontSize: land ? 14 : 20, color: theme.muted, fontWeight: 700 }}>No projections yet</div>
              ) : (
                g.rows.map((r) => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: land ? 8 : 12, flex: 1, minHeight: 0 }}>
                    <Jersey team={r.teamShort} position={r.position} px={land ? 34 : tall ? 62 : 52} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: land ? 19 : tall ? 30 : 27, fontWeight: 900, lineHeight: 1.05, ...ellipsis }}>{r.name}{r.doubtful ? " ⚠" : ""}</div>
                      <div style={{ fontSize: land ? 12 : 17, color: theme.muted, fontWeight: 700, ...ellipsis }}>{r.teamShort} · {r.price}</div>
                    </div>
                    <div style={{ fontSize: land ? 24 : tall ? 38 : 34, fontWeight: 900, color: theme.accent }}>{r.xpts.toFixed(1)}</div>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      )}
    </Frame>
  );
}

function ScorersFace({ spec, theme, scorers, gwLabel, subtitle }: { spec: GraphicSpec; theme: GraphicTheme; scorers: TopScorersContent; gwLabel: string; subtitle: string }) {
  const land = spec.size === "landscape";
  const nameFont = land ? 26 : spec.size === "portrait" ? 42 : 38;
  const jersey = land ? 44 : 76;
  return (
    <Frame spec={spec} theme={theme} subtitle={subtitle} gwLabel={gwLabel}>
      {scorers.rows.length === 0 ? (
        <EmptyNote theme={theme} land={land}>No scores to show for {gwLabel} yet.</EmptyNote>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: land ? 8 : 12, flex: 1, minHeight: 0 }}>
          {scorers.rows.map((r) => (
            <div key={r.id} style={{ ...panel(theme), flex: 1, maxHeight: land ? 84 : 160, display: "flex", alignItems: "center", gap: land ? 12 : 20, padding: land ? "0 16px" : "0 26px", minHeight: 0 }} data-testid={`scorer-${r.id}`}>
              <div style={{ fontSize: land ? 28 : 46, fontWeight: 900, color: theme.accent, width: land ? 34 : 54, flexShrink: 0 }}>{r.rank}</div>
              <Jersey team={r.teamShort} position={r.position} px={jersey} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: nameFont, fontWeight: 900, lineHeight: 1.05, ...ellipsis }}>{r.name}</div>
                <div style={{ fontSize: land ? 14 : 21, color: theme.muted, fontWeight: 700, ...ellipsis }}>{r.teamShort} · {r.position} · {r.minutes}&apos;</div>
                {r.chips.length > 0 && (
                  <div style={{ display: "flex", gap: land ? 6 : 10, marginTop: land ? 3 : 8, overflow: "hidden" }}>
                    {r.chips.map((c) => (
                      <span key={c.label} style={{ background: theme.panel, border: `1px solid ${theme.panelBorder}`, borderRadius: 999, padding: land ? "1px 8px" : "3px 14px", fontSize: land ? 12 : 19, fontWeight: 800, color: c.points < 0 ? theme.bad : theme.text, whiteSpace: "nowrap" }}>
                        {c.label} {c.points > 0 ? "+" : ""}{c.points}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: land ? 36 : 62, fontWeight: 900, color: theme.accent, lineHeight: 1 }}>{r.points}</div>
                <div style={{ fontSize: land ? 12 : 18, color: theme.muted, fontWeight: 700 }}>points</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Frame>
  );
}

function HistoryFace({ spec, theme, history, gwLabel }: { spec: GraphicSpec; theme: GraphicTheme; history: PlayerHistoryContent; gwLabel: string }) {
  const land = spec.size === "landscape";
  const tall = spec.size === "portrait";
  const t = history.totals;
  const tiles: Array<[string, string]> = [
    ["Points", String(t.points)],
    ["Per game", t.average === null ? "—" : t.average.toFixed(1)],
    ["Goals", String(t.goals)],
    ["Assists", String(t.assists)],
    ["Bonus", String(t.bonus)],
    ["Minutes", String(t.minutes)],
  ];
  const maxPoints = Math.max(10, ...history.bars.map((b) => b.points ?? 0));
  const scaleMax = Math.ceil(maxPoints / 5) * 5;
  const valueFont = land ? 22 : tall ? 38 : 34;
  const smallFont = land ? 12 : tall ? 18 : 16;
  return (
    <Frame spec={spec} theme={theme} subtitle={`${gwLabel} · points in each gameweek`} gwLabel={gwLabel}>
      <div style={{ display: "flex", flexDirection: "column", gap: land ? 8 : tall ? 18 : 14, flex: 1, minHeight: 0 }}>
        <div style={{ ...panel(theme), display: "flex", alignItems: "center", gap: land ? 14 : 22, padding: land ? "8px 18px" : "16px 26px", flexShrink: 0 }}>
          <Jersey team={history.teamShort} position={history.position} px={land ? 52 : tall ? 100 : 84} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: land ? 32 : tall ? 56 : 48, fontWeight: 900, lineHeight: 1.05, ...ellipsis }}>{history.name}</div>
            <div style={{ fontSize: land ? 15 : 24, color: theme.muted, fontWeight: 700, ...ellipsis }}>{history.teamShort} · {history.position} · {history.price} · {history.ownership} owned</div>
          </div>
          {t.best && (
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: land ? 26 : 44, fontWeight: 900, color: theme.good, lineHeight: 1 }}>{t.best.points}</div>
              <div style={{ fontSize: smallFont, color: theme.muted, fontWeight: 700 }}>best · GW{t.best.gameweek}</div>
            </div>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: land ? 8 : 12, flexShrink: 0 }}>
          {tiles.map(([label, value]) => (
            <div key={label} style={{ ...panel(theme, { borderRadius: 14 }), padding: land ? "6px 4px" : "12px 6px", textAlign: "center" }}>
              <div style={{ fontSize: land ? 22 : tall ? 38 : 34, fontWeight: 900, lineHeight: 1.05 }}>{value}</div>
              <div style={{ fontSize: smallFont, color: theme.muted, fontWeight: 700 }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ ...panel(theme), flex: 1, minHeight: 0, display: "flex", gap: land ? 8 : 14, padding: land ? "10px 14px" : "20px 22px", alignItems: "stretch" }} data-testid="history-bars">
          {history.bars.map((b) => {
            const pct = b.points === null ? 0 : Math.max(0, (b.points / scaleMax) * 100);
            const isBest = t.best !== null && b.gameweek === t.best.gameweek && b.points !== null;
            const opp = b.opponents.map((o) => `${o.short}${o.isHome ? "" : "*"}`).join(" + ");
            return (
              <div key={b.gameweek} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: land ? 3 : 6 }}>
                <div style={{ position: "relative", flex: 1, width: "100%", minHeight: 0 }}>
                  {b.points === null ? (
                    <div style={{ position: "absolute", left: "18%", right: "18%", bottom: 0, height: land ? 6 : 10, borderRadius: 6, background: theme.panelBorder }} />
                  ) : (
                    <>
                      <div style={{ position: "absolute", left: "12%", right: "12%", bottom: 0, height: `${pct}%`, minHeight: 4, borderRadius: land ? 6 : 10, background: isBest ? theme.good : theme.accent, opacity: b.minutes > 0 ? 1 : 0.35 }} />
                      <div style={{ position: "absolute", left: 0, right: 0, bottom: `calc(${pct}% + ${land ? 4 : 8}px)`, textAlign: "center", fontSize: valueFont, fontWeight: 900, lineHeight: 1 }}>{b.points}</div>
                    </>
                  )}
                </div>
                <div style={{ fontSize: smallFont + 2, fontWeight: 800, color: theme.muted }}>GW{b.gameweek}</div>
                <div style={{ fontSize: smallFont, fontWeight: 700, color: theme.text, opacity: 0.85, whiteSpace: "nowrap", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", minHeight: smallFont * 1.2 }}>{opp || "–"}</div>
                <div style={{ fontSize: smallFont - 1, color: theme.muted, fontWeight: 600, minHeight: (smallFont - 1) * 1.2 }}>{b.points === null ? "" : b.minutes > 0 ? `${b.minutes}'` : "DNP"}</div>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: land ? 12 : 17, color: theme.muted, fontWeight: 600, flexShrink: 0 }}>* away · DNP = did not play · green bar = best gameweek</div>
      </div>
    </Frame>
  );
}


// ---------- Team graphics ----------

function TeamProjectionsFace({ spec, theme, teams, gwLabel, subtitle }: { spec: GraphicSpec; theme: GraphicTheme; teams: TeamProjectionsContent; gwLabel: string; subtitle: string }) {
  const land = spec.size === "landscape";
  const tall = spec.size === "portrait";
  const def = TEAM_METRICS[teams.metric];
  const value = (v: number) => (def.unit === "percent" ? `${Math.round(v)}%` : v.toFixed(2));
  const perColumn = Math.ceil(teams.rows.length / 2);
  const columns = [teams.rows.slice(0, perColumn), teams.rows.slice(perColumn)];
  return (
    <Frame spec={spec} theme={theme} subtitle={subtitle} gwLabel={gwLabel}>
      {teams.rows.length === 0 ? (
        <EmptyNote theme={theme} land={land}>No fixtures with projections in {gwLabel}.</EmptyNote>
      ) : (
        <>
          <div style={{ fontSize: land ? 13 : 17, color: theme.muted, fontWeight: 700, marginBottom: land ? 6 : 10, flexShrink: 0 }}>
            Big number: {def.perGameLabel} · small: games and total in the range · {def.better === "lower" ? "fewest first" : "best first"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: land ? 12 : 18, flex: 1, minHeight: 0 }}>
            {columns.map((rows, ci) => (
              <div key={ci} style={{ display: "flex", flexDirection: "column", gap: land ? 5 : tall ? 10 : 7, minWidth: 0, minHeight: 0 }}>
                {rows.map((r) => (
                  <div key={r.teamId} style={{ ...panel(theme, { borderRadius: 14 }), position: "relative", overflow: "hidden", flex: 1, minHeight: 0, maxHeight: land ? 56 : 120 }} data-testid={`team-row-${r.short}`}>
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.max(4, r.share * 100)}%`, background: theme.accent, opacity: 0.2 }} />
                    <div style={{ position: "relative", height: "100%", display: "flex", alignItems: "center", gap: land ? 8 : 12, padding: land ? "0 10px" : "0 16px" }}>
                      <div style={{ fontSize: land ? 18 : tall ? 30 : 26, fontWeight: 900, color: theme.accent, width: land ? 26 : 40, flexShrink: 0 }}>{r.rank}</div>
                      <Jersey team={r.short} position="MID" px={land ? 30 : tall ? 54 : 44} />
                      <div style={{ flex: 1, minWidth: 0, fontSize: land ? 20 : tall ? 34 : 30, fontWeight: 900, ...ellipsis }}>{r.short}</div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: land ? 22 : tall ? 38 : 34, fontWeight: 900, lineHeight: 1 }}>{value(r.perGame)}</div>
                        <div style={{ fontSize: land ? 10 : tall ? 15 : 14, color: theme.muted, fontWeight: 700, whiteSpace: "nowrap" }}>
                          {r.games} {r.games === 1 ? "game" : "games"} · {def.unit === "percent" ? r.total.toFixed(1) : formatGoals(r.total)} {def.totalLabel}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </Frame>
  );
}

function TableFace({ spec, theme, table, gwLabel, subtitle }: { spec: GraphicSpec; theme: GraphicTheme; table: TableContent; gwLabel: string; subtitle: string }) {
  const land = spec.size === "landscape";
  const tall = spec.size === "portrait";
  const font = land ? 14 : tall ? 25 : 20;
  const head = land ? 11 : tall ? 16 : 14;
  const jersey = land ? 17 : tall ? 36 : 28;
  const num = land ? 50 : tall ? 66 : 58;
  const zoneColor = { top4: theme.good, relegation: theme.bad } as const;
  const cells = (r: { played: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number; goalDifference: number }) =>
    [r.played, r.wins, r.draws, r.losses, r.goalsFor, r.goalsAgainst, r.goalDifference > 0 ? `+${r.goalDifference}` : r.goalDifference];
  const labels = ["P", "W", "D", "L", "GF", "GA", "GD"];
  const hasZones = table.rows.some((r) => r.zone !== null);
  return (
    <Frame spec={spec} theme={theme} subtitle={subtitle} gwLabel={gwLabel}>
      {table.rows.length === 0 ? (
        <EmptyNote theme={theme} land={land}>No table to show yet.</EmptyNote>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, gap: land ? 2 : 4 }} data-testid="table-rows">
          <div style={{ display: "flex", alignItems: "center", fontSize: head, fontWeight: 800, color: theme.muted, letterSpacing: 1, padding: `0 ${land ? 10 : 16}px 0 ${land ? 16 : 22}px`, flexShrink: 0 }}>
            <div style={{ width: land ? 30 : 46 }}>#</div>
            <div style={{ flex: 1 }}>CLUB</div>
            {labels.map((l) => <div key={l} style={{ width: num, textAlign: "center" }}>{l}</div>)}
            <div style={{ width: land ? 56 : 84, textAlign: "center" }}>PTS</div>
          </div>
          {table.rows.map((r) => (
            <div key={r.teamId} style={{ ...panel(theme, { borderRadius: land ? 6 : 10 }), flex: 1, minHeight: 0, maxHeight: land ? 30 : 70, display: "flex", alignItems: "center", fontSize: font, fontWeight: 700, padding: `0 ${land ? 10 : 16}px 0 ${land ? 10 : 16}px`, borderLeft: `${land ? 5 : 7}px solid ${r.zone ? zoneColor[r.zone] : "transparent"}` }} data-testid={`table-row-${r.short}`}>
              <div style={{ width: land ? 30 : 46, fontWeight: 900, color: theme.muted }}>{r.position}</div>
              <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: land ? 8 : 12 }}>
                <Jersey team={r.short} position="MID" px={jersey} />
                <span style={{ fontWeight: 900, ...ellipsis }}>{land || tall ? r.name : r.short}</span>
              </div>
              {cells(r).map((v, i) => <div key={i} style={{ width: num, textAlign: "center", opacity: i === 6 ? 1 : 0.9 }}>{v}</div>)}
              <div style={{ width: land ? 56 : 84, textAlign: "center", fontWeight: 900, fontSize: font * 1.12, color: theme.accent }}>{r.points}</div>
            </div>
          ))}
          {hasZones && (
            <div style={{ display: "flex", gap: 22, fontSize: land ? 11 : 16, color: theme.muted, fontWeight: 700, flexShrink: 0, paddingTop: land ? 2 : 6 }}>
              <span><span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 3, background: theme.good, marginRight: 8 }} />Top 4</span>
              <span><span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 3, background: theme.bad, marginRight: 8 }} />Bottom 3</span>
            </div>
          )}
        </div>
      )}
    </Frame>
  );
}

function TeamHistoryFace({ spec, theme, history, gwLabel }: { spec: GraphicSpec; theme: GraphicTheme; history: TeamHistoryContent; gwLabel: string }) {
  const land = spec.size === "landscape";
  const tall = spec.size === "portrait";
  const dash = (v: number | string | null) => (v === null ? "—" : String(v));
  const suffix = (n: number) => (n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th");
  const tiles: Array<[string, string]> = [
    ["Position", history.position === null ? "—" : `${history.position}${suffix(history.position)}`],
    ["Points", dash(history.points)],
    ["W-D-L", history.wins === null ? "—" : `${history.wins}-${history.draws}-${history.losses}`],
    ["Goals F-A", history.goalsFor === null ? "—" : `${history.goalsFor}-${history.goalsAgainst}`],
    ["xG F-A", history.xgFor === null || history.xgAgainst === null ? "—" : `${history.xgFor}-${history.xgAgainst}`],
    ["Clean sheets", dash(history.cleanSheets)],
  ];
  const chipColor = { W: theme.good, D: theme.muted, L: theme.bad } as const;
  const w = history.window;
  const rowFont = land ? 17 : tall ? 30 : 26;
  const resultRow = (r: TeamHistoryContent["results"][number], i: number) => (
    <div key={i} style={{ ...panel(theme, { borderRadius: land ? 10 : 14 }), flex: 1, minHeight: 0, maxHeight: land ? 56 : 96, display: "flex", alignItems: "center", gap: land ? 8 : 16, padding: land ? "0 12px" : "0 22px" }} data-testid={`team-result-${i}`}>
      <div style={{ width: land ? 46 : 74, fontSize: land ? 13 : 20, fontWeight: 800, color: theme.muted, flexShrink: 0 }}>GW{r.gameweek}</div>
      <div style={{ width: land ? 22 : 34, fontSize: land ? 12 : 19, fontWeight: 800, color: theme.muted, flexShrink: 0 }}>{r.isHome ? "H" : "A"}</div>
      <Jersey team={r.opponentShort} position="MID" px={land ? 26 : tall ? 54 : 44} />
      <div style={{ flex: 1, minWidth: 0, fontSize: rowFont, fontWeight: 800, ...ellipsis }}>{r.opponentName}</div>
      <div style={{ fontSize: land ? 22 : tall ? 40 : 34, fontWeight: 900, whiteSpace: "nowrap" }}>{r.scored} – {r.conceded}</div>
      <div style={{ width: land ? 28 : 52, height: land ? 28 : 52, borderRadius: land ? 8 : 14, background: chipColor[r.result], color: "#0b1020", display: "flex", alignItems: "center", justifyContent: "center", fontSize: land ? 16 : 28, fontWeight: 900, flexShrink: 0 }}>{r.result}</div>
    </div>
  );
  const half = Math.ceil(history.results.length / 2);
  return (
    <Frame spec={spec} theme={theme} subtitle={`${gwLabel || "Season"} · recent results and form`} gwLabel={gwLabel}>
      <div style={{ display: "flex", flexDirection: "column", gap: land ? 8 : tall ? 18 : 14, flex: 1, minHeight: 0 }}>
        <div style={{ ...panel(theme), display: "flex", alignItems: "center", gap: land ? 14 : 22, padding: land ? "8px 18px" : "16px 26px", flexShrink: 0 }}>
          <Jersey team={history.short} position="MID" px={land ? 52 : tall ? 100 : 84} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: land ? 32 : tall ? 56 : 48, fontWeight: 900, lineHeight: 1.05, ...ellipsis }}>{history.name}</div>
            <div style={{ fontSize: land ? 15 : 24, color: theme.muted, fontWeight: 700, ...ellipsis }}>
              {history.results.length ? `Last ${history.results.length}: W${w.wins} D${w.draws} L${w.losses} · goals ${w.goalsFor}-${w.goalsAgainst}` : "No finished matches yet"}
            </div>
          </div>
          <div style={{ display: "flex", gap: land ? 5 : 8, flexShrink: 0 }}>
            {history.results.map((r, i) => (
              <div key={i} style={{ width: land ? 22 : 38, height: land ? 22 : 38, borderRadius: land ? 6 : 10, background: chipColor[r.result], color: "#0b1020", display: "flex", alignItems: "center", justifyContent: "center", fontSize: land ? 13 : 22, fontWeight: 900 }}>{r.result}</div>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: land ? 8 : 12, flexShrink: 0 }}>
          {tiles.map(([label, value]) => (
            <div key={label} style={{ ...panel(theme, { borderRadius: 14 }), padding: land ? "6px 4px" : "12px 6px", textAlign: "center", minWidth: 0 }}>
              <div style={{ fontSize: land ? 20 : tall ? 34 : 28, fontWeight: 900, lineHeight: 1.05, whiteSpace: "nowrap" }}>{value}</div>
              <div style={{ fontSize: land ? 11 : tall ? 17 : 15, color: theme.muted, fontWeight: 700, whiteSpace: "nowrap" }}>{label}</div>
            </div>
          ))}
        </div>
        {history.results.length === 0 ? (
          <EmptyNote theme={theme} land={land}>This club has no finished matches yet.</EmptyNote>
        ) : land ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, flex: 1, minHeight: 0 }}>
            {[history.results.slice(0, half), history.results.slice(half)].map((rows, ci) => (
              <div key={ci} style={{ display: "flex", flexDirection: "column", gap: 6, minHeight: 0 }}>{rows.map((r, i) => resultRow(r, ci * half + i))}</div>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: tall ? 12 : 8, flex: 1, minHeight: 0 }}>
            {history.results.map(resultRow)}
          </div>
        )}
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
    case "player-news": return <NewsFace spec={spec} theme={theme} news={data.news} />;
    case "captain-picks": return <CaptainFace spec={spec} theme={theme} rows={data.rows} gwLabel={data.gwLabel} subtitle={data.subtitle} />;
    case "fixture-ticker": return <TickerFace spec={spec} theme={theme} grid={data.grid} gwLabel={data.gwLabel} />;
    case "transfer-trends": return <TrendsFace spec={spec} theme={theme} trends={data.trends} gwLabel={data.gwLabel} subtitle={data.subtitle} />;
    case "team-of-the-week": return <TotwFace spec={spec} theme={theme} totw={data.totw} gwLabel={data.gwLabel} />;
    case "stat-leaders": return <LeadersFace spec={spec} theme={theme} rows={data.rows} gwLabel={data.gwLabel} subtitle={data.subtitle} />;
    case "availability-watch": return <AvailabilityFace spec={spec} theme={theme} rows={data.rows} gwLabel={data.gwLabel} subtitle={data.subtitle} />;
    case "match-predictions": return <PredictionsFace spec={spec} theme={theme} predictions={data.predictions} gwLabel={data.gwLabel} subtitle={data.subtitle} />;
    case "match-results": return <ResultsFace spec={spec} theme={theme} results={data.results} gwLabel={data.gwLabel} subtitle={data.subtitle} />;
    case "match-preview": return <PreviewFace spec={spec} theme={theme} preview={data.preview} gwLabel={data.gwLabel} />;
    case "player-projections": return <ProjectionsFace spec={spec} theme={theme} projections={data.projections} gwLabel={data.gwLabel} subtitle={data.subtitle} />;
    case "gw-top-scorers": return <ScorersFace spec={spec} theme={theme} scorers={data.scorers} gwLabel={data.gwLabel} subtitle={data.subtitle} />;
    case "player-history": return <HistoryFace spec={spec} theme={theme} history={data.history} gwLabel={data.gwLabel} />;
    case "team-projections": return <TeamProjectionsFace spec={spec} theme={theme} teams={data.teams} gwLabel={data.gwLabel} subtitle={data.subtitle} />;
    case "projected-table":
    case "league-table": return <TableFace spec={spec} theme={theme} table={data.table} gwLabel={data.gwLabel} subtitle={data.subtitle} />;
    case "team-history": return <TeamHistoryFace spec={spec} theme={theme} history={data.history} gwLabel={data.gwLabel} />;
    case "match-report": return <ReportFace spec={spec} theme={theme} report={data.report} gwLabel={data.gwLabel} />;
    case "top-differentials": return <DifferentialsFace spec={spec} theme={theme} rows={data.rows} gwLabel={data.gwLabel} subtitle={data.subtitle} />;
  }
}
