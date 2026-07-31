# FPL Dilemmas

## Overview
FPL Dilemmas is an analytics application designed for Fantasy Premier League (FPL) managers. Its core purpose is to provide FPL managers with intuitive data presentation, filtering, sorting, and statistical analysis to facilitate informed decision-making for their fantasy teams. The application aims to be a leading tool for optimizing team performance and gaining a competitive advantage, offering advanced features such as AI-powered player projections, detailed team analysis, and comprehensive historical data. The project envisions empowering users to make smarter FPL choices with predictive analytics.

## User Preferences
Preferred communication style: Simple, everyday language.
Development Protocol: Always ask permission before making any changes to logic, calculations, or functionality. No unauthorized modifications are permitted.
Test-Driven Development (TDD): TDD is applied to backend logic, API contracts, and calculation functions — not UI/styling. Scope: (1) API endpoint behavior — correct data shapes, edge cases, query param handling, (2) Calculation/projection logic — scoring formulas, transfer costs, availability adjustments, (3) Data consistency — cached vs live data, cross-endpoint consistency. Workflow: Write test cases first (red), implement to pass (green), refactor while green. A backend feature is only complete when all its test cases pass. Tests live in `tests/` directory using Vitest. Existing test file: `tests/projection-consistency.test.ts`. UI/styling changes do not require tests.
Plan Storage: Never overwrite or delete old plans. Each plan is saved as a separate numbered file in `.local/plans/` (e.g. `plan-001-description.md`, `plan-002-description.md`). `.local/session_plan.md` serves as an index. Plans must include a plan name and number to avoid confusion with older plans.
Local-Only Workflow: Commit to local git as work progresses (logical chunks, clean history), but never `git push` or trigger a deploy until the user explicitly says to (e.g. "deploy", "push", "ship it"). Railway auto-deploys from the `main` branch on GitHub, so pushing to `origin` is itself the deploy trigger — treat it with the same caution as a manual deploy step.
Before pushing/deploying: run `npx tsc --noEmit -p .` and `npx vitest run`, and confirm both are clean (aside from documented pre-existing flaky tests — see below) before asking the user to deploy.

### Known pre-existing test flakiness (not regressions)
A handful of tests fail intermittently under full-suite parallel load but pass cleanly in isolation — this is resource contention (DB connections, auth/session state), not a real bug. Before treating a failure as a regression, re-run just that file in isolation; if it passes alone, it's this known pattern. Clusters seen so far: `tests/projection-consistency.test.ts`'s "Server-Side Availability Adjustments" and "Cached vs Live Endpoint Consistency" tests, `tests/projection-validation-historical-compare.test.ts` (admin-auth session contention), `tests/promoted-team-admin-settings.test.ts`, `tests/cache-integrity.test.ts`.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite.
- **Routing**: Wouter, with Player Total Points as the default route.
- **State Management**: TanStack Query for server state.
- **UI Library**: shadcn/ui components built on Radix UI primitives.
- **Styling**: Tailwind CSS with a custom FPL-themed design system.
- **UI/UX Decisions**: Enhanced UI for My Team, color-coded defensive metrics, streamlined interfaces, unified pitch view styling, and standardized header system. Responsive design implemented across all major pages for mobile optimization, including adaptive column hiding and responsive grids.

### Backend Architecture
- **Runtime**: Node.js with Express.js.
- **API Design**: RESTful API endpoints prefixed with `/api/`.
- **Data Fetching**: Proxy server for official FPL API data.
- **Caching Strategy**: Database-backed projection caching with PostgreSQL. A cache-first architecture is implemented across projection endpoints, significantly improving loading times by pre-computing and serving aggregated data.
- **Performance Optimization**: Dedicated `ProjectionService` with intelligent caching and client-side filtering.
- **Data Storage Solutions**: In-memory storage (Map and object caching) for immediate data. Drizzle ORM for PostgreSQL (hosted on Railway) for historical data and daily price tracking.
- **Data Persistence**: Automated daily collection of player prices, ownership, and transfer data.
- **Data Consistency**: Deterministic calculations based on team ID and gameweek seeds. `MASTER_TEAM_DEFAULTS` for central configuration.
- **Cache Refresh Strategy**: Daily automated cache refresh at 3 AM. Manual refresh available via POST `/api/admin/refresh-cache`. In-memory caches have 30-minute TTL.

### API Integration
- **External API**: Official Fantasy Premier League API.
- **Data Validation**: Zod schemas for type-safe API response parsing.
- **Historical Data**: Fetches previous seasons' data from `history_past` field.

