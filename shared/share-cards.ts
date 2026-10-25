// What goes on each shareable image card. Pure content builders (no pixels): every number comes from data the
// pages already show, and every card says where it is from and, for projections, that they are estimates.

export interface ShareCardRow {
  left: string;
  right: string;
}

export interface ShareCardSection {
  heading?: string;
  rows: ShareCardRow[];
}

export interface ShareCard {
  title: string;
  subtitle: string;
  sections: ShareCardSection[];
  footer: string;
}

import type {
  CaptainResult,
  ChipResult,
  FormCaptainResult,
  HitsResult,
  KeeperResult,
  NoChipResult,
  RotationResult,
  SetAndForgetResult,
  ViceResult,
} from "./hindsight-what-if";

export function truncateName(name: string, max: number): string {
  return name.length <= max ? name : `${name.slice(0, max - 1)}…`;
}

export function shareFileName(parts: string[]): string {
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${["fpl-dilemmas", ...parts.map(slug)].filter(Boolean).join("-")}.png`;
}

export function captainsCard(input: {
  gameweek: number;
  players: Array<{ name: string; teamShort: string; xPts: number; captainPoints: number }>;
  limit?: number;
}): ShareCard {
  const { gameweek, players, limit = 5 } = input;
  const rows: ShareCardRow[] = players.slice(0, limit).map((p, i) => ({
    left: `${i + 1}. ${truncateName(p.name, 18)} (${p.teamShort})`,
    right: `${p.xPts.toFixed(1)} xPts · ${p.captainPoints.toFixed(1)} cap`,
  }));
  return {
    title: "Top captain options",
    subtitle: `Gameweek ${gameweek}`,
    sections: [{ rows: rows.length ? rows : [{ left: "No projections available yet", right: "" }] }],
    footer: "fpldilemmas.com · Projections are estimates, not guarantees",
  };
}

const CHIP_LABEL: Record<string, string> = {
  bboost: "Bench Boost",
  "3xc": "Triple Captain",
  freehit: "Free Hit",
  wildcard: "Wildcard",
  manager: "Assistant Manager",
};

export function hindsightCard(input: {
  gameweek: number;
  officialPoints: number;
  bestPossible: number;
  gap: number;
  chip: string | null;
  captain: { chosen: string; chosenPoints: number; best: string; bestPoints: number };
}): ShareCard {
  const { gameweek, officialPoints, bestPossible, gap, chip, captain } = input;
  const rows: ShareCardRow[] = [
    { left: "I scored", right: String(officialPoints) },
    { left: "Best possible from my 15", right: String(bestPossible) },
    { left: "Difference", right: String(gap) },
  ];
  if (chip) rows.push({ left: "Chip", right: CHIP_LABEL[chip] ?? chip });
  rows.push({
    left:
      captain.chosen === captain.best
        ? `Best captain available: ${captain.chosen} (${captain.chosenPoints})`
        : `Captain: ${captain.chosen} (${captain.chosenPoints}) · best was ${captain.best} (${captain.bestPoints})`,
    right: "",
  });
  return {
    title: `Hindsight · GW${gameweek}`,
    subtitle: "My points versus the best XI from the same 15 players",
    sections: [{ rows }],
    footer: "fpldilemmas.com · Shown in hindsight, not advice",
  };
}

// ---------- Pre-deadline Brief sections ----------
// One card per section of the brief, built only from what the section already shows.

const SITE = "fpldilemmas.com";
const withMore = (rows: ShareCardRow[], total: number, shown: number): ShareCardRow[] =>
  total > shown ? [...rows, { left: `+${total - shown} more`, right: "" }] : rows;

export function bestPicksCard(input: {
  gameweek: number;
  byPosition: Record<"GKP" | "DEF" | "MID" | "FWD", Array<{ name: string; teamShort: string; xPts: number }>>;
  perPosition?: number;
}): ShareCard {
  const { gameweek, byPosition, perPosition = 3 } = input;
  return {
    title: "Best picks by position",
    subtitle: `Gameweek ${gameweek}`,
    sections: (["GKP", "DEF", "MID", "FWD"] as const).map((pos) => {
      const rows = byPosition[pos].slice(0, perPosition).map((p) => ({
        left: `${truncateName(p.name, 18)} (${p.teamShort})`,
        right: `${p.xPts.toFixed(1)} xPts`,
      }));
      return { heading: pos, rows: rows.length ? rows : [{ left: "No projections yet", right: "" }] };
    }),
    footer: `${SITE} · Projections are estimates, not guarantees`,
  };
}

/** FPL's status letter (plus chance of playing when below 100) as short text. */
export function statusLabel(status: string, chance: number | null): string {
  const base = status === "s" ? "Suspended" : status === "i" ? "Injured" : status === "u" ? "Unavailable" : "Doubtful";
  return chance !== null && chance < 100 ? `${base} · ${chance}% chance` : base;
}

export function availabilityCard(input: {
  gameweek: number;
  players: Array<{ name: string; teamShort: string; status: string; chanceOfPlayingNextRound: number | null; ownership: number }>;
  limit?: number;
}): ShareCard {
  const { gameweek, players, limit = 10 } = input;
  const rows = players.slice(0, limit).map((p) => ({
    left: `${truncateName(p.name, 16)} (${p.teamShort}) · ${Math.round(p.ownership)}%`,
    right: statusLabel(p.status, p.chanceOfPlayingNextRound),
  }));
  return {
    title: "Availability watch",
    subtitle: `Gameweek ${gameweek} · players owned by 10%+`,
    sections: [{ rows: rows.length ? withMore(rows, players.length, limit) : [{ left: "No injury or suspension flags", right: "" }] }],
    footer: `${SITE} · FPL's own status and news; it can change before the deadline`,
  };
}

