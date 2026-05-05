import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../server/services/twitterService', () => ({
  twitterService: {
    postTweet: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../server/config', () => ({
  internalFetch: vi.fn().mockResolvedValue({ ok: false }),
}));

import { twitterService } from '../server/services/twitterService';
import { LiveGoalMonitor } from '../server/services/liveGoalMonitor';

// ---------------------------------------------------------------------------
// Helpers to build the minimal fixture / liveData structures that
// processLiveFixture() expects.
// ---------------------------------------------------------------------------

function makeFixture(overrides: Partial<{
  id: number;
  team_h: number;
  team_a: number;
  team_h_score: number;
  team_a_score: number;
  minutes: number;
}> = {}): any {
  return {
    id: 1,
    team_h: 10,
    team_a: 20,
    team_h_score: 0,
    team_a_score: 0,
    minutes: 45,
    ...overrides,
  };
}

function makeLiveData(elements: any[]): any {
  return { elements };
}

function makeLiveElement(playerId: number, fixtureId: number, stats: { identifier: string; value: number }[]): any {
  return {
    id: playerId,
    explain: [{ fixture: fixtureId, stats }],
  };
}

// ---------------------------------------------------------------------------
// Directly populate the private maps on a LiveGoalMonitor instance using
// type-casting, so we can unit-test processLiveFixture() in isolation.
// ---------------------------------------------------------------------------

function buildMonitor(players: Array<{
  id: number;
  web_name: string;
  team: number;
  selected_by_percent: string;
  element_type: number;
}>, teams: Array<{ id: number; name: string; short_name: string }>): LiveGoalMonitor {
  const monitor = new LiveGoalMonitor() as any;

  for (const p of players) {
    monitor.bootstrapPlayers.set(p.id, p);
  }
  for (const t of teams) {
    monitor.bootstrapTeams.set(t.id, t);
  }

  return monitor as LiveGoalMonitor;
}

function seedPrevState(monitor: LiveGoalMonitor, fixtureId: number, teamH: number, teamA: number): void {
  (monitor as any).fixtureStates.set(fixtureId, {
    fixtureId,
    homeTeamId: teamH,
    awayTeamId: teamA,
    homeScore: 0,
    awayScore: 0,
    playerGoals: new Map<number, number>(),
    playerAssists: new Map<number, number>(),
    playerRedCards: new Map<number, number>(),
    playerDC: new Map<number, number>(),
    tweetedEvents: new Set<string>(),
    overturnCounts: new Map<number, number>(),
  });
}

function seedPrevStateWithGoals(
  monitor: LiveGoalMonitor,
  fixtureId: number,
  teamH: number,
  teamA: number,
  homeScore: number,
  awayScore: number,
  goalsMap: Map<number, number>,
): void {
  (monitor as any).fixtureStates.set(fixtureId, {
    fixtureId,
    homeTeamId: teamH,
    awayTeamId: teamA,
    homeScore,
    awayScore,
    playerGoals: goalsMap,
    playerAssists: new Map<number, number>(),
    playerRedCards: new Map<number, number>(),
    playerDC: new Map<number, number>(),
    tweetedEvents: new Set<string>(),
    overturnCounts: new Map<number, number>(),
  });
}

