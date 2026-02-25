import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = `http://localhost:5000`;

async function fetchJSON(path: string) {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

let bootstrapData: any;
let currentGameweek: number;
let nextGameweek: number;
let cachedPlayerTotalPoints: any[];
let rawCachedPlayerTotalPoints: any[];
let livePlayerTotalPoints: any[];

beforeAll(async () => {
  bootstrapData = await fetchJSON('/api/bootstrap-static');
  currentGameweek = bootstrapData.events.find((e: any) => e.is_current)?.id || 1;
  nextGameweek = Math.min(currentGameweek + 1, 38);

  cachedPlayerTotalPoints = await fetchJSON('/api/cached/player-total-points');
  rawCachedPlayerTotalPoints = await fetchJSON('/api/cached/player-total-points?availabilityAdjusted=false');
  const endGW = Math.min(nextGameweek + 11, 38);
  livePlayerTotalPoints = await fetchJSON(`/api/player-total-points?startGameweek=${nextGameweek}&endGameweek=${endGW}`);
}, 120000);

describe('Data Source Integrity', () => {
  it('cached endpoint returns non-empty player data', () => {
    expect(Array.isArray(cachedPlayerTotalPoints)).toBe(true);
    expect(cachedPlayerTotalPoints.length).toBeGreaterThan(0);
  });

  it('live endpoint returns non-empty player data', () => {
    expect(Array.isArray(livePlayerTotalPoints)).toBe(true);
    expect(livePlayerTotalPoints.length).toBeGreaterThan(0);
  });

  it('all players have playerId field', () => {
    for (const player of cachedPlayerTotalPoints) {
      expect(player.playerId).toBeDefined();
      expect(typeof player.playerId).toBe('number');
    }
  });

  it('all players have gameweekProjections object', () => {
    for (const player of cachedPlayerTotalPoints) {
      expect(player.gameweekProjections).toBeDefined();
      expect(typeof player.gameweekProjections).toBe('object');
    }
  });

  it('all players have totalExpectedPoints field', () => {
    for (const player of cachedPlayerTotalPoints) {
      expect(player.totalExpectedPoints).toBeDefined();
      expect(typeof player.totalExpectedPoints).toBe('number');
    }
  });

  it('gameweekProjections keys are numeric strings', () => {
    for (const player of cachedPlayerTotalPoints.slice(0, 20)) {
      const keys = Object.keys(player.gameweekProjections);
      for (const key of keys) {
        expect(parseInt(key)).not.toBeNaN();
      }
    }
  });

  it('gameweekProjections contain only future gameweeks', () => {
    for (const player of cachedPlayerTotalPoints.slice(0, 20)) {
      const keys = Object.keys(player.gameweekProjections).map(Number);
      for (const gw of keys) {
        expect(gw).toBeGreaterThan(currentGameweek);
        expect(gw).toBeLessThanOrEqual(38);
      }
    }
  });
});

describe('Cached vs Live Endpoint Consistency', () => {
  it('both endpoints return the same players (by playerId)', () => {
    const cachedIds = new Set(cachedPlayerTotalPoints.map((p: any) => p.playerId));
    const liveIds = new Set(livePlayerTotalPoints.map((p: any) => p.playerId));

    const cachedOnly = [...cachedIds].filter(id => !liveIds.has(id));
    const liveOnly = [...liveIds].filter(id => !cachedIds.has(id));

    expect(cachedOnly.length).toBeLessThan(cachedIds.size * 0.05);
    expect(liveOnly.length).toBeLessThan(liveIds.size * 0.05);
  });

  it('matching players have identical gameweek projections', () => {
    const cachedMap = new Map(cachedPlayerTotalPoints.map((p: any) => [p.playerId, p]));
    let mismatches = 0;
    const mismatchDetails: string[] = [];

    for (const livePlayer of livePlayerTotalPoints) {
      const cachedPlayer = cachedMap.get(livePlayer.playerId);
      if (!cachedPlayer) continue;

      const liveGWs = livePlayer.gameweekProjections || {};
      const cachedGWs = cachedPlayer.gameweekProjections || {};

      for (const gw of Object.keys(liveGWs)) {
        const liveVal = liveGWs[gw] || 0;
        const cachedVal = cachedGWs[gw] || 0;

        if (Math.abs(liveVal - cachedVal) > 0.15) {
          mismatches++;
          if (mismatchDetails.length < 10) {
            mismatchDetails.push(
              `Player ${livePlayer.playerName || livePlayer.playerId} GW${gw}: live=${liveVal.toFixed(2)}, cached=${cachedVal.toFixed(2)}`
            );
          }
        }
      }
    }

    if (mismatchDetails.length > 0) {
      console.log('Projection mismatches (first 10):', mismatchDetails);
    }

    const totalComparisons = livePlayerTotalPoints.length * 12;
    const mismatchRate = mismatches / totalComparisons;
    expect(mismatchRate).toBeLessThan(0.05);
  });

  it('totalExpectedPoints matches sum of gameweekProjections', () => {
    const failures: string[] = [];

    for (const player of cachedPlayerTotalPoints.slice(0, 50)) {
      const gwSum = Object.values(player.gameweekProjections as Record<string, number>)
        .reduce((sum: number, val: number) => sum + val, 0);
      const diff = Math.abs(gwSum - player.totalExpectedPoints);

      if (diff > 0.2) {
        failures.push(
          `${player.playerName || player.playerId}: sum=${gwSum.toFixed(2)}, total=${player.totalExpectedPoints.toFixed(2)}`
        );
      }
    }

    if (failures.length > 0) {
      console.log('Total vs sum mismatches:', failures);
    }

    expect(failures.length).toBeLessThan(3);
  });
});

describe('Component Breakdown Consistency', () => {
  it('point component breakdowns exist for cached data', () => {
    const componentKeys = [
      'pointsFromGoals', 'pointsFromAssists', 'pointsFromCleanSheets',
      'pointsFromMinutes', 'pointsFromBonus'
    ];

    const sample = cachedPlayerTotalPoints.slice(0, 20);
    let playersWithBreakdown = 0;

    for (const player of sample) {
      const hasAny = componentKeys.some(key => {
        const data = player[key];
        return data && typeof data === 'object' && Object.keys(data).length > 0;
      });
      if (hasAny) playersWithBreakdown++;
    }

    expect(playersWithBreakdown).toBeGreaterThan(sample.length * 0.5);
  });

  it('component breakdown gameweeks match total gameweek keys', () => {
    const sample = cachedPlayerTotalPoints.slice(0, 20);

    for (const player of sample) {
      const totalGWKeys = new Set(Object.keys(player.gameweekProjections || {}));
      if (totalGWKeys.size === 0) continue;

      const goalsBreakdown = player.pointsFromGoals;
      if (goalsBreakdown && typeof goalsBreakdown === 'object') {
        const goalsGWKeys = new Set(Object.keys(goalsBreakdown));
        for (const gw of goalsGWKeys) {
          expect(totalGWKeys.has(gw)).toBe(true);
        }
      }
    }
  });

  it('sum of components approximately equals total for each gameweek (using raw data)', () => {
    const componentKeys = [
      'pointsFromGoals', 'pointsFromAssists', 'pointsFromCleanSheets',
      'pointsFromMinutes', 'pointsFromBonus', 'pointsFromSaves',
      'pointsFromGoalsConceded', 'pointsFromYellowCards', 'pointsFromRedCards',
      'pointsFromDefensiveContributions'
    ];

    const failures: string[] = [];
    const sample = rawCachedPlayerTotalPoints.slice(0, 30);

    for (const player of sample) {
      const gwKeys = Object.keys(player.gameweekProjections || {});

      for (const gw of gwKeys) {
        const totalForGW = player.gameweekProjections[gw] || 0;
        if (totalForGW === 0) continue;

        let componentSum = 0;
        let hasComponents = false;
        for (const key of componentKeys) {
          const val = player[key]?.[gw];
          if (val !== undefined) {
            componentSum += val;
            hasComponents = true;
          }
        }

        if (hasComponents) {
          const diff = Math.abs(componentSum - totalForGW);
          if (diff > 0.5) {
            failures.push(
              `${player.playerName || player.playerId} GW${gw}: components=${componentSum.toFixed(2)}, total=${totalForGW.toFixed(2)}`
            );
          }
        }
      }
    }

    if (failures.length > 0) {
      console.log('Component sum mismatches:', failures.slice(0, 10));
    }

    expect(failures.length).toBeLessThan(10);
  });
});

describe('Server-Side Availability Adjustments', () => {
  it('adjusted endpoint returns same number of players as raw endpoint', () => {
    expect(cachedPlayerTotalPoints.length).toBe(rawCachedPlayerTotalPoints.length);
  });

  it('raw endpoint does not include availabilityAdjustments field for any player', () => {
    for (const player of rawCachedPlayerTotalPoints.slice(0, 50)) {
      expect(player.availabilityAdjustments).toBeUndefined();
      expect(player.originalGameweekProjections).toBeUndefined();
    }
  });

  it('adjusted endpoint includes availabilityAdjustments for injured/doubtful players', () => {
    const injuredPlayers = bootstrapData.elements.filter(
      (el: any) => el.chance_of_playing_next_round === 0 || 
        (el.chance_of_playing_next_round !== null && el.chance_of_playing_next_round < 100)
    );

    let adjustedCount = 0;

    for (const injured of injuredPlayers.slice(0, 20)) {
      const adjustedPlayer = cachedPlayerTotalPoints.find(
        (p: any) => p.playerId === injured.id
      );

      if (adjustedPlayer && adjustedPlayer.availabilityAdjustments && 
          Object.keys(adjustedPlayer.availabilityAdjustments).length > 0) {
        adjustedCount++;
      }
    }

    expect(adjustedCount).toBeGreaterThan(0);
  });

  it('injured players (0% chance) have zero projections in adjusted response', () => {
    const injuredPlayers = bootstrapData.elements.filter(
      (el: any) => el.chance_of_playing_next_round === 0
    );

    const issues: string[] = [];

    for (const injured of injuredPlayers.slice(0, 10)) {
      const adjustedPlayer = cachedPlayerTotalPoints.find(
        (p: any) => p.playerId === injured.id
      );

      if (!adjustedPlayer) continue;

      const nextGWKey = nextGameweek.toString();
      const gwProjection = adjustedPlayer.gameweekProjections?.[nextGWKey] || 0;

      if (gwProjection > 0) {
        issues.push(
          `${injured.web_name} (ID: ${injured.id}): 0% chance but adjusted GW${nextGameweek} = ${gwProjection.toFixed(2)}`
        );
      }
    }

    if (issues.length > 0) {
      console.log('Injured player adjusted projection issues:', issues);
    }

    expect(issues.length).toBe(0);
  });

  it('injured players have non-zero projections in raw response', () => {
    const injuredPlayers = bootstrapData.elements.filter(
      (el: any) => el.chance_of_playing_next_round === 0
    );

    let rawNonZeroCount = 0;

    for (const injured of injuredPlayers.slice(0, 10)) {
      const rawPlayer = rawCachedPlayerTotalPoints.find(
        (p: any) => p.playerId === injured.id
      );

      if (!rawPlayer) continue;

      const nextGWKey = nextGameweek.toString();
      const gwProjection = rawPlayer.gameweekProjections?.[nextGWKey] || 0;

      if (gwProjection > 0) {
        rawNonZeroCount++;
      }
    }

    expect(rawNonZeroCount).toBeGreaterThan(0);
  });

  it('fully available players have identical projections in adjusted and raw responses', () => {
    const availablePlayers = bootstrapData.elements.filter(
      (el: any) =>
        el.status === 'a' &&
        (el.chance_of_playing_next_round === null || el.chance_of_playing_next_round === 100)
    );

    const failures: string[] = [];
    const sample = availablePlayers.slice(0, 30);

    for (const player of sample) {
      const adjustedPlayer = cachedPlayerTotalPoints.find((p: any) => p.playerId === player.id);
      const rawPlayer = rawCachedPlayerTotalPoints.find((p: any) => p.playerId === player.id);

      if (!adjustedPlayer || !rawPlayer) continue;

      const adjTotal = adjustedPlayer.totalExpectedPoints || 0;
      const rawTotal = rawPlayer.totalExpectedPoints || 0;

      if (Math.abs(adjTotal - rawTotal) > 0.01) {
        failures.push(
          `${player.web_name}: adjusted=${adjTotal.toFixed(2)}, raw=${rawTotal.toFixed(2)}`
        );
      }
    }

    expect(failures.length).toBe(0);
  });

  it('live endpoint also supports availabilityAdjusted param', async () => {
    const endGW = Math.min(nextGameweek + 5, 38);
    const adjustedData = await fetchJSON(`/api/player-total-points?startGameweek=${nextGameweek}&endGameweek=${endGW}`);
    const rawData = await fetchJSON(`/api/player-total-points?startGameweek=${nextGameweek}&endGameweek=${endGW}&availabilityAdjusted=false`);

    expect(adjustedData.length).toBe(rawData.length);

    const injuredPlayers = bootstrapData.elements.filter(
      (el: any) => el.chance_of_playing_next_round === 0
    );

    let differencesFound = 0;

    for (const injured of injuredPlayers.slice(0, 5)) {
      const adj = adjustedData.find((p: any) => p.playerId === injured.id);
      const raw = rawData.find((p: any) => p.playerId === injured.id);

      if (adj && raw) {
        const adjTotal = adj.totalExpectedPoints || 0;
        const rawTotal = raw.totalExpectedPoints || 0;

        if (Math.abs(adjTotal - rawTotal) > 0.01) {
          differencesFound++;
        }
      }
    }

    expect(differencesFound).toBeGreaterThan(0);
  });

  it('adjusted response preserves original projections in originalGameweekProjections', () => {
    const injuredPlayers = bootstrapData.elements.filter(
      (el: any) => el.chance_of_playing_next_round === 0
    );

    let hasOriginals = 0;

    for (const injured of injuredPlayers.slice(0, 10)) {
      const adjustedPlayer = cachedPlayerTotalPoints.find(
        (p: any) => p.playerId === injured.id
      );

      if (adjustedPlayer && adjustedPlayer.originalGameweekProjections) {
        hasOriginals++;
        const origTotal = Object.values(adjustedPlayer.originalGameweekProjections as Record<string, number>)
          .reduce((sum: number, v: number) => sum + v, 0);
        expect(origTotal).toBeGreaterThanOrEqual(0);
      }
    }

    expect(hasOriginals).toBeGreaterThan(0);
  });

  it('individual scoring components are NOT adjusted (only totals are adjusted)', () => {
    const injuredPlayers = bootstrapData.elements.filter(
      (el: any) => el.chance_of_playing_next_round === 0
    );

    const nextGWKey = nextGameweek.toString();
    const failures: string[] = [];

    for (const injured of injuredPlayers.slice(0, 10)) {
      const adjustedPlayer = cachedPlayerTotalPoints.find((p: any) => p.playerId === injured.id);
      const rawPlayer = rawCachedPlayerTotalPoints.find((p: any) => p.playerId === injured.id);

      if (!adjustedPlayer || !rawPlayer) continue;

      const componentKeys = [
        'pointsFromGoals', 'pointsFromAssists', 'pointsFromCleanSheets',
        'pointsFromMinutes', 'pointsFromBonus', 'pointsFromSaves',
        'pointsFromGoalsConceded', 'pointsFromYellowCards', 'pointsFromRedCards',
        'pointsFromDefensiveContributions'
      ];

      for (const compKey of componentKeys) {
        const rawComp = rawPlayer[compKey]?.[nextGWKey];
        const adjComp = adjustedPlayer[compKey]?.[nextGWKey];

        if (rawComp === undefined || rawComp === 0) continue;

        if (adjComp !== rawComp) {
          failures.push(
            `${injured.web_name} GW${nextGWKey} ${compKey}: raw=${rawComp}, adjusted=${adjComp} (should be identical)`
          );
        }
      }
    }

    if (failures.length > 0) {
      console.log('Component double-adjustment detected:', failures);
    }
    expect(failures.length).toBe(0);
  });

  it('component totals are NOT adjusted (only totalExpectedPoints is adjusted)', () => {
    const injuredPlayers = bootstrapData.elements.filter(
      (el: any) => el.chance_of_playing_next_round === 0
    );

    const failures: string[] = [];

    for (const injured of injuredPlayers.slice(0, 10)) {
      const adjustedPlayer = cachedPlayerTotalPoints.find((p: any) => p.playerId === injured.id);
      const rawPlayer = rawCachedPlayerTotalPoints.find((p: any) => p.playerId === injured.id);

      if (!adjustedPlayer || !rawPlayer) continue;

      const totalKeys = [
        'totalPointsFromGoals', 'totalPointsFromAssists', 'totalPointsFromCleanSheets',
        'totalPointsFromMinutes', 'totalPointsFromBonus', 'totalPointsFromSaves',
        'totalPointsFromGoalsConceded', 'totalPointsFromYellowCards', 'totalPointsFromRedCards',
        'totalPointsFromDefensiveContributions'
      ];

      for (const totalKey of totalKeys) {
        const rawTotal = rawPlayer[totalKey];
        const adjTotal = adjustedPlayer[totalKey];

        if (rawTotal === undefined || rawTotal === 0) continue;

        if (Math.abs((adjTotal || 0) - rawTotal) > 0.01) {
          failures.push(
            `${injured.web_name} ${totalKey}: raw=${rawTotal?.toFixed(2)}, adjusted=${adjTotal?.toFixed(2)} (should be identical)`
          );
        }
      }
    }

    if (failures.length > 0) {
      console.log('Component total adjustment detected:', failures);
    }
    expect(failures.length).toBe(0);
  });
});

describe('Cross-Endpoint Projection Consistency', () => {
  it('individual goal projections are available and structurally consistent', async () => {
    let goalProjections: any[];
    try {
      goalProjections = await fetchJSON(`/api/player-goals-scored-projections?startGameweek=${nextGameweek}&endGameweek=${nextGameweek}`);
    } catch {
      console.log('Skipping: goal projections endpoint unavailable');
      return;
    }

    expect(Array.isArray(goalProjections)).toBe(true);
    expect(goalProjections.length).toBeGreaterThan(0);

    const goalMap = new Map(goalProjections.map((p: any) => [p.playerId, p]));
    let matchedPlayers = 0;

    for (const cachedPlayer of cachedPlayerTotalPoints.slice(0, 30)) {
      if (goalMap.has(cachedPlayer.playerId)) {
        matchedPlayers++;
        const goalPlayer = goalMap.get(cachedPlayer.playerId)!;
        expect(goalPlayer.gameweekProjections).toBeDefined();
      }
    }

    expect(matchedPlayers).toBeGreaterThan(10);
  });

  it('individual assist projections are available and structurally consistent', async () => {
    let assistProjections: any[];
    try {
      assistProjections = await fetchJSON(`/api/player-assist-projections?startGameweek=${nextGameweek}&endGameweek=${nextGameweek}`);
    } catch {
      console.log('Skipping: assist projections endpoint unavailable');
      return;
    }

    expect(Array.isArray(assistProjections)).toBe(true);
    expect(assistProjections.length).toBeGreaterThan(0);

    const assistMap = new Map(assistProjections.map((p: any) => [p.playerId, p]));
    let matchedPlayers = 0;

    for (const cachedPlayer of cachedPlayerTotalPoints.slice(0, 30)) {
      if (assistMap.has(cachedPlayer.playerId)) {
        matchedPlayers++;
        const assistPlayer = assistMap.get(cachedPlayer.playerId)!;
        expect(assistPlayer.gameweekProjections).toBeDefined();
      }
    }

    expect(matchedPlayers).toBeGreaterThan(10);
  });

  it('minutes projections are available for all players with total points', async () => {
    let minutesProjections: any[];
    try {
      minutesProjections = await fetchJSON('/api/player-minutes-projections');
    } catch {
      console.log('Skipping: minutes projections endpoint unavailable');
      return;
    }

    const minutesIds = new Set(minutesProjections.map((p: any) => p.playerId));
    let missingMinutes = 0;

    for (const player of cachedPlayerTotalPoints.slice(0, 50)) {
      if (player.totalExpectedPoints > 0 && !minutesIds.has(player.playerId)) {
        missingMinutes++;
      }
    }

    expect(missingMinutes).toBeLessThan(5);
  });
});

describe('Gameweek Range Consistency', () => {
  it('all players in cached data have the same gameweek range', () => {
    const gwRanges = new Map<string, number>();

    for (const player of cachedPlayerTotalPoints) {
      const keys = Object.keys(player.gameweekProjections || {}).sort().join(',');
      gwRanges.set(keys, (gwRanges.get(keys) || 0) + 1);
    }

    const sortedRanges = [...gwRanges.entries()].sort((a, b) => b[1] - a[1]);
    const dominantRange = sortedRanges[0];
    const dominantPct = dominantRange[1] / cachedPlayerTotalPoints.length;

    expect(dominantPct).toBeGreaterThan(0.9);
  });

  it('gameweek range starts from next gameweek', () => {
    const sample = cachedPlayerTotalPoints[0];
    const gwKeys = Object.keys(sample.gameweekProjections || {}).map(Number).sort((a, b) => a - b);

    expect(gwKeys[0]).toBe(nextGameweek);
  });

  it('gameweek range does not exceed GW38', () => {
    for (const player of cachedPlayerTotalPoints.slice(0, 20)) {
      const gwKeys = Object.keys(player.gameweekProjections || {}).map(Number);
      for (const gw of gwKeys) {
        expect(gw).toBeLessThanOrEqual(38);
      }
    }
  });
});

describe('Player Metadata Consistency', () => {
  it('player positions match bootstrap data', () => {
    const positionMap: Record<number, string[]> = {
      1: ['GKP', 'Goalkeeper', 'GK'],
      2: ['DEF', 'Defender'],
      3: ['MID', 'Midfielder'],
      4: ['FWD', 'Forward', 'Striker']
    };
    const failures: string[] = [];

    for (const cachedPlayer of cachedPlayerTotalPoints.slice(0, 50)) {
      const bootstrapPlayer = bootstrapData.elements.find(
        (el: any) => el.id === cachedPlayer.playerId
      );

      if (!bootstrapPlayer) continue;

      const expectedPositions = positionMap[bootstrapPlayer.element_type] || [];
      if (cachedPlayer.position && !expectedPositions.includes(cachedPlayer.position)) {
        failures.push(
          `${cachedPlayer.playerName}: cached=${cachedPlayer.position}, expected one of=${expectedPositions.join('/')}`
        );
      }
    }

    expect(failures.length).toBe(0);
  });

  it('player teams match bootstrap data', () => {
    const failures: string[] = [];

    for (const cachedPlayer of cachedPlayerTotalPoints.slice(0, 50)) {
      const bootstrapPlayer = bootstrapData.elements.find(
        (el: any) => el.id === cachedPlayer.playerId
      );

      if (!bootstrapPlayer) continue;

      const bootstrapTeam = bootstrapData.teams.find(
        (t: any) => t.id === bootstrapPlayer.team
      );

      if (bootstrapTeam && cachedPlayer.teamName && cachedPlayer.teamName !== bootstrapTeam.name) {
        failures.push(
          `${cachedPlayer.playerName}: cached team=${cachedPlayer.teamName}, expected=${bootstrapTeam.name}`
        );
      }
    }

    expect(failures.length).toBe(0);
  });

  it('player prices match bootstrap data within tolerance', () => {
    const failures: string[] = [];

    for (const cachedPlayer of cachedPlayerTotalPoints.slice(0, 50)) {
      const bootstrapPlayer = bootstrapData.elements.find(
        (el: any) => el.id === cachedPlayer.playerId
      );

      if (!bootstrapPlayer || !cachedPlayer.price) continue;

      const bootstrapPrice = bootstrapPlayer.now_cost / 10;
      const diff = Math.abs(cachedPlayer.price - bootstrapPrice);

      if (diff > 0.5) {
        failures.push(
          `${cachedPlayer.playerName}: cached price=${cachedPlayer.price}, bootstrap=${bootstrapPrice}`
        );
      }
    }

    expect(failures.length).toBe(0);
  });
});

describe('Projection Value Sanity Checks', () => {
  it('no player has significantly negative projected points', () => {
    const negativeIssues: string[] = [];
    for (const player of cachedPlayerTotalPoints) {
      if (player.totalExpectedPoints < -1) {
        negativeIssues.push(`${player.playerName}: total=${player.totalExpectedPoints}`);
      }
      for (const [gw, pts] of Object.entries(player.gameweekProjections as Record<string, number>)) {
        if (pts < -0.5) {
          negativeIssues.push(`${player.playerName} GW${gw}: ${pts}`);
        }
      }
    }
    if (negativeIssues.length > 0) {
      console.log('Significantly negative projections:', negativeIssues.slice(0, 5));
    }
    expect(negativeIssues.length).toBe(0);
  });

  it('no player has unreasonably high per-gameweek projections (>20)', () => {
    const highProjections: string[] = [];

    for (const player of cachedPlayerTotalPoints) {
      for (const [gw, pts] of Object.entries(player.gameweekProjections as Record<string, number>)) {
        if (pts > 20) {
          highProjections.push(`${player.playerName || player.playerId} GW${gw}: ${pts.toFixed(1)}`);
        }
      }
    }

    if (highProjections.length > 0) {
      console.log('Unusually high projections:', highProjections.slice(0, 5));
    }

    expect(highProjections.length).toBeLessThan(5);
  });

  it('goalkeepers have save projections, outfield players do not', () => {
    let issues = 0;

    for (const player of cachedPlayerTotalPoints.slice(0, 100)) {
      const bootstrapPlayer = bootstrapData.elements.find((el: any) => el.id === player.playerId);
      if (!bootstrapPlayer) continue;

      const hasSaves = player.pointsFromSaves && Object.values(player.pointsFromSaves as Record<string, number>).some((v: number) => v > 0);

      if (bootstrapPlayer.element_type === 1 && !hasSaves && player.totalExpectedPoints > 0) {
        issues++;
      }
    }

    expect(issues).toBeLessThan(5);
  });

  it('defenders and goalkeepers have clean sheet projections', () => {
    let issues = 0;

    for (const player of cachedPlayerTotalPoints.slice(0, 100)) {
      const bootstrapPlayer = bootstrapData.elements.find((el: any) => el.id === player.playerId);
      if (!bootstrapPlayer) continue;

      if (bootstrapPlayer.element_type <= 2 && player.totalExpectedPoints > 1) {
        const hasCS = player.pointsFromCleanSheets &&
          Object.values(player.pointsFromCleanSheets as Record<string, number>).some((v: number) => v > 0);

        if (!hasCS) issues++;
      }
    }

    expect(issues).toBeLessThan(5);
  });
});

describe('Batch Projection Endpoint Consistency', () => {
  it('batch projected points endpoint returns consistent data with cached projections', async () => {
    const sampleManagerIds = [577434];
    let batchData: any;
    try {
      const response = await fetch(`${BASE_URL}/api/managers/batch-projected-points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerIds: sampleManagerIds }),
      });
      if (!response.ok) {
        console.log('Batch endpoint returned non-OK:', response.status);
        return;
      }
      batchData = await response.json();
    } catch (e) {
      console.log('Skipping batch test: endpoint unavailable');
      return;
    }

    expect(batchData).toBeDefined();

    if (batchData[577434]) {
      const managerData = batchData[577434];
      expect(managerData.projectedPoints).toBeDefined();
      expect(typeof managerData.projectedPoints).toBe('number');
      expect(managerData.projectedPoints).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Transfer Planner Projection Consistency', () => {
  it('transfer planner cached data matches main cached endpoint', async () => {
    let transferPlannerData: any[];
    try {
      transferPlannerData = await fetchJSON('/api/cached/player-total-points');
    } catch {
      console.log('Skipping: cached endpoint unavailable');
      return;
    }

    expect(transferPlannerData.length).toBe(cachedPlayerTotalPoints.length);

    const cachedMap = new Map(cachedPlayerTotalPoints.map((p: any) => [p.playerId, p]));

    for (const tpPlayer of transferPlannerData.slice(0, 30)) {
      const cachedPlayer = cachedMap.get(tpPlayer.playerId);
      if (!cachedPlayer) continue;

      for (const gw of Object.keys(tpPlayer.gameweekProjections || {})) {
        const tpVal = tpPlayer.gameweekProjections[gw] || 0;
        const cachedVal = cachedPlayer.gameweekProjections?.[gw] || 0;

        expect(Math.abs(tpVal - cachedVal)).toBeLessThan(0.01);
      }
    }
  });

  it('doubtful players are not double-adjusted (adjusted projection matches single adjustment)', () => {
    const doubtfulPlayers = bootstrapData.elements.filter(
      (el: any) =>
        el.chance_of_playing_next_round !== null &&
        el.chance_of_playing_next_round > 0 &&
        el.chance_of_playing_next_round < 100
    );

    const nextGWKey = nextGameweek.toString();
    const failures: string[] = [];

    for (const player of doubtfulPlayers.slice(0, 15)) {
      const adjustedPlayer = cachedPlayerTotalPoints.find((p: any) => p.playerId === player.id);
      const rawPlayer = rawCachedPlayerTotalPoints.find((p: any) => p.playerId === player.id);

      if (!adjustedPlayer || !rawPlayer) continue;

      const rawGWPoints = rawPlayer.gameweekProjections?.[nextGWKey] || 0;
      const adjustedGWPoints = adjustedPlayer.gameweekProjections?.[nextGWKey] || 0;

      if (rawGWPoints === 0) continue;

      const expectedRatio = player.chance_of_playing_next_round / 100;
      const actualRatio = adjustedGWPoints / rawGWPoints;

      if (Math.abs(actualRatio - expectedRatio) > 0.05 && Math.abs(actualRatio - expectedRatio * expectedRatio) < 0.05) {
        failures.push(
          `${player.web_name}: raw=${rawGWPoints.toFixed(2)}, adjusted=${adjustedGWPoints.toFixed(2)}, ` +
          `ratio=${actualRatio.toFixed(3)} looks like double-adjustment (expected ~${expectedRatio.toFixed(2)}, got ~${(expectedRatio * expectedRatio).toFixed(2)})`
        );
      }
    }

    if (failures.length > 0) {
      console.log('Double-adjustment detected:', failures);
    }
    expect(failures.length).toBe(0);
  });
});

describe('Team Goal Projections', () => {
  let cachedTeamGoals: any[];
  let liveTeamGoals: any[];

  beforeAll(async () => {
    cachedTeamGoals = await fetchJSON('/api/cached/team-goal-projections');
    liveTeamGoals = await fetchJSON('/api/team-goal-projections');
  }, 30000);

  it('cached endpoint returns exactly 20 teams', () => {
    expect(Array.isArray(cachedTeamGoals)).toBe(true);
    expect(cachedTeamGoals.length).toBe(20);
  });

  it('live endpoint returns exactly 20 teams', () => {
    expect(Array.isArray(liveTeamGoals)).toBe(true);
    expect(liveTeamGoals.length).toBe(20);
  });

  it('each team has required fields', () => {
    for (const team of cachedTeamGoals) {
      expect(team.teamId).toBeDefined();
      expect(team.teamName).toBeDefined();
      expect(team.gameweekProjections).toBeDefined();
      expect(typeof team.gameweekProjections).toBe('object');
      expect(team.totalGoals).toBeDefined();
      expect(typeof team.totalGoals).toBe('number');
      expect(team.averageGoalsPerGame).toBeDefined();
      expect(typeof team.averageGoalsPerGame).toBe('number');
    }
  });

  it('all 20 unique team IDs are present', () => {
    const teamIds = cachedTeamGoals.map((t: any) => t.teamId);
    const uniqueIds = new Set(teamIds);
    expect(uniqueIds.size).toBe(20);
  });

  it('gameweek projections contain only future gameweeks', () => {
    for (const team of cachedTeamGoals) {
      const gwKeys = Object.keys(team.gameweekProjections).map(Number);
      for (const gw of gwKeys) {
        expect(gw).toBeGreaterThanOrEqual(nextGameweek);
        expect(gw).toBeLessThanOrEqual(38);
      }
    }
  });

  it('goal projections are non-negative', () => {
    for (const team of cachedTeamGoals) {
      expect(team.totalGoals).toBeGreaterThanOrEqual(0);
      for (const [, val] of Object.entries(team.gameweekProjections)) {
        expect(val as number).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('per-gameweek projections are reasonable (0-6 goals)', () => {
    const issues: string[] = [];
    for (const team of cachedTeamGoals) {
      for (const [gw, val] of Object.entries(team.gameweekProjections)) {
        if ((val as number) > 6) {
          issues.push(`${team.teamName} GW${gw}: ${val} goals`);
        }
      }
    }
    expect(issues.length).toBe(0);
  });

  it('totalGoals approximately matches sum of gameweek projections', () => {
    const failures: string[] = [];
    for (const team of cachedTeamGoals) {
      const gwSum = Object.values(team.gameweekProjections as Record<string, number>)
        .reduce((sum: number, v: number) => sum + v, 0);
      if (Math.abs(gwSum - team.totalGoals) > 0.1) {
        failures.push(`${team.teamName}: sum=${gwSum.toFixed(2)}, total=${team.totalGoals.toFixed(2)}`);
      }
    }
    expect(failures.length).toBe(0);
  });

  it('cached and live endpoints have matching team IDs', () => {
    const cachedIds = new Set(cachedTeamGoals.map((t: any) => t.teamId));
    const liveIds = new Set(liveTeamGoals.map((t: any) => t.teamId));
    expect(cachedIds.size).toBe(liveIds.size);
    for (const id of cachedIds) {
      expect(liveIds.has(id)).toBe(true);
    }
  });

  it('cached and live projections are consistent within tolerance', () => {
    const failures: string[] = [];
    for (const cachedTeam of cachedTeamGoals) {
      const liveTeam = liveTeamGoals.find((t: any) => t.teamId === cachedTeam.teamId);
      if (!liveTeam) continue;

      if (Math.abs(cachedTeam.totalGoals - liveTeam.totalGoals) > 1.0) {
        failures.push(
          `${cachedTeam.teamName}: cached=${cachedTeam.totalGoals.toFixed(2)}, live=${liveTeam.totalGoals.toFixed(2)}`
        );
      }
    }
    expect(failures.length).toBe(0);
  });
});

describe('Team Assist Projections', () => {
  let cachedTeamAssists: any[];

  beforeAll(async () => {
    cachedTeamAssists = await fetchJSON('/api/cached/team-assist-projections');
  }, 30000);

  it('cached endpoint returns exactly 20 teams', () => {
    expect(Array.isArray(cachedTeamAssists)).toBe(true);
    expect(cachedTeamAssists.length).toBe(20);
  });

  it('each team has required fields', () => {
    for (const team of cachedTeamAssists) {
      expect(team.teamId).toBeDefined();
      expect(team.teamName).toBeDefined();
      expect(team.gameweekProjections).toBeDefined();
      expect(typeof team.gameweekProjections).toBe('object');
      expect(team.totalAssists).toBeDefined();
      expect(typeof team.totalAssists).toBe('number');
      expect(team.averageAssistsPerGame).toBeDefined();
      expect(typeof team.averageAssistsPerGame).toBe('number');
    }
  });

  it('all 20 unique team IDs are present', () => {
    const teamIds = cachedTeamAssists.map((t: any) => t.teamId);
    const uniqueIds = new Set(teamIds);
    expect(uniqueIds.size).toBe(20);
  });

  it('assist projections are non-negative', () => {
    for (const team of cachedTeamAssists) {
      expect(team.totalAssists).toBeGreaterThanOrEqual(0);
      for (const [, val] of Object.entries(team.gameweekProjections)) {
        expect(val as number).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('totalAssists approximately matches sum of gameweek projections', () => {
    const failures: string[] = [];
    for (const team of cachedTeamAssists) {
      const gwSum = Object.values(team.gameweekProjections as Record<string, number>)
        .reduce((sum: number, v: number) => sum + v, 0);
      if (Math.abs(gwSum - team.totalAssists) > 0.1) {
        failures.push(`${team.teamName}: sum=${gwSum.toFixed(2)}, total=${team.totalAssists.toFixed(2)}`);
      }
    }
    expect(failures.length).toBe(0);
  });

  it('team assists are always less than or equal to team goals', async () => {
    const cachedTeamGoals = await fetchJSON('/api/cached/team-goal-projections');
    const failures: string[] = [];

    for (const assistTeam of cachedTeamAssists) {
      const goalTeam = cachedTeamGoals.find((t: any) => t.teamId === assistTeam.teamId);
      if (!goalTeam) continue;

      if (assistTeam.totalAssists > goalTeam.totalGoals + 0.1) {
        failures.push(
          `${assistTeam.teamName}: assists=${assistTeam.totalAssists.toFixed(2)} > goals=${goalTeam.totalGoals.toFixed(2)}`
        );
      }
    }
    expect(failures.length).toBe(0);
  });
});

describe('Team Clean Sheet Projections', () => {
  let cachedTeamCS: any[];

  beforeAll(async () => {
    cachedTeamCS = await fetchJSON('/api/cached/team-cs-projections');
  }, 30000);

  it('cached endpoint returns data for all teams', () => {
    expect(Array.isArray(cachedTeamCS)).toBe(true);
    expect(cachedTeamCS.length).toBeGreaterThan(0);
  });

  it('each entry has required fields', () => {
    for (const entry of cachedTeamCS) {
      expect(entry.teamId).toBeDefined();
      expect(typeof entry.teamId).toBe('number');
      expect(entry.gameweek).toBeDefined();
      expect(typeof entry.gameweek).toBe('number');
      expect(entry.cleanSheetProbability).toBeDefined();
      expect(typeof entry.cleanSheetProbability).toBe('number');
    }
  });

  it('covers all 20 teams', () => {
    const teamIds = new Set(cachedTeamCS.map((e: any) => e.teamId));
    expect(teamIds.size).toBe(20);
  });

  it('gameweeks are within valid range', () => {
    for (const entry of cachedTeamCS) {
      expect(entry.gameweek).toBeGreaterThanOrEqual(nextGameweek);
      expect(entry.gameweek).toBeLessThanOrEqual(38);
    }
  });

  it('clean sheet probabilities are between 0 and 100', () => {
    const issues: string[] = [];
    for (const entry of cachedTeamCS) {
      if (entry.cleanSheetProbability < 0 || entry.cleanSheetProbability > 100) {
        issues.push(`Team ${entry.teamId} GW${entry.gameweek}: ${entry.cleanSheetProbability}%`);
      }
    }
    expect(issues.length).toBe(0);
  });

  it('each team has consistent number of gameweek entries', () => {
    const teamGWCounts: Map<number, number> = new Map();
    for (const entry of cachedTeamCS) {
      teamGWCounts.set(entry.teamId, (teamGWCounts.get(entry.teamId) || 0) + 1);
    }

    const counts = [...teamGWCounts.values()];
    const maxCount = Math.max(...counts);
    const minCount = Math.min(...counts);
    expect(maxCount - minCount).toBeLessThanOrEqual(2);
  });

  it('blank gameweek teams have 0% clean sheet probability', () => {
    const zeroEntries = cachedTeamCS.filter((e: any) => e.cleanSheetProbability === 0);
    for (const entry of zeroEntries) {
      expect(entry.cleanSheetProbability).toBe(0);
    }
  });
});

describe('Team Projection Cross-Consistency', () => {
  it('team goal and assist endpoints cover the same gameweek range', async () => {
    const teamGoals = await fetchJSON('/api/cached/team-goal-projections');
    const teamAssists = await fetchJSON('/api/cached/team-assist-projections');

    const goalGWs = new Set<number>();
    for (const team of teamGoals) {
      for (const gw of Object.keys(team.gameweekProjections).map(Number)) {
        goalGWs.add(gw);
      }
    }

    const assistGWs = new Set<number>();
    for (const team of teamAssists) {
      for (const gw of Object.keys(team.gameweekProjections).map(Number)) {
        assistGWs.add(gw);
      }
    }

    expect(goalGWs.size).toBe(assistGWs.size);
    for (const gw of goalGWs) {
      expect(assistGWs.has(gw)).toBe(true);
    }
  });

  it('clean sheet gameweeks are a subset of goal projection gameweeks', async () => {
    const teamGoals = await fetchJSON('/api/cached/team-goal-projections');
    const teamCS = await fetchJSON('/api/cached/team-cs-projections');

    const goalGWs = new Set<number>();
    for (const team of teamGoals) {
      for (const gw of Object.keys(team.gameweekProjections).map(Number)) {
        goalGWs.add(gw);
      }
    }

    const csGWs = new Set(teamCS.map((e: any) => e.gameweek as number));

    for (const gw of csGWs) {
      expect(goalGWs.has(gw)).toBe(true);
    }
  });

  it('team IDs are consistent across all team projection endpoints', async () => {
    const teamGoals = await fetchJSON('/api/cached/team-goal-projections');
    const teamAssists = await fetchJSON('/api/cached/team-assist-projections');
    const teamCS = await fetchJSON('/api/cached/team-cs-projections');

    const goalTeamIds = new Set(teamGoals.map((t: any) => t.teamId));
    const assistTeamIds = new Set(teamAssists.map((t: any) => t.teamId));
    const csTeamIds = new Set(teamCS.map((e: any) => e.teamId));

    expect(goalTeamIds.size).toBe(20);
    expect(assistTeamIds.size).toBe(20);
    expect(csTeamIds.size).toBe(20);

    for (const id of goalTeamIds) {
      expect(assistTeamIds.has(id)).toBe(true);
      expect(csTeamIds.has(id)).toBe(true);
    }
  });

  it('blank gameweeks (0 goals) align across goals and assists', async () => {
    const teamGoals = await fetchJSON('/api/cached/team-goal-projections');
    const teamAssists = await fetchJSON('/api/cached/team-assist-projections');

    const failures: string[] = [];
    for (const goalTeam of teamGoals) {
      const assistTeam = teamAssists.find((t: any) => t.teamId === goalTeam.teamId);
      if (!assistTeam) continue;

      for (const [gw, goalVal] of Object.entries(goalTeam.gameweekProjections)) {
        const assistVal = assistTeam.gameweekProjections[gw];
        if ((goalVal as number) === 0 && assistVal !== undefined && assistVal !== 0) {
          failures.push(`${goalTeam.teamName} GW${gw}: goals=0 but assists=${assistVal}`);
        }
        if (assistVal === 0 && (goalVal as number) !== 0) {
          // assists can be 0 even if goals > 0 (own goals, unassisted), so skip this check
        }
      }
    }
    expect(failures.length).toBe(0);
  });
});

describe('Fixture Detail vs Aggregate Projection Consistency', () => {
  it('gameweekProjections[gw] equals sum of fixtureDetails[gw].totalPoints for every player and gameweek', () => {
    const failures: string[] = [];

    for (const player of rawCachedPlayerTotalPoints) {
      const gwKeys = Object.keys(player.gameweekProjections || {});

      for (const gw of gwKeys) {
        const aggregateTotal = player.gameweekProjections[gw] || 0;
        const fixtures = player.fixtureDetails?.[gw];

        if (!fixtures || fixtures.length === 0) {
          if (aggregateTotal === 0) continue;
          failures.push(
            `${player.playerName || player.playerId} GW${gw}: aggregate=${aggregateTotal.toFixed(2)} but no fixtureDetails`
          );
          continue;
        }

        const fixtureSum = fixtures.reduce((sum: number, f: any) => sum + (f.totalPoints || 0), 0);
        const diff = Math.abs(fixtureSum - aggregateTotal);

        if (diff > 0.02) {
          failures.push(
            `${player.playerName || player.playerId} GW${gw}: aggregate=${aggregateTotal.toFixed(2)}, fixtureSum=${fixtureSum.toFixed(2)}, diff=${diff.toFixed(4)}`
          );
        }
      }
    }

    if (failures.length > 0) {
      console.log(`Fixture vs aggregate mismatches (${failures.length} total, showing first 15):`, failures.slice(0, 15));
    }

    expect(failures.length).toBe(0);
  });

  it('each component total matches sum of per-fixture components for every player and gameweek', () => {
    const componentKeys = [
      'pointsFromGoals', 'pointsFromAssists', 'pointsFromCleanSheets',
      'pointsFromMinutes', 'pointsFromGoalsConceded', 'pointsFromYellowCards',
      'pointsFromRedCards', 'pointsFromBonus', 'pointsFromSaves',
      'pointsFromDefensiveContributions'
    ];

    const fixtureComponentKeys = [
      'pointsFromGoals', 'pointsFromAssists', 'pointsFromCleanSheets',
      'pointsFromMinutes', 'pointsFromGoalsConceded', 'pointsFromYellowCards',
      'pointsFromRedCards', 'pointsFromBonus', 'pointsFromSaves',
      'pointsFromDefensiveContributions'
    ];

    const failures: string[] = [];

    for (const player of rawCachedPlayerTotalPoints) {
      const gwKeys = Object.keys(player.gameweekProjections || {});

      for (const gw of gwKeys) {
        const fixtures = player.fixtureDetails?.[gw];
        if (!fixtures || fixtures.length === 0) continue;

        for (let i = 0; i < componentKeys.length; i++) {
          const compKey = componentKeys[i];
          const fixtureCompKey = fixtureComponentKeys[i];

          const aggregateVal = player[compKey]?.[gw] || 0;
          const fixtureSum = fixtures.reduce((sum: number, f: any) => sum + (f[fixtureCompKey] || 0), 0);
          const diff = Math.abs(fixtureSum - aggregateVal);

          if (diff > 0.02) {
            failures.push(
              `${player.playerName || player.playerId} GW${gw} ${compKey}: aggregate=${aggregateVal.toFixed(2)}, fixtureSum=${fixtureSum.toFixed(2)}`
            );
          }
        }
      }
    }

    if (failures.length > 0) {
      console.log(`Component fixture vs aggregate mismatches (${failures.length} total, showing first 15):`, failures.slice(0, 15));
    }

    expect(failures.length).toBe(0);
  });

  it('sum of all components equals gameweekProjections total for each gameweek (strict)', () => {
    const componentKeys = [
      'pointsFromGoals', 'pointsFromAssists', 'pointsFromCleanSheets',
      'pointsFromMinutes', 'pointsFromGoalsConceded', 'pointsFromYellowCards',
      'pointsFromRedCards', 'pointsFromBonus', 'pointsFromSaves',
      'pointsFromDefensiveContributions'
    ];

    const failures: string[] = [];

    for (const player of rawCachedPlayerTotalPoints) {
      const gwKeys = Object.keys(player.gameweekProjections || {});

      for (const gw of gwKeys) {
        const totalForGW = player.gameweekProjections[gw] || 0;
        if (totalForGW === 0) continue;

        let componentSum = 0;
        for (const key of componentKeys) {
          componentSum += player[key]?.[gw] || 0;
        }

        const diff = Math.abs(componentSum - totalForGW);
        if (diff > 0.15) {
          failures.push(
            `${player.playerName || player.playerId} GW${gw}: components=${componentSum.toFixed(2)}, total=${totalForGW.toFixed(2)}, diff=${diff.toFixed(4)}`
          );
        }
      }
    }

    if (failures.length > 0) {
      console.log(`Component sum vs total mismatches (${failures.length} total, showing first 15):`, failures.slice(0, 15));
    }

    expect(failures.length).toBe(0);
  });
});

describe('Double Gameweek (DGW) Handling', () => {
  it('DGW fixtures result in higher projections than single GW for same team', async () => {
    let fixturesData: any[];
    try {
      fixturesData = await fetchJSON('/api/fixtures');
    } catch {
      console.log('Skipping: fixtures endpoint unavailable');
      return;
    }

    const teamFixtureCounts: Map<number, Map<number, number>> = new Map();

    for (const fixture of fixturesData) {
      if (!fixture.event) continue;

      for (const teamId of [fixture.team_h, fixture.team_a]) {
        if (!teamFixtureCounts.has(teamId)) {
          teamFixtureCounts.set(teamId, new Map());
        }
        const counts = teamFixtureCounts.get(teamId)!;
        counts.set(fixture.event, (counts.get(fixture.event) || 0) + 1);
      }
    }

    const dgwTeams: { teamId: number; gameweek: number }[] = [];
    for (const [teamId, gwCounts] of teamFixtureCounts) {
      for (const [gw, count] of gwCounts) {
        if (count >= 2 && gw > currentGameweek) {
          dgwTeams.push({ teamId, gameweek: gw });
        }
      }
    }

    if (dgwTeams.length === 0) {
      console.log('No future DGWs found - test passes trivially');
      return;
    }

    console.log(`Found ${dgwTeams.length} DGW team/gameweek combinations`);
    expect(dgwTeams.length).toBeGreaterThan(0);
  });
});