## Deployment
- **Hosting**: Railway (migrated from Replit around 2026-07-19/20). Project `thriving-passion`, service `fpldilemmas`, environment `production`.
- **Live site**: https://fpldilemmas.com (also served on the Railway subdomain `https://fpldilemmas-production.up.railway.app`).
- **Source of truth**: GitHub — https://github.com/vivekfrancis1/fpldilemmas, `main` branch. Railway auto-deploys on every push to `main`; there is no separate manual deploy step.
- **Checking deploy status**: `railway status --json` (requires the Railway CLI to be linked to this project) shows the active deployment's build/deploy status and which commit it's running.
- **Database**: Railway-hosted PostgreSQL, accessed via the standard `pg` driver + Drizzle ORM (not Neon, despite some older docs/naming in this repo referencing it).
- Do not push to `main` or run destructive Railway/DB commands without the user's explicit go-ahead for that specific action (see Local-Only Workflow above).

### Feature Specifications
- **My Dashboard**: Comprehensive FPL overview (Live Rank, My Team, My Leagues) as the home page.
- **Player & Team Projections**: AI-powered models for various player statistics and advanced team-level forecasting using statistical modeling.
- **Captain Selector**: Enhanced with historical data and a 6-factor scoring algorithm.
- **Transfer Planner**: Comprehensive tool for gameweek selection, chip planning, draft management (Base + A-E drafts), Team Evolution visualization, and Projected Points analysis. It fully supports FPL 2024/25 rule changes including new free transfer rules. All user actions are persistently saved to the database.
- **Automated Social Media**: Integrations for automated daily price change tweets and live goal monitoring, including red cards and defensive contribution points for players with significant ownership. Also sends 4 pre-deadline tweets (Top 5 GKP/DEF/MID/FWD by xPts for the upcoming gameweek) 2 hours before every FPL deadline via `server/deadline-tweet-scheduler.ts`.
- **Match Stats** (`/results-and-fixtures`): Comprehensive match schedule with live indicators, results, and a 2025/26 historical season option (`GET /api/fixtures-history`, sourced from `season_fixtures_archive` since FPL's live fixtures feed only ever reflects the current season).
- **Team Stats** (`/current-standings`): Enhanced Premier League table (clean sheets, cards, saves, xG, defensive contributions, venue splits) for the live season, plus a 2025/26 historical option computed by `computeHistoricalStandings()` from the archive tables — defaults to 2025/26 until the current season has actually kicked off.
- **Player Stats** (`/player-statistics`): Comprehensive player data with a season selector; "Smart Filters & Search" is collapsed by default.
- **Fixture Analyzer** (`/fixtures`): FDR modes — Official FPL ratings, current-Season Form, **Last Season Form** (`GET /api/last-season-form-fdr`, PPG-tier from real 2025/26 archive results), and Custom.
- **Price Changes** (`/recent-price-changes`): Two tabs — **Predicted Price Changes** (ownership/transfer-momentum heuristic via `GET /api/price-predictions`) and **Recent Price Changes** (confirmed changes via `GET /api/price-changes/recent`, filtered to the current season only since the underlying table has no season column). Both show a clear empty-state message when there's no data yet (e.g. pre-season).
- **Historical Data**: Player statistics from 2016/17 season onwards. `season_fixtures_archive` holds full, real match-level results for 2025/26 specifically, reconstructed before FPL's live endpoints reset for the new season — the basis for all of the historical-season features above.
- **Availability Tracking**: Uses only official FPL API data for player availability.
- **Time-Weighted Blend for goalShare/assistShare**: Players who missed a block of games (AFCON, injury, mid-season transfer) but are now regularly playing get a blend of their raw season total and an extrapolated per-game rate. Four-condition gate: activeGames≥3, maxConsecDNP≥4, startRate≥70%, played last 4 fixtures. Qualifying players (~50) stored in `blend_eligible_players` DB table, refreshed on every goalShare/assistShare cache miss. Admin endpoint: `GET /api/admin/blend-eligible-players`.
- **FPL Content Creators Admin**: Streamlined admin interface for managing content creators with CRUD functionality.
- **Loading Experience**: Enhanced loading screens with shared components for a consistent user experience on slow-loading pages.
- **Top nav order**: Statistics (Team Stats, Player Stats, Match Stats), Team Projections, Player Projections, Popular Tools, Top Managers, My FPL.

## External Dependencies

- **React Ecosystem**: React 18+.
- **Build Tools**: Vite.
- **Routing**: Wouter.
- **UI & Styling**: Radix UI, shadcn/ui, Tailwind CSS, PostCSS, Lucide React (icons), Google Fonts.
- **Data Management**: TanStack Query, React Hook Form, Hookform Resolvers, Zod.
- **Database & ORM**: Drizzle ORM, Drizzle Kit, PostgreSQL (Railway-hosted).
- **External APIs**: Official Fantasy Premier League API.