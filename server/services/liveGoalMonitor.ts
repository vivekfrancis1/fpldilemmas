import { twitterService } from './twitterService';

interface FixtureState {
  fixtureId: number;
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number;
  awayScore: number;
  playerGoals: Map<number, number>;
  playerAssists: Map<number, number>;
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
  private readonly SITE_URL = 'https://fpldilemmas.com';

  start() {
    console.log('⚽ Live goal monitor starting...');
    console.log(`📋 Will tweet goals when scorer or assister has >${this.OWNERSHIP_THRESHOLD}% ownership`);

    this.poll();
    this.pollInterval = setInterval(() => this.poll(), this.POLL_INTERVAL_MS);
  }

  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      console.log('⏹️ Live goal monitor stopped');
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
      console.error('⚽ Live goal monitor poll error:', error);
    } finally {
      this.isPolling = false;
    }
  }

  private async processFixture(fixture: any, liveData: any) {
    const fixtureId = fixture.id;
    const homeScore = fixture.team_h_score ?? 0;
    const awayScore = fixture.team_a_score ?? 0;

    const currentPlayerGoals = new Map<number, number>();
    const currentPlayerAssists = new Map<number, number>();

    if (liveData?.elements) {
      for (const el of liveData.elements) {
        const playerInfo = this.bootstrapPlayers.get(el.id);
        if (!playerInfo) continue;
        if (playerInfo.team !== fixture.team_h && playerInfo.team !== fixture.team_a) continue;

        const fixtureExplain = el.explain?.find((ex: any) => ex.fixture === fixtureId);
        if (!fixtureExplain) continue;

        for (const stat of fixtureExplain.stats || []) {
          if (stat.identifier === 'goals_scored' && stat.points > 0) {
            currentPlayerGoals.set(el.id, stat.value);
          }
          if (stat.identifier === 'assists' && stat.points > 0) {
            currentPlayerAssists.set(el.id, stat.value);
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
      });
      return;
    }

    const totalScoreBefore = prevState.homeScore + prevState.awayScore;
    const totalScoreNow = homeScore + awayScore;

    if (totalScoreNow > totalScoreBefore) {
      const newGoalScorers = this.findNewGoalScorers(prevState.playerGoals, currentPlayerGoals);
      const newAssistProviders = this.findNewAssistProviders(prevState.playerAssists, currentPlayerAssists);
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
          const homeTeam = this.bootstrapTeams.get(fixture.team_h);
          const awayTeam = this.bootstrapTeams.get(fixture.team_a);
          const minute = fixture.minutes ?? '?';

          await this.postGoalTweet({
            scorerName: scorer.web_name,
            scorerOwnership,
            assistName: assistProvider?.web_name,
            assistOwnership: assistProvider ? assistOwnership : undefined,
            homeTeamName: homeTeam?.name || 'Home',
            awayTeamName: awayTeam?.name || 'Away',
            homeScore,
            awayScore,
            minute,
            fixtureId,
          });
        } else {
          console.log(`⚽ Goal by ${scorer.web_name} (${scorerOwnership}%) skipped - below ${this.OWNERSHIP_THRESHOLD}% threshold`);
        }
      }
    }

    prevState.homeScore = homeScore;
    prevState.awayScore = awayScore;
    prevState.playerGoals = currentPlayerGoals;
    prevState.playerAssists = currentPlayerAssists;
  }

  private findNewGoalScorers(prev: Map<number, number>, current: Map<number, number>): number[] {
    const newScorers: number[] = [];
    const entries = Array.from(current.entries());
    for (const [playerId, goals] of entries) {
      const prevGoals = prev.get(playerId) || 0;
      if (goals > prevGoals) {
        for (let i = 0; i < goals - prevGoals; i++) {
          newScorers.push(playerId);
        }
      }
    }
    return newScorers;
  }

  private findNewAssistProviders(prev: Map<number, number>, current: Map<number, number>): number[] {
    const newAssists: number[] = [];
    const entries = Array.from(current.entries());
    for (const [playerId, assists] of entries) {
      const prevAssists = prev.get(playerId) || 0;
      if (assists > prevAssists) {
        for (let i = 0; i < assists - prevAssists; i++) {
          newAssists.push(playerId);
        }
      }
    }
    return newAssists;
  }

  private async postGoalTweet(data: {
    scorerName: string;
    scorerOwnership: number;
    assistName?: string;
    assistOwnership?: number;
    homeTeamName: string;
    awayTeamName: string;
    homeScore: number;
    awayScore: number;
    minute: number | string;
    fixtureId: number;
  }) {
    const homeAbbr = TEAM_ABBREVIATIONS[data.homeTeamName] || data.homeTeamName.substring(0, 3).toUpperCase();
    const awayAbbr = TEAM_ABBREVIATIONS[data.awayTeamName] || data.awayTeamName.substring(0, 3).toUpperCase();

    let tweet = `⚽ GOAL! ${data.scorerName} (${data.minute}') [${data.scorerOwnership.toFixed(1)}% owned]`;

    if (data.assistName) {
      tweet += `\n🅰️ Assist: ${data.assistName}`;
      if (data.assistOwnership !== undefined) {
        tweet += ` [${data.assistOwnership.toFixed(1)}% owned]`;
      }
    }

    tweet += `\n\n${homeAbbr} ${data.homeScore}-${data.awayScore} ${awayAbbr}`;
    tweet += `\n\n📊 Match Stats: ${this.SITE_URL}/match-stats/${data.fixtureId}`;
    tweet += `\n#FPL #FantasyPremierLeague`;

    console.log(`📤 Posting goal tweet:\n${tweet}`);

    try {
      await twitterService.postTweet(tweet);
      console.log('✅ Goal tweet posted successfully');
    } catch (error) {
      console.error('❌ Failed to post goal tweet:', error);
    }
  }

  formatGoalTweetPreview(data: {
    scorerName: string;
    scorerOwnership: number;
    assistName?: string;
    assistOwnership?: number;
    homeTeamName: string;
    awayTeamName: string;
    homeScore: number;
    awayScore: number;
    minute: number | string;
    fixtureId: number;
  }): string {
    const homeAbbr = TEAM_ABBREVIATIONS[data.homeTeamName] || data.homeTeamName.substring(0, 3).toUpperCase();
    const awayAbbr = TEAM_ABBREVIATIONS[data.awayTeamName] || data.awayTeamName.substring(0, 3).toUpperCase();

    let tweet = `⚽ GOAL! ${data.scorerName} (${data.minute}') [${data.scorerOwnership.toFixed(1)}% owned]`;

    if (data.assistName) {
      tweet += `\n🅰️ Assist: ${data.assistName}`;
      if (data.assistOwnership !== undefined) {
        tweet += ` [${data.assistOwnership.toFixed(1)}% owned]`;
      }
    }

    tweet += `\n\n${homeAbbr} ${data.homeScore}-${data.awayScore} ${awayAbbr}`;
    tweet += `\n\n📊 Match Stats: ${this.SITE_URL}/match-stats/${data.fixtureId}`;
    tweet += `\n#FPL #FantasyPremierLeague`;

    return tweet;
  }

  getStatus(): { isRunning: boolean; trackedFixtures: number; fixtureDetails: any[] } {
    const fixtureDetails = Array.from(this.fixtureStates.values()).map(state => {
      const homeTeam = this.bootstrapTeams.get(state.homeTeamId);
      const awayTeam = this.bootstrapTeams.get(state.awayTeamId);
      return {
        fixtureId: state.fixtureId,
        match: `${homeTeam?.short_name || '?'} ${state.homeScore}-${state.awayScore} ${awayTeam?.short_name || '?'}`,
        trackedGoals: Array.from(state.playerGoals.entries()).length,
        trackedAssists: Array.from(state.playerAssists.entries()).length,
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
