import type { CSSProperties } from "react";
import type { TemplatePlayer } from "@shared/template-team";
import { truncateName } from "@shared/share-cards";
import { getJerseyUrl } from "@/lib/jersey";

// The Template Team share image: the XI on a pitch with the bench underneath. Drawn at its exact export size with
// plain inline styles (no theme tokens) so the PNG looks the same on every device. Shirts are the site's own
// same-origin files, so the export never depends on an outside image host.

export const TEMPLATE_CARD_WIDTH = 1080;
export const TEMPLATE_CARD_HEIGHT = 1350;

const FONT = "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif";
const ROWS: Array<TemplatePlayer["position"]> = ["GKP", "DEF", "MID", "FWD"];
const LINE = "rgba(255,255,255,0.28)";

const absolute: CSSProperties = { position: "absolute", boxSizing: "border-box" };

function PitchMarkings() {
  return (
    <div style={{ ...absolute, inset: 0, pointerEvents: "none" }}>
      <div style={{ ...absolute, left: 0, right: 0, top: "50%", height: 3, background: LINE }} />
      <div style={{ ...absolute, left: "50%", top: "50%", width: 220, height: 220, marginLeft: -110, marginTop: -110, borderRadius: "50%", border: `3px solid ${LINE}` }} />
      <div style={{ ...absolute, left: "50%", top: 0, width: 520, height: 200, marginLeft: -260, border: `3px solid ${LINE}`, borderTop: "none" }} />
      <div style={{ ...absolute, left: "50%", top: 0, width: 240, height: 90, marginLeft: -120, border: `3px solid ${LINE}`, borderTop: "none" }} />
      <div style={{ ...absolute, left: "50%", bottom: 0, width: 520, height: 200, marginLeft: -260, border: `3px solid ${LINE}`, borderBottom: "none" }} />
      <div style={{ ...absolute, left: "50%", bottom: 0, width: 240, height: 90, marginLeft: -120, border: `3px solid ${LINE}`, borderBottom: "none" }} />
    </div>
  );
}

function PlayerTile({ p, captain }: { p: TemplatePlayer; captain: boolean }) {
  return (
    <div style={{ width: 168, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ position: "relative", width: 98, height: 98 }}>
        <img
          src={getJerseyUrl(p.teamShort, p.position)}
          alt=""
          width={98}
          height={98}
          style={{ width: 98, height: 98, objectFit: "contain", filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.35))" }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        {captain && (
          <div style={{ ...absolute, left: -4, top: 0, width: 38, height: 38, borderRadius: "50%", background: "#facc15", border: "3px solid #ffffff", color: "#713f12", fontSize: 22, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>
            C
          </div>
        )}
      </div>
      <div style={{ width: "100%", marginTop: 2, background: "rgba(255,255,255,0.96)", color: "#111827", fontSize: 23, fontWeight: 800, textAlign: "center", padding: "2px 6px", borderRadius: "8px 8px 0 0", whiteSpace: "nowrap", overflow: "hidden" }}>
        {truncateName(p.name, 13)}
      </div>
      <div style={{ width: "100%", background: "#7c3aed", color: "#ffffff", fontSize: 23, fontWeight: 800, textAlign: "center", padding: "2px 6px", borderRadius: "0 0 8px 8px" }}>
        {p.ownershipPercent}%
      </div>
    </div>
  );
}

export function TemplateTeamShareCard({
  gameweek,
  formation,
  managersCounted,
  managersRequested,
  totalValue,
  startingXI,
  bench,
  captain,
}: {
  gameweek: number | null;
  formation: string | null;
  managersCounted: number;
  managersRequested: number;
  totalValue: number;
  startingXI: TemplatePlayer[];
  bench: TemplatePlayer[];
  captain: { playerId: number; name: string; percent: number } | null;
}) {
  return (
    <div
      style={{
        width: TEMPLATE_CARD_WIDTH, height: TEMPLATE_CARD_HEIGHT, boxSizing: "border-box", padding: "40px 36px 28px", display: "flex", flexDirection: "column",
        background: "linear-gradient(170deg, #0b1020 0%, #121936 100%)", color: "#f8fafc", border: "6px solid #fbbf24", fontFamily: FONT, overflow: "hidden",
      }}
    >
      <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 2, color: "#fbbf24" }}>FPL DILEMMAS</div>
      <div style={{ fontSize: 58, fontWeight: 900, lineHeight: 1.1, marginTop: 6, textTransform: "uppercase" }}>
        Template Team{formation ? ` · ${formation}` : ""}
      </div>
      <div style={{ fontSize: 25, color: "#cbd5e1", marginTop: 8 }}>
        Most-owned squad among the Top {managersRequested} managers · GW{gameweek ?? "?"} · {managersCounted} of {managersRequested} squads · £{totalValue.toFixed(1)}m
      </div>

      <div style={{ position: "relative", flex: 1, marginTop: 22, borderRadius: 22, overflow: "hidden", background: "linear-gradient(180deg, #16a34a 0%, #15803d 100%)", display: "flex", flexDirection: "column", padding: "18px 20px 14px" }}>
        <PitchMarkings />
        <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-around" }}>
          {ROWS.map((pos) => (
            <div key={pos} style={{ display: "flex", justifyContent: "center", gap: 14 }}>
              {startingXI.filter((p) => p.position === pos).map((p) => (
                <PlayerTile key={p.playerId} p={p} captain={captain?.playerId === p.playerId} />
              ))}
            </div>
          ))}
        </div>
        <div style={{ position: "relative", marginTop: 10, paddingTop: 8, borderTop: "3px solid rgba(255,255,255,0.35)" }}>
          <div style={{ textAlign: "center", fontSize: 20, fontWeight: 800, letterSpacing: 2, marginBottom: 4 }}>BENCH</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 14 }}>
            {bench.map((p) => (
              <PlayerTile key={p.playerId} p={p} captain={false} />
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 20, fontSize: 22, color: "#cbd5e1" }}>
        <span>
          {captain ? <><b style={{ color: "#facc15" }}>Top captain:</b> {captain.name} ({captain.percent}%) · </> : null}
          Badge = share of squads owning the player
        </span>
        <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>fpldilemmas.com</span>
      </div>
    </div>
  );
}