export function priceWatchCard(input: { gameweek: number; risers: PriceRowLike[]; fallers: PriceRowLike[]; limit?: number }): ShareCard {
  const { gameweek, risers, fallers, limit = 5 } = input;
  const list = (items: PriceRowLike[]): ShareCardRow[] =>
    items.length
      ? withMore(
          items.slice(0, limit).map((r) => ({
            left: `${truncateName(r.name, 18)} (${r.teamShort})`,
            right: `£${(r.currentPrice / 10).toFixed(1)}m · ${Math.round(r.ownership)}% owned`,
          })),
          items.length,
          limit,
        )
      : [{ left: "None predicted", right: "" }];
  return {
    title: "Price-change watch",
    subtitle: `Gameweek ${gameweek}`,
    sections: [
      { heading: "May rise", rows: list(risers) },
      { heading: "May fall", rows: list(fallers) },
    ],
    footer: `${SITE} · Predictions from transfer momentum, not certainties`,
  };
}
type PriceRowLike = { name: string; teamShort: string; currentPrice: number; ownership: number };

export function dgwBgwCard(input: {
  gameweek: number;
  doubles: Array<{ name: string }>;
  blanks: Array<{ name: string }>;
  tbc: Array<{ name: string }>;
  limit?: number;
}): ShareCard {
  const { gameweek, doubles, blanks, tbc, limit = 8 } = input;
  const section = (heading: string, teams: Array<{ name: string }>) => ({
    heading,
    rows: withMore(teams.slice(0, limit).map((t) => ({ left: t.name, right: "" })), teams.length, limit),
  });
  const sections = [
    doubles.length ? section("Double gameweek", doubles) : null,
    blanks.length ? section("Blank gameweek", blanks) : null,
    tbc.length ? section("Fixture TBC", tbc) : null,
  ].filter((s): s is NonNullable<typeof s> => s !== null);
  return {
    title: "Double and blank gameweeks",
    subtitle: `Gameweek ${gameweek}`,
    sections: sections.length ? sections : [{ rows: [{ left: "No double or blank gameweeks", right: "" }] }],
    footer: `${SITE} · From the official FPL fixture list`,
  };
}

