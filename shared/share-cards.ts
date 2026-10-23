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
