// Matches XMINS_RAW_DATA (transcribed from Manual Uploads/xMins/*.jpeg) to bootstrap-static
// player IDs, sums each player's start-probability across every position slot they appear in
// (mutually-exclusive slots within one projected lineup, so summing gives P(starts anywhere)),
// converts to expected minutes (x 0.9), and stores the result in manual_xmins_projections.
//
// Usage: tsx scripts/build-xmins-projections.ts
import { pool } from "../server/db";
import { internalFetch } from "../server/config";
import { PREMIER_LEAGUE_TEAMS, CURRENT_SEASON } from "../shared/schema";
import { XMINS_RAW_DATA, type XMinsRawRow } from "./xmins-raw-data";

const SOURCE = "solio_baseline";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]/g, "");
}

// "B.Fernandes" / "J.Timber" / "N.Williams" -> surname-only "fernandes" / "timber" / "williams"
function surnameOnly(raw: string): string | null {
  const m = raw.match(/^[A-Z]\.\s*(.+)$/);
  return m ? normalize(m[1]) : null;
}

interface BootstrapElement {
  id: number;
  team: number;
  web_name: string;
  first_name: string;
  second_name: string;
}

function findMatch(raw: string, candidates: BootstrapElement[]): BootstrapElement | null {
  const normRaw = normalize(raw);
  const normSurname = surnameOnly(raw);

  for (const c of candidates) {
    if (normalize(c.web_name) === normRaw) return c;
  }
  for (const c of candidates) {
    if (normalize(c.second_name) === normRaw) return c;
  }
  if (normSurname) {
    for (const c of candidates) {
      if (normalize(c.web_name) === normSurname || normalize(c.second_name) === normSurname) return c;
    }
  }
  for (const c of candidates) {
    if (normalize(`${c.first_name}${c.second_name}`) === normRaw) return c;
  }
  // First-name-only sources (e.g. "Jaden" for Jaden Philogene, whose web_name is the surname).
  for (const c of candidates) {
    if (normalize(c.first_name) === normRaw) return c;
  }
  // Substring match as a fallback, guarded against short-name false positives.
  if (normRaw.length >= 4) {
    for (const c of candidates) {
      const webName = normalize(c.web_name);
      const secondName = normalize(c.second_name);
      if (webName.includes(normRaw) || normRaw.includes(webName)) return c;
      if (secondName.includes(normRaw) || normRaw.includes(secondName)) return c;
    }
  }
  return null;
}

(async () => {
  const bsRes = await internalFetch("api/bootstrap-static");
  if (!bsRes.ok) throw new Error(`bootstrap-static returned ${bsRes.status}`);
  const bootstrap = await bsRes.json();
  const elements: BootstrapElement[] = bootstrap.elements;

  const teamIdByName = new Map<string, number>();
  for (const t of PREMIER_LEAGUE_TEAMS) teamIdByName.set(t.name, t.id);

  const elementsByTeam = new Map<number, BootstrapElement[]>();
  for (const el of elements) {
    if (!elementsByTeam.has(el.team)) elementsByTeam.set(el.team, []);
    elementsByTeam.get(el.team)!.push(el);
  }

  // Sum raw % per (team, raw player name) first, since the same spelling can appear in
  // multiple slots for the same player.
  const sumByKey = new Map<string, { team: string; player: string; pct: number }>();
  for (const row of XMINS_RAW_DATA) {
    const key = `${row.team}||${row.player}`;
    const existing = sumByKey.get(key);
    if (existing) existing.pct += row.pct;
    else sumByKey.set(key, { team: row.team, player: row.player, pct: row.pct });
  }

  const byPlayerId = new Map<number, { playerId: number; team: string; matchedNames: string[]; pct: number; webName: string }>();
  const unmatched: Array<{ team: string; player: string; pct: number }> = [];

  for (const { team, player, pct } of sumByKey.values()) {
    const teamId = teamIdByName.get(team);
    if (!teamId) {
      unmatched.push({ team, player, pct });
      continue;
    }
    const candidates = elementsByTeam.get(teamId) || [];
    const match = findMatch(player, candidates);
    if (!match) {
      unmatched.push({ team, player, pct });
      continue;
    }
    const existing = byPlayerId.get(match.id);
    if (existing) {
      console.log(`  (merging "${player}" into existing match "${existing.matchedNames.join('/')}" -> ${match.web_name}, ${team})`);
      existing.pct += pct;
      existing.matchedNames.push(player);
    } else {
      byPlayerId.set(match.id, { playerId: match.id, team, matchedNames: [player], pct, webName: match.web_name });
    }
  }

  const matched = Array.from(byPlayerId.values()).map(m => {
    const startProbability = Math.min(100, m.pct);
    return {
      playerId: m.playerId,
      team: m.team,
      matchedName: m.matchedNames.join(" / "),
      startProbability,
      xMins: Math.round(startProbability * 0.9 * 10) / 10,
      webName: m.webName,
    };
  });

  console.log(`Matched: ${matched.length}, Unmatched: ${unmatched.length}`);
  if (unmatched.length > 0) {
    console.log("\n=== UNMATCHED (not written to DB) ===");
    for (const u of unmatched.sort((a, b) => b.pct - a.pct)) {
      console.log(`  ${u.team.padEnd(16)} ${u.player.padEnd(24)} ${u.pct}%`);
    }
  }

  await pool.query(`DELETE FROM manual_xmins_projections WHERE season = $1 AND source = $2`, [CURRENT_SEASON, SOURCE]);

  for (const m of matched) {
    await pool.query(
      `INSERT INTO manual_xmins_projections (player_id, season, source, team, matched_name, start_probability, x_mins)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [m.playerId, CURRENT_SEASON, SOURCE, m.team, m.matchedName, m.startProbability, m.xMins]
    );
  }

  console.log(`\nWrote ${matched.length} rows to manual_xmins_projections.`);
  console.log("\n=== TOP 20 BY xMins ===");
  for (const m of matched.sort((a, b) => b.xMins - a.xMins).slice(0, 20)) {
    console.log(`  ${m.webName.padEnd(20)} ${m.team.padEnd(14)} P(start)=${m.startProbability}%  xMins=${m.xMins}`);
  }

  process.exit(0);
})().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
