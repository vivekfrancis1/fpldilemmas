import { twitterService, TEAM_ABBREVIATIONS } from './services/twitterService';
import { internalFetch } from './config';

const RANK_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
const FULL_LIST_URL = 'https://fpldilemmas.com/player-total-points';
const TRANSFER_TRACKER_URL = 'https://fpldilemmas.com/transfer-tracker';
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
    const top = players
      .filter(p => p.position === positionKey)
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

      const footer = `\n\nFull list 👉 ${FULL_LIST_URL}\n#FPL #FantasyPremierLeague #FPLCommunity`;
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
      console.log(`🔄 Transfer tweets for GW${gwNumber} already posted — skipping duplicate`);
      return;
    }

    console.log(`🔄 Posting transfer tweets for GW${gwNumber}...`);

    try {
      const bootstrapResp = await internalFetch('api/bootstrap-static');
      if (!bootstrapResp.ok) {
        console.error(`❌ Transfer tweets: failed to fetch bootstrap (${bootstrapResp.status})`);
        return;
      }

      const bootstrap = await bootstrapResp.json();

      // Build teamId → short_name map directly from bootstrap
      const teamShortNames: Record<number, string> = {};
      for (const team of bootstrap.teams as any[]) {
        teamShortNames[team.id] = team.short_name;
      }

      const players: any[] = bootstrap.elements;

      // Top 5 transfers in
      const topIn = [...players]
        .filter(p => (p.transfers_in_event || 0) > 0)
        .sort((a, b) => (b.transfers_in_event || 0) - (a.transfers_in_event || 0))
        .slice(0, 5);

      // Top 5 transfers out
      const topOut = [...players]
        .filter(p => (p.transfers_out_event || 0) > 0)
        .sort((a, b) => (b.transfers_out_event || 0) - (a.transfers_out_event || 0))
        .slice(0, 5);

      if (topIn.length === 0 && topOut.length === 0) {
        console.warn(`⚠️ Transfer tweets: no transfer data available for GW${gwNumber}, skipping`);
        return;
      }

      // Tweet 1: Transfers In
      if (topIn.length > 0) {
        const inLines = topIn
          .map((p, idx) => `${RANK_EMOJIS[idx]} ${p.web_name} (${teamShortNames[p.team] || '???'}) — ${(p.transfers_in_event as number).toLocaleString()}`)
          .join('\n');

        const tweetIn =
          `🔄 GW${gwNumber} Deadline Passed!\n\n` +
          `📈 Top Transfers In\n\n` +
          `${inLines}\n\n` +
          `Full list 👉 ${TRANSFER_TRACKER_URL}\n` +
          `#FPL #FantasyPremierLeague #FPLCommunity`;

        try {
          console.log(`📤 Posting transfers-in tweet (${tweetIn.length} chars)...`);
          await twitterService.postTweet(tweetIn);
          console.log(`✅ GW${gwNumber} transfers-in tweet posted`);
        } catch (err) {
          console.error(`❌ Failed to post GW${gwNumber} transfers-in tweet:`, err);
        }

        await sleep(3000);
      }

      // Tweet 2: Transfers Out
      if (topOut.length > 0) {
        const outLines = topOut
          .map((p, idx) => `${RANK_EMOJIS[idx]} ${p.web_name} (${teamShortNames[p.team] || '???'}) — ${(p.transfers_out_event as number).toLocaleString()}`)
          .join('\n');

        const tweetOut =
          `📉 GW${gwNumber} Top Transfers Out\n\n` +
          `${outLines}\n\n` +
          `Full list 👉 ${TRANSFER_TRACKER_URL}\n` +
          `#FPL #FantasyPremierLeague #FPLCommunity`;

        try {
          console.log(`📤 Posting transfers-out tweet (${tweetOut.length} chars)...`);
          await twitterService.postTweet(tweetOut);
          console.log(`✅ GW${gwNumber} transfers-out tweet posted`);
        } catch (err) {
          console.error(`❌ Failed to post GW${gwNumber} transfers-out tweet:`, err);
        }
      }

      this.lastTransferPostedGW = gwNumber;
      console.log(`✅ All transfer tweets posted for GW${gwNumber}`);

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
