// Deadline reminders over web push. Inert unless VAPID keys are configured; sending is production-only (see
// server/index.ts) so a local dev server that shares the production database can never notify real users.
import webpush from "web-push";
import { pool } from "./db";
import { internalFetch } from "./config";
import { dueEvent, reminderMessage, classifySendError } from "../shared/deadline-reminders";

const CHECK_EVERY_MS = 5 * 60 * 1000;
const PAGE_SIZE = 500; // subscriptions loaded per query
const SEND_CONCURRENCY = 25; // pushes in flight at once

export const pushConfigured = (): boolean =>
  !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);

export async function saveSubscription(sub: { endpoint: string; p256dh: string; auth: string }): Promise<void> {
  await pool.query(
    `INSERT INTO push_subscriptions (endpoint, p256dh, auth) VALUES ($1, $2, $3)
     ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
    [sub.endpoint, sub.p256dh, sub.auth],
  );
}

/** Hard cap on stored subscriptions so the table cannot be filled by abuse. */
export const MAX_SUBSCRIPTIONS = 50_000;

export async function countSubscriptions(): Promise<number> {
  const { rows } = await pool.query(`SELECT count(*)::int AS n FROM push_subscriptions`);
  return rows[0]?.n ?? 0;
}

export async function removeSubscription(endpoint: string): Promise<void> {
  await pool.query(`DELETE FROM push_subscriptions WHERE endpoint = $1`, [endpoint]);
}

class DeadlineReminderScheduler {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  start(): void {
    if (!pushConfigured() || this.timer) return;
    webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
    this.timer = setInterval(() => void this.tick(), CHECK_EVERY_MS);
    setTimeout(() => void this.tick(), 60 * 1000);
  }

  // Sends each subscriber at most one reminder per gameweek: last_sent_gameweek is recorded after a successful send,
  // so restarts and overlapping checks cannot double-send.
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const response = await internalFetch("api/bootstrap-static");
      if (!response.ok) return;
      const bootstrap = await response.json();
      const now = Date.now();
      const event = dueEvent(bootstrap.events as Array<{ id: number; deadline_time: string }>, now);
      if (!event) return;

      const payload = JSON.stringify(reminderMessage(event, now));
      const counts = { sent: 0, gone: 0, permanent: 0, retry: 0 };

      const sendOne = async (row: { id: number; endpoint: string; p256dh: string; auth: string }) => {
        try {
          await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, payload, { TTL: 3600 });
          await pool.query(`UPDATE push_subscriptions SET last_sent_gameweek = $1 WHERE id = $2`, [event.id, row.id]);
          counts.sent++;
        } catch (error: any) {
          const kind = classifySendError(error?.statusCode);
          counts[kind]++;
          if (kind === "gone") {
            // the browser unsubscribed or the subscription expired; forget it
            await pool.query(`DELETE FROM push_subscriptions WHERE id = $1`, [row.id]);
          } else if (kind === "permanent") {
            // retrying cannot help (bad request / auth / payload): stop for this gameweek instead of retrying every check
            await pool.query(`UPDATE push_subscriptions SET last_sent_gameweek = $1 WHERE id = $2`, [event.id, row.id]);
          }
        }
      };

      // Keyset pages (id > lastId) so memory stays bounded however many subscribers there are, and sends run in parallel
      // batches so a large list finishes well inside the two-hour window.
      let lastId = 0;
      for (;;) {
        const { rows } = await pool.query(
          `SELECT id, endpoint, p256dh, auth FROM push_subscriptions
           WHERE last_sent_gameweek IS DISTINCT FROM $1 AND id > $2 ORDER BY id LIMIT $3`,
          [event.id, lastId, PAGE_SIZE],
        );
        if (rows.length === 0) break;
        for (let i = 0; i < rows.length; i += SEND_CONCURRENCY) {
          await Promise.all(rows.slice(i, i + SEND_CONCURRENCY).map(sendOne));
        }
        lastId = rows[rows.length - 1].id;
      }
      const total = counts.sent + counts.gone + counts.permanent + counts.retry;
      if (total > 0) {
        console.log(`⏰ Deadline reminders for GW${event.id}: sent ${counts.sent}, gone ${counts.gone}, failed permanently ${counts.permanent}, will retry ${counts.retry}`);
      }
    } catch (error) {
      console.error("Deadline reminder check failed:", error);
    } finally {
      this.running = false;
    }
  }
}

export const deadlineReminderScheduler = new DeadlineReminderScheduler();
