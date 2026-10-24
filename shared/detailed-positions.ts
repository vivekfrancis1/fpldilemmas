// Detailed positions (Left-back, Defensive midfield, Left winger...) for FPL players, taken from FotMob's club squad
// pages and matched to FPL players by name. FPL's own position (GKP / DEF / MID / FWD) is kept next to it, and a player
// whose main detailed position sits outside his FPL position is flagged `outOfPosition` (e.g. an FPL defender who is
// playing on the left wing). The detailed position is never bent to fit FPL's. Pure: the script that loads the table
// does the fetching and the writing.

export type FplPosition = "GKP" | "DEF" | "MID" | "FWD";

export const POSITION_LABELS: Record<string, string> = {
  GK: "Goalkeeper",
  CB: "Centre-back",
  LB: "Left-back",
  RB: "Right-back",
  LWB: "Left wing-back",
  RWB: "Right wing-back",
  CDM: "Defensive midfield",
  CM: "Central midfield",
  CAM: "Attacking midfield",
  LM: "Left midfield",
  RM: "Right midfield",
  LW: "Left winger",
  RW: "Right winger",
  ST: "Striker",
};

// FPL's own labels vary: wingers are usually midfielders but some are forwards, wing-backs are defenders or midfielders.
const ALLOWED: Record<string, FplPosition[]> = {
  GK: ["GKP"],
  CB: ["DEF"],
  LB: ["DEF"],
  RB: ["DEF"],
  LWB: ["DEF", "MID"],
  RWB: ["DEF", "MID"],
  CDM: ["MID"],
  CM: ["MID"],
  CAM: ["MID", "FWD"],
  LM: ["MID"],
  RM: ["MID"],
  LW: ["MID", "FWD"],
  RW: ["MID", "FWD"],
  ST: ["FWD"],
};

/** The FPL positions a detailed position normally appears under. */
export function allowedFplPositions(code: string): FplPosition[] {
  return ALLOWED[code] ?? [];
}

export function fplPositionFromType(elementType: number): FplPosition {
  return (["GKP", "DEF", "MID", "FWD"] as const)[elementType - 1];
}

/** "LB,CB" -> ["LB","CB"]: known codes only, in order (the first is the main position), no repeats. */
export function parsePositionCodes(raw: string | null | undefined): string[] {
  const out: string[] = [];
  for (const part of (raw ?? "").split(",")) {
    const code = part.trim().toUpperCase();
    if (POSITION_LABELS[code] && !out.includes(code)) out.push(code);
  }
  return out;
}

const SPECIAL_LETTERS: Record<string, string> = { ø: "o", đ: "d", ł: "l", æ: "ae", œ: "oe", ß: "ss", ð: "d", þ: "th", ı: "i" };

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[øđłæœßðþı]/g, (c) => SPECIAL_LETTERS[c])
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export interface FplPlayerInput {
  id: number;
  first_name: string;
  second_name: string;
  web_name: string;
  element_type: number;
  team: number;
}

export interface FotmobMember {
  id: number;
  name: string;
  /** Comma list, main position first (FotMob's `positionIdsDesc`). */
  positionIdsDesc?: string;
}

export type MatchMethod = "name" | "name-part" | "web-name" | "web-name-part";

export interface MatchResult<M extends FotmobMember = FotmobMember, P extends FplPlayerInput = FplPlayerInput> {
  matches: Map<number, { member: M; method: MatchMethod }>;
  unmatchedFpl: P[];
  unmatchedFotmob: M[];
}

const tokens = (s: string) => normalizeName(s).split(" ").filter(Boolean);
const isSubset = (small: string[], big: string[]) => small.length > 0 && small.every((t) => big.includes(t));

/**
 * Matches FPL players to FotMob squad members, strictest rule first. A match is only made when exactly one FotMob player
 * fits and no other FPL player fits him too: an ambiguous name stays unmatched rather than being guessed.
 */
export function matchFplToFotmob<M extends FotmobMember, P extends FplPlayerInput>(players: P[], members: M[]): MatchResult<M, P> {
  const matches = new Map<number, { member: M; method: MatchMethod }>();
  const claimed = new Set<number>();
  const memberTokens = new Map(members.map((m) => [m.id, tokens(m.name)]));
  const memberNorm = new Map(members.map((m) => [m.id, normalizeName(m.name)]));

  const rules: Array<[MatchMethod, (p: P, m: M) => boolean]> = [
    ["name", (p, m) => {
      const full = tokens(`${p.first_name} ${p.second_name}`);
      const mt = memberTokens.get(m.id)!;
      return memberNorm.get(m.id) === full.join(" ") || (mt.length >= 2 && isSubset(mt, full));
    }],
    ["name-part", (p, m) => {
      const full = tokens(`${p.first_name} ${p.second_name}`);
      return full.length >= 2 && isSubset(full, memberTokens.get(m.id)!);
    }],
    ["web-name", (p, m) => normalizeName(p.web_name) === memberNorm.get(m.id)],
    ["web-name-part", (p, m) => isSubset(tokens(p.web_name), memberTokens.get(m.id)!)],
  ];

  for (const [method, fits] of rules) {
    const open = players.filter((p) => !matches.has(p.id));
    const free = members.filter((m) => !claimed.has(m.id));
    const picks: Array<[P, M]> = [];
    for (const p of open) {
      const candidates = free.filter((m) => fits(p, m));
      if (candidates.length !== 1) continue;
      const rivals = open.filter((q) => q.id !== p.id && fits(q, candidates[0]));
      if (rivals.length === 0) picks.push([p, candidates[0]]);
    }
    for (const [p, m] of picks) {
      matches.set(p.id, { member: m, method });
      claimed.add(m.id);
    }
  }

  return {
    matches,
    unmatchedFpl: players.filter((p) => !matches.has(p.id)),
    unmatchedFotmob: members.filter((m) => !claimed.has(m.id)),
  };
}

export interface PositionRecord {
  fplPlayerId: number;
  fplPosition: FplPosition;
  mainPosition: string;
  mainPositionLabel: string;
  otherPositions: string[];
  fotmobPlayerId: number;
  matchMethod: MatchMethod;
  /** The main detailed position is not one FPL normally files under the player's FPL position. */
  outOfPosition: boolean;
}

export function buildPositionRecord(player: FplPlayerInput, member: FotmobMember, method: MatchMethod): PositionRecord | null {
  const [main, ...others] = parsePositionCodes(member.positionIdsDesc);
  if (!main) return null;
  const fplPosition = fplPositionFromType(player.element_type);
  return {
    fplPlayerId: player.id,
    fplPosition,
    mainPosition: main,
    mainPositionLabel: POSITION_LABELS[main],
    otherPositions: others,
    fotmobPlayerId: member.id,
    matchMethod: method,
    outOfPosition: !allowedFplPositions(main).includes(fplPosition),
  };
}
