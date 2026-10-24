// What each Graphics Maker template opens on when nothing has been chosen yet, so no template starts empty. The rules
// themselves live in shared/default-picks.ts (trending in, best projected, next club, newsworthy); this module maps them
// onto the templates. Pure: the page applies the patch once, and only when the link and the person have chosen nothing.
//
//   Player Card            the best projected player (also Player History)
//   Player Comparison      the 3 most transferred in this gameweek (topped up from the best projected)
//   Cover Generator        the 3 best projected players
//   Player News Quote      the most newsworthy player, else the most transferred in
//   Predicted Lineups      the club whose match kicks off next (also Team History)
//   Fixtures Comparison    the 4 clubs with the easiest run (lowest average official difficulty)
// A comparison needs two to draw, so a single player or club carried over from another template is kept and topped up.
// Team Reveal loads the saved FPL team ID's squad instead (the page does that), and the other templates are driven by
// data (captain picks, ticker, trends, team of the week, leaders...) so they never open empty.

import { DEFAULT_COMPARISON_SIZE, DEFAULT_FIXTURE_COMPARISON_SIZE, mostNewsworthy, nextFixtureClub, topByProjection, trendingIn, type PickElement, type PickFixture } from "./default-picks";
import type { FixtureGridContent, GraphicElement, GraphicSpec } from "./graphics";

export interface GraphicDefaultsContext {
  elements: GraphicElement[];
  /** Our expected points per player over the range being shown (null / missing = no projection). */
  totals: Map<number, number | null>;
  /** undefined while still loading. */
  fixtures: PickFixture[] | undefined;
  /** The single gameweek the lineup is for. */
  gameweek: number;
  /** Every club's fixtures over the range (empty while loading). */
  tickerRows: FixtureGridContent["rows"];
}

const PLAYER_TEMPLATES = new Set(["player-card", "player-comparison", "cover", "player-news", "player-history"]);
const TEAM_TEMPLATES = new Set(["predicted-lineup", "fixtures-comparison", "team-history"]);

/** True when this template has nothing (usable) chosen and has a default to offer. */
export function needsDefaults(spec: GraphicSpec): boolean {
  if (spec.template === "player-comparison") return spec.players.length < 2;
  if (spec.template === "fixtures-comparison") return spec.teams.length < 2;
  if (PLAYER_TEMPLATES.has(spec.template)) return spec.players.length === 0;
  if (TEAM_TEMPLATES.has(spec.template)) return spec.teams.length === 0;
  return false;
}

/** The clubs with the lowest average difficulty (clubs with no fixtures are left out; ties by name). */
export function easiestRunClubs(rows: FixtureGridContent["rows"], n: number): number[] {
  return rows
    .filter((r) => r.avgFdr !== null)
    .sort((a, b) => (a.avgFdr as number) - (b.avgFdr as number) || a.name.localeCompare(b.name))
    .slice(0, n)
    .map((r) => r.teamId);
}

/**
 * The settings to fill in for a template that has nothing chosen, or null when there is nothing to do (something is
 * already chosen) or the data it needs has not loaded yet. Never returns a random pick.
 */
export function defaultSelectionPatch(spec: GraphicSpec, ctx: GraphicDefaultsContext): Partial<GraphicSpec> | null {
  if (!needsDefaults(spec)) return null;
  const elements = ctx.elements as unknown as PickElement[];
  const players = (ids: number[]) => (ids.length ? { players: ids } : null);
  switch (spec.template) {
    case "player-card":
    case "player-history":
      return players(topByProjection(elements, ctx.totals, 1));
    case "cover":
      return players(topByProjection(elements, ctx.totals, DEFAULT_COMPARISON_SIZE));
    case "player-comparison": {
      const kept = spec.players;
      const fresh = (ids: number[]) => ids.filter((id) => !kept.includes(id));
      const trending = fresh(trendingIn(elements, DEFAULT_COMPARISON_SIZE + kept.length));
      const topUp = fresh(topByProjection(elements, ctx.totals, DEFAULT_COMPARISON_SIZE + kept.length + trending.length)).filter((id) => !trending.includes(id));
      return players([...kept, ...trending, ...topUp].slice(0, DEFAULT_COMPARISON_SIZE));
    }
    case "player-news": {
      const id = mostNewsworthy(elements) ?? trendingIn(elements, 1)[0];
      return id === undefined ? null : { players: [id] };
    }
    case "predicted-lineup":
    case "team-history": {
      if (!ctx.fixtures) return null;
      const club = nextFixtureClub(ctx.fixtures, ctx.gameweek);
      return club === null ? null : { teams: [club] };
    }
    case "fixtures-comparison": {
      const kept = spec.teams;
      const easiest = easiestRunClubs(ctx.tickerRows, DEFAULT_FIXTURE_COMPARISON_SIZE + kept.length).filter((id) => !kept.includes(id));
      const ids = [...kept, ...easiest].slice(0, DEFAULT_FIXTURE_COMPARISON_SIZE);
      return ids.length > kept.length ? { teams: ids } : null;
    }
    default:
      return null;
  }
}
