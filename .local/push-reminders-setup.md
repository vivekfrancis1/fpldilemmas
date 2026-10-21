# Deadline reminders: setup (nothing below has been applied anywhere)

Reminders are inert until you do all three steps. Until then the Brief page shows no reminder button, the
`/api/push/*` routes refuse subscriptions, and the scheduler does not start.

## 1. Create the table (production database)
Run once (or `npm run db:push`, which reads `pushSubscriptions` in `shared/schema.ts`):

```sql
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id serial PRIMARY KEY,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  last_sent_gameweek integer,
  created_at timestamp NOT NULL DEFAULT now()
);
```
NOTE: local dev and tests share the production database, so only create it when you are ready to switch reminders on.

## 2. Generate VAPID keys and set them on Railway
```bash
npx web-push generate-vapid-keys
```
Set these environment variables on the Railway service (never commit them):
- `VAPID_PUBLIC_KEY` (the public key)
- `VAPID_PRIVATE_KEY` (the private key)
- `VAPID_SUBJECT` (e.g. `mailto:you@example.com`)

## 3. Deploy, then check by hand
- The server log should say "✓ Deadline reminder scheduler started".
- On a phone or desktop, open /deadline-brief, press "Remind me 2h before deadlines", allow notifications.
- iPhone: only works when the site is installed to the Home Screen (iOS 16.4+).
- A reminder is sent once per gameweek per subscriber, from 2 hours before the deadline. Delivery cannot be tested
  locally (the dev server never sends: production + keys required), so do one real check after the first deploy.

## What is stored
Only the browser's push endpoint and keys, and the last gameweek reminded. No name, email or team ID. A subscription
is deleted when the push service reports it gone, or when the person turns reminders off.