export function deadlineCard(input: { gameweek: number; deadlineLabel: string }): ShareCard {
  return {
    title: `Gameweek ${input.gameweek} deadline`,
    subtitle: "Fantasy Premier League",
    sections: [{ rows: [{ left: "Deadline", right: input.deadlineLabel }, { left: "Gameweek", right: `GW${input.gameweek}` }] }],
    footer: `${SITE} · Set your team before the deadline`,
  };
}

// ---------- Rate My Team ----------

type FlagPlayer = { name: string; gameweeks: number[] };

/** The "Things to check" list from Rate My Team: injuries, blanks, TBC fixtures and doubles in the squad. */
export function thingsToCheckCard(input: {
  gwLabel: string;
  flags: {
    availability: Array<{ name: string; status: string; chanceOfPlayingNextRound: number | null }>;
    blanks: FlagPlayer[];
    doubles: FlagPlayer[];
    tbc: FlagPlayer[];
  };
  /** Most rows the card shows before counting the rest (default 10, so it fits the square). */
  limit?: number;
}): ShareCard {
  const { gwLabel, flags, limit = 10 } = input;
  const gws = (list: number[]) => list.map((g) => `GW${g}`).join(", ");
  const fixtureRows = (list: FlagPlayer[]): ShareCardRow[] => list.map((p) => ({ left: truncateName(p.name, 22), right: gws(p.gameweeks) }));
  const kinds: Array<{ heading: string; rows: ShareCardRow[] }> = [
    {
      heading: "Injuries and suspensions",
      rows: flags.availability.map((a) => ({ left: truncateName(a.name, 22), right: statusLabel(a.status, a.chanceOfPlayingNextRound) })),
    },
    { heading: "Blank gameweek", rows: fixtureRows(flags.blanks) },
    { heading: "Fixture TBC", rows: fixtureRows(flags.tbc) },
    { heading: "Double gameweek", rows: fixtureRows(flags.doubles) },
  ].filter((k) => k.rows.length > 0);

  const total = kinds.reduce((n, k) => n + k.rows.length, 0);
  const sections: ShareCardSection[] = [];
  let left = limit;
  for (const kind of kinds) {
    if (left <= 0) break;
    const rows = kind.rows.slice(0, left);
    left -= rows.length;
    sections.push({ heading: kind.heading, rows });
  }
  if (total > limit) sections[sections.length - 1].rows.push({ left: `+${total - limit} more`, right: "" });

  return {
    title: "Things to check",
    subtitle: `Injuries, blanks and doubles in my squad · ${gwLabel}`,
    sections: sections.length ? sections : [{ rows: [{ left: "No injury flags, blank or double gameweeks in your squad", right: "" }] }],
    footer: `${SITE} · FPL's own status and fixture list; it can change before the deadline`,
  };
}

// ---------- Hindsight "What if" ----------
// One card per scenario, built only from the result the page shows (shared/hindsight-what-if.ts), written in the first person.

/** "+6", "−6" (a real minus sign) or "0". */
export function signedPoints(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0";
}

export type WhatIfCardData =
  | SetAndForgetResult
  | (CaptainResult & { player: { id: number; name: string } })
  | ViceResult
  | FormCaptainResult
  | KeeperResult
  | RotationResult
  | ChipResult
  | HitsResult
  | NoChipResult;

const POSITION_WORD: Record<string, string> = { GKP: "goalkeepers", DEF: "defenders", MID: "midfielders", FWD: "forwards" };
const MAX_WEEK_ROWS = 7;
const WEEKS_HEADING = "Gameweek by gameweek";

