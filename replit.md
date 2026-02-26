# FPL Dilemmas

## Overview
FPL Dilemmas is an analytics application designed for Fantasy Premier League (FPL) managers. Its core purpose is to provide FPL managers with intuitive data presentation, filtering, sorting, and statistical analysis to facilitate informed decision-making for their fantasy teams. The application aims to be a leading tool for optimizing team performance and gaining a competitive advantage, offering advanced features such as AI-powered player projections, detailed team analysis, and comprehensive historical data. The project envisions empowering users to make smarter FPL choices with predictive analytics.

## User Preferences
Preferred communication style: Simple, everyday language.
Development Protocol: Always ask permission before making any changes to logic, calculations, or functionality. No unauthorized modifications are permitted.
Test-Driven Development (TDD): TDD is applied to backend logic, API contracts, and calculation functions — not UI/styling. Scope: (1) API endpoint behavior — correct data shapes, edge cases, query param handling, (2) Calculation/projection logic — scoring formulas, transfer costs, availability adjustments, (3) Data consistency — cached vs live data, cross-endpoint consistency. Workflow: Write test cases first (red), implement to pass (green), refactor while green. A backend feature is only complete when all its test cases pass. Tests live in `tests/` directory using Vitest. Existing test file: `tests/projection-consistency.test.ts`. UI/styling changes do not require tests.

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
- **Data Storage Solutions**: In-memory storage (Map and object caching) for immediate data. Drizzle ORM for PostgreSQL (Neon Database) for historical data and daily price tracking.
- **Data Persistence**: Automated daily collection of player prices, ownership, and transfer data.
- **Data Consistency**: Deterministic calculations based on team ID and gameweek seeds. `MASTER_TEAM_DEFAULTS` for central configuration.
- **Cache Refresh Strategy**: Daily automated cache refresh at 3 AM. Manual refresh available via POST `/api/admin/refresh-cache`. In-memory caches have 30-minute TTL.

### API Integration
- **External API**: Official Fantasy Premier League API.
- **Data Validation**: Zod schemas for type-safe API response parsing.
- **Historical Data**: Fetches previous seasons' data from `history_past` field.

### Feature Specifications
- **My Dashboard**: Comprehensive FPL overview (Live Rank, My Team, My Leagues) as the home page.
- **Player & Team Projections**: AI-powered models for various player statistics and advanced team-level forecasting using statistical modeling.
- **Captain Selector**: Enhanced with historical data and a 6-factor scoring algorithm.
- **Transfer Planner**: Comprehensive tool for gameweek selection, chip planning, draft management (Base + A-E drafts), Team Evolution visualization, and Projected Points analysis. It fully supports FPL 2024/25 rule changes including new free transfer rules. All user actions are persistently saved to the database.
- **Automated Social Media**: Integrations for automated daily price change tweets and live goal monitoring, including red cards and defensive contribution points for players with significant ownership.
- **Results Projections & Fixtures**: Match prediction tool and a comprehensive match schedule with live indicators and player stats.
- **Historical Data**: Player statistics from 2016/17 season onwards.
- **Availability Tracking**: Uses only official FPL API data for player availability.
- **FPL Content Creators Admin**: Streamlined admin interface for managing content creators with CRUD functionality.
- **Loading Experience**: Enhanced loading screens with shared components for a consistent user experience on slow-loading pages.

## External Dependencies

- **React Ecosystem**: React 18+.
- **Build Tools**: Vite.
- **Routing**: Wouter.
- **UI & Styling**: Radix UI, shadcn/ui, Tailwind CSS, PostCSS, Lucide React (icons), Google Fonts.
- **Data Management**: TanStack Query, React Hook Form, Hookform Resolvers, Zod.
- **Database & ORM**: Drizzle ORM, Neon Database, Drizzle Kit.
- **External APIs**: Official Fantasy Premier League API.