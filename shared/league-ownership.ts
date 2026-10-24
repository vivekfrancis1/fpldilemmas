// Mini-league ownership: exact counts over the squads we loaded for a league (a league is small enough to count,
// unlike global effective ownership). Everything is "how many of the managers counted hold this player", with the
// sample size reported. The league's template team reuses buildTemplateTeam on the same squads.
import { buildTemplateTeam, type TemplateTeam } from "./template-team";
import { POSITION_SHORT } from "./captaincy-matrix";

/**
 * Gameweeks whose squads are locked: finished ones, plus the live one once its deadline has passed.
 * Ascending. A deadline exactly at `now` counts as passed.
 */
export function selectableGameweeks(
  events: Array<{ id: number; deadline_time?: string | null; finished?: boolean }>,
  now: Date = new Date(),
): number[] {
  return events
    .filter((e) => e.finished || (!!e.deadline_time && new Date(e.deadline_time).getTime() <= now.getTime()))
    .map((e) => e.id)
    .sort((a, b) => a - b);
}

export interface LeagueManager {
  managerId: number;
  picks: Array<{ element: number; is_captain?: boolean; position?: number }> | null | undefined;
  /** Display name and league rank, used to say who holds a threat. Optional. */
  name?: string;
  rank?: number;
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
  /** Points the player scored in the gameweek (0 if he is missing from the points supplied); absent when no points were supplied. */
  points?: number;
}

/** A player you own: whether he is in your starting XI (pick position 1-11) or on the bench. */
export interface YourPlayer extends OwnedPlayer {
  /** Absent when the pick positions are unknown. */
  starting?: boolean;
}

export interface ThreatOwner {
  managerId: number;
  name?: string;
  rank?: number;
  /** Whether this manager has him in the starting XI (false = bench); absent when pick positions are unknown. */
  starting?: boolean;
}

/** A player you don't own that only a few of your rivals do. */
export interface Threat extends OwnedPlayer {
  /** Managers who hold him, best league rank first. */
  owners: ThreatOwner[];
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
    differentials: YourPlayer[];
    /** Players at least gapMin % of the league own that you don't. Most owned first. */
    gaps: OwnedPlayer[];
    /**
     * Players you don't own that at least one but fewer than differentialMax % of the league do (your rivals'
     * differentials). The player held by the best-ranked rival first, then fewest owners; at most threatsMax.
     */
    threats: Threat[];
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
  /** How many threats to return. Default 12. */
  threatsMax?: number;
  /** Points scored in the gameweek by player id. */
  points?: Record<number, number>;
}): LeagueOwnership {
  const { managers, elements, teams, topN = 30, you, differentialMax = 25, gapMin = 50, threatsMax = 12, points } = input;
  const complete = managers.filter((m) => Array.isArray(m.picks) && m.picks.length === 15);
  const counted = complete.length;

  const elementById = new Map(elements.map((e) => [e.id, e]));
  const teamById = new Map(teams.map((t) => [t.id, t]));

  const owned = new Map<number, number>();
  const ownersOf = new Map<number, ThreatOwner[]>();
  const captained = new Map<number, number>();
  for (const m of complete) {
    for (const p of m.picks!) {
      owned.set(p.element, (owned.get(p.element) ?? 0) + 1);
      const list = ownersOf.get(p.element) ?? [];
      list.push({ managerId: m.managerId, name: m.name, rank: m.rank, starting: p.position === undefined ? undefined : p.position <= 11 });
      ownersOf.set(p.element, list);
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
      ...(points ? { points: points[id] ?? 0 } : {}),
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
      youResult = { managerId: you.managerId, hasFullSquad, inSample, differentials: [], gaps: [], threats: [] };
    } else {
      const yours = new Set(you.picks!.map((p) => p.element));
      const yourPick = new Map(you.picks!.map((p) => [p.element, p]));
      // exact comparisons on counts (no rounding): ownedBy/counted < max%  <=>  ownedBy*100 < max*counted
      const differentials: YourPlayer[] = Array.from(yours)
        .filter((id) => (owned.get(id) ?? 0) * 100 < differentialMax * counted)
        .map((id) => {
          const base = toOwned(id);
          const position = yourPick.get(id)?.position;
          return base && position !== undefined ? { ...base, starting: position <= 11 } : base;
        })
        .filter((p): p is YourPlayer => !!p)
        .sort((a, b) => a.ownedBy - b.ownedBy || a.playerId - b.playerId);
      const gaps = Array.from(owned.keys())
        .filter((id) => !yours.has(id) && (owned.get(id) ?? 0) * 100 >= gapMin * counted)
        .map(toOwned)
        .filter((p): p is OwnedPlayer => !!p)
        .sort(byOwnedDesc);
      const byRank = (a: ThreatOwner, b: ThreatOwner) => (a.rank ?? Infinity) - (b.rank ?? Infinity) || a.managerId - b.managerId;
      const threats: Threat[] = Array.from(owned.keys())
        .filter((id) => !yours.has(id) && (owned.get(id) ?? 0) * 100 < differentialMax * counted)
        .map((id) => {
          const base = toOwned(id);
          if (!base) return null;
          const owners = [...(ownersOf.get(id) ?? [])].sort(byRank).map((o) => {
            const out: ThreatOwner = { managerId: o.managerId };
            if (o.name !== undefined) out.name = o.name;
            if (o.rank !== undefined) out.rank = o.rank;
            if (o.starting !== undefined) out.starting = o.starting;
            return out;
          });
          return { ...base, owners };
        })
        .filter((t): t is Threat => !!t)
        .sort((a, b) => byRank(a.owners[0], b.owners[0]) || a.ownedBy - b.ownedBy || a.playerId - b.playerId)
        .slice(0, threatsMax);
      youResult = { managerId: you.managerId, hasFullSquad, inSample, differentials, gaps, threats };
    }
  }

  return { managersRequested: managers.length, managersCounted: counted, ownership, captains, template, you: youResult };
}
