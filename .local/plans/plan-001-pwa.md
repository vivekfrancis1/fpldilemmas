# Plan 001: PWA Support for FPL Dilemmas

## Goal
Make FPL Dilemmas an installable Progressive Web App: installable on desktop/mobile home screens, loads instantly via cached app shell, has a proper manifest/icons, and gets a lightweight update flow when a new version deploys. Live FPL data (projections, stats, prices) is **never** cached by the service worker — always network-fresh. This is infrastructure/build-config work, not a change to calculation logic.

## Decisions already confirmed with user
1. **Tooling**: `vite-plugin-pwa` (generateSW strategy) — not a hand-rolled service worker.
2. **Caching strategy**: App-shell only. Static assets (JS/CSS/fonts/icons) precached for offline/instant load. All `/api/*` requests bypass the service worker entirely (network-only, no runtime caching) so FPL data is always live.
3. **Icons**: Generated from `attached_assets/FPL_Dilemmas_logo_green_new_1776001333352.jpg` (already done, see below).

## Already done (this session)
- **Logo**: the old neon-green `attached_assets/FPL_Dilemmas_logo_green_new_1776001333352.jpg` is stale — the app was rebranded to a purple/indigo gradient circle badge ("FPL" / "DILEMMAS", Tailwind `purple-600`→`indigo-600`, matching `client/src/components/top-nav.tsx`'s header badge). The available reference file (`Manual Uploads/Avatar options/Avatar 1.png`) was a low-res (460x440) font-comparison mockup, not production art, so instead of upscaling it the icon was **regenerated at native resolution** with PIL to exactly match the in-app gradient/typography (Arial Bold, same diagonal gradient colors), avoiding blur.
- Generated into `client/public/icons/`:
  - `icon-512.png`, `icon-192.png` — transparent background, circle badge (for `purpose: "any"`)
  - `maskable-512.png`, `maskable-192.png` — solid `#280a2e` (the app's `--fpl-purple` token) background with the badge inset to the maskable safe zone (for `purpose: "maskable"`)
  - `icon-180.png` (apple-touch-icon), `icon-32.png`, `icon-16.png` — opaque dark-bg favicons
- Confirmed no existing manifest.json or service worker in the repo — this is a clean setup.

## Steps

### 1. Install dependency
- `npm install -D vite-plugin-pwa`

### 2. Vite config (`vite.config.ts`)
- Add `VitePWA({...})` to the plugins array with:
  - `registerType: 'autoUpdate'`
  - `injectRegister: 'auto'` (plugin injects the SW registration script itself)
  - `manifest`: name "FPL Dilemmas", short_name "FPL Dilemmas", description from existing meta tags, `start_url: '/'`, `display: 'standalone'`, `background_color: '#280a2e'` + `theme_color: '#280a2e'` (matches `--fpl-purple`, the app's actual header bar color), icons array pointing at the generated `/icons/*.png` files: 192/512 with `purpose: 'any'`, maskable-192/maskable-512 with `purpose: 'maskable'`.
  - `workbox`:
    - `globPatterns` for the built JS/CSS/font/image assets (default vite-plugin-pwa patterns are fine).
    - `navigateFallback: '/index.html'` for SPA routing offline support, but **explicitly deny-list `/api/` from the fallback** (`navigateFallbackDenylist: [/^\/api\//]`) so API 404s don't get masked by the app shell.
    - No `runtimeCaching` entries for `/api/*` — anything not precached at build time (i.e., all API calls) just hits the network normally, unaffected by the service worker.
  - `devOptions.enabled: false` (don't run the SW in dev mode — avoids caching/HMR conflicts while developing).

### 3. `client/index.html`
- Remove the Replit-specific dev banner script (unrelated cleanup — flag to user, don't remove without asking, since CLAUDE.md requires confirmation before removing things — actually this is a separate concern, leave untouched unless user asks).
- Add:
  - `<link rel="manifest" href="/manifest.webmanifest">` (vite-plugin-pwa auto-injects this in `injectRegister: 'auto'` mode, so may not need to hand-add — verify after build).
  - `<link rel="apple-touch-icon" href="/icons/icon-180.png">`
  - `<link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32.png">` and 16x16 equivalent
  - `<meta name="theme-color" content="...">` matching manifest theme_color
  - `<meta name="apple-mobile-web-app-capable" content="yes">` and `apple-mobile-web-app-status-bar-style` for iOS install behavior (iOS doesn't read the manifest for this).

### 4. Update prompt UX (small, optional but recommended)
- Use `virtual:pwa-register/react` hook (`useRegisterSW`) in a small new component (e.g. `client/src/components/pwa-update-toast.tsx`) that shows a toast/banner "New version available — Refresh" when `needRefresh` is true, using the existing toast system (shadcn `useToast`) rather than inventing new UI.
- Mount it once near the root in `App.tsx`.
- No install-prompt UI (custom "Add to Home Screen" button) unless user wants one — browsers show their own install affordance by default; can revisit later.

### 5. Build config / gitignore
- Confirm `dist/` (already built output) doesn't need changes; vite-plugin-pwa emits `sw.js` and `manifest.webmanifest` into `dist/public` automatically as part of `vite build`.
- No server-side route changes needed — service worker and manifest are static files served from the existing static file serving in `server/`.

### 6. Testing / verification
- `npx tsc --noEmit -p .` — should be unaffected (no logic changes).
- No new Vitest tests needed per CLAUDE.md scope (UI/build-config, not backend logic/calculations) — skip TDD requirement here, this is explicitly out of that scope.
- Manual verification via the Browser preview tool:
  - Run `npm run build && npm run start` (or dev server) and open in the Browser pane.
  - Confirm manifest loads (`/manifest.webmanifest`), icons resolve, no console errors from the SW registration.
  - Confirm `/api/*` calls are NOT intercepted/cached by the SW (check Network tab — should show normal network requests, not "(ServiceWorker)" as the source, or if it does show SW as passthrough, confirm response isn't a stale cached one).
  - Test offline: after first load, throttle/offline in devtools, reload — app shell should still render (blank data states are fine, since API calls will fail offline by design).
  - Check installability (Chrome's install icon in the address bar appears).

### 7. Commit
- Local commit only per CLAUDE.md workflow — no push/deploy until user explicitly says so.

## Open questions for user (will surface via AskUserQuestion when reached, not blocking the plan)
- Exact theme_color / background_color hex — will read from `client/src/index.css` CSS variables rather than ask, unless ambiguous.
- Whether to keep the Replit dev-banner script in `index.html` — unrelated to PWA, will leave as-is.

## Out of scope for this plan
- Push notifications
- Background sync
- Any caching of `/api/*` responses (explicitly rejected per user's decision above)
- Custom "Add to Home Screen" install button UI
