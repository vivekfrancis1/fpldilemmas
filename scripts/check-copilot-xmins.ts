// Read-only check that the Copilot xMins export is actually driving the site's minutes
// projections. Compares each player's xMins_<gw> in the export with the site's xMinsPerGW.
// A mismatch is expected where a teammate's injury triggers minutes reallocation, so this
// reports the match rate and the largest differences instead of failing.
//
// Usage: npx tsx scripts/check-copilot-xmins.ts            (checks https://fpldilemmas.com)
//        BASE_URL=http://localhost:5050 npx tsx scripts/check-copilot-xmins.ts
import fs from "fs";
import path from "path";

const BASE_URL = process.env.BASE_URL || "https://fpldilemmas.com";
const FILE = path.join(process.cwd(), "Manual Uploads/xMins/Copilot projections/copilot_xmins_xpts_next6.json");
const TOLERANCE = 0.15;

(async () => {
  const exp = JSON.parse(fs.readFileSync(FILE, "utf-8"));
  const res = await fetch(`${BASE_URL}/api/player-minutes-projections`);
  if (!res.ok) throw new Error(`minutes endpoint returned ${res.status}`);
  const site: any[] = await res.json();
  const byId = new Map(site.map((p) => [p.playerId, p]));

  let compared = 0, matched = 0;
  const diffs: Array<{ name: string; gw: number; copilot: number; site: number }> = [];
  for (const p of exp.players) {
    const s = byId.get(p.id);
    if (!s?.xMinsPerGW) continue;
    for (const gw of exp.gameweeks) {
      const c = p[`xMins_${gw}`] ?? p[`GW${gw}_xMins`];
      const v = s.xMinsPerGW[`gw${gw}`];
      if (typeof c !== "number" || typeof v !== "number") continue;
      compared++;
      if (Math.abs(c - v) <= TOLERANCE) matched++;
      else diffs.push({ name: p.name, gw, copilot: c, site: v });
    }
  }

  console.log(`Export: GW${exp.gameweeks.join(",")} (last updated ${exp.last_updated})`);
  console.log(`Compared ${compared} player-gameweeks: ${matched} match (${((matched / compared) * 100).toFixed(1)}%), ${diffs.length} differ`);
  diffs.sort((a, b) => Math.abs(b.copilot - b.site) - Math.abs(a.copilot - a.site));
  console.log("Largest differences (usually injury reallocation to/from a teammate):");
  for (const d of diffs.slice(0, 10)) console.log(`  ${d.name.padEnd(14)} GW${d.gw}: copilot ${d.copilot} -> site ${d.site}`);
  // Healthy override => most values match exactly. A very low rate means the export isn't being used.
  console.log(matched / compared >= 0.6 ? "OK: Copilot xMins are driving the projections." : "WARNING: low match rate — the Copilot data may not be loaded or the Minutes cache needs a refresh.");
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