/** The weeks that moved the total most (up to MAX_WEEK_ROWS), in gameweek order, then a count of the rest. */
function weekSection(items: Array<{ gameweek: number; text: string; delta: number }>, empty: string): ShareCardSection {
  if (items.length === 0) return { heading: WEEKS_HEADING, rows: [{ left: empty, right: "" }] };
  const biggest = [...items].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.gameweek - b.gameweek).slice(0, MAX_WEEK_ROWS);
  const shown = biggest.sort((a, b) => a.gameweek - b.gameweek);
  const rows: ShareCardRow[] = shown.map((i) => ({ left: `GW${i.gameweek} · ${i.text}`, right: signedPoints(i.delta) }));
  if (items.length > shown.length) rows.push({ left: `+${items.length - shown.length} more gameweeks`, right: "" });
  return { heading: WEEKS_HEADING, rows };
}

const names = (ps: Array<{ name: string }>, max = 3) => ps.slice(0, max).map((p) => p.name).join(", ");

export function whatIfCard(data: WhatIfCardData): ShareCard {
  const card = (title: string, subtitle: string, summary: ShareCardRow[], weeks?: ShareCardSection): ShareCard => ({
    title: `What if · ${title}`,
    subtitle,
    sections: [{ rows: summary }, ...(weeks ? [weeks] : [])],
    footer: "fpldilemmas.com · Shown in hindsight, not advice",
  });

  switch (data.scenario) {
    case "set-and-forget": {
      const t = data.totals;
      const summary: ShareCardRow[] = [{ left: "Best XI points vs my real squads", right: signedPoints(t.delta) }];
      if (t.hitsSaved > 0) {
        summary.push({ left: "Transfer costs saved", right: `+${t.hitsSaved}` }, { left: "Overall", right: signedPoints(t.netDelta) });
      }
      return card(
        "Set and forget",
        `What if I'd kept my GW${data.fromGameweek} squad and made no transfers?`,
        summary,
        weekSection(data.rows.map((r) => ({ gameweek: r.gameweek, text: `kept ${r.fixedBest} vs ${r.actualBest}`, delta: r.delta })), "No gameweeks yet"),
      );
    }
    case "captain":
      return card(
        "Same captain every week",
        `What if I'd captained ${data.player.name} every week?`,
        [
          { left: "Points vs my real captains", right: signedPoints(data.totals.delta) },
          { left: "Weeks it changed something", right: String(data.totals.weeksApplied) },
        ],
        weekSection(
          data.rows.filter((r) => r.status === "applied").map((r) => ({ gameweek: r.gameweek, text: `${r.playerPoints} vs my captain ${r.captainPoints}`, delta: r.delta })),
          "He was never in my XI without the armband",
        ),
      );
    case "vice":
      return card(
        "Vice-captain instead",
        "What if I'd always given the armband to my vice-captain?",
        [
          { left: "Points vs my real captains", right: signedPoints(data.totals.delta) },
          { left: "Weeks it changed something", right: String(data.totals.weeksApplied) },
        ],
        weekSection(
          data.rows.filter((r) => r.status === "applied").map((r) => ({ gameweek: r.gameweek, text: `${truncateName(r.vice!.name, 14)} ${r.vice!.points} vs ${truncateName(r.captain!.name, 14)} ${r.captain!.points}`, delta: r.delta })),
          "No gameweeks yet",
        ),
      );
    case "form-captain":
      return card(
        "Chase form",
        "What if I'd captained last week's top scorer in my XI?",
        [
          { left: "Points vs my real captains", right: signedPoints(data.totals.delta) },
          { left: "Weeks it changed something", right: String(data.totals.weeksApplied) },
        ],
        weekSection(
          data.rows.filter((r) => r.status === "applied").map((r) => ({ gameweek: r.gameweek, text: `${truncateName(r.player!.name, 14)} ${r.player!.points} vs ${truncateName(r.captain!.name, 14)} ${r.captain!.points}`, delta: r.delta })),
          "No gameweeks yet",
        ),
      );
    case "keeper":
      return card(
        "One goalkeeper",
        `What if I'd always started ${data.keeper.name}?`,
        [{ left: "Points vs my real goalkeepers", right: signedPoints(data.totals.delta) }],
        weekSection(
          data.rows.filter((r) => r.status === "changed").map((r) => ({ gameweek: r.gameweek, text: `${data.keeper.name} ${r.keeperPoints} vs ${truncateName(r.started!.name, 14)} ${r.started!.points}`, delta: r.delta })),
          `I started ${data.keeper.name} every week he was in my squad`,
        ),
      );
    case "rotation": {
      const word = POSITION_WORD[data.position] ?? "players";
      return card(
        "Stop rotating",
        `What if I'd stuck with my regular ${word}?`,
        [{ left: `Points vs my real ${word}`, right: signedPoints(data.totals.delta) }],
        weekSection(
          data.rows.filter((r) => r.status === "changed").map((r) => {
            // only the players who differ: the rest of the lineup is the same on both sides
            const startedIds = new Set(r.started.map((x) => x.id));
            const insteadIds = new Set(r.instead.map((x) => x.id));
            const swappedIn = r.instead.filter((x) => !startedIds.has(x.id));
            const swappedOut = r.started.filter((x) => !insteadIds.has(x.id));
            return { gameweek: r.gameweek, text: truncateName(`${names(swappedIn)} for ${names(swappedOut)}`, 40), delta: r.delta };
          }),
          `I already started the same ${word} every week`,
        ),
      );
    }
    case "chips": {
      const rows: ShareCardRow[] =
        data.chips.length === 0
          ? [{ left: "No Bench Boost or Triple Captain played yet", right: "" }]
          : data.chips.map((c) => ({
              left: `${c.chip === "bboost" ? "Bench Boost" : "Triple Captain"} GW${c.usedGameweek}${c.missed > 0 ? ` · best was GW${c.best.gameweek}` : " · best week"}`,
              right: `${c.gain} vs ${c.best.gain}`,
            }));
      return card(
        "Chip timing",
        "Were my Bench Boost and Triple Captain well timed?",
        data.chips.length === 0
          ? rows
          : [
              { left: "Points my chips gave me", right: String(data.totals.gain) },
              { left: "Best weeks available would have given", right: String(data.totals.gain + data.totals.missed) },
            ],
        data.chips.length === 0 ? undefined : { heading: "Each chip: points it gave vs best week", rows },
      );
    }
    case "hits": {
      if (data.rows.length === 0) return card("Transfer hits", "Were the transfer hits I took worth it?", [{ left: "No transfer hits taken yet", right: "" }]);
      return card(
        "Transfer hits",
        `Were the transfer hits I took worth it? (that week and the next ${data.horizon - 1})`,
        [
          { left: "Hits taken", right: `${data.totals.hits} (−${data.totals.cost})` },
          { left: "Net after the hits", right: signedPoints(data.totals.net) },
        ],
        weekSection(data.rows.map((r) => ({ gameweek: r.gameweek, text: truncateName(`in ${names(r.bought, 2) || "–"} · out ${names(r.sold, 2) || "–"}`, 40), delta: r.net })), "No gameweeks yet"),
      );
    }
    case "wildcard":
    case "freehit": {
      const label = data.scenario === "wildcard" ? "Wildcard" : "Free Hit";
      if (data.chips.length === 0) return card(`No ${label}`, `What if I'd kept my old squad instead of my ${label}?`, [{ left: `No ${label} played yet`, right: "" }]);
      return card(
        `No ${label}`,
        `What if I'd kept my old squad instead of my ${label}?`,
        [{ left: "Best XI points vs my real squad", right: signedPoints(data.totals.delta) }],
        weekSection(
          data.chips.flatMap((c) => c.rows.map((r) => ({ gameweek: r.gameweek, text: `GW${c.squadFrom} squad ${r.fixedBest} vs ${r.actualBest}`, delta: r.delta }))),
          "No gameweeks yet",
        ),
      );
    }
  }
}
