// Template Team: the most-owned squad among a set of tracked managers (the Top 100 we already load).
// Pure selection and counting only: ownership is "how many of the managers counted hold this player in
// their 15", the squad is the most-owned players per position (2 GKP / 5 DEF / 5 MID / 3 FWD) with the
// 3-players-per-club rule enforced, and the XI is the most-owned legal formation from those 15.
// Squads that did not return exactly 15 picks are left out of the denominator.

export interface TemplatePick {
  element: number;
  is_captain?: boolean;
}

export interface TemplateManager {
  managerId: number;
  picks: TemplatePick[] | null | undefined;
}

export interface TemplateElement {
  id: number;
  web_name: string;
  team: number;
  element_type: number;
  now_cost: number;
}

export interface TemplateTeamInfo {
  id: number;
  name: string;
  short_name: string;
}

export interface TemplatePlayer {
  playerId: number;
  name: string;
  position: "GKP" | "DEF" | "MID" | "FWD";
  teamId: number;
  teamName: string;
  teamShort: string;
  /** Managers (of those counted) holding this player in their 15. */
  ownedBy: number;
  /** ownedBy / managersCounted, rounded to a whole percent. */
  ownershipPercent: number;
  /** Price in millions. */
  price: number;
}

export interface TemplateTeam {
  managersRequested: number;
  managersCounted: number;
  formation: string | null;
  startingXI: TemplatePlayer[];
  bench: TemplatePlayer[];
  captain: { playerId: number; name: string; count: number; percent: number } | null;
  /** Sum of the 15 players' current prices, in millions. */
  totalValue: number;
}

const POSITIONS = ["GKP", "DEF", "MID", "FWD"] as const;
const QUOTA: Record<string, number> = { GKP: 2, DEF: 5, MID: 5, FWD: 3 };
const MAX_PER_CLUB = 3;

export function buildTemplateTeam(input: {
  managers: TemplateManager[];
  elements: TemplateElement[];
  teams: TemplateTeamInfo[];
}): TemplateTeam {
  const { managers, elements, teams } = input;
  const complete = managers.filter((m) => Array.isArray(m.picks) && m.picks.length === 15);
  const counted = complete.length;

  const empty: TemplateTeam = {
    managersRequested: managers.length,
    managersCounted: counted,
    formation: null,
    startingXI: [],
    bench: [],
    captain: null,
    totalValue: 0,
  };
  if (counted === 0) return empty;

  const owned = new Map<number, number>();
  const captained = new Map<number, number>();
  for (const m of complete) {
    for (const p of m.picks!) {
      owned.set(p.element, (owned.get(p.element) ?? 0) + 1);
      if (p.is_captain) captained.set(p.element, (captained.get(p.element) ?? 0) + 1);
    }
  }

  const elementById = new Map(elements.map((e) => [e.id, e]));
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const toPlayer = (e: TemplateElement): TemplatePlayer => {
    const ownedBy = owned.get(e.id) ?? 0;
    const team = teamById.get(e.team);
    return {
      playerId: e.id,
      name: e.web_name,
      position: POSITIONS[e.element_type - 1],
      teamId: e.team,
      teamName: team?.name ?? "",
      teamShort: team?.short_name ?? "",
      ownedBy,
      ownershipPercent: Math.round((ownedBy / counted) * 100),
      price: e.now_cost / 10,
    };
  };
  const byOwnership = (a: TemplatePlayer, b: TemplatePlayer) => b.ownedBy - a.ownedBy || a.playerId - b.playerId;

  // Every player, most-owned first (ties by id), so selection is repeatable.
  const ranked = elements
    .filter((e) => e.element_type >= 1 && e.element_type <= 4)
    .map(toPlayer)
    .sort(byOwnership);

  // Squad of 15: fill each position's quota from the top of the ranking, never exceeding 3 per club.
  const filled: Record<string, number> = { GKP: 0, DEF: 0, MID: 0, FWD: 0 };
  const perClub = new Map<number, number>();
  const squad: TemplatePlayer[] = [];
  for (const p of ranked) {
    if (filled[p.position] >= QUOTA[p.position]) continue;
    if ((perClub.get(p.teamId) ?? 0) >= MAX_PER_CLUB) continue;
    squad.push(p);
    filled[p.position]++;
    perClub.set(p.teamId, (perClub.get(p.teamId) ?? 0) + 1);
  }
  if (squad.length !== 15) return { ...empty, managersCounted: counted };

  // XI: the best keeper, the minimum legal outfield (3 DEF / 2 MID / 1 FWD), then the 4 most-owned remaining outfielders.
  const inSquad = (pos: string) => squad.filter((p) => p.position === pos).sort(byOwnership);
  const xi: TemplatePlayer[] = [
    ...inSquad("GKP").slice(0, 1),
    ...inSquad("DEF").slice(0, 3),
    ...inSquad("MID").slice(0, 2),
    ...inSquad("FWD").slice(0, 1),
  ];
  const chosen = new Set(xi.map((p) => p.playerId));
  const rest = squad.filter((p) => p.position !== "GKP" && !chosen.has(p.playerId)).sort(byOwnership);
  for (const p of rest.slice(0, 4)) xi.push(p);
  const xiIds = new Set(xi.map((p) => p.playerId));

  const order = (p: TemplatePlayer) => POSITIONS.indexOf(p.position);
  const startingXI = xi.sort((a, b) => order(a) - order(b) || byOwnership(a, b));
  const benchPlayers = squad.filter((p) => !xiIds.has(p.playerId));
  const bench = [
    ...benchPlayers.filter((p) => p.position === "GKP"),
    ...benchPlayers.filter((p) => p.position !== "GKP").sort(byOwnership),
  ];

  const n = (pos: string) => startingXI.filter((p) => p.position === pos).length;

  let captain: TemplateTeam["captain"] = null;
  const captainCandidates = Array.from(captained.entries()).sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  if (captainCandidates.length) {
    const [id, count] = captainCandidates[0];
    captain = {
      playerId: id,
      name: elementById.get(id)?.web_name ?? "",
      count,
      percent: Math.round((count / counted) * 100),
    };
  }

  const totalValue = Math.round(squad.reduce((sum, p) => sum + p.price, 0) * 10) / 10;

  return {
    managersRequested: managers.length,
    managersCounted: counted,
    formation: `${n("DEF")}-${n("MID")}-${n("FWD")}`,
    startingXI,
    bench,
    captain,
    totalValue,
  };
}
