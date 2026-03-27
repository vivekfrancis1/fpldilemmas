import { twitterService } from './twitterService';
import { internalFetch } from '../config';

interface FixtureState {
  fixtureId: number;
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number;
  awayScore: number;
  playerGoals: Map<number, number>;
  playerAssists: Map<number, number>;
  playerRedCards: Map<number, number>;
  playerDC: Map<number, number>;
  tweetedEvents: Set<string>;
}

interface DCEntry {
  playerId: number;
  playerName: string;
  dc: number;
  position: string;
  ownership: number;
}

interface FinishedFixtureState {
  fixtureId: number;
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number;
  awayScore: number;
  gameweek: number;
  finishedAt: number;
  bonusAllocation: string;
  bonusTweeted: boolean;
  dcTweeted: boolean;
}

interface BonusEntry {
  playerId: number;
  playerName: string;
  bonus: number;
  ownership: number;
}

interface BootstrapPlayer {
  id: number;
  web_name: string;
  team: number;
  selected_by_percent: string;
  element_type: number;
}

interface BootstrapTeam {
  id: number;
  name: string;
  short_name: string;
}

interface MatchContext {
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  minute: number | string;
  fixtureId: number;
}

const TEAM_ABBREVIATIONS: Record<string, string> = {
  'Arsenal': 'ARS', 'Aston Villa': 'AVL', 'Bournemouth': 'BOU',
  'Brentford': 'BRE', 'Brighton': 'BHA', 'Brighton and Hove Albion': 'BHA',
  'Chelsea': 'CHE', 'Crystal Palace': 'CRY', 'Everton': 'EVE',
  'Fulham': 'FUL', 'Ipswich': 'IPS', 'Ipswich Town': 'IPS',
  'Leicester': 'LEI', 'Leicester City': 'LEI', 'Liverpool': 'LIV',
  'Man City': 'MCI', 'Manchester City': 'MCI', 'Man Utd': 'MUN',
  'Manchester United': 'MUN', 'Newcastle': 'NEW', 'Newcastle United': 'NEW',
  "Nott'm Forest": 'NFO', 'Nottingham Forest': 'NFO', 'Southampton': 'SOU',
  'Spurs': 'TOT', 'Tottenham': 'TOT', 'Tottenham Hotspur': 'TOT',
  'West Ham': 'WHU', 'West Ham United': 'WHU', 'Wolves': 'WOL',
  'Wolverhampton Wanderers': 'WOL'
};

const POSITION_MAP: Record<number, string> = { 1: 'GKP', 2: 'DEF', 3: 'MID', 4: 'FWD' };

export class LiveGoalMonitor {
  private pollInterval: NodeJS.Timeout | null = null;
  private fixtureStates: Map<number, FixtureState> = new Map();
  private finishedFixtures: Map<number, FinishedFixtureState> = new Map();
  private isPolling = false;
  private bootstrapPlayers: Map<number, BootstrapPlayer> = new Map();
  private bootstrapTeams: Map<number, BootstrapTeam> = new Map();
  private lastBootstrapRefresh = 0;
  private readonly POLL_INTERVAL_MS = 60_000;
  private readonly BOOTSTRAP_REFRESH_MS = 10 * 60_000;
  private readonly OWNERSHIP_THRESHOLD = 1.0;
  private readonly BONUS_MONITOR_HOURS = 24;
  private readonly BATCH_DELAY_MS = 5 * 60_000;
  private readonly SITE_URL = 'https://fpldilemmas.com';

  private pendingDCBatch: Map<number, { matchLine: string; fixtureId: number; players: DCEntry[] }> = new Map();
  private pendingBonusBatch: Map<number, { matchLine: string; fixtureId: number; entries: BonusEntry[] }> = new Map();
  private pendingBonusUpdateBatch: Map<number, { matchLine: string; fixtureId: number; entries: BonusEntry[] }> = new Map();
  private dcBatchTimer: NodeJS.Timeout | null = null;
  private bonusBatchTimer: NodeJS.Timeout | null = null;
  private bonusUpdateBatchTimer: NodeJS.Timeout | null = null;