function seedPrevStateWithGoalsAndAssists(
  monitor: LiveGoalMonitor,
  fixtureId: number,
  teamH: number,
  teamA: number,
  homeScore: number,
  awayScore: number,
  goalsMap: Map<number, number>,
  assistsMap: Map<number, number>,
): void {
  (monitor as any).fixtureStates.set(fixtureId, {
    fixtureId,
    homeTeamId: teamH,
    awayTeamId: teamA,
    homeScore,
    awayScore,
    playerGoals: goalsMap,
    playerAssists: assistsMap,
    playerRedCards: new Map<number, number>(),
    playerDC: new Map<number, number>(),
    tweetedEvents: new Set<string>(),
    overturnCounts: new Map<number, number>(),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LiveGoalMonitor — goal tweets are always posted regardless of ownership', () => {
  const FIXTURE_ID = 1;
  const HOME_TEAM_ID = 10;
  const AWAY_TEAM_ID = 20;
  const SCORER_ID = 101;
  const ASSISTER_ID = 102;

  const scorer = {
    id: SCORER_ID,
    web_name: 'LowOwnedScorer',
    team: HOME_TEAM_ID,
    selected_by_percent: '0.0',
    element_type: 4,
  };

  const assister = {
    id: ASSISTER_ID,
    web_name: 'LowOwnedAssister',
    team: HOME_TEAM_ID,
    selected_by_percent: '0.0',
    element_type: 3,
  };

  const homeTeam = { id: HOME_TEAM_ID, name: 'Arsenal', short_name: 'ARS' };
  const awayTeam = { id: AWAY_TEAM_ID, name: 'Chelsea', short_name: 'CHE' };

  let monitor: LiveGoalMonitor;
  const postTweetMock = twitterService.postTweet as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    postTweetMock.mockClear();
    monitor = buildMonitor([scorer, assister], [homeTeam, awayTeam]);
    seedPrevState(monitor, FIXTURE_ID, HOME_TEAM_ID, AWAY_TEAM_ID);
  });

  it('calls postTweet for a goal by a 0%-owned scorer (no assister)', async () => {
    const fixture = makeFixture({ id: FIXTURE_ID, team_h: HOME_TEAM_ID, team_a: AWAY_TEAM_ID });
    const liveData = makeLiveData([
      makeLiveElement(SCORER_ID, FIXTURE_ID, [{ identifier: 'goals_scored', value: 1 }]),
    ]);

    await (monitor as any).processLiveFixture(fixture, liveData);

    expect(postTweetMock).toHaveBeenCalledTimes(1);
  });

  it('tweet text includes the scorer ownership percentage for a 0%-owned scorer', async () => {
    const fixture = makeFixture({ id: FIXTURE_ID, team_h: HOME_TEAM_ID, team_a: AWAY_TEAM_ID });
    const liveData = makeLiveData([
      makeLiveElement(SCORER_ID, FIXTURE_ID, [{ identifier: 'goals_scored', value: 1 }]),
    ]);

    await (monitor as any).processLiveFixture(fixture, liveData);

    const tweetArg: string = postTweetMock.mock.calls[0][0];
    expect(tweetArg).toContain('LowOwnedScorer');
    expect(tweetArg).toContain('0.0%');
  });

  it('calls postTweet when both scorer and assister are 0%-owned', async () => {
    const fixture = makeFixture({ id: FIXTURE_ID, team_h: HOME_TEAM_ID, team_a: AWAY_TEAM_ID });
    const liveData = makeLiveData([
      makeLiveElement(SCORER_ID, FIXTURE_ID, [{ identifier: 'goals_scored', value: 1 }]),
      makeLiveElement(ASSISTER_ID, FIXTURE_ID, [{ identifier: 'assists', value: 1 }]),
    ]);

    await (monitor as any).processLiveFixture(fixture, liveData);

    expect(postTweetMock).toHaveBeenCalledTimes(1);
  });

  it('tweet text includes ownership percentages for both 0%-owned scorer and assister', async () => {
    const fixture = makeFixture({ id: FIXTURE_ID, team_h: HOME_TEAM_ID, team_a: AWAY_TEAM_ID });
    const liveData = makeLiveData([
      makeLiveElement(SCORER_ID, FIXTURE_ID, [{ identifier: 'goals_scored', value: 1 }]),
      makeLiveElement(ASSISTER_ID, FIXTURE_ID, [{ identifier: 'assists', value: 1 }]),
    ]);

    await (monitor as any).processLiveFixture(fixture, liveData);

    const tweetArg: string = postTweetMock.mock.calls[0][0];
    expect(tweetArg).toContain('LowOwnedScorer');
    expect(tweetArg).toContain('LowOwnedAssister');
    const ownershipMatches = tweetArg.match(/0\.0%/g);
    expect(ownershipMatches).not.toBeNull();
    expect(ownershipMatches!.length).toBeGreaterThanOrEqual(2);
  });

  it('calls postTweet exactly once per goal even when the scorer is well below the OWNERSHIP_THRESHOLD', async () => {
    const veryLowOwnershipScorer = {
      id: 201,
      web_name: 'TinyOwned',
      team: AWAY_TEAM_ID,
      selected_by_percent: '0.1',
      element_type: 4,
    };
    (monitor as any).bootstrapPlayers.set(201, veryLowOwnershipScorer);

    const fixture = makeFixture({ id: FIXTURE_ID, team_h: HOME_TEAM_ID, team_a: AWAY_TEAM_ID });
    const liveData = makeLiveData([
      makeLiveElement(201, FIXTURE_ID, [{ identifier: 'goals_scored', value: 1 }]),
    ]);

    await (monitor as any).processLiveFixture(fixture, liveData);

    expect(postTweetMock).toHaveBeenCalledTimes(1);
  });

  it('does NOT call postTweet on the first-seen poll (no prevState diff yet)', async () => {
    const freshMonitor = buildMonitor([scorer], [homeTeam, awayTeam]);

    const fixture = makeFixture({ id: FIXTURE_ID, team_h: HOME_TEAM_ID, team_a: AWAY_TEAM_ID });
    const liveData = makeLiveData([
      makeLiveElement(SCORER_ID, FIXTURE_ID, [{ identifier: 'goals_scored', value: 1 }]),
    ]);

    await (freshMonitor as any).processLiveFixture(fixture, liveData);

    expect(postTweetMock).not.toHaveBeenCalled();
  });

  it('calls postTweet on the second poll when a new goal appears (simulating real detection)', async () => {
    const fixture = makeFixture({ id: FIXTURE_ID, team_h: HOME_TEAM_ID, team_a: AWAY_TEAM_ID });

    const emptyLiveData = makeLiveData([
      makeLiveElement(SCORER_ID, FIXTURE_ID, []),
    ]);
    await (monitor as any).processLiveFixture(fixture, emptyLiveData);

    const goalLiveData = makeLiveData([
      makeLiveElement(SCORER_ID, FIXTURE_ID, [{ identifier: 'goals_scored', value: 1 }]),
    ]);
    await (monitor as any).processLiveFixture(fixture, goalLiveData);

    expect(postTweetMock).toHaveBeenCalledTimes(1);
    const tweetArg: string = postTweetMock.mock.calls[0][0];
    expect(tweetArg).toContain('0.0%');
  });
});

