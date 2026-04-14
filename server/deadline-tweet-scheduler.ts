import { twitterService, TEAM_ABBREVIATIONS } from './services/twitterService';
import { internalFetch } from './config';

const RANK_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
const FULL_LIST_URL = 'https://fpldilemmas.com/player-total-points';
const TRANSFER_TRACKER_URL = 'https://fpldilemmas.com/transfer-tracker';

const POSITION_ALIASES: Record<string, string[]> = {
  'FWD': ['FWD', 'Forward', 'Forwards'],
  'MID': ['MID', 'Midfielder', 'Midfielders'],
  'DEF': ['DEF', 'Defender', 'Defenders'],
  'GKP': ['GKP', 'Goalkeeper', 'Goalkeepers'],
};
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const THIRTY_MINUTES_MS = 30 * 60 * 1000;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getTeamAbbr(teamName: string): string {
  return TEAM_ABBREVIATIONS[teamName] || teamName.substring(0, 3).toUpperCase();
}

export class DeadlineTweetScheduler {
  private lastPostedGW: number | null = null;
  private lastTransferPostedGW: number | null = null;
  private scheduledTimeout: NodeJS.Timeout | null = null;
  private postDeadlineTimeout: NodeJS.Timeout | null = null;

  start(): void {
    this.scheduleNext();
  }

  private async scheduleNext(): Promise<void> {
    try {
      const bootstrapResp = await internalFetch('api/bootstrap-static');
      if (!bootstrapResp.ok) {
        console.error('⏰ Deadline tweet scheduler: failed to fetch bootstrap, retrying in 10 minutes');
        this.scheduledTimeout = setTimeout(() => this.scheduleNext(), 10 * 60 * 1000);
        return;
      }

      const bootstrap = await bootstrapResp.json();
      const now = Date.now();

      // Find the next upcoming deadline event (first event whose deadline is in the future)
      const upcomingEvents = (bootstrap.events as any[])
        .filter(e => new Date(e.deadline_time).getTime() > now)
        .sort((a, b) => new Date(a.deadline_time).getTime() - new Date(b.deadline_time).getTime());

      if (upcomingEvents.length === 0) {
        console.log('⏰ Deadline tweet scheduler: no upcoming deadlines found (season may be over)');
        return;
      }

      // Find the event to tweet for — skip any whose pre-deadline fire time is already past
      let targetEvent: any = null;
      for (const event of upcomingEvents) {
        const deadlineMs = new Date(event.deadline_time).getTime();
        const fireAt = deadlineMs - TWO_HOURS_MS;
        if (fireAt > now) {
          targetEvent = event;
          break;
        }
      }

      if (!targetEvent) {
        // We're inside the 2-hour window for the nearest deadline — skip to the one after
        targetEvent = upcomingEvents[1] || null;
        if (!targetEvent) {
          console.log('⏰ Deadline tweet scheduler: within 2h window and no next deadline found');
          return;
        }
      }

      const gwNumber: number = targetEvent.id;
      const deadlineMs = new Date(targetEvent.deadline_time).getTime();
      const fireAt = deadlineMs - TWO_HOURS_MS;
      const delayMs = fireAt - now;

      console.log(`⏰ Deadline tweet scheduler: GW${gwNumber} deadline ${targetEvent.deadline_time} — tweets fire at ${new Date(fireAt).toISOString()} (in ${Math.round(delayMs / 60000)}min)`);

      // Pre-deadline tweets (2 hours before): top 5 by position xPts
      this.scheduledTimeout = setTimeout(async () => {
        await this.postDeadlineTweets(gwNumber);
        // Re-schedule for the following deadline
        this.scheduleNext();
      }, delayMs);

      // Post-deadline tweets (30 minutes after): top transfers in/out
      const postDeadlineFireAt = deadlineMs + THIRTY_MINUTES_MS;
      const postDeadlineDelayMs = postDeadlineFireAt - now;

      if (postDeadlineDelayMs > 0) {
        console.log(`🔄 Transfer tweet scheduler: GW${gwNumber} transfer tweets fire at ${new Date(postDeadlineFireAt).toISOString()} (in ${Math.round(postDeadlineDelayMs / 60000)}min)`);
        this.postDeadlineTimeout = setTimeout(async () => {
          await this.postTransferTweets(gwNumber);
        }, postDeadlineDelayMs);
      } else {
        console.log(`🔄 Transfer tweet scheduler: GW${gwNumber} post-deadline window already passed, skipping transfer tweets`);
      }

    } catch (err) {
      console.error('⏰ Deadline tweet scheduler: error scheduling next run:', err);
      // Retry in 15 minutes on unexpected error
      this.scheduledTimeout = setTimeout(() => this.scheduleNext(), 15 * 60 * 1000);
    }
  }

