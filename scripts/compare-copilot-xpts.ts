// Read-only: compares our cached per-gameweek player projections with Copilot's own xPts for
// the gameweeks its export covers, and shows where we disagree most. Copilot is a second
// opinion, not truth — use this to find things worth reviewing (e.g. rotation players we
// project as if they start), not as a target to match.
//
// Usage: npx tsx scripts/compare-copilot-xpts.ts            (checks https://fpldilemmas.com)
//        BASE_URL=http://localhost:5050 ENDPOINT="/api/player-total-points?startGameweek=7&endGameweek=12" npx tsx scripts/compare-copilot-xpts.ts
import fs from "fs";
import path from "path";
import { comparePredictions, type CompareRow } from "../server/projection-compare";

const BASE_URL = process.env.BASE_URL || "https://fpldilemmas.com";
// Point at the live (uncached) calculation with e.g. ENDPOINT="/api/player-total-points?startGameweek=7&endGameweek=12"
const ENDPOINT = process.env.ENDPOINT || "/api/cached/player-total-points";
const FILE = path.join(process.cwd(), "Manual Uploads/xMins/Copilot projections/copilot_xmins_xpts_next6.json");

(async () => {
  const exp = JSON.parse(fs.readFileSync(FILE, "utf-8"));
  const res = await fetch(`${BASE_URL}${ENDPOINT}`);
  if (!res.ok) throw new Error(`total points endpoint returned ${res.status}`);
  const ours: any[] = await res.json();
  const byId = new Map(ours.map((p) => [p.playerId, p]));

  const rows: CompareRow[] = [];
  for (const p of exp.players) {
    const o = byId.get(p.id);
    if (!o) continue;
    for (const gw of exp.gameweeks) {
      const theirs = p[`xPts_${gw}`] ?? p[`GW${gw}_xPts`];
      const xMins = p[`xMins_${gw}`] ?? p[`GW${gw}_xMins`];
      const mine = o.gameweekProjections?.[gw];
      if (typeof theirs !== "number" || typeof xMins !== "number" || typeof mine !== "number") continue;
      rows.push({ name: p.name, gw, ours: mine, theirs, xMins });
    }
  }

  const r = comparePredictions(rows, 12);
  console.log(`Export GW${exp.gameweeks.join(",")} (updated ${exp.last_updated}) vs ${BASE_URL}`);
  console.log(`Compared ${r.n} player-gameweeks. Ours minus Copilot: bias ${r.bias.toFixed(2)}, mean abs diff ${r.meanAbsDiff.toFixed(2)}, rank correlation ${r.spearman.toFixed(3)}`);
  console.log("\nBy Copilot expected minutes (positive bias = we project more than Copilot):");
  for (const b of r.byXMins) console.log(`  ${b.label.padEnd(6)} n=${String(b.n).padStart(4)}  bias ${b.bias.toFixed(2).padStart(6)}  mean abs diff ${b.meanAbsDiff.toFixed(2)}`);
  const staleZeros = rows.filter((x) => x.ours === 0 && x.theirs > 1);
  console.log(`\nWe project 0 where Copilot projects > 1: ${staleZeros.length} player-gameweeks (${new Set(staleZeros.map((x) => x.name)).size} players) — usually injuries/suspensions newer than the export`);
  const live = rows.filter((x) => !(x.ours === 0 && x.theirs > 1));
  const over = [...live].sort((a, b) => (b.ours - b.theirs) - (a.ours - a.theirs)).slice(0, 10);
  const under = [...live].sort((a, b) => (a.ours - a.theirs) - (b.ours - b.theirs)).slice(0, 10);
  const fmt = (o: CompareRow) => `  ${o.name.padEnd(14)} GW${String(o.gw).padEnd(3)} ours ${o.ours.toFixed(2).padStart(6)}  Copilot ${o.theirs.toFixed(2).padStart(6)}  (Copilot xMins ${o.xMins})`;
  console.log("\nWe project MORE than Copilot (excluding the zeros above):");
  over.forEach((o) => console.log(fmt(o)));
  console.log("\nWe project LESS than Copilot (excluding the zeros above):");
  under.forEach((o) => console.log(fmt(o)));
  process.exit(0);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
