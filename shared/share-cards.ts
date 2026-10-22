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
