// Mini-league ownership: exact counts over the squads we loaded for a league (a league is small enough to count,
// unlike global effective ownership). Everything is "how many of the managers counted hold this player", with the
// sample size reported. The league's template team reuses buildTemplateTeam on the same squads.
import { buildTemplateTeam, type TemplateTeam } from "./template-team";
import { POSITION_SHORT } from "./captaincy-matrix";

export interface LeagueManager {
  managerId: number;
  picks: Array<{ element: number; is_captain?: boolean }> | null | undefined;
}

export interface LeagueElement {
  id: number;
  web_name: string;
  team: number;
  element_type: number;
  now_cost: number;
}

export interface LeagueTeamInfo {
  id: number;
  name: string;
  short_name: string;
}

export interface OwnedPlayer {
  playerId: number;
  name: string;
  position: string;
  teamShort: string;
  ownedBy: number;
  /** ownedBy / managersCounted, whole percent. */
  percent: number;
}

export interface LeagueOwnership {
  managersRequested: number;
  managersCounted: number;
  ownership: OwnedPlayer[];
  captains: Array<{ playerId: number; name: string; count: number; percent: number }>;
  template: TemplateTeam;
  you: null | {
    managerId: number;
    /** false when this squad doesn't have exactly 15 picks. */
    hasFullSquad: boolean;
    /** true when you are one of the managers counted. */
    inSample: boolean;
    /** Players you own that fewer than differentialMax % of the league own. Most distinctive first. */
    differentials: OwnedPlayer[];
    /** Players at least gapMin % of the league own that you don't. Most owned first. */
    gaps: OwnedPlayer[];
  };
}

export function buildLeagueOwnership(input: {
  managers: LeagueManager[];
  elements: LeagueElement[];
  teams: LeagueTeamInfo[];
  topN?: number;
  you?: LeagueManager;
  /** A differential is owned by FEWER than this % of the league (exclusive). Default 25. */
  differentialMax?: number;
  /** A gap is owned by AT LEAST this % of the league (inclusive). Default 50. */
  gapMin?: number;
}): LeagueOwnership {
  const { managers, elements, teams, topN = 30, you, differentialMax = 25, gapMin = 50 } = input;
  const complete = managers.filter((m) => Array.isArray(m.picks) && m.picks.length === 15);
  const counted = complete.length;

  const elementById = new Map(elements.map((e) => [e.id, e]));
  const teamById = new Map(teams.map((t) => [t.id, t]));

  const owned = new Map<number, number>();
  const captained = new Map<number, number>();
  for (const m of complete) {
    for (const p of m.picks!) {
      owned.set(p.element, (owned.get(p.element) ?? 0) + 1);
      if (p.is_captain) captained.set(p.element, (captained.get(p.element) ?? 0) + 1);
    }
  }

  const toOwned = (id: number): OwnedPlayer | null => {
    const e = elementById.get(id);
    if (!e || counted === 0) return null;
    const ownedBy = owned.get(id) ?? 0;
    return {
      playerId: id,
      name: e.web_name,
      position: POSITION_SHORT[e.element_type] ?? "",
      teamShort: teamById.get(e.team)?.short_name ?? "",
      ownedBy,
      percent: Math.round((ownedBy / counted) * 100),
    };
  };
  const byOwnedDesc = (a: OwnedPlayer, b: OwnedPlayer) => b.ownedBy - a.ownedBy || a.playerId - b.playerId;

  const ownership = Array.from(owned.keys())
    .map(toOwned)
    .filter((p): p is OwnedPlayer => !!p)
    .sort(byOwnedDesc)
    .slice(0, topN);

  const captains = Array.from(captained.entries())
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, 5)
    .map(([playerId, count]) => ({
      playerId,
      name: elementById.get(playerId)?.web_name ?? "",
      count,
      percent: Math.round((count / counted) * 100),
    }));

  const template = buildTemplateTeam({
    managers: managers.map((m) => ({ managerId: m.managerId, picks: m.picks as any })),
    elements,
    teams,
  });

  let youResult: LeagueOwnership["you"] = null;
  if (you) {
    const hasFullSquad = Array.isArray(you.picks) && you.picks.length === 15;
    const inSample = complete.some((m) => m.managerId === you.managerId);
    if (!hasFullSquad || counted === 0) {
      youResult = { managerId: you.managerId, hasFullSquad, inSample, differentials: [], gaps: [] };
    } else {
      const yours = new Set(you.picks!.map((p) => p.element));
      // exact comparisons on counts (no rounding): ownedBy/counted < max%  <=>  ownedBy*100 < max*counted
      const differentials = Array.from(yours)
        .filter((id) => (owned.get(id) ?? 0) * 100 < differentialMax * counted)
        .map(toOwned)
        .filter((p): p is OwnedPlayer => !!p)
        .sort((a, b) => a.ownedBy - b.ownedBy || a.playerId - b.playerId);
      const gaps = Array.from(owned.keys())
        .filter((id) => !yours.has(id) && (owned.get(id) ?? 0) * 100 >= gapMin * counted)
        .map(toOwned)
        .filter((p): p is OwnedPlayer => !!p)
        .sort(byOwnedDesc);
      youResult = { managerId: you.managerId, hasFullSquad, inSample, differentials, gaps };
    }
  }

  return { managersRequested: managers.length, managersCounted: counted, ownership, captains, template, you: youResult };
}
