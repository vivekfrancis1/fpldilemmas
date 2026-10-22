// Serves a built copy of the frontend on http://localhost:5070 and forwards every /api/ request to the live site,
// so pages can be checked locally with real data without a working local database.
//
//   npx vite build --outDir /tmp/fpl-preview --emptyOutDir
//   node scripts/local-preview.mjs /tmp/fpl-preview
//
// Read-only: only GET requests are forwarded. Port 5070 on purpose (browsers refuse 5060/5061 as unsafe).
import http from "http";
import fs from "fs";
import path from "path";

const root = path.resolve(process.argv[2] || "dist/public");
const port = Number(process.env.PORT || 5070);
const upstream = process.env.UPSTREAM || "https://fpldilemmas.com";
const types = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml",
  ".json": "application/json", ".webmanifest": "application/manifest+json", ".woff2": "font/woff2", ".ico": "image/x-icon",
};

http
  .createServer(async (req, res) => {
    if (req.url.startsWith("/api/")) {
      if (req.method !== "GET") {
        res.writeHead(405);
        res.end("preview is read-only");
        return;
      }
      try {
        const r = await fetch(upstream + req.url, { headers: { "user-agent": "local-preview" } });
        res.writeHead(r.status, { "content-type": r.headers.get("content-type") || "application/json" });
        res.end(Buffer.from(await r.arrayBuffer()));
      } catch {
        res.writeHead(502);
        res.end("could not reach " + upstream);
      }
      return;
    }
    let file = path.join(root, decodeURIComponent(req.url.split("?")[0]));
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, "index.html");
    res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, () => console.log(`Preview of ${root} on http://localhost:${port} (API from ${upstream})`));
