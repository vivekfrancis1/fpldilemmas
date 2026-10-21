// Pure logic for deadline reminders (web push). No I/O: when a reminder is due, what it says, and which push
// endpoints we will accept. The server POSTs to a subscription's endpoint, so only real push services are allowed.

export const REMINDER_LEAD_MS = 2 * 60 * 60 * 1000;

export interface DeadlineEvent {
  id: number;
  deadline_time: string;
}

/** The earliest gameweek whose reminder window is open: from `lead` before its deadline until the deadline. */
export function dueEvent<T extends DeadlineEvent>(events: T[], nowMs: number, leadMs = REMINDER_LEAD_MS): T | null {
  let best: { event: T; deadline: number } | null = null;
  for (const event of events) {
    const deadline = new Date(event.deadline_time).getTime();
    if (!Number.isFinite(deadline)) continue;
    if (nowMs >= deadline - leadMs && nowMs < deadline && (!best || deadline < best.deadline)) best = { event, deadline };
  }
  return best?.event ?? null;
}

export function reminderMessage(event: DeadlineEvent, nowMs: number): { title: string; body: string; url: string; tag: string } {
  const minutes = Math.max(0, Math.floor((new Date(event.deadline_time).getTime() - nowMs) / 60000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return {
    title: "FPL deadline approaching",
    body: `Gameweek ${event.id} deadline in ${h > 0 ? `${h}h ${m}m` : `${m}m`}`,
    url: "/deadline-brief",
    tag: `deadline-gw${event.id}`,
  };
}

const EXACT_HOSTS = new Set([
  "fcm.googleapis.com",
  "android.googleapis.com",
  "updates.push.services.mozilla.com",
  "push.services.mozilla.com",
  "web.push.apple.com",
]);
const HOST_SUFFIXES = [".push.services.mozilla.com", ".push.apple.com", ".notify.windows.com"];

export function isAllowedPushEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) return false;
  if (url.port && url.port !== "443") return false;
  const host = url.hostname.toLowerCase();
  return EXACT_HOSTS.has(host) || HOST_SUFFIXES.some((s) => host.endsWith(s));
}

const BASE64URL = /^[A-Za-z0-9_-]+$/;

/** A browser PushSubscription JSON reduced to the three fields we store, or null if it isn't acceptable. */
export function parseSubscription(body: unknown): { endpoint: string; p256dh: string; auth: string } | null {
  if (!body || typeof body !== "object") return null;
  const { endpoint, keys } = body as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  if (typeof endpoint !== "string" || endpoint.length > 2048 || !isAllowedPushEndpoint(endpoint)) return null;
  const p256dh = keys?.p256dh;
  const auth = keys?.auth;
  if (typeof p256dh !== "string" || typeof auth !== "string") return null;
  if (!BASE64URL.test(p256dh) || p256dh.length > 200 || !BASE64URL.test(auth) || auth.length > 50) return null;
  return { endpoint, p256dh, auth };
}

/** VAPID public keys arrive base64url-encoded; PushManager.subscribe wants raw bytes. */
export function base64UrlToBytes(input: string): Uint8Array<ArrayBuffer> {
  const padded = (input + "=".repeat((4 - (input.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}
