// One-off / occasional load of detailed positions (Left-back, Defensive midfield, Left winger...) for every FPL player into
// player_detailed_positions. Source: FotMob's public club squad pages (20 page loads; robots.txt allows them), which list each
// player's main position first, then the others he plays. Players are matched to FPL by name and club; anything that cannot be
// matched safely is listed, never guessed. FPL's own position is kept alongside, and `out_of_position` flags a main position
// outside it (an FPL defender who plays on the left wing).
//
// Usage (dry run, default):  npx tsx scripts/load-detailed-positions.ts
//        write to the DB:    npx tsx scripts/load-detailed-positions.ts --apply
import { pool } from "../server/db";
import {
  buildPositionRecord,
  matchFplToFotmob,
  type FotmobMember,
  type FplPlayerInput,
  type PositionRecord,
} from "../shared/detailed-positions";

// FPL team short name -> FotMob club (id, url slug). Add a line when a club is promoted; the script stops on an unknown club.
const FOTMOB_CLUBS: Record<string, [number, string]> = {
  ARS: [9825, "arsenal"], AVL: [10252, "aston-villa"], BOU: [8678, "afc-bournemouth"], BRE: [9937, "brentford"],
  BHA: [10204, "brighton-hove-albion"], CHE: [8455, "chelsea"], COV: [8669, "coventry-city"], CRY: [9826, "crystal-palace"],
  EVE: [8668, "everton"], FUL: [9879, "fulham"], HUL: [8667, "hull-city"], IPS: [9902, "ipswich-town"],
  LEE: [8463, "leeds-united"], LIV: [8650, "liverpool"], MCI: [8456, "manchester-city"], MUN: [10260, "manchester-united"],
  NEW: [10261, "newcastle-united"], NFO: [10203, "nottingham-forest"], SUN: [8472, "sunderland"], TOT: [8586, "tottenham-hotspur"],
};

type FplElement = FplPlayerInput & { minutes: number; team: number };

async function fetchSquad(id: number, slug: string): Promise<FotmobMember[]> {
  const res = await fetch(`https://www.fotmob.com/teams/${id}/squad/${slug}`, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`FotMob ${slug}: HTTP ${res.status}`);
  const html = await res.text();
  const json = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s)?.[1];
  if (!json) throw new Error(`FotMob ${slug}: squad data not found in the page`);
  const groups = JSON.parse(json)?.props?.pageProps?.fallback?.[`team-${id}`]?.squad?.squad;
  if (!Array.isArray(groups)) throw new Error(`FotMob ${slug}: unexpected squad shape`);
  return groups.filter((g: any) => g.title !== "coach").flatMap((g: any) => g.members as FotmobMember[]);
}

(async () => {
  const apply = process.argv.includes("--apply");
  const bootstrap: any = await (await fetch("https://fantasy.premierleague.com/api/bootstrap-static/")).json();
  const shortById = new Map<number, string>(bootstrap.teams.map((t: any) => [t.id, t.short_name]));
  const unknown = [...shortById.values()].filter((s) => !FOTMOB_CLUBS[s]);
  if (unknown.length) throw new Error(`No FotMob club for FPL team(s): ${unknown.join(", ")} — add them to FOTMOB_CLUBS`);
  const elements: FplElement[] = bootstrap.elements;

  const records: PositionRecord[] = [];
  const leftoverFpl: FplElement[] = [];
  const leftoverFotmob: Array<FotmobMember & { club: string }> = [];
  const byMethod: Record<string, number> = {};

  for (const [teamId, short] of shortById) {
    const [fotmobId, slug] = FOTMOB_CLUBS[short];
    const squad = await fetchSquad(fotmobId, slug);
    const result = matchFplToFotmob(elements.filter((e) => e.team === teamId), squad);
    for (const [fplId, { member, method }] of result.matches) {
      const rec = buildPositionRecord(elements.find((e) => e.id === fplId)!, member, method);
      if (rec) { records.push(rec); byMethod[method] = (byMethod[method] ?? 0) + 1; }
    }
    leftoverFpl.push(...(result.unmatchedFpl as FplElement[]));
    leftoverFotmob.push(...result.unmatchedFotmob.map((m) => ({ ...m, club: short })));
    await new Promise((r) => setTimeout(r, 750));
  }

  // Second pass for players who changed club: full-name matches only, across every club's leftovers.
  const second = matchFplToFotmob(leftoverFpl, leftoverFotmob);
  const stillUnmatched = new Set(leftoverFpl.map((p) => p.id));
  for (const [fplId, { member, method }] of second.matches) {
    if (method !== "name") continue; // across clubs, only exact full names are safe
    const rec = buildPositionRecord(elements.find((e) => e.id === fplId)!, member, method);
    if (rec) { records.push(rec); stillUnmatched.delete(fplId); byMethod["name (other club)"] = (byMethod["name (other club)"] ?? 0) + 1; }
  }

  const outOfPosition = records.filter((r) => r.outOfPosition);
  const nameOf = (id: number) => { const e = elements.find((x) => x.id === id)!; return `${e.web_name} (${shortById.get(e.team)})`; };
  console.log(`FPL players: ${elements.length}; matched: ${records.length}; by method: ${JSON.stringify(byMethod)}`);
  console.log(`\nOut of position (${outOfPosition.length}) — main position outside the FPL position:`);
  for (const r of outOfPosition) console.log(`  ${nameOf(r.fplPlayerId)}: FPL ${r.fplPosition}, plays ${r.mainPositionLabel}${r.otherPositions.length ? ` (also ${r.otherPositions.join(", ")})` : ""}`);
  const unmatched = elements.filter((e) => stillUnmatched.has(e.id));
  const withMinutes = unmatched.filter((e) => e.minutes > 0).sort((a, b) => b.minutes - a.minutes);
  console.log(`\nUnmatched FPL players: ${unmatched.length} (${withMinutes.length} have played minutes)`);
  for (const e of withMinutes) console.log(`  ${nameOf(e.id)} — ${e.minutes} min, FPL ${e.first_name} ${e.second_name}`);

  if (!apply) { console.log("\nDry run only — pass --apply to write the table."); process.exit(0); }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const r of records) {
      await client.query(
        `INSERT INTO player_detailed_positions (fpl_player_id, fpl_position, main_position, main_position_label, other_positions, out_of_position, fotmob_player_id, match_method, source, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'fotmob',now())
         ON CONFLICT (fpl_player_id) DO UPDATE SET fpl_position=EXCLUDED.fpl_position, main_position=EXCLUDED.main_position, main_position_label=EXCLUDED.main_position_label,
           other_positions=EXCLUDED.other_positions, out_of_position=EXCLUDED.out_of_position, fotmob_player_id=EXCLUDED.fotmob_player_id, match_method=EXCLUDED.match_method, updated_at=now()`,
        [r.fplPlayerId, r.fplPosition, r.mainPosition, r.mainPositionLabel, r.otherPositions, r.outOfPosition, r.fotmobPlayerId, r.matchMethod],
      );
    }
    await client.query("COMMIT");
    console.log(`\nWrote ${records.length} rows to player_detailed_positions.`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  process.exit(0);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
