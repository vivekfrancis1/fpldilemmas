import { describe, it, expect } from "vitest";
import { dueEvent, reminderMessage, isAllowedPushEndpoint, parseSubscription, REMINDER_LEAD_MS, base64UrlToBytes } from "../shared/deadline-reminders";

const H = 60 * 60 * 1000;
const at = (iso: string) => new Date(iso).getTime();
const events = [
  { id: 8, deadline_time: "2026-10-23T17:30:00Z" },
  { id: 9, deadline_time: "2026-10-30T17:30:00Z" },
];

describe("dueEvent (a reminder is due from 2 hours before a deadline until the deadline)", () => {
  it("is not due before the window opens", () => {
    expect(dueEvent(events, at("2026-10-23T15:29:59Z"))).toBeNull();
  });

  it("is due exactly when the window opens and any time until the deadline", () => {
    expect(dueEvent(events, at("2026-10-23T15:30:00Z"))?.id).toBe(8);
    expect(dueEvent(events, at("2026-10-23T17:29:59Z"))?.id).toBe(8);
  });

  it("is not due at or after the deadline", () => {
    expect(dueEvent(events, at("2026-10-23T17:30:00Z"))).toBeNull();
    expect(dueEvent(events, at("2026-10-24T09:00:00Z"))).toBeNull();
  });

  it("the lead time is two hours", () => {
    expect(REMINDER_LEAD_MS).toBe(2 * H);
  });

  it("picks the earliest due event and ignores events with bad dates", () => {
    const messy = [{ id: 1, deadline_time: "not a date" }, ...events];
    expect(dueEvent(messy, at("2026-10-23T16:00:00Z"))?.id).toBe(8);
  });

  it("returns null for no events", () => {
    expect(dueEvent([], Date.now())).toBeNull();
  });
});

describe("reminderMessage", () => {
  const ev = events[0];

  it("says how long is left in hours and minutes and links to the Brief", () => {
    const m = reminderMessage(ev, at("2026-10-23T15:32:00Z"));
    expect(m.title).toBe("FPL deadline approaching");
    expect(m.body).toBe("Gameweek 8 deadline in 1h 58m");
    expect(m.url).toBe("/deadline-brief");
    expect(m.tag).toBe("deadline-gw8");
  });

  it("under an hour shows minutes only; never negative", () => {
    expect(reminderMessage(ev, at("2026-10-23T16:45:00Z")).body).toBe("Gameweek 8 deadline in 45m");
    expect(reminderMessage(ev, at("2026-10-23T18:00:00Z")).body).toBe("Gameweek 8 deadline in 0m");
  });
});

describe("isAllowedPushEndpoint (the server posts to this URL, so only real push services are accepted)", () => {
  it("allows the major push services over https", () => {
    for (const u of [
      "https://fcm.googleapis.com/fcm/send/abc",
      "https://updates.push.services.mozilla.com/wpush/v2/abc",
      "https://web.push.apple.com/abc",
      "https://wns2-par02p.notify.windows.com/w/?token=abc",
    ]) expect(isAllowedPushEndpoint(u)).toBe(true);
  });

  it("rejects http, other hosts, look-alikes, userinfo tricks, IPs and junk", () => {
    for (const u of [
      "http://fcm.googleapis.com/fcm/send/abc",
      "https://evil.com/fcm.googleapis.com",
      "https://fcm.googleapis.com.evil.com/x",
      "https://fcm.googleapis.com@evil.com/x",
      "https://localhost/x",
      "https://127.0.0.1/x",
      "https://169.254.169.254/latest/meta-data",
      "ftp://fcm.googleapis.com/x",
      "not a url",
      "",
    ]) expect(isAllowedPushEndpoint(u)).toBe(false);
  });
});

describe("parseSubscription", () => {
  const good = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "BPubKey_-abc", auth: "authSecret_-1" } };

  it("accepts a normal browser subscription and extracts the three fields", () => {
    expect(parseSubscription({ ...good, expirationTime: null })).toEqual({
      endpoint: good.endpoint, p256dh: "BPubKey_-abc", auth: "authSecret_-1",
    });
  });

  it("rejects missing or non-string keys, disallowed endpoints, oversized values and non-objects", () => {
    expect(parseSubscription({ endpoint: good.endpoint })).toBeNull();
    expect(parseSubscription({ ...good, keys: { p256dh: "x" } })).toBeNull();
    expect(parseSubscription({ ...good, keys: { p256dh: 1, auth: 2 } })).toBeNull();
    expect(parseSubscription({ ...good, endpoint: "https://evil.com/x" })).toBeNull();
    expect(parseSubscription({ ...good, endpoint: `https://fcm.googleapis.com/${"a".repeat(3000)}` })).toBeNull();
    expect(parseSubscription({ ...good, keys: { p256dh: "a".repeat(500), auth: "b" } })).toBeNull();
    expect(parseSubscription(null)).toBeNull();
    expect(parseSubscription("x")).toBeNull();
  });

  it("only base64url characters are allowed in keys", () => {
    expect(parseSubscription({ ...good, keys: { p256dh: "abc def", auth: "x" } })).toBeNull();
  });
});

describe("base64UrlToBytes", () => {
  it("decodes padded and unpadded base64url, including - and _", () => {
    expect(Array.from(base64UrlToBytes("SGVsbG8"))).toEqual([72, 101, 108, 108, 111]);
    expect(Array.from(base64UrlToBytes("-_-_"))).toEqual([251, 255, 191]);
    expect(Array.from(base64UrlToBytes("SGk="))).toEqual([72, 105]);
  });
});

const BASE_URL = `http://localhost:5050`;

describe("push API (dev server has no VAPID keys, so it must stay inert)", () => {
  it("reports whether reminders are enabled and only exposes a public key when they are", async () => {
    const body = await (await fetch(`${BASE_URL}/api/push/config`)).json();
    expect(typeof body.enabled).toBe("boolean");
    if (!body.enabled) expect(body.publicKey).toBeNull();
  });

  it("subscribe rejects malformed or disallowed subscriptions with 400, before anything else", async () => {
    const post = (b: unknown) =>
      fetch(`${BASE_URL}/api/push/subscribe`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
    expect((await post({})).status).toBe(400);
    expect((await post({ endpoint: "https://evil.com/x", keys: { p256dh: "abc", auth: "def" } })).status).toBe(400);
    expect((await post({ endpoint: "https://fcm.googleapis.com/x", keys: { p256dh: "a b", auth: "def" } })).status).toBe(400);
  });

  it("a valid subscription is refused with 503 when reminders are not configured (nothing is written)", async () => {
    const cfg = await (await fetch(`${BASE_URL}/api/push/config`)).json();
    if (cfg.enabled) return; // never write a test row into a configured database
    const res = await fetch(`${BASE_URL}/api/push/subscribe`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: "https://fcm.googleapis.com/fcm/send/test", keys: { p256dh: "BPubKey", auth: "authKey" } }),
    });
    expect(res.status).toBe(503);
  });

  it("unsubscribe validates its input", async () => {
    const post = (b: unknown) =>
      fetch(`${BASE_URL}/api/push/unsubscribe`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
    expect((await post({})).status).toBe(400);
    expect((await post({ endpoint: "" })).status).toBe(400);
    expect((await post({ endpoint: 5 })).status).toBe(400);
  });
});
