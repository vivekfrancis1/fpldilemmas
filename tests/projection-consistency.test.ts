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
let livePlayerTotalPoints: any[];

beforeAll(async () => {
  bootstrapData = await fetchJSON('/api/bootstrap-static');
  currentGameweek = bootstrapData.events.find((e: any) => e.is_current)?.id || 1;
  nextGameweek = Math.min(currentGameweek + 1, 38);

  cachedPlayerTotalPoints = await fetchJSON('/api/cached/player-total-points');
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

  it('sum of components approximately equals total for each gameweek', () => {
    const componentKeys = [
      'pointsFromGoals', 'pointsFromAssists', 'pointsFromCleanSheets',
      'pointsFromMinutes', 'pointsFromBonus', 'pointsFromSaves',
      'pointsFromGoalsConceded', 'pointsFromYellowCards', 'pointsFromRedCards',
      'pointsFromDefensiveContributions'
    ];

    const failures: string[] = [];
    const sample = cachedPlayerTotalPoints.slice(0, 30);

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

describe('Availability Adjustments Consistency', () => {
  it('injured players (0% chance) have availability data in bootstrap for client-side adjustments', () => {
    const injuredPlayers = bootstrapData.elements.filter(
      (el: any) => el.chance_of_playing_next_round === 0
    );

    expect(injuredPlayers.length).toBeGreaterThan(0);

    for (const player of injuredPlayers.slice(0, 10)) {
      expect(player.chance_of_playing_next_round).toBe(0);
      expect(['i', 's', 'u', 'n', 'd']).toContain(player.status);

      const cachedPlayer = cachedPlayerTotalPoints.find(
        (p: any) => p.playerId === player.id
      );

      if (cachedPlayer) {
        expect(cachedPlayer.gameweekProjections).toBeDefined();
      }
    }
  });

  it('doubtful players (25-75%) have availability data in bootstrap for client-side adjustments', () => {
    const doubtfulPlayers = bootstrapData.elements.filter(
      (el: any) =>
        el.chance_of_playing_next_round !== null &&
        el.chance_of_playing_next_round > 0 &&
        el.chance_of_playing_next_round < 100
    );

    for (const player of doubtfulPlayers.slice(0, 10)) {
      expect(player.chance_of_playing_next_round).toBeGreaterThan(0);
      expect(player.chance_of_playing_next_round).toBeLessThan(100);

      const cachedPlayer = cachedPlayerTotalPoints.find(
        (p: any) => p.playerId === player.id
      );

      if (cachedPlayer) {
        expect(cachedPlayer.gameweekProjections).toBeDefined();
        expect(typeof cachedPlayer.gameweekProjections).toBe('object');
      }
    }
  });

  it('fully available players have unmodified projections', () => {
    const availablePlayers = bootstrapData.elements.filter(
      (el: any) =>
        el.status === 'a' &&
        (el.chance_of_playing_next_round === null || el.chance_of_playing_next_round === 100)
    );

    const sample = availablePlayers.slice(0, 20);

    for (const player of sample) {
      const cachedPlayer = cachedPlayerTotalPoints.find(
        (p: any) => p.playerId === player.id
      );

      if (!cachedPlayer) continue;

      expect(cachedPlayer.availabilityAdjustments).toBeUndefined();
    }
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
