// Deadline reminders over web push. Inert unless VAPID keys are configured; sending is production-only (see
// server/index.ts) so a local dev server that shares the production database can never notify real users.
import webpush from "web-push";
import { pool } from "./db";
import { internalFetch } from "./config";
import { dueEvent, reminderMessage } from "../shared/deadline-reminders";

const CHECK_EVERY_MS = 5 * 60 * 1000;

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

      const { rows } = await pool.query(
        `SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE last_sent_gameweek IS DISTINCT FROM $1`,
        [event.id],
      );
      const payload = JSON.stringify(reminderMessage(event, now));
      let sent = 0;
      for (const row of rows) {
        try {
          await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, payload, { TTL: 3600 });
          await pool.query(`UPDATE push_subscriptions SET last_sent_gameweek = $1 WHERE id = $2`, [event.id, row.id]);
          sent++;
        } catch (error: any) {
          // 404/410: the browser unsubscribed or the subscription expired; forget it
          if (error?.statusCode === 404 || error?.statusCode === 410) {
            await pool.query(`DELETE FROM push_subscriptions WHERE id = $1`, [row.id]);
          } else {
            console.warn(`Deadline reminder failed for subscription ${row.id}:`, error?.statusCode ?? error?.message);
          }
        }
      }
      if (rows.length) console.log(`⏰ Deadline reminders for GW${event.id}: sent ${sent} of ${rows.length}`);
    } catch (error) {
      console.error("Deadline reminder check failed:", error);
    } finally {
      this.running = false;
    }
  }
}

export const deadlineReminderScheduler = new DeadlineReminderScheduler();
