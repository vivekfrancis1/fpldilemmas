import { twitterService, TEAM_ABBREVIATIONS } from './services/twitterService';
import { internalFetch } from './config';

const POSITION_CONFIG: Array<{
  key: string;
  label: string;
  emoji: string;
  plural: string;
}> = [
  { key: 'GKP', label: 'Goalkeeper', emoji: '🧤', plural: 'Goalkeepers' },
  { key: 'DEF', label: 'Defender',   emoji: '🛡️', plural: 'Defenders'   },
  { key: 'MID', label: 'Midfielder', emoji: '🎯', plural: 'Midfielders' },
  { key: 'FWD', label: 'Forward',    emoji: '⚽', plural: 'Forwards'    },
];

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

      for (let i = 0; i < POSITION_CONFIG.length; i++) {
        const pos = POSITION_CONFIG[i];

        const top5 = players
          .filter(p => p.position === pos.key)
          .map(p => ({
            name: p.playerName || p.name,
            team: p.teamName || p.team || '',
            xPts: (p.gameweekProjections && p.gameweekProjections[gwNumber]) ?? 0,
          }))
          .filter(p => p.xPts > 0)
          .sort((a, b) => b.xPts - a.xPts)
          .slice(0, 5);

        if (top5.length === 0) {
          console.warn(`⚠️ Deadline tweets: no ${pos.plural} data for GW${gwNumber}, skipping`);
          continue;
        }

        const playerLines = top5
          .map((p, idx) => `${RANK_EMOJIS[idx]} ${p.name} (${getTeamAbbr(p.team)}) — ${p.xPts.toFixed(1)}`)
          .join('\n');

        const tweet =
          `⏰ GW${gwNumber} Deadline in 2hrs!\n\n` +
          `${pos.emoji} Top ${pos.plural} by xPts\n\n` +
          `${playerLines}\n\n` +
          `Full list 👉 ${FULL_LIST_URL}\n` +
          `#FPL #FantasyPremierLeague`;

        try {
          console.log(`📤 Posting ${pos.plural} tweet (${tweet.length} chars)...`);
          await twitterService.postTweet(tweet);
          console.log(`✅ GW${gwNumber} ${pos.plural} tweet posted`);
        } catch (err) {
          console.error(`❌ Failed to post GW${gwNumber} ${pos.plural} tweet:`, err);
        }

        // 3-second gap between tweets to avoid rate limits (except after last)
        if (i < POSITION_CONFIG.length - 1) {
          await sleep(3000);
        }
      }

      this.lastPostedGW = gwNumber;
      console.log(`✅ All deadline tweets posted for GW${gwNumber}`);

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
          `#FPL #FantasyPremierLeague`;

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
          `#FPL #FantasyPremierLeague`;

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