  start() {
    console.log('⚽ Live match monitor starting...');
    console.log(`📋 Will tweet events when player has >${this.OWNERSHIP_THRESHOLD}% ownership`);
    console.log(`📋 Tracking: goals, assists, red cards, DC, bonus points`);
    console.log(`📋 Bonus points monitored for ${this.BONUS_MONITOR_HOURS} hours after match ends`);

    // Delay first poll by 2 minutes so startup memory (aggregation, DB writes, caches)
    // has time to be GC'd before the live monitor begins its 60-second polling cycle.
    setTimeout(() => this.poll(), 2 * 60 * 1000);
    this.pollInterval = setInterval(() => this.poll(), this.POLL_INTERVAL_MS);
  }

  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      console.log('⏹️ Live match monitor stopped');
    }
    if (this.dcBatchTimer) {
      clearTimeout(this.dcBatchTimer);
      this.dcBatchTimer = null;
    }
    if (this.bonusBatchTimer) {
      clearTimeout(this.bonusBatchTimer);
      this.bonusBatchTimer = null;
    }
    if (this.bonusUpdateBatchTimer) {
      clearTimeout(this.bonusUpdateBatchTimer);
      this.bonusUpdateBatchTimer = null;
    }
  }

  private async poll() {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      await this.refreshBootstrapIfNeeded();

      const fixturesRes = await internalFetch('api/fixtures');
      if (!fixturesRes.ok) return;
      const fixtures: any[] = await fixturesRes.json();

      const liveFixtures = fixtures.filter((f: any) => f.started && !f.finished_provisional);

      const fixturesByGw = new Map<number, any[]>();
      for (const f of liveFixtures) {
        const gw = f.event;
        if (!fixturesByGw.has(gw)) fixturesByGw.set(gw, []);
        fixturesByGw.get(gw)!.push(f);
      }

      for (const [gameweek, gwFixtures] of Array.from(fixturesByGw.entries())) {
        const liveRes = await fetch(`https://fantasy.premierleague.com/api/event/${gameweek}/live/`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FPL-Analytics/1.0)', Accept: 'application/json' }
        });
        if (!liveRes.ok) continue;
        const liveData: any = await liveRes.json();

        for (const fixture of gwFixtures) {
          await this.processLiveFixture(fixture, liveData);
        }
      }

      const liveIds = new Set(liveFixtures.map((f: any) => f.id));
      for (const id of Array.from(this.fixtureStates.keys())) {
        if (!liveIds.has(id)) {
          const state = this.fixtureStates.get(id)!;
          const matchingFixture = fixtures.find((f: any) => f.id === id);
          if (matchingFixture && (matchingFixture.finished_provisional || matchingFixture.finished)) {
            await this.handleFixtureFinished(matchingFixture, state);
          }
          this.fixtureStates.delete(id);
        }
      }

      this.pickUpRecentlyFinishedFixtures(fixtures);

      await this.checkBonusUpdates(fixtures);

      if (liveFixtures.length === 0 && this.fixtureStates.size > 0) {
        this.fixtureStates.clear();
      }
    } catch (error) {
      console.error('⚽ Live match monitor poll error:', error);
    } finally {
      this.isPolling = false;
    }
  }

  private pickUpRecentlyFinishedFixtures(fixtures: any[]) {
    const now = Date.now();
    const monitorWindowMs = this.BONUS_MONITOR_HOURS * 60 * 60 * 1000;

    for (const fixture of fixtures) {
      if (!fixture.finished_provisional && !fixture.finished) continue;
      if (this.finishedFixtures.has(fixture.id)) continue;
      if (!fixture.kickoff_time) continue;

      const kickoffTime = new Date(fixture.kickoff_time).getTime();
      const estimatedEndTime = kickoffTime + 2 * 60 * 60 * 1000;

      if (now - estimatedEndTime > monitorWindowMs) continue;

      const existingBonus = this.extractBonusFromFixture(fixture);
      const existingBonusKey = this.bonusAllocationKey(existingBonus);

      this.finishedFixtures.set(fixture.id, {
        fixtureId: fixture.id,
        homeTeamId: fixture.team_h,
        awayTeamId: fixture.team_a,
        homeScore: fixture.team_h_score ?? 0,
        awayScore: fixture.team_a_score ?? 0,
        gameweek: fixture.event,
        finishedAt: estimatedEndTime,
        bonusAllocation: existingBonusKey,
        bonusTweeted: true,
        dcTweeted: true,
      });
      console.log(`🌟 Picked up recently finished fixture ${fixture.id} for bonus change monitoring (existing bonus: ${existingBonusKey || 'none'})`);
    }
  }

  private async handleFixtureFinished(fixture: any, state: FixtureState) {
    const fixtureId = fixture.id;
    const homeScore = fixture.team_h_score ?? 0;
    const awayScore = fixture.team_a_score ?? 0;

    const bonusEntries = this.extractBonusFromFixture(fixture);
    const bonusKey = this.bonusAllocationKey(bonusEntries);

    const finishedState: FinishedFixtureState = {
      fixtureId,
      homeTeamId: fixture.team_h,
      awayTeamId: fixture.team_a,
      homeScore,
      awayScore,
      gameweek: fixture.event,
      finishedAt: Date.now(),
      bonusAllocation: bonusKey,
      bonusTweeted: false,
      dcTweeted: false,
    };

    this.finishedFixtures.set(fixtureId, finishedState);

    const matchCtx: MatchContext = {
      homeTeamName: this.bootstrapTeams.get(fixture.team_h)?.name || 'Home',
      awayTeamName: this.bootstrapTeams.get(fixture.team_a)?.name || 'Away',
      homeScore,
      awayScore,
      minute: 'FT',
      fixtureId,
    };

    const dcPlayers = this.extractDCFromState(state, fixture);
    if (dcPlayers.length > 0) {
      this.pendingDCBatch.set(fixtureId, { matchLine: this.matchLine(matchCtx), fixtureId, players: dcPlayers });
      finishedState.dcTweeted = true;
      this.scheduleDCBatch();
      console.log(`🛡️ DC data queued for fixture ${fixtureId} (${dcPlayers.length} players)`);
    }

    if (bonusEntries.length > 0) {
      this.pendingBonusBatch.set(fixtureId, { matchLine: this.matchLine(matchCtx), fixtureId, entries: bonusEntries });
      finishedState.bonusTweeted = true;
      this.scheduleBonusBatch();
      console.log(`🌟 Bonus data queued for fixture ${fixtureId}`);
    } else {
      console.log(`🌟 No bonus data yet for fixture ${fixtureId}, will monitor`);
    }
  }

  private extractDCFromState(state: FixtureState, fixture: any): DCEntry[] {
    const dcPlayers: DCEntry[] = [];
    for (const [playerId, dc] of Array.from(state.playerDC.entries())) {
      const player = this.bootstrapPlayers.get(playerId);
      if (!player) continue;
      if (player.team !== fixture.team_h && player.team !== fixture.team_a) continue;
      const pos = POSITION_MAP[player.element_type] || 'MID';
      const threshold = (pos === 'DEF' || pos === 'GKP') ? 10 : 12;
      if (dc < threshold) continue;
      const ownership = parseFloat(player.selected_by_percent);
      dcPlayers.push({ playerId, playerName: player.web_name, dc, position: pos, ownership });
    }
    dcPlayers.sort((a, b) => b.dc - a.dc);
    return dcPlayers;
  }

  private async checkBonusUpdates(fixtures: any[]) {
    const now = Date.now();
    const expireMs = this.BONUS_MONITOR_HOURS * 60 * 60 * 1000;

    for (const [fixtureId, state] of Array.from(this.finishedFixtures.entries())) {
      if (now - state.finishedAt > expireMs) {
        this.finishedFixtures.delete(fixtureId);
        console.log(`🌟 Stopped monitoring bonus for fixture ${fixtureId} (${this.BONUS_MONITOR_HOURS}h expired)`);
        continue;
      }

      const fixture = fixtures.find((f: any) => f.id === fixtureId);
      if (!fixture) continue;

      const bonusEntries = this.extractBonusFromFixture(fixture);
      if (bonusEntries.length === 0) continue;

      const newBonusKey = this.bonusAllocationKey(bonusEntries);

      if (!state.bonusTweeted) {
        const matchCtx: MatchContext = {
          homeTeamName: this.bootstrapTeams.get(state.homeTeamId)?.name || 'Home',
          awayTeamName: this.bootstrapTeams.get(state.awayTeamId)?.name || 'Away',
          homeScore: state.homeScore,
          awayScore: state.awayScore,
          minute: 'FT',
          fixtureId,
        };
        this.pendingBonusBatch.set(fixtureId, { matchLine: this.matchLine(matchCtx), fixtureId, entries: bonusEntries });
        state.bonusTweeted = true;
        state.bonusAllocation = newBonusKey;
        this.scheduleBonusBatch();
        console.log(`🌟 Bonus data queued for fixture ${fixtureId} (from monitoring)`);
      } else if (newBonusKey !== state.bonusAllocation) {
        const matchCtx: MatchContext = {
          homeTeamName: this.bootstrapTeams.get(state.homeTeamId)?.name || 'Home',
          awayTeamName: this.bootstrapTeams.get(state.awayTeamId)?.name || 'Away',
          homeScore: state.homeScore,
          awayScore: state.awayScore,
          minute: 'FT',
          fixtureId,
        };
        state.bonusAllocation = newBonusKey;
        this.pendingBonusUpdateBatch.set(fixtureId, { matchLine: this.matchLine(matchCtx), fixtureId, entries: bonusEntries });
        this.scheduleBonusUpdateBatch();
        console.log(`🔄 Bonus update queued for fixture ${fixtureId}`);
      }
    }
  }

  private extractBonusFromFixture(fixture: any): BonusEntry[] {
    const bonusEntries: BonusEntry[] = [];
    const stats = fixture.stats;
    if (!stats || !Array.isArray(stats)) return bonusEntries;

    const bonusStat = stats.find((s: any) => s.identifier === 'bonus');
    if (!bonusStat) return bonusEntries;

    const allBonusPlayers: Array<{ playerId: number; bonus: number }> = [];
    for (const entry of (bonusStat.h || [])) {
      if (entry.value > 0) {
        allBonusPlayers.push({ playerId: entry.element, bonus: entry.value });
      }
    }
    for (const entry of (bonusStat.a || [])) {
      if (entry.value > 0) {
        allBonusPlayers.push({ playerId: entry.element, bonus: entry.value });
      }
    }

    allBonusPlayers.sort((a, b) => b.bonus - a.bonus);

    for (const bp of allBonusPlayers) {
      const player = this.bootstrapPlayers.get(bp.playerId);
      if (!player) continue;
      bonusEntries.push({
        playerId: bp.playerId,
        playerName: player.web_name,
        bonus: bp.bonus,
        ownership: parseFloat(player.selected_by_percent),
      });
    }

    return bonusEntries;
  }

  private bonusAllocationKey(entries: BonusEntry[]): string {
    return entries.map(e => `${e.playerId}:${e.bonus}`).join(',');
  }

  private formatBonusTweet(entries: BonusEntry[], ctx: MatchContext, isUpdate: boolean): string {
    const header = isUpdate ? '🔄 Bonus Points Updated!' : '🌟 Bonus Points Confirmed!';
    let tweet = `${header}\n\n${this.matchLine(ctx)}\n`;

    for (const entry of entries) {
      const ptLabel = entry.bonus === 1 ? 'pt' : 'pts';
      tweet += `\n${entry.bonus} ${ptLabel} - ${entry.playerName}`;
    }

    tweet += this.footer(ctx);
    return tweet;
  }

  private async processLiveFixture(fixture: any, liveData: any) {
    const fixtureId = fixture.id;
    // Note: fixture.team_h_score / team_a_score come from our 30-min cached /api/fixtures
    // endpoint and are unreliable during live matches. We derive the live score from our
    // prevState (tracked per-poll) + newly detected goals to ensure the tweet score is correct.

    const currentPlayerGoals = new Map<number, number>();
    const currentPlayerAssists = new Map<number, number>();
    const currentPlayerRedCards = new Map<number, number>();
    const currentPlayerDC = new Map<number, number>();

    if (liveData?.elements) {
      for (const el of liveData.elements) {
        const playerInfo = this.bootstrapPlayers.get(el.id);
        if (!playerInfo) continue;
        if (playerInfo.team !== fixture.team_h && playerInfo.team !== fixture.team_a) continue;

        const fixtureExplain = el.explain?.find((ex: any) => ex.fixture === fixtureId);
        if (!fixtureExplain) continue;

        for (const stat of fixtureExplain.stats || []) {
          if (stat.identifier === 'goals_scored' && stat.value > 0) {
            currentPlayerGoals.set(el.id, stat.value);
          }
          if (stat.identifier === 'assists' && stat.value > 0) {
            currentPlayerAssists.set(el.id, stat.value);
          }
          if (stat.identifier === 'red_cards' && stat.value > 0) {
            currentPlayerRedCards.set(el.id, stat.value);
          }
          if (stat.identifier === 'defensive_contribution' && stat.value > 0) {
            currentPlayerDC.set(el.id, stat.value);
          }
        }
      }
    }

    const prevState = this.fixtureStates.get(fixtureId);

    if (!prevState) {
      // First time seeing this fixture — initialise from fixture data (match just started, score reliable)
      this.fixtureStates.set(fixtureId, {
        fixtureId,
        homeTeamId: fixture.team_h,
        awayTeamId: fixture.team_a,
        homeScore: fixture.team_h_score ?? 0,
        awayScore: fixture.team_a_score ?? 0,
        playerGoals: currentPlayerGoals,
        playerAssists: currentPlayerAssists,
        playerRedCards: currentPlayerRedCards,
        playerDC: currentPlayerDC,
        tweetedEvents: new Set(),
      });
      return;
    }

    // Derive live score from our tracked prevState, then increment per new goal.
    // This avoids the stale 30-min cached fixture score being used in tweets.
    let liveHomeScore = prevState.homeScore;
    let liveAwayScore = prevState.awayScore;

    const homeTeamName = this.bootstrapTeams.get(fixture.team_h)?.name || 'Home';
    const awayTeamName = this.bootstrapTeams.get(fixture.team_a)?.name || 'Away';

    const newGoalScorers = this.findNewEntries(prevState.playerGoals, currentPlayerGoals);
    const newAssistProviders = this.findNewEntries(prevState.playerAssists, currentPlayerAssists);

    if (newGoalScorers.length > 0) {
      const safeAssistAttribution = newGoalScorers.length === 1 && newAssistProviders.length === 1;

      for (const scorerId of newGoalScorers) {
        const scorer = this.bootstrapPlayers.get(scorerId);
        if (!scorer) continue;

        // Increment the live score for this goal before building the tweet context
        if (scorer.team === fixture.team_h) {
          liveHomeScore++;
        } else {
          liveAwayScore++;
        }

        let assistProvider: BootstrapPlayer | undefined;
        if (safeAssistAttribution && newAssistProviders.length > 0) {
          assistProvider = this.bootstrapPlayers.get(newAssistProviders.shift()!);
        }

        const scorerOwnership = parseFloat(scorer.selected_by_percent);
        const assistOwnership = assistProvider ? parseFloat(assistProvider.selected_by_percent) : 0;

        if (scorerOwnership > this.OWNERSHIP_THRESHOLD || assistOwnership > this.OWNERSHIP_THRESHOLD) {
          const goalCtx: MatchContext = {
            homeTeamName,
            awayTeamName,
            homeScore: liveHomeScore,
            awayScore: liveAwayScore,
            minute: fixture.minutes ?? '?',
            fixtureId,
          };
          await this.postEventTweet(this.formatGoalTweet(
            scorer.web_name, scorerOwnership,
            assistProvider?.web_name, assistProvider ? assistOwnership : undefined,
            goalCtx
          ));
        } else {
          console.log(`⚽ Goal by ${scorer.web_name} (${scorerOwnership}%) skipped - below threshold`);
        }
      }
    }

    const newRedCards = this.findNewEntries(prevState.playerRedCards, currentPlayerRedCards);
    for (const playerId of newRedCards) {
      const player = this.bootstrapPlayers.get(playerId);
      if (!player) continue;
      const ownership = parseFloat(player.selected_by_percent);
      if (ownership > this.OWNERSHIP_THRESHOLD) {
        const redCardCtx: MatchContext = {
          homeTeamName,
          awayTeamName,
          homeScore: liveHomeScore,
          awayScore: liveAwayScore,
          minute: fixture.minutes ?? '?',
          fixtureId,
        };
        await this.postEventTweet(this.formatRedCardTweet(player.web_name, ownership, redCardCtx));
      }
    }

    // Update tracked state with our computed live scores (not stale fixture cache scores)
    prevState.homeScore = liveHomeScore;
    prevState.awayScore = liveAwayScore;
    prevState.playerGoals = currentPlayerGoals;
    prevState.playerAssists = currentPlayerAssists;
    prevState.playerRedCards = currentPlayerRedCards;
    prevState.playerDC = currentPlayerDC;
  }

  private findNewEntries(prev: Map<number, number>, current: Map<number, number>): number[] {
    const results: number[] = [];
    const entries = Array.from(current.entries());
    for (const [playerId, value] of entries) {
      const prevValue = prev.get(playerId) || 0;
      if (value > prevValue) {
        for (let i = 0; i < value - prevValue; i++) {
          results.push(playerId);
        }
      }
    }
    return results;
  }

  private getTeamAbbr(teamName: string): string {
    return TEAM_ABBREVIATIONS[teamName] || teamName.substring(0, 3).toUpperCase();
  }

  private matchLine(ctx: MatchContext): string {
    return `${this.getTeamAbbr(ctx.homeTeamName)} ${ctx.homeScore}-${ctx.awayScore} ${this.getTeamAbbr(ctx.awayTeamName)}`;
  }

  private footer(ctx: MatchContext): string {
    return `\n\n📊 Match Stats: ${this.SITE_URL}/match-stats/${ctx.fixtureId}\n#FPL #FantasyPremierLeague #FPLCommunity`;
  }

  private formatGoalTweet(
    scorerName: string, scorerOwnership: number,
    assistName: string | undefined, assistOwnership: number | undefined,
    ctx: MatchContext
  ): string {
    let tweet = `⚽ GOAL! ${scorerName} [${scorerOwnership.toFixed(1)}% owned]`;
    if (assistName) {
      tweet += `\n🅰️ Assist: ${assistName}`;
      if (assistOwnership !== undefined) {
        tweet += ` [${assistOwnership.toFixed(1)}% owned]`;
      }
    }
    tweet += `\n\n${this.matchLine(ctx)}`;
    tweet += this.footer(ctx);
    return tweet;
  }

  private formatRedCardTweet(playerName: string, ownership: number, ctx: MatchContext): string {
    let tweet = `🟥 Red Card! ${playerName} [${ownership.toFixed(1)}% owned]`;
    tweet += `\n\n${this.matchLine(ctx)}`;
    tweet += this.footer(ctx);
    return tweet;
  }

  private scheduleDCBatch() {
    if (this.dcBatchTimer) clearTimeout(this.dcBatchTimer);
    this.dcBatchTimer = setTimeout(() => this.flushDCBatch(), this.BATCH_DELAY_MS);
  }

  private scheduleBonusBatch() {
    if (this.bonusBatchTimer) clearTimeout(this.bonusBatchTimer);
    this.bonusBatchTimer = setTimeout(() => this.flushBonusBatch(), this.BATCH_DELAY_MS);
  }

  private async flushDCBatch() {
    this.dcBatchTimer = null;
    const batch = Array.from(this.pendingDCBatch.values());
    this.pendingDCBatch.clear();
    if (batch.length === 0) return;
    const tweet = this.formatBatchedDCTweet(batch);
    await this.postEventTweet(tweet);
    console.log(`🛡️ Batched DC tweet posted (${batch.length} fixture(s))`);
  }

  private async flushBonusBatch() {
    this.bonusBatchTimer = null;
    const batch = Array.from(this.pendingBonusBatch.values());
    this.pendingBonusBatch.clear();
    if (batch.length === 0) return;
    const tweet = this.formatBatchedBonusTweet(batch);
    await this.postEventTweet(tweet);
    console.log(`🌟 Batched bonus tweet posted (${batch.length} fixture(s))`);
  }

  private scheduleBonusUpdateBatch() {
    if (this.bonusUpdateBatchTimer) clearTimeout(this.bonusUpdateBatchTimer);
    this.bonusUpdateBatchTimer = setTimeout(() => this.flushBonusUpdateBatch(), this.BATCH_DELAY_MS);
  }

  private async flushBonusUpdateBatch() {
    this.bonusUpdateBatchTimer = null;
    const batch = Array.from(this.pendingBonusUpdateBatch.values());
    this.pendingBonusUpdateBatch.clear();
    if (batch.length === 0) return;
    const tweet = this.formatBatchedBonusUpdateTweet(batch);
    await this.postEventTweet(tweet);
    console.log(`🔄 Batched bonus update tweet posted (${batch.length} fixture(s))`);
  }

  private formatBatchedBonusUpdateTweet(batch: Array<{ matchLine: string; fixtureId: number; entries: BonusEntry[] }>): string {
    const genericFooter = `\n\n#FPL #FantasyPremierLeague #FPLCommunity`;

    if (batch.length === 1) {
      const { matchLine, fixtureId, entries } = batch[0];
      let tweet = `🔄 Bonus Points Updated!\n\n${matchLine}`;
      for (const e of entries) {
        tweet += `\n${e.playerName} - ${e.bonus} pts`;
      }
      tweet += `\n\n📊 Match Stats: ${this.SITE_URL}/match-stats/${fixtureId}\n#FPL #FantasyPremierLeague #FPLCommunity`;
      return tweet.slice(0, 280);
    }

    const header = `🔄 Bonus Points Updated!\n\n`;
    const reservedFooter = genericFooter.length;
    let body = '';

    for (const { matchLine, entries } of batch) {
      const section = `${matchLine}\n` + entries.map(e => `${e.playerName} - ${e.bonus} pts`).join('\n') + `\n\n`;
      if ((header + body + section).length + reservedFooter > 280) break;
      body += section;
    }

    return (header + body.trimEnd() + genericFooter).slice(0, 280);
  }

  private formatBatchedDCTweet(batch: Array<{ matchLine: string; fixtureId: number; players: DCEntry[] }>): string {
    const genericFooter = `\n\n#FPL #FantasyPremierLeague #FPLCommunity`;

    if (batch.length === 1) {
      const { matchLine, fixtureId, players } = batch[0];
      let tweet = `🛡️ Defensive Contribution Points!\n\n${matchLine}`;
      for (const entry of players) {
        tweet += `\n${entry.playerName} - ${entry.dc} DC`;
      }
      tweet += `\n\n📊 Match Stats: ${this.SITE_URL}/match-stats/${fixtureId}\n#FPL #FantasyPremierLeague #FPLCommunity`;
      return tweet;
    }

    let tweet = `🛡️ Defensive Contributions`;
    for (const { matchLine, players } of batch) {
      const section = `\n\n${matchLine}\n` + players.map(e => `${e.playerName} - ${e.dc} DC`).join('\n');
      if ((tweet + section + genericFooter).length > 280) break;
      tweet += section;
    }
    tweet += genericFooter;
    return tweet;
  }

  private formatBatchedBonusTweet(batch: Array<{ matchLine: string; fixtureId: number; entries: BonusEntry[] }>): string {
    const genericFooter = `\n\n#FPL #FantasyPremierLeague #FPLCommunity`;

    if (batch.length === 1) {
      const { matchLine, fixtureId, entries } = batch[0];
      let tweet = `🌟 Bonus Points Confirmed!\n\n${matchLine}\n`;
      for (const entry of entries) {
        const ptLabel = entry.bonus === 1 ? 'pt' : 'pts';
        tweet += `\n${entry.bonus} ${ptLabel} - ${entry.playerName}`;
      }
      tweet += `\n\n📊 Match Stats: ${this.SITE_URL}/match-stats/${fixtureId}\n#FPL #FantasyPremierLeague #FPLCommunity`;
      return tweet;
    }

    let tweet = `🌟 Bonus Points Confirmed!`;
    for (const { matchLine, entries } of batch) {
      const lines = entries.map(e => {
        const ptLabel = e.bonus === 1 ? 'pt' : 'pts';
        return `${e.bonus} ${ptLabel} - ${e.playerName}`;
      }).join('\n');
      const section = `\n\n${matchLine}\n${lines}`;
      if ((tweet + section + genericFooter).length > 280) break;
      tweet += section;
    }
    tweet += genericFooter;
    return tweet;
  }

  private async postEventTweet(tweet: string) {
    console.log(`📤 Posting tweet:\n${tweet}`);
    try {
      await twitterService.postTweet(tweet);
      console.log('✅ Tweet posted successfully');
    } catch (error) {
      console.error('❌ Failed to post tweet:', error);
    }
  }

  formatPreviewTweets(): any[] {
    const sampleCtx: MatchContext = {
      homeTeamName: 'Liverpool',
      awayTeamName: 'Arsenal',
      homeScore: 2,
      awayScore: 1,
      minute: 62,
      fixtureId: 246,
    };
    const sampleCtx2: MatchContext = {
      homeTeamName: 'Arsenal',
      awayTeamName: 'Man City',
      homeScore: 0,
      awayScore: 0,
      minute: 55,
      fixtureId: 250,
    };
    const sampleCtxFT: MatchContext = {
      homeTeamName: 'Liverpool',
      awayTeamName: 'Arsenal',
      homeScore: 2,
      awayScore: 1,
      minute: 'FT',
      fixtureId: 246,
    };

    const bonusEntries: BonusEntry[] = [
      { playerId: 1, playerName: 'Salah', bonus: 3, ownership: 42.3 },
      { playerId: 2, playerName: 'Alexander-Arnold', bonus: 2, ownership: 18.7 },
      { playerId: 3, playerName: 'Saka', bonus: 1, ownership: 28.5 },
    ];
    const updatedBonusEntries: BonusEntry[] = [
      { playerId: 1, playerName: 'Salah', bonus: 3, ownership: 42.3 },
      { playerId: 4, playerName: 'Van Dijk', bonus: 2, ownership: 15.2 },
      { playerId: 2, playerName: 'Alexander-Arnold', bonus: 1, ownership: 18.7 },
    ];

    const sampleDCPlayers: DCEntry[] = [
      { playerId: 5, playerName: 'Saliba', dc: 14, position: 'DEF', ownership: 22.1 },
      { playerId: 6, playerName: 'Gabriel', dc: 11, position: 'DEF', ownership: 15.8 },
    ];

    const sampleDCMatchLine = this.getTeamAbbr(sampleCtx2.homeTeamName) + ` ${sampleCtx2.homeScore}-${sampleCtx2.awayScore} ` + this.getTeamAbbr(sampleCtx2.awayTeamName);
    const sampleBonusMatchLine = this.getTeamAbbr(sampleCtxFT.homeTeamName) + ` ${sampleCtxFT.homeScore}-${sampleCtxFT.awayScore} ` + this.getTeamAbbr(sampleCtxFT.awayTeamName);

    const tweets = [
      { type: 'goal', tweet: this.formatGoalTweet('Salah', 42.3, 'Alexander-Arnold', 18.7, sampleCtx) },
      { type: 'red_card', tweet: this.formatRedCardTweet('Rice', 31.2, { ...sampleCtx, minute: 78 }) },
      { type: 'dc_summary', tweet: this.formatBatchedDCTweet([{ matchLine: sampleDCMatchLine, fixtureId: sampleCtx2.fixtureId, players: sampleDCPlayers }]) },
      { type: 'bonus_confirmed', tweet: this.formatBatchedBonusTweet([{ matchLine: sampleBonusMatchLine, fixtureId: sampleCtxFT.fixtureId, entries: bonusEntries }]) },
      { type: 'bonus_updated', tweet: this.formatBatchedBonusUpdateTweet([{ matchLine: sampleBonusMatchLine, fixtureId: sampleCtxFT.fixtureId, entries: updatedBonusEntries }]) },
    ];

    return tweets.map(t => ({ ...t, length: t.tweet.length }));
  }

  getStatus(): { isRunning: boolean; trackedFixtures: number; monitoredBonusFixtures: number; fixtureDetails: any[]; bonusDetails: any[] } {
    const fixtureDetails = Array.from(this.fixtureStates.values()).map(state => {
      const homeTeam = this.bootstrapTeams.get(state.homeTeamId);
      const awayTeam = this.bootstrapTeams.get(state.awayTeamId);
      return {
        fixtureId: state.fixtureId,
        match: `${homeTeam?.short_name || '?'} ${state.homeScore}-${state.awayScore} ${awayTeam?.short_name || '?'}`,
        trackedGoals: state.playerGoals.size,
        trackedAssists: state.playerAssists.size,
        trackedRedCards: state.playerRedCards.size,
        trackedDC: state.playerDC.size,
        tweetedThresholdEvents: state.tweetedEvents.size,
      };
    });

    const bonusDetails = Array.from(this.finishedFixtures.values()).map(state => {
      const homeTeam = this.bootstrapTeams.get(state.homeTeamId);
      const awayTeam = this.bootstrapTeams.get(state.awayTeamId);
      const hoursRemaining = Math.max(0, this.BONUS_MONITOR_HOURS - (Date.now() - state.finishedAt) / (60 * 60 * 1000));
      return {
        fixtureId: state.fixtureId,
        match: `${homeTeam?.short_name || '?'} ${state.homeScore}-${state.awayScore} ${awayTeam?.short_name || '?'}`,
        bonusTweeted: state.bonusTweeted,
        bonusAllocation: state.bonusAllocation,
        hoursRemaining: hoursRemaining.toFixed(1),
      };
    });

    return {
      isRunning: this.pollInterval !== null,
      trackedFixtures: this.fixtureStates.size,
      monitoredBonusFixtures: this.finishedFixtures.size,
      fixtureDetails,
      bonusDetails,
    };
  }

  private async refreshBootstrapIfNeeded() {
    const now = Date.now();
    if (now - this.lastBootstrapRefresh < this.BOOTSTRAP_REFRESH_MS && this.bootstrapPlayers.size > 0) return;

    try {
      const res = await internalFetch('api/bootstrap-static');
      if (!res.ok) return;
      const data: any = await res.json();

      this.bootstrapPlayers.clear();
      for (const p of data.elements) {
        this.bootstrapPlayers.set(p.id, {
          id: p.id,
          web_name: p.web_name,
          team: p.team,
          selected_by_percent: p.selected_by_percent,
          element_type: p.element_type,
        });
      }

      this.bootstrapTeams.clear();
      for (const t of data.teams) {
        this.bootstrapTeams.set(t.id, {
          id: t.id,
          name: t.name,
          short_name: t.short_name,
        });
      }

      this.lastBootstrapRefresh = now;
      console.log(`⚽ Bootstrap refreshed: ${this.bootstrapPlayers.size} players, ${this.bootstrapTeams.size} teams`);
    } catch (error) {
      console.error('⚽ Failed to refresh bootstrap data:', error);
    }
  }
}

export const liveGoalMonitor = new LiveGoalMonitor();
