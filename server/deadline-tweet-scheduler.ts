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
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getTeamAbbr(teamName: string): string {
  return TEAM_ABBREVIATIONS[teamName] || teamName.substring(0, 3).toUpperCase();
}

export class DeadlineTweetScheduler {
  private lastPostedGW: number | null = null;
  private scheduledTimeout: NodeJS.Timeout | null = null;

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

      // Find the event to tweet for — skip any whose fire time is already past
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

      this.scheduledTimeout = setTimeout(async () => {
        await this.postDeadlineTweets(gwNumber);
        // Re-schedule for the following deadline
        this.scheduleNext();
      }, delayMs);

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

  stop(): void {
    if (this.scheduledTimeout) {
      clearTimeout(this.scheduledTimeout);
      this.scheduledTimeout = null;
    }
  }
}

export const deadlineTweetScheduler = new DeadlineTweetScheduler();
