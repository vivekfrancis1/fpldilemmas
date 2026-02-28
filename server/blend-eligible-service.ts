import { db } from "./db";
import { blendEligiblePlayers } from "@shared/schema";

export interface BlendInfo {
  blendWeight: number;
  activeGames: number;
  teamGames: number;
  startedGames: number;
  maxConsecDnp: number;
}

/**
 * Computes the time-weighted blend eligibility for each player.
 *
 * A player qualifies if ALL four conditions hold:
 *   1. activeClubGames >= 3        — minimum sample
 *   2. maxConsecDNP >= 4           — block absence (AFCON, injury, transfer)
 *   3. startRate >= 0.70           — primarily a starter when fit, not a squad/sub player
 *   4. playedLast4 = true          — appeared (minutes > 0) in all last 4 finished team fixtures
 *
 * @param bootstrapPlayers  Elements array from FPL bootstrap-static
 * @param finishedFixtures  Finished fixture objects from FPL fixtures API (with .id, .team_h, .team_a, .event)
 * @param dbHistories       Map of playerId → per-game history array (from player_history_cache)
 * @returns Map of playerId → BlendInfo for qualifying players only
 */
export function computeBlendMap(
  bootstrapPlayers: any[],
  finishedFixtures: any[],
  dbHistories: Map<number, any[]>
): Map<number, BlendInfo> {
  const blendMap = new Map<number, BlendInfo>();

  const teamFixturesSorted = new Map<number, Array<{ fixtureId: number; round: number }>>();
  finishedFixtures.forEach((f: any) => {
    [f.team_h, f.team_a].forEach((teamId: number) => {
      if (!teamFixturesSorted.has(teamId)) teamFixturesSorted.set(teamId, []);
      teamFixturesSorted.get(teamId)!.push({ fixtureId: f.id, round: f.event || 0 });
    });
  });
  teamFixturesSorted.forEach(fixtures => fixtures.sort((a, b) => a.round - b.round));

  for (const player of bootstrapPlayers) {
    if (!player.minutes) continue;

    const teamId: number = player.team;
    const teamFixtures = teamFixturesSorted.get(teamId) || [];
    if (teamFixtures.length === 0) continue;

    const history = dbHistories.get(player.id) || [];
    const pMins = new Map<number, number>();
    const pStarts = new Map<number, number>();
    history.forEach((g: any) => {
      pMins.set(g.fixture, g.minutes || 0);
      pStarts.set(g.fixture, g.starts || 0);
    });

    let activeGames = 0;
    let startedGames = 0;
    let maxConsecDNP = 0;
    let curConsec = 0;

    for (const f of teamFixtures) {
      const mins = pMins.get(f.fixtureId) ?? 0;
      const started = pStarts.get(f.fixtureId) ?? 0;
      if (mins > 0) {
        activeGames++;
        if (started === 1) startedGames++;
        curConsec = 0;
      } else {
        curConsec++;
        if (curConsec > maxConsecDNP) maxConsecDNP = curConsec;
      }
    }

    const startRate = activeGames > 0 ? startedGames / activeGames : 0;

    const last4 = teamFixtures.slice(-4);
    const playedLast4 = last4.length >= 4 && last4.every(f => (pMins.get(f.fixtureId) ?? 0) > 0);

    const teamGames = teamFixtures.length;

    if (
      activeGames >= 3 &&
      maxConsecDNP >= 4 &&
      startRate >= 0.70 &&
      playedLast4 &&
      activeGames < teamGames
    ) {
      const blendWeight = activeGames / teamGames;
      blendMap.set(player.id, { blendWeight, activeGames, teamGames, startedGames, maxConsecDnp: maxConsecDNP });
    }
  }

  return blendMap;
}

/**
 * Applies the blend formula to a raw contribution value.
 * blendedContrib = rawTotal × weight + (rawTotal/activeGames × teamGames) × (1 − weight)
 */
export function applyBlend(rawTotal: number, info: BlendInfo): number {
  if (rawTotal <= 0 || info.blendWeight >= 1.0) return rawTotal;
  const ratePerGame = rawTotal / info.activeGames;
  const rateNormalized = ratePerGame * info.teamGames;
  return rawTotal * info.blendWeight + rateNormalized * (1 - info.blendWeight);
}

/**
 * Persists the blend map to the blend_eligible_players table (upsert).
 * Called asynchronously — does not block the response.
 */
export async function persistBlendMap(
  blendMap: Map<number, BlendInfo>,
  bootstrapPlayers: any[]
): Promise<void> {
  if (blendMap.size === 0) return;

  const playerTeamMap = new Map<number, number>();
  bootstrapPlayers.forEach((p: any) => playerTeamMap.set(p.id, p.team));

  const rows = Array.from(blendMap.entries())
    .filter(([playerId]) => playerTeamMap.has(playerId))
    .map(([playerId, info]) => ({
      playerId,
      teamId: playerTeamMap.get(playerId)!,
      activeClubGames: info.activeGames,
      startedClubGames: info.startedGames,
      teamTotalGames: info.teamGames,
      maxConsecDnp: info.maxConsecDnp,
      blendWeight: info.blendWeight,
      updatedAt: new Date(),
    }));

  if (rows.length === 0) return;

  try {
    await db
      .insert(blendEligiblePlayers)
      .values(rows)
      .onConflictDoUpdate({
        target: blendEligiblePlayers.playerId,
        set: {
          teamId: blendEligiblePlayers.teamId,
          activeClubGames: blendEligiblePlayers.activeClubGames,
          startedClubGames: blendEligiblePlayers.startedClubGames,
          teamTotalGames: blendEligiblePlayers.teamTotalGames,
          maxConsecDnp: blendEligiblePlayers.maxConsecDnp,
          blendWeight: blendEligiblePlayers.blendWeight,
          updatedAt: new Date(),
        },
      });
  } catch (err) {
    console.error("[blend-eligible] Failed to persist blend map:", err);
  }
}