// ---------------------------------------------------------------------------
// VAR / goal-overturned path
// ---------------------------------------------------------------------------

describe('LiveGoalMonitor — goal-overturned (VAR) tweet path', () => {
  const FIXTURE_ID = 1;
  const HOME_TEAM_ID = 10;
  const AWAY_TEAM_ID = 20;
  const HOME_SCORER_ID = 101;
  const AWAY_SCORER_ID = 102;

  const homeScorer = {
    id: HOME_SCORER_ID,
    web_name: 'HomeGoalScorer',
    team: HOME_TEAM_ID,
    selected_by_percent: '15.5',
    element_type: 4,
  };

  const awayScorer = {
    id: AWAY_SCORER_ID,
    web_name: 'AwayGoalScorer',
    team: AWAY_TEAM_ID,
    selected_by_percent: '8.2',
    element_type: 4,
  };

  const homeTeam = { id: HOME_TEAM_ID, name: 'Arsenal', short_name: 'ARS' };
  const awayTeam = { id: AWAY_TEAM_ID, name: 'Chelsea', short_name: 'CHE' };

  let monitor: LiveGoalMonitor;
  const postTweetMock = twitterService.postTweet as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    postTweetMock.mockClear();
    monitor = buildMonitor([homeScorer, awayScorer], [homeTeam, awayTeam]);
  });

  it('calls postTweet with text containing "OVERTURNED" when a previously tracked goal is removed', async () => {
    const goalsMap = new Map([[HOME_SCORER_ID, 1]]);
    seedPrevStateWithGoals(monitor, FIXTURE_ID, HOME_TEAM_ID, AWAY_TEAM_ID, 1, 0, goalsMap);

    const fixture = makeFixture({ id: FIXTURE_ID, team_h: HOME_TEAM_ID, team_a: AWAY_TEAM_ID, team_h_score: 1, team_a_score: 0 });
    const liveData = makeLiveData([
      makeLiveElement(HOME_SCORER_ID, FIXTURE_ID, [{ identifier: 'goals_scored', value: 0 }]),
    ]);

    await (monitor as any).processLiveFixture(fixture, liveData);

    expect(postTweetMock).toHaveBeenCalledTimes(1);
    const tweetArg: string = postTweetMock.mock.calls[0][0];
    expect(tweetArg).toContain('OVERTURNED');
  });

  it('tweet text includes the scorer name and ownership when goal is overturned', async () => {
    const goalsMap = new Map([[HOME_SCORER_ID, 1]]);
    seedPrevStateWithGoals(monitor, FIXTURE_ID, HOME_TEAM_ID, AWAY_TEAM_ID, 1, 0, goalsMap);

    const fixture = makeFixture({ id: FIXTURE_ID, team_h: HOME_TEAM_ID, team_a: AWAY_TEAM_ID });
    const liveData = makeLiveData([
      makeLiveElement(HOME_SCORER_ID, FIXTURE_ID, [{ identifier: 'goals_scored', value: 0 }]),
    ]);

    await (monitor as any).processLiveFixture(fixture, liveData);

    const tweetArg: string = postTweetMock.mock.calls[0][0];
    expect(tweetArg).toContain('HomeGoalScorer');
    expect(tweetArg).toContain('15.5%');
  });

  it('decrements the home score correctly in the overturned-goal tweet', async () => {
    const goalsMap = new Map([[HOME_SCORER_ID, 1]]);
    seedPrevStateWithGoals(monitor, FIXTURE_ID, HOME_TEAM_ID, AWAY_TEAM_ID, 1, 0, goalsMap);

    const fixture = makeFixture({ id: FIXTURE_ID, team_h: HOME_TEAM_ID, team_a: AWAY_TEAM_ID });
    const liveData = makeLiveData([
      makeLiveElement(HOME_SCORER_ID, FIXTURE_ID, [{ identifier: 'goals_scored', value: 0 }]),
    ]);

    await (monitor as any).processLiveFixture(fixture, liveData);

    const tweetArg: string = postTweetMock.mock.calls[0][0];
    expect(tweetArg).toContain('0-0');
  });

  it('decrements the away score correctly in the overturned-goal tweet', async () => {
    const goalsMap = new Map([[AWAY_SCORER_ID, 1]]);
    seedPrevStateWithGoals(monitor, FIXTURE_ID, HOME_TEAM_ID, AWAY_TEAM_ID, 0, 1, goalsMap);

    const fixture = makeFixture({ id: FIXTURE_ID, team_h: HOME_TEAM_ID, team_a: AWAY_TEAM_ID });
    const liveData = makeLiveData([
      makeLiveElement(AWAY_SCORER_ID, FIXTURE_ID, [{ identifier: 'goals_scored', value: 0 }]),
    ]);

    await (monitor as any).processLiveFixture(fixture, liveData);

    const tweetArg: string = postTweetMock.mock.calls[0][0];
    expect(tweetArg).toContain('0-0');
  });

  it('does NOT call postTweet for an overturned goal when there is no prevState', async () => {
    const freshMonitor = buildMonitor([homeScorer], [homeTeam, awayTeam]);

    const fixture = makeFixture({ id: FIXTURE_ID, team_h: HOME_TEAM_ID, team_a: AWAY_TEAM_ID });
    const liveData = makeLiveData([
      makeLiveElement(HOME_SCORER_ID, FIXTURE_ID, [{ identifier: 'goals_scored', value: 0 }]),
    ]);

    await (freshMonitor as any).processLiveFixture(fixture, liveData);

    expect(postTweetMock).not.toHaveBeenCalled();
  });

  it('handles a partial overturn — only removed goals trigger overturn tweets', async () => {
    const goalsMap = new Map([[HOME_SCORER_ID, 2]]);
    seedPrevStateWithGoals(monitor, FIXTURE_ID, HOME_TEAM_ID, AWAY_TEAM_ID, 2, 0, goalsMap);

    const fixture = makeFixture({ id: FIXTURE_ID, team_h: HOME_TEAM_ID, team_a: AWAY_TEAM_ID });
    const liveData = makeLiveData([
      makeLiveElement(HOME_SCORER_ID, FIXTURE_ID, [{ identifier: 'goals_scored', value: 1 }]),
    ]);

    await (monitor as any).processLiveFixture(fixture, liveData);

    expect(postTweetMock).toHaveBeenCalledTimes(1);
    const tweetArg: string = postTweetMock.mock.calls[0][0];
    expect(tweetArg).toContain('OVERTURNED');
  });

  it('does NOT double-tweet an overturn when the same removed-goal state is polled twice', async () => {
    const goalsMap = new Map([[HOME_SCORER_ID, 1]]);
    seedPrevStateWithGoals(monitor, FIXTURE_ID, HOME_TEAM_ID, AWAY_TEAM_ID, 1, 0, goalsMap);

    const fixture = makeFixture({ id: FIXTURE_ID, team_h: HOME_TEAM_ID, team_a: AWAY_TEAM_ID });
    const liveData = makeLiveData([
      makeLiveElement(HOME_SCORER_ID, FIXTURE_ID, [{ identifier: 'goals_scored', value: 0 }]),
    ]);

    await (monitor as any).processLiveFixture(fixture, liveData);

    // Simulate a second poll arriving before state has advanced: manually restore
    // playerGoals and overturnCounts in prevState so findRemovedEntries sees the
    // same removal again, while tweetedEvents retains the key from the first poll.
    const state = (monitor as any).fixtureStates.get(FIXTURE_ID);
    state.playerGoals = new Map([[HOME_SCORER_ID, 1]]);
    state.overturnCounts = new Map(); // reset committed count to mimic non-committed state

    await (monitor as any).processLiveFixture(fixture, liveData);

    expect(postTweetMock).toHaveBeenCalledTimes(1);
  });

  it('tweets a second OVERTURNED when the same scorer has a distinct goal overturned later', async () => {
    const fixture = makeFixture({ id: FIXTURE_ID, team_h: HOME_TEAM_ID, team_a: AWAY_TEAM_ID });

    // Poll 1: scorer has 1 goal, gets overturned to 0 → first overturn tweet
    const goalsMap1 = new Map([[HOME_SCORER_ID, 1]]);
    seedPrevStateWithGoals(monitor, FIXTURE_ID, HOME_TEAM_ID, AWAY_TEAM_ID, 1, 0, goalsMap1);
    const liveData1 = makeLiveData([
      makeLiveElement(HOME_SCORER_ID, FIXTURE_ID, [{ identifier: 'goals_scored', value: 0 }]),
    ]);
    await (monitor as any).processLiveFixture(fixture, liveData1);
    expect(postTweetMock).toHaveBeenCalledTimes(1);
    const firstTweet: string = postTweetMock.mock.calls[0][0];
    expect(firstTweet).toContain('OVERTURNED');

    // Poll 2: scorer scores again (goals: 0 → 1). Advance state manually to represent
    // a processed "new goal" poll (goal tweet is outside scope of this test).
    const state = (monitor as any).fixtureStates.get(FIXTURE_ID);
    state.playerGoals = new Map([[HOME_SCORER_ID, 1]]);
    state.homeScore = 1;

    // Poll 3: second goal overturned (goals: 1 → 0) → second distinct overturn tweet
    const liveData3 = makeLiveData([
      makeLiveElement(HOME_SCORER_ID, FIXTURE_ID, [{ identifier: 'goals_scored', value: 0 }]),
    ]);
    await (monitor as any).processLiveFixture(fixture, liveData3);

    expect(postTweetMock).toHaveBeenCalledTimes(2);
    const secondTweet: string = postTweetMock.mock.calls[1][0];
    expect(secondTweet).toContain('OVERTURNED');
  });
});

