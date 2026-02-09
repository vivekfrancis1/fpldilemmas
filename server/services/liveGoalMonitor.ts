import { twitterService } from './twitterService';

interface FixtureState {
  fixtureId: number;
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number;
  awayScore: number;
  playerGoals: Map<number, number>;
  playerAssists: Map<number, number>;
  playerYellowCards: Map<number, number>;
  playerRedCards: Map<number, number>;
  playerSaves: Map<number, number>;
  playerDC: Map<number, number>;
  tweetedEvents: Set<string>;
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
  private isPolling = false;
  private bootstrapPlayers: Map<number, BootstrapPlayer> = new Map();
  private bootstrapTeams: Map<number, BootstrapTeam> = new Map();
  private lastBootstrapRefresh = 0;
  private readonly POLL_INTERVAL_MS = 60_000;
  private readonly BOOTSTRAP_REFRESH_MS = 10 * 60_000;
  private readonly OWNERSHIP_THRESHOLD = 5.0;
  private readonly SAVES_THRESHOLD = 3;
  private readonly SITE_URL = 'https://fpldilemmas.com';

  start() {
    console.log('⚽ Live match monitor starting...');
    console.log(`📋 Will tweet events when player has >${this.OWNERSHIP_THRESHOLD}% ownership`);
    console.log(`📋 Tracking: goals, assists, yellow cards, red cards, saves (${this.SAVES_THRESHOLD}+), defensive contributions`);

    this.poll();
    this.pollInterval = setInterval(() => this.poll(), this.POLL_INTERVAL_MS);
  }

  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      console.log('⏹️ Live match monitor stopped');
    }
  }

  private async poll() {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      await this.refreshBootstrapIfNeeded();

      const fixturesRes = await fetch('https://fantasy.premierleague.com/api/fixtures/', {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FPL-Analytics/1.0)', Accept: 'application/json' }
      });
      if (!fixturesRes.ok) return;
      const fixtures: any[] = await fixturesRes.json();

      const liveFixtures = fixtures.filter((f: any) => f.started && !f.finished_provisional);

      if (liveFixtures.length === 0) {
        if (this.fixtureStates.size > 0) {
          console.log('⚽ No live matches, clearing state');
          this.fixtureStates.clear();
        }
        return;
      }

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
          await this.processFixture(fixture, liveData);
        }
      }

      const liveIds = new Set(liveFixtures.map((f: any) => f.id));
      for (const id of Array.from(this.fixtureStates.keys())) {
        if (!liveIds.has(id)) {
          this.fixtureStates.delete(id);
        }
      }
    } catch (error) {
      console.error('⚽ Live match monitor poll error:', error);
    } finally {
      this.isPolling = false;
    }
  }

  private async processFixture(fixture: any, liveData: any) {
    const fixtureId = fixture.id;
    const homeScore = fixture.team_h_score ?? 0;
    const awayScore = fixture.team_a_score ?? 0;
    const minute = fixture.minutes ?? '?';

    const currentPlayerGoals = new Map<number, number>();
    const currentPlayerAssists = new Map<number, number>();
    const currentPlayerYellowCards = new Map<number, number>();
    const currentPlayerRedCards = new Map<number, number>();
    const currentPlayerSaves = new Map<number, number>();
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
          if (stat.identifier === 'yellow_cards' && stat.value > 0) {
            currentPlayerYellowCards.set(el.id, stat.value);
          }
          if (stat.identifier === 'red_cards' && stat.value > 0) {
            currentPlayerRedCards.set(el.id, stat.value);
          }
          if (stat.identifier === 'saves' && stat.value > 0) {
            currentPlayerSaves.set(el.id, stat.value);
          }
        }

        const elStats = el.stats;
        if (elStats) {
          const cbi = elStats.clearances_blocks_interceptions || 0;
          const tackles = elStats.tackles || 0;
          const recoveries = elStats.recoveries || 0;
          const pos = POSITION_MAP[playerInfo.element_type] || 'MID';
          const dc = (pos === 'GKP' || pos === 'DEF')
            ? cbi + tackles
            : cbi + tackles + recoveries;
          if (dc > 0) {
            currentPlayerDC.set(el.id, dc);
          }
        }
      }
    }

    const prevState = this.fixtureStates.get(fixtureId);

    if (!prevState) {
      this.fixtureStates.set(fixtureId, {
        fixtureId,
        homeTeamId: fixture.team_h,
        awayTeamId: fixture.team_a,
        homeScore,
        awayScore,
        playerGoals: currentPlayerGoals,
        playerAssists: currentPlayerAssists,
        playerYellowCards: currentPlayerYellowCards,
        playerRedCards: currentPlayerRedCards,
        playerSaves: currentPlayerSaves,
        playerDC: currentPlayerDC,
        tweetedEvents: new Set(),
      });
      return;
    }

    const matchCtx: MatchContext = {
      homeTeamName: this.bootstrapTeams.get(fixture.team_h)?.name || 'Home',
      awayTeamName: this.bootstrapTeams.get(fixture.team_a)?.name || 'Away',
      homeScore,
      awayScore,
      minute,
      fixtureId,
    };

    const totalScoreBefore = prevState.homeScore + prevState.awayScore;
    const totalScoreNow = homeScore + awayScore;

    if (totalScoreNow > totalScoreBefore) {
      const newGoalScorers = this.findNewEntries(prevState.playerGoals, currentPlayerGoals);
      const newAssistProviders = this.findNewEntries(prevState.playerAssists, currentPlayerAssists);
      const safeAssistAttribution = newGoalScorers.length === 1 && newAssistProviders.length === 1;

      for (const scorerId of newGoalScorers) {
        const scorer = this.bootstrapPlayers.get(scorerId);
        if (!scorer) continue;

        let assistProvider: BootstrapPlayer | undefined;
        if (safeAssistAttribution && newAssistProviders.length > 0) {
          assistProvider = this.bootstrapPlayers.get(newAssistProviders.shift()!);
        }

        const scorerOwnership = parseFloat(scorer.selected_by_percent);
        const assistOwnership = assistProvider ? parseFloat(assistProvider.selected_by_percent) : 0;

        if (scorerOwnership > this.OWNERSHIP_THRESHOLD || assistOwnership > this.OWNERSHIP_THRESHOLD) {
          await this.postEventTweet(this.formatGoalTweet(
            scorer.web_name, scorerOwnership,
            assistProvider?.web_name, assistProvider ? assistOwnership : undefined,
            matchCtx
          ));
        } else {
          console.log(`⚽ Goal by ${scorer.web_name} (${scorerOwnership}%) skipped - below threshold`);
        }
      }
    }

    const newYellowCards = this.findNewEntries(prevState.playerYellowCards, currentPlayerYellowCards);
    for (const playerId of newYellowCards) {
      const player = this.bootstrapPlayers.get(playerId);
      if (!player) continue;
      const ownership = parseFloat(player.selected_by_percent);
      if (ownership > this.OWNERSHIP_THRESHOLD) {
        await this.postEventTweet(this.formatYellowCardTweet(player.web_name, ownership, matchCtx));
      }
    }

    const newRedCards = this.findNewEntries(prevState.playerRedCards, currentPlayerRedCards);
    for (const playerId of newRedCards) {
      const player = this.bootstrapPlayers.get(playerId);
      if (!player) continue;
      const ownership = parseFloat(player.selected_by_percent);
      if (ownership > this.OWNERSHIP_THRESHOLD) {
        await this.postEventTweet(this.formatRedCardTweet(player.web_name, ownership, matchCtx));
      }
    }

    const saveEntries = Array.from(currentPlayerSaves.entries());
    for (const [playerId, saves] of saveEntries) {
      const prevSaves = prevState.playerSaves.get(playerId) || 0;
      const eventKey = `saves_${fixtureId}_${playerId}`;
      if (saves >= this.SAVES_THRESHOLD && prevSaves < this.SAVES_THRESHOLD && !prevState.tweetedEvents.has(eventKey)) {
        const player = this.bootstrapPlayers.get(playerId);
        if (!player) continue;
        const ownership = parseFloat(player.selected_by_percent);
        if (ownership > this.OWNERSHIP_THRESHOLD) {
          await this.postEventTweet(this.formatSavesTweet(player.web_name, ownership, saves, matchCtx));
          prevState.tweetedEvents.add(eventKey);
        }
      }
    }

    const dcEntries = Array.from(currentPlayerDC.entries());
    for (const [playerId, dc] of dcEntries) {
      const player = this.bootstrapPlayers.get(playerId);
      if (!player) continue;
      const pos = POSITION_MAP[player.element_type] || 'MID';
      const threshold = (pos === 'DEF' || pos === 'GKP') ? 10 : 12;
      const prevDC = prevState.playerDC.get(playerId) || 0;
      const eventKey = `dc_${fixtureId}_${playerId}`;
      if (dc >= threshold && prevDC < threshold && !prevState.tweetedEvents.has(eventKey)) {
        const ownership = parseFloat(player.selected_by_percent);
        if (ownership > this.OWNERSHIP_THRESHOLD) {
          await this.postEventTweet(this.formatDCTweet(player.web_name, ownership, dc, pos, matchCtx));
          prevState.tweetedEvents.add(eventKey);
        }
      }
    }

    prevState.homeScore = homeScore;
    prevState.awayScore = awayScore;
    prevState.playerGoals = currentPlayerGoals;
    prevState.playerAssists = currentPlayerAssists;
    prevState.playerYellowCards = currentPlayerYellowCards;
    prevState.playerRedCards = currentPlayerRedCards;
    prevState.playerSaves = currentPlayerSaves;
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
    return `\n\n📊 Match Stats: ${this.SITE_URL}/match-stats/${ctx.fixtureId}\n#FPL #FantasyPremierLeague`;
  }

  private formatGoalTweet(
    scorerName: string, scorerOwnership: number,
    assistName: string | undefined, assistOwnership: number | undefined,
    ctx: MatchContext
  ): string {
    let tweet = `⚽ GOAL! ${scorerName} (${ctx.minute}') [${scorerOwnership.toFixed(1)}% owned]`;
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

  private formatYellowCardTweet(playerName: string, ownership: number, ctx: MatchContext): string {
    let tweet = `🟨 Yellow Card! ${playerName} (${ctx.minute}') [${ownership.toFixed(1)}% owned]`;
    tweet += `\n\n${this.matchLine(ctx)}`;
    tweet += this.footer(ctx);
    return tweet;
  }

  private formatRedCardTweet(playerName: string, ownership: number, ctx: MatchContext): string {
    let tweet = `🟥 Red Card! ${playerName} (${ctx.minute}') [${ownership.toFixed(1)}% owned]`;
    tweet += `\n\n${this.matchLine(ctx)}`;
    tweet += this.footer(ctx);
    return tweet;
  }

  private formatSavesTweet(playerName: string, ownership: number, saves: number, ctx: MatchContext): string {
    let tweet = `🧤 Save Points! ${playerName} - ${saves} saves (${ctx.minute}') [${ownership.toFixed(1)}% owned]`;
    tweet += `\n\n${this.matchLine(ctx)}`;
    tweet += this.footer(ctx);
    return tweet;
  }

  private formatDCTweet(playerName: string, ownership: number, dc: number, position: string, ctx: MatchContext): string {
    let tweet = `🛡️ Defensive Contribution Points! ${playerName} - ${dc} DC (${ctx.minute}') [${ownership.toFixed(1)}% owned]`;
    tweet += `\n\n${this.matchLine(ctx)}`;
    tweet += this.footer(ctx);
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

    const tweets = [
      { type: 'goal', tweet: this.formatGoalTweet('Salah', 42.3, 'Alexander-Arnold', 18.7, sampleCtx) },
      { type: 'yellow_card', tweet: this.formatYellowCardTweet('Salah', 42.3, { ...sampleCtx, minute: 67 }) },
      { type: 'red_card', tweet: this.formatRedCardTweet('Rice', 31.2, { ...sampleCtx, minute: 78 }) },
      { type: 'saves', tweet: this.formatSavesTweet('Raya', 18.5, 3, sampleCtx2) },
      { type: 'defensive_contribution', tweet: this.formatDCTweet('Saliba', 22.1, 12, 'DEF', { ...sampleCtx2, minute: 82 }) },
    ];

    return tweets.map(t => ({ ...t, length: t.tweet.length }));
  }

  getStatus(): { isRunning: boolean; trackedFixtures: number; fixtureDetails: any[] } {
    const fixtureDetails = Array.from(this.fixtureStates.values()).map(state => {
      const homeTeam = this.bootstrapTeams.get(state.homeTeamId);
      const awayTeam = this.bootstrapTeams.get(state.awayTeamId);
      return {
        fixtureId: state.fixtureId,
        match: `${homeTeam?.short_name || '?'} ${state.homeScore}-${state.awayScore} ${awayTeam?.short_name || '?'}`,
        trackedGoals: state.playerGoals.size,
        trackedAssists: state.playerAssists.size,
        trackedYellowCards: state.playerYellowCards.size,
        trackedRedCards: state.playerRedCards.size,
        trackedSaves: state.playerSaves.size,
        trackedDC: state.playerDC.size,
        tweetedThresholdEvents: state.tweetedEvents.size,
      };
    });

    return {
      isRunning: this.pollInterval !== null,
      trackedFixtures: this.fixtureStates.size,
      fixtureDetails,
    };
  }

  private async refreshBootstrapIfNeeded() {
    const now = Date.now();
    if (now - this.lastBootstrapRefresh < this.BOOTSTRAP_REFRESH_MS && this.bootstrapPlayers.size > 0) return;

    try {
      const res = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/', {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FPL-Analytics/1.0)', Accept: 'application/json' }
      });
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
