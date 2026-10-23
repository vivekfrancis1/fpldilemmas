// Storage and routes for shared-graphic link previews (see shared-graphics.ts for what and why).
//   POST /api/shared-graphics?title=..&target=/path   body: image/png (1200x630)   -> { id, url }
//   GET  /g/:id      the preview page (og/twitter tags), then on to the tool
//   GET  /g/:id.png  the stored link-card image
import express, { type Express, type Request } from "express";
import { pool } from "./db";
import { createRateLimiter, clientIpFromHeaders, isLoopback } from "@shared/rate-limiter";
import { MAX_PNG_BYTES, newShareId, renderSharePage, shareHash, validateShareUpload } from "./shared-graphics";

let tableReady: Promise<void> | null = null;
function ensureTable(): Promise<void> {
  tableReady ??= (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shared_graphics (
        id text PRIMARY KEY,
        hash text NOT NULL UNIQUE,
        png bytea NOT NULL,
        title text NOT NULL,
        target text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`);
  })().catch((error) => {
    tableReady = null; // try again on the next request
    throw error;
  });
  return tableReady;
}

const KEEP_DAYS = 180;
const ID_PATTERN = "[A-Za-z0-9]{8}";

function origin(req: Request): string {
  if (process.env.PUBLIC_ORIGIN) return process.env.PUBLIC_ORIGIN.replace(/\/$/, "");
  const proto = String(req.headers["x-forwarded-proto"] ?? req.protocol).split(",")[0].trim();
  return `${proto}://${req.get("host")}`;
}

export function registerSharedGraphicsRoutes(app: Express): void {
  // Anonymous uploads: a modest per-address limit keeps the table from being filled in bulk
  const limiter = createRateLimiter({ limit: 40, windowMs: 60 * 60 * 1000 });

  app.post("/api/shared-graphics", express.raw({ type: "image/png", limit: MAX_PNG_BYTES + 1024 }), async (req, res) => {
    try {
      const ip = clientIpFromHeaders(req.headers["x-forwarded-for"], req.socket.remoteAddress);
      if (!isLoopback(ip)) {
        const verdict = limiter.check(ip);
        if (!verdict.allowed) {
          res.set("Retry-After", String(verdict.retryAfterSec));
          return res.status(429).json({ error: "Too many shares from this address. Please try again later." });
        }
      }
      const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      const checked = validateShareUpload({ png: body, title: String(req.query.title ?? ""), target: String(req.query.target ?? "") });
      if (!checked.ok) return res.status(400).json({ error: checked.error });

      await ensureTable();
      const hash = shareHash(checked.png, checked.target);
      const existing = await pool.query("SELECT id FROM shared_graphics WHERE hash = $1", [hash]);
      let id: string | undefined = existing.rows[0]?.id;
      for (let attempt = 0; !id && attempt < 4; attempt++) {
        const candidate = newShareId();
        const inserted = await pool.query(
          "INSERT INTO shared_graphics (id, hash, png, title, target) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING RETURNING id",
          [candidate, hash, checked.png, checked.title, checked.target],
        );
        id = inserted.rows[0]?.id;
        if (!id) id = (await pool.query("SELECT id FROM shared_graphics WHERE hash = $1", [hash])).rows[0]?.id; // a parallel upload won
      }
      if (!id) return res.status(500).json({ error: "Couldn't save the image" });

      if (Math.random() < 0.02) {
        pool.query("DELETE FROM shared_graphics WHERE created_at < now() - ($1 || ' days')::interval", [String(KEEP_DAYS)]).catch(() => undefined);
      }
      res.json({ id, url: `${origin(req)}/g/${id}` });
    } catch (error) {
      console.error("Error saving shared graphic:", error instanceof Error ? error.message : error);
      res.status(500).json({ error: "Couldn't save the image" });
    }
  });

  app.get(new RegExp(`^/g/(${ID_PATTERN})\\.png$`), async (req, res) => {
    try {
      await ensureTable();
      const row = (await pool.query("SELECT png FROM shared_graphics WHERE id = $1", [req.params[0]])).rows[0];
      if (!row) return res.status(404).type("text/plain").send("Not found");
      res.set({ "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" });
      res.send(row.png);
    } catch (error) {
      console.error("Error reading shared graphic:", error instanceof Error ? error.message : error);
      res.status(500).type("text/plain").send("Something went wrong");
    }
  });

  app.get(new RegExp(`^/g/(${ID_PATTERN})$`), async (req, res) => {
    try {
      await ensureTable();
      const id = req.params[0];
      const row = (await pool.query("SELECT title, target FROM shared_graphics WHERE id = $1", [id])).rows[0];
      if (!row) return res.status(404).type("text/plain").send("This shared graphic was not found.");
      const base = origin(req);
      res.set({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" });
      res.send(renderSharePage({ title: row.title, imageUrl: `${base}/g/${id}.png`, pageUrl: `${base}/g/${id}`, targetPath: row.target }));
    } catch (error) {
      console.error("Error reading shared graphic page:", error instanceof Error ? error.message : error);
      res.status(500).type("text/plain").send("Something went wrong");
    }
  });
}