  private buildPositionSection(
    players: any[],
    gwNumber: number,
    positionKey: string,
    emoji: string,
    label: string,
    topN: number
  ): { lines: string; count: number } {
    const aliases = POSITION_ALIASES[positionKey] || [positionKey];
    const top = players
      .filter(p => aliases.includes(p.position))
      .map(p => ({
        name: p.playerName || p.name,
        team: p.teamName || p.team || '',
        xPts: (p.gameweekProjections && p.gameweekProjections[gwNumber]) ?? 0,
      }))
      .filter(p => p.xPts > 0)
      .sort((a, b) => b.xPts - a.xPts)
      .slice(0, topN);

    if (top.length === 0) return { lines: '', count: 0 };

    const playerLines = top
      .map((p, idx) => `${RANK_EMOJIS[idx]} ${p.name} (${getTeamAbbr(p.team)}) — ${p.xPts.toFixed(1)}`)
      .join('\n');

    return { lines: `${emoji} Top ${label}\n${playerLines}`, count: top.length };
  }

  async postDeadlineTweets(gwNumber: number): Promise<void> {
    if (this.lastPostedGW === gwNumber) {
      console.log(`⏰ Deadline tweets for GW${gwNumber} already posted — skipping duplicate`);
      return;
    }

    console.log(`🐦 Posting deadline tweets for GW${gwNumber}...`);

    try {
      const resp = await internalFetch('api/cached/player-total-points');
      if (!resp.ok) {
        console.error(`❌ Deadline tweets: failed to fetch player projections (${resp.status})`);
        return;
      }

      const players: any[] = await resp.json();
      console.log(`📊 Deadline tweets: loaded ${players.length} players`);

      const footer = `\n\n${FULL_LIST_URL}\n\n#FPL #FantasyPremierLeague #FPLCommunity`;
      let tweetsPosted = 0;

      // Tweet 1: Forwards + Midfielders (top 3 each)
      const fwdSection = this.buildPositionSection(players, gwNumber, 'FWD', '⚽', 'Forwards', 3);
      const midSection = this.buildPositionSection(players, gwNumber, 'MID', '🎯', 'Midfielders', 3);

      if (fwdSection.count === 0 && midSection.count === 0) {
        console.warn(`⚠️ Deadline tweets: no FWD or MID data for GW${gwNumber}, skipping tweet 1`);
      } else {
        const sections = [fwdSection.lines, midSection.lines].filter(s => s).join('\n\n');
        const tweet1 = `⏰ GW${gwNumber} Deadline in 2hrs!\n\n${sections}${footer}`;
        try {
          console.log(`📤 Posting FWD+MID tweet (${tweet1.length} chars)...`);
          await twitterService.postTweet(tweet1);
          console.log(`✅ GW${gwNumber} FWD+MID tweet posted`);
          tweetsPosted++;
        } catch (err) {
          console.error(`❌ Failed to post GW${gwNumber} FWD+MID tweet:`, err);
        }
        await sleep(3000);
      }

      // Tweet 2: Defenders + Goalkeepers (top 3 each)
      const defSection = this.buildPositionSection(players, gwNumber, 'DEF', '🛡️', 'Defenders', 3);
      const gkpSection = this.buildPositionSection(players, gwNumber, 'GKP', '🧤', 'Goalkeepers', 3);

      if (defSection.count === 0 && gkpSection.count === 0) {
        console.warn(`⚠️ Deadline tweets: no DEF or GKP data for GW${gwNumber}, skipping tweet 2`);
      } else {
        const sections = [defSection.lines, gkpSection.lines].filter(s => s).join('\n\n');
        const tweet2 = `⏰ GW${gwNumber} Deadline in 2hrs!\n\n${sections}${footer}`;
        try {
          console.log(`📤 Posting DEF+GKP tweet (${tweet2.length} chars)...`);
          await twitterService.postTweet(tweet2);
          console.log(`✅ GW${gwNumber} DEF+GKP tweet posted`);
          tweetsPosted++;
        } catch (err) {
          console.error(`❌ Failed to post GW${gwNumber} DEF+GKP tweet:`, err);
        }
      }

      this.lastPostedGW = gwNumber;
      console.log(`✅ Posted ${tweetsPosted}/2 deadline tweets for GW${gwNumber}`);

    } catch (err) {
      console.error(`❌ Deadline tweet posting failed for GW${gwNumber}:`, err);
    }
  }

