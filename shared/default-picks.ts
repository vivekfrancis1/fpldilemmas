// One set of rules for choosing default players and teams, so every tool opens on something useful instead of an empty
// form. Pure functions over the data the pages already load (FPL bootstrap players, fixtures, our projections).
//   trending      the most transferred-in players this gameweek
//   top by xPts   the best projected players
//   next club     the club whose match kicks off next
//   newsworthy    the most-owned player with injury/availability news
//   saved squad   the 15 players of a team ID the person has entered once

export const DEFAULT_COMPARISON_SIZE = 3;
/** Fixtures Comparison opens on this many clubs (the ones with the easiest runs). */
export const DEFAULT_FIXTURE_COMPARISON_SIZE = 4;

export interface PickElement {
  id: number;
  element_type: number;
  team: number;
  status?: string;
  transfers_in_event?: number | string | null;
  selected_by_percent?: string | number | null;
  news?: string | null;
}

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};

/** Players who can be picked: not injured, suspended, unavailable or outside the squad list. Doubtful is fine. */
export function isPickable(e: PickElement): boolean {
  return !["i", "s", "u", "n"].includes(e.status ?? "a");
}

/** Ids of the n players most transferred in this gameweek (pickable, at least one transfer), ties by ownership then id. */
export function trendingIn(elements: PickElement[], n: number, opts: { elementType?: number } = {}): number[] {
  return elements
    .filter((e) => isPickable(e) && num(e.transfers_in_event) > 0 && (opts.elementType === undefined || e.element_type === opts.elementType))
    .sort((a, b) => num(b.transfers_in_event) - num(a.transfers_in_event) || num(b.selected_by_percent) - num(a.selected_by_percent) || a.id - b.id)
    .slice(0, n)
    .map((e) => e.id);
}

/** Ids of the n best projected players (pickable, with a projection), ties by lower id. */
export function topByProjection(elements: PickElement[], totals: Map<number, number | null>, n: number, opts: { elementType?: number } = {}): number[] {
  return elements
    .filter((e) => isPickable(e) && typeof totals.get(e.id) === "number" && (opts.elementType === undefined || e.element_type === opts.elementType))
    .sort((a, b) => (totals.get(b.id) as number) - (totals.get(a.id) as number) || a.id - b.id)
    .slice(0, n)
    .map((e) => e.id);
}

export interface PickFixture {
  event: number | null;
  team_h: number;
  team_a: number;
  finished?: boolean;
  kickoff_time?: string | null;
}

/** The home team of the earliest unfinished match in the gameweek, or in the next gameweek that has one left. */
export function nextFixtureClub(fixtures: PickFixture[], gameweek: number): number | null {
  const open = fixtures.filter((f) => f.event !== null && f.event >= gameweek && !f.finished);
  if (open.length === 0) return null;
  const firstGw = Math.min(...open.map((f) => f.event as number));
  const inGw = open
    .filter((f) => f.event === firstGw)
    .sort((a, b) => (a.kickoff_time ?? "").localeCompare(b.kickoff_time ?? "") || a.team_h - b.team_h);
  return inGw[0].team_h;
}

/** The most-owned player who has news and is not simply available (the one most worth a news card). */
export function mostNewsworthy(elements: PickElement[]): number | null {
  const withNews = elements
    .filter((e) => (e.news ?? "").trim() !== "" && (e.status ?? "a") !== "a")
    .sort((a, b) => num(b.selected_by_percent) - num(a.selected_by_percent) || a.id - b.id);
  return withNews[0]?.id ?? null;
}

/** Player ids of a team's picks in squad order (the 11 starters, then the bench). */
export function squadFromPicks(picks: Array<{ element: number; position: number }> | undefined | null): number[] {
  return [...(picks ?? [])].sort((a, b) => a.position - b.position).map((p) => p.element);
}
