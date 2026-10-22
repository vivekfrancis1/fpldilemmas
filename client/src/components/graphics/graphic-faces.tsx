import type { CSSProperties, ReactNode } from "react";
import {
  GRAPHIC_SIZES,
  fdrColor,
  footerHeight,
  footerNote,
  resolveHeadline,
  watermarkText,
  type ComparisonContent,
  type DifferentialRow,
  type FixtureGridContent,
  type GraphicSpec,
  type GraphicTheme,
  type PlayerCardContent,
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
  | { kind: "top-differentials"; rows: DifferentialRow[]; gwLabel: string; subtitle: string };

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
  children,
}: {
  spec: GraphicSpec;
  theme: GraphicTheme;
  subtitle: string;
  gwLabel: string | null;
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
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 20, flexShrink: 0 }}>
          <div style={{ fontSize: m.title, fontWeight: 900, lineHeight: 1.1, textTransform: "uppercase", letterSpacing: 0.5, ...ellipsis }}>{resolveHeadlineText(spec)}</div>
        </div>
        <div style={{ fontSize: m.sub, color: theme.muted, fontWeight: 600, marginTop: land ? 4 : 8, flexShrink: 0, ...ellipsis }}>{subtitle}</div>
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", marginTop: m.gap }}>{children}</div>
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

// ---------- entry point ----------

export function GraphicCanvas({ spec, theme, data }: { spec: GraphicSpec; theme: GraphicTheme; data: GraphicData }) {
  switch (data.kind) {
    case "player-card": return <PlayerCardFace spec={spec} theme={theme} card={data.card} gwLabel={data.gwLabel} />;
    case "player-comparison": return <ComparisonFace spec={spec} theme={theme} comparison={data.comparison} />;
    case "fixtures-comparison": return <FixturesFace spec={spec} theme={theme} grid={data.grid} gwLabel={data.gwLabel} />;
    case "price-change": return <PriceFace spec={spec} theme={theme} prices={data.prices} dateLabel={data.dateLabel} />;
    case "top-differentials": return <DifferentialsFace spec={spec} theme={theme} rows={data.rows} gwLabel={data.gwLabel} subtitle={data.subtitle} />;
  }
}