  async postTransferTweets(gwNumber: number): Promise<void> {
    if (this.lastTransferPostedGW === gwNumber) {
      console.log(`🔄 Transfer tweet for GW${gwNumber} already posted — skipping duplicate`);
      return;
    }

    console.log(`🔄 Posting transfer tweet for GW${gwNumber}...`);

    try {
      const bootstrapResp = await internalFetch('api/bootstrap-static');
      if (!bootstrapResp.ok) {
        console.error(`❌ Transfer tweet: failed to fetch bootstrap (${bootstrapResp.status})`);
        return;
      }

      const bootstrap = await bootstrapResp.json();

      const teamShortNames: Record<number, string> = {};
      for (const team of bootstrap.teams as any[]) {
        teamShortNames[team.id] = team.short_name;
      }

      const players: any[] = bootstrap.elements;

      const topIn = [...players]
        .filter(p => (p.transfers_in_event || 0) > 0)
        .sort((a, b) => (b.transfers_in_event || 0) - (a.transfers_in_event || 0))
        .slice(0, 5);

      const topOut = [...players]
        .filter(p => (p.transfers_out_event || 0) > 0)
        .sort((a, b) => (b.transfers_out_event || 0) - (a.transfers_out_event || 0))
        .slice(0, 5);

      if (topIn.length === 0 && topOut.length === 0) {
        console.warn(`⚠️ Transfer tweet: no transfer data available for GW${gwNumber}, skipping`);
        return;
      }

      const footer = `\n\n${TRANSFER_TRACKER_URL}\n\n#FPL #FantasyPremierLeague #FPLCommunity`;
      let body = `🔄 GW${gwNumber} Deadline Passed!`;

      // Transfers In section
      if (topIn.length > 0) {
        body += `\n\n📈 Top Transfers In`;
        for (let i = 0; i < topIn.length; i++) {
          const p = topIn[i];
          const line = `\n${RANK_EMOJIS[i]} ${p.web_name} (${teamShortNames[p.team] || '???'}) — ${(p.transfers_in_event as number).toLocaleString()}`;
          const reservedForOut = topOut.length > 0 ? `\n\n📉 Top Transfers Out` : '';
          if ((body + line + reservedForOut + footer).length > 280) break;
          body += line;
        }
      }

      // Transfers Out section
      if (topOut.length > 0) {
        const outHeader = `\n\n📉 Top Transfers Out`;
        if ((body + outHeader + footer).length <= 280) {
          body += outHeader;
          for (let i = 0; i < topOut.length; i++) {
            const p = topOut[i];
            const line = `\n${RANK_EMOJIS[i]} ${p.web_name} (${teamShortNames[p.team] || '???'}) — ${(p.transfers_out_event as number).toLocaleString()}`;
            if ((body + line + footer).length > 280) break;
            body += line;
          }
        }
      }

      const tweet = body + footer;

      try {
        console.log(`📤 Posting transfer tweet (${tweet.length} chars)...`);
        await twitterService.postTweet(tweet);
        console.log(`✅ GW${gwNumber} transfer tweet posted`);
      } catch (err) {
        console.error(`❌ Failed to post GW${gwNumber} transfer tweet:`, err);
      }

      this.lastTransferPostedGW = gwNumber;
      console.log(`✅ Transfer tweet posted for GW${gwNumber}`);

    } catch (err) {
      console.error(`❌ Transfer tweet posting failed for GW${gwNumber}:`, err);
    }
  }

  stop(): void {
    if (this.scheduledTimeout) {
      clearTimeout(this.scheduledTimeout);
      this.scheduledTimeout = null;
    }
    if (this.postDeadlineTimeout) {
      clearTimeout(this.postDeadlineTimeout);
      this.postDeadlineTimeout = null;
    }
  }
}

export const deadlineTweetScheduler = new DeadlineTweetScheduler();