// ---------------------------------------------------------------------------
// Overturned assist credit
// ---------------------------------------------------------------------------

describe('LiveGoalMonitor — overturned goal also removes assist credit', () => {
  const FIXTURE_ID = 1;
  const HOME_TEAM_ID = 10;
  const AWAY_TEAM_ID = 20;
  const SCORER_ID = 101;
  const ASSISTER_ID = 102;

  const scorer = {
    id: SCORER_ID,
    web_name: 'HomeScorer',
    team: HOME_TEAM_ID,
    selected_by_percent: '12.0',
    element_type: 4,
  };

  const assister = {
    id: ASSISTER_ID,
    web_name: 'HomeAssister',
    team: HOME_TEAM_ID,
    selected_by_percent: '9.5',
    element_type: 3,
  };

  const homeTeam = { id: HOME_TEAM_ID, name: 'Arsenal', short_name: 'ARS' };
  const awayTeam = { id: AWAY_TEAM_ID, name: 'Chelsea', short_name: 'CHE' };

  let monitor: LiveGoalMonitor;
  const postTweetMock = twitterService.postTweet as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    postTweetMock.mockClear();
    monitor = buildMonitor([scorer, assister], [homeTeam, awayTeam]);
  });

  it('removes the assist from tracked state after the associated goal is overturned', async () => {
    const goalsMap = new Map([[SCORER_ID, 1]]);
    const assistsMap = new Map([[ASSISTER_ID, 1]]);
    seedPrevStateWithGoalsAndAssists(
      monitor, FIXTURE_ID, HOME_TEAM_ID, AWAY_TEAM_ID, 1, 0, goalsMap, assistsMap,
    );

    const fixture = makeFixture({ id: FIXTURE_ID, team_h: HOME_TEAM_ID, team_a: AWAY_TEAM_ID });
    const liveData = makeLiveData([
      makeLiveElement(SCORER_ID, FIXTURE_ID, [{ identifier: 'goals_scored', value: 0 }]),
      makeLiveElement(ASSISTER_ID, FIXTURE_ID, [{ identifier: 'assists', value: 0 }]),
    ]);

    await (monitor as any).processLiveFixture(fixture, liveData);

    const updatedState = (monitor as any).fixtureStates.get(FIXTURE_ID);
    expect(updatedState.playerAssists.get(ASSISTER_ID) ?? 0).toBe(0);
  });

  it('does not tweet a new assist when the associated goal is overturned alongside the assist', async () => {
    const goalsMap = new Map([[SCORER_ID, 1]]);
    const assistsMap = new Map([[ASSISTER_ID, 1]]);
    seedPrevStateWithGoalsAndAssists(
      monitor, FIXTURE_ID, HOME_TEAM_ID, AWAY_TEAM_ID, 1, 0, goalsMap, assistsMap,
    );

    const fixture = makeFixture({ id: FIXTURE_ID, team_h: HOME_TEAM_ID, team_a: AWAY_TEAM_ID });
    const liveData = makeLiveData([
      makeLiveElement(SCORER_ID, FIXTURE_ID, [{ identifier: 'goals_scored', value: 0 }]),
      makeLiveElement(ASSISTER_ID, FIXTURE_ID, [{ identifier: 'assists', value: 0 }]),
    ]);

    await (monitor as any).processLiveFixture(fixture, liveData);

    const tweetCalls: string[] = postTweetMock.mock.calls.map((c: any[]) => c[0] as string);
    const hasAssistTweet = tweetCalls.some(t => t.includes('HomeAssister') && !t.includes('OVERTURNED'));
    expect(hasAssistTweet).toBe(false);
  });

  it('only posts the OVERTURNED tweet — not a spurious assist tweet — when goal and assist are both removed', async () => {
    const goalsMap = new Map([[SCORER_ID, 1]]);
    const assistsMap = new Map([[ASSISTER_ID, 1]]);
    seedPrevStateWithGoalsAndAssists(
      monitor, FIXTURE_ID, HOME_TEAM_ID, AWAY_TEAM_ID, 1, 0, goalsMap, assistsMap,
    );

    const fixture = makeFixture({ id: FIXTURE_ID, team_h: HOME_TEAM_ID, team_a: AWAY_TEAM_ID });
    const liveData = makeLiveData([
      makeLiveElement(SCORER_ID, FIXTURE_ID, [{ identifier: 'goals_scored', value: 0 }]),
      makeLiveElement(ASSISTER_ID, FIXTURE_ID, [{ identifier: 'assists', value: 0 }]),
    ]);

    await (monitor as any).processLiveFixture(fixture, liveData);

    expect(postTweetMock).toHaveBeenCalledTimes(1);
    const tweetArg: string = postTweetMock.mock.calls[0][0];
    expect(tweetArg).toContain('OVERTURNED');
  });

  it('does not tweet a new assist when the goal is overturned but assist count stays at zero in liveData', async () => {
    const goalsMap = new Map([[SCORER_ID, 1]]);
    const assistsMap = new Map<number, number>();
    seedPrevStateWithGoalsAndAssists(
      monitor, FIXTURE_ID, HOME_TEAM_ID, AWAY_TEAM_ID, 1, 0, goalsMap, assistsMap,
    );

    const fixture = makeFixture({ id: FIXTURE_ID, team_h: HOME_TEAM_ID, team_a: AWAY_TEAM_ID });
    const liveData = makeLiveData([
      makeLiveElement(SCORER_ID, FIXTURE_ID, [{ identifier: 'goals_scored', value: 0 }]),
    ]);

    await (monitor as any).processLiveFixture(fixture, liveData);

    const tweetCalls: string[] = postTweetMock.mock.calls.map((c: any[]) => c[0] as string);
    const hasAssistTweet = tweetCalls.some(t => !t.includes('OVERTURNED') && t.includes('assist'));
    expect(hasAssistTweet).toBe(false);
  });

  it('removes assist from state but does NOT affect an unrelated assist from a concurrent event', async () => {
    const UNRELATED_ASSISTER_ID = 103;
    const unrelatedAssister = {
      id: UNRELATED_ASSISTER_ID,
      web_name: 'UnrelatedAssister',
      team: HOME_TEAM_ID,
      selected_by_percent: '5.0',
      element_type: 3,
    };
    (monitor as any).bootstrapPlayers.set(UNRELATED_ASSISTER_ID, unrelatedAssister);

    const goalsMap = new Map([[SCORER_ID, 1]]);
    const assistsMap = new Map([[ASSISTER_ID, 1]]);
    seedPrevStateWithGoalsAndAssists(
      monitor, FIXTURE_ID, HOME_TEAM_ID, AWAY_TEAM_ID, 1, 0, goalsMap, assistsMap,
    );

    const fixture = makeFixture({ id: FIXTURE_ID, team_h: HOME_TEAM_ID, team_a: AWAY_TEAM_ID });
    const liveData = makeLiveData([
      makeLiveElement(SCORER_ID, FIXTURE_ID, [{ identifier: 'goals_scored', value: 0 }]),
      makeLiveElement(ASSISTER_ID, FIXTURE_ID, [{ identifier: 'assists', value: 0 }]),
      makeLiveElement(UNRELATED_ASSISTER_ID, FIXTURE_ID, [{ identifier: 'assists', value: 1 }]),
    ]);

    await (monitor as any).processLiveFixture(fixture, liveData);

    const updatedState = (monitor as any).fixtureStates.get(FIXTURE_ID);
    expect(updatedState.playerAssists.get(ASSISTER_ID) ?? 0).toBe(0);
    expect(updatedState.playerAssists.get(UNRELATED_ASSISTER_ID)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Goal tweet deduplication guard
// ---------------------------------------------------------------------------

describe('LiveGoalMonitor — goal tweet deduplication', () => {
  const FIXTURE_ID = 1;
  const HOME_TEAM_ID = 10;
  const AWAY_TEAM_ID = 20;
  const SCORER_ID = 101;

  const scorer = {
    id: SCORER_ID,
    web_name: 'DedupScorer',
    team: HOME_TEAM_ID,
    selected_by_percent: '20.0',
    element_type: 4,
  };

  const homeTeam = { id: HOME_TEAM_ID, name: 'Arsenal', short_name: 'ARS' };
  const awayTeam = { id: AWAY_TEAM_ID, name: 'Chelsea', short_name: 'CHE' };

  let monitor: LiveGoalMonitor;
  const postTweetMock = twitterService.postTweet as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    postTweetMock.mockClear();
    monitor = buildMonitor([scorer], [homeTeam, awayTeam]);
    seedPrevState(monitor, FIXTURE_ID, HOME_TEAM_ID, AWAY_TEAM_ID);
  });

  it('does NOT double-tweet a goal when the same state is polled a second time before state advances', async () => {
    const fixture = makeFixture({ id: FIXTURE_ID, team_h: HOME_TEAM_ID, team_a: AWAY_TEAM_ID });
    const liveData = makeLiveData([
      makeLiveElement(SCORER_ID, FIXTURE_ID, [{ identifier: 'goals_scored', value: 1 }]),
    ]);

    await (monitor as any).processLiveFixture(fixture, liveData);

    // Simulate a second identical poll before state advances: restore playerGoals
    // in prevState so findNewEntries detects the same "new" goal again, while
    // tweetedEvents retains the key from the first poll.
    const state = (monitor as any).fixtureStates.get(FIXTURE_ID);
    state.playerGoals = new Map();

    await (monitor as any).processLiveFixture(fixture, liveData);

    expect(postTweetMock).toHaveBeenCalledTimes(1);
  });

  it('tweets a second time when a genuinely new goal is scored after the first', async () => {
    const fixture = makeFixture({ id: FIXTURE_ID, team_h: HOME_TEAM_ID, team_a: AWAY_TEAM_ID });

    const liveData1 = makeLiveData([
      makeLiveElement(SCORER_ID, FIXTURE_ID, [{ identifier: 'goals_scored', value: 1 }]),
    ]);
    await (monitor as any).processLiveFixture(fixture, liveData1);
    expect(postTweetMock).toHaveBeenCalledTimes(1);

    const liveData2 = makeLiveData([
      makeLiveElement(SCORER_ID, FIXTURE_ID, [{ identifier: 'goals_scored', value: 2 }]),
    ]);
    await (monitor as any).processLiveFixture(fixture, liveData2);
    expect(postTweetMock).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Red card deduplication guard
// ---------------------------------------------------------------------------

describe('LiveGoalMonitor — red card tweet deduplication', () => {
  const FIXTURE_ID = 1;
  const HOME_TEAM_ID = 10;
  const AWAY_TEAM_ID = 20;
  const PLAYER_ID = 201;

  const player = {
    id: PLAYER_ID,
    web_name: 'RedCardPlayer',
    team: HOME_TEAM_ID,
    selected_by_percent: '12.5',
    element_type: 2,
  };

  const homeTeam = { id: HOME_TEAM_ID, name: 'Arsenal', short_name: 'ARS' };
  const awayTeam = { id: AWAY_TEAM_ID, name: 'Chelsea', short_name: 'CHE' };

  let monitor: LiveGoalMonitor;
  const postTweetMock = twitterService.postTweet as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    postTweetMock.mockClear();
    monitor = buildMonitor([player], [homeTeam, awayTeam]);
    seedPrevState(monitor, FIXTURE_ID, HOME_TEAM_ID, AWAY_TEAM_ID);
  });

  it('tweets once when a red card is first detected', async () => {
    const fixture = makeFixture({ id: FIXTURE_ID, team_h: HOME_TEAM_ID, team_a: AWAY_TEAM_ID });
    const liveData = makeLiveData([
      makeLiveElement(PLAYER_ID, FIXTURE_ID, [{ identifier: 'red_cards', value: 1 }]),
    ]);

    await (monitor as any).processLiveFixture(fixture, liveData);

    expect(postTweetMock).toHaveBeenCalledTimes(1);
  });

  it('does NOT double-tweet a red card when the same state is polled a second time', async () => {
    const fixture = makeFixture({ id: FIXTURE_ID, team_h: HOME_TEAM_ID, team_a: AWAY_TEAM_ID });
    const liveData = makeLiveData([
      makeLiveElement(PLAYER_ID, FIXTURE_ID, [{ identifier: 'red_cards', value: 1 }]),
    ]);

    await (monitor as any).processLiveFixture(fixture, liveData);

    // Simulate a second identical poll before state advances: restore playerRedCards
    // in prevState so findNewEntries detects the same "new" card again, while
    // tweetedEvents retains the key from the first poll.
    const state = (monitor as any).fixtureStates.get(FIXTURE_ID);
    state.playerRedCards = new Map();

    await (monitor as any).processLiveFixture(fixture, liveData);

    expect(postTweetMock).toHaveBeenCalledTimes(1);
  });

  it('tweet text includes the player name when a red card is detected', async () => {
    const fixture = makeFixture({ id: FIXTURE_ID, team_h: HOME_TEAM_ID, team_a: AWAY_TEAM_ID });
    const liveData = makeLiveData([
      makeLiveElement(PLAYER_ID, FIXTURE_ID, [{ identifier: 'red_cards', value: 1 }]),
    ]);

    await (monitor as any).processLiveFixture(fixture, liveData);

    const tweetArg: string = postTweetMock.mock.calls[0][0];
    expect(tweetArg).toContain('RedCardPlayer');
  });

  it('does NOT tweet a red card on the very first poll (no prevState diff)', async () => {
    const freshMonitor = buildMonitor([player], [homeTeam, awayTeam]);

    const fixture = makeFixture({ id: FIXTURE_ID, team_h: HOME_TEAM_ID, team_a: AWAY_TEAM_ID });
    const liveData = makeLiveData([
      makeLiveElement(PLAYER_ID, FIXTURE_ID, [{ identifier: 'red_cards', value: 1 }]),
    ]);

    await (freshMonitor as any).processLiveFixture(fixture, liveData);

    expect(postTweetMock).not.toHaveBeenCalled();
  });
});
