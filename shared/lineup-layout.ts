// Where an XI's players are drawn on the pitch: by each player's detailed position (FotMob: LB, CB, CDM, CAM, LW, ST...),
// left to right, rather than by FPL's four positions. A player FPL calls a defender who plays on the left wing is drawn on
// the left wing. Players with no detailed position fall back on their FPL position. Pure.
//
// Lines, back to front:   GKP | DEF | MID (holders and central/wide midfielders) | AM (attacking midfielder, and wingers when
// there is one) | FWD (strikers, and wingers when there is no attacking midfielder). Wing-backs join the midfield line when
// there are three or more centre-backs (3-4-3, 3-5-2), otherwise the back line. Empty lines are left out.

export type LineKey = "GKP" | "DEF" | "MID" | "AM" | "FWD";

export interface LayoutPlayer {
  id: number;
  /** Main detailed position code (GK, CB, LB, RB, LWB, RWB, CDM, CM, CAM, LM, RM, LW, RW, ST), or null when unknown. */
  role: string | null;
  fallback: "GKP" | "DEF" | "MID" | "FWD";
  xMins: number;
}

export interface LayoutRow {
  key: LineKey;
  ids: number[];
}

const FALLBACK_ROLE: Record<LayoutPlayer["fallback"], string> = { GKP: "GK", DEF: "CB", MID: "CM", FWD: "ST" };
const LINE_ORDER: LineKey[] = ["GKP", "DEF", "MID", "AM", "FWD"];

// left (0) to right, within a line
const SIDE: Record<LineKey, Record<string, number>> = {
  GKP: { GK: 0 },
  DEF: { LWB: 0, LB: 0, CB: 1, RB: 2, RWB: 2 },
  MID: { LWB: 0, LM: 1, CDM: 2, CM: 2, RM: 3, RWB: 4 },
  AM: { LW: 0, CAM: 1, RW: 2 },
  FWD: { LW: 0, ST: 1, RW: 2 },
};

export function layoutLineup(players: LayoutPlayer[]): { rows: LayoutRow[]; formation: string } {
  const roleOf = (p: LayoutPlayer) => p.role ?? FALLBACK_ROLE[p.fallback];
  const centreBacks = players.filter((p) => roleOf(p) === "CB").length;
  const hasCam = players.some((p) => roleOf(p) === "CAM");

  const lineOf = (role: string): LineKey => {
    switch (role) {
      case "GK": return "GKP";
      case "LWB":
      case "RWB": return centreBacks >= 3 ? "MID" : "DEF";
      case "CB":
      case "LB":
      case "RB": return "DEF";
      case "CAM": return "AM";
      case "LW":
      case "RW": return hasCam ? "AM" : "FWD";
      case "ST": return "FWD";
      default: return "MID";
    }
  };

  const buckets = new Map<LineKey, LayoutPlayer[]>(LINE_ORDER.map((k) => [k, []]));
  for (const p of players) buckets.get(lineOf(roleOf(p)))!.push(p);

  const rows: LayoutRow[] = [];
  for (const key of LINE_ORDER) {
    const line = buckets.get(key)!;
    if (line.length === 0) continue;
    const side = (p: LayoutPlayer) => SIDE[key][roleOf(p)] ?? 1;
    line.sort((a, b) => side(a) - side(b) || b.xMins - a.xMins || a.id - b.id);
    rows.push({ key, ids: line.map((p) => p.id) });
  }
  const formation = rows.filter((r) => r.key !== "GKP").map((r) => r.ids.length).join("-");
  return { rows, formation };
}
