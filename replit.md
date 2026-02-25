# FPL Dilemmas

## Overview
FPL Dilemmas is an analytics application designed for Fantasy Premier League (FPL) managers. Its core purpose is to provide FPL managers with data-driven insights and tools to enhance their team's performance. The application offers intuitive data presentation, filtering, sorting, and statistical analysis, including AI-powered player projections, detailed team analysis, and comprehensive historical data. It aims to be a leading platform for optimizing FPL team decisions and gaining a competitive advantage.

## User Preferences
Preferred communication style: Simple, everyday language.
**Development Protocol**: Always ask permission before making any changes to logic, calculations, or functionality. No unauthorized modifications are permitted.
**Test-Driven Development (TDD)**: TDD is applied to backend logic, API contracts, and calculation functions — not UI/styling. Scope: (1) API endpoint behavior — correct data shapes, edge cases, query param handling, (2) Calculation/projection logic — scoring formulas, transfer costs, availability adjustments, (3) Data consistency — cached vs live data, cross-endpoint consistency. Workflow: Write test cases first (red), implement to pass (green), refactor while green. A backend feature is only complete when all its test cases pass. Tests live in `tests/` directory using Vitest. Existing test file: `tests/projection-consistency.test.ts`. UI/styling changes do not require tests.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite.
- **Routing**: Wouter for client-side routing; Player Total Points is the default route (`/`).
- **State Management**: TanStack Query for server state.
- **UI Library**: shadcn/ui components built on Radix UI primitives.
- **Styling**: Tailwind CSS with a custom FPL-themed design system.
- **UI/UX Decisions**:
    - Tagline: "FPL made smarter with predictive analytics." displayed in header.
    - Default landing page: Player Total Points.
    - Manager ID Auto-Load: All 6 FPL Manager tools (My Dashboard, My Live Rank, My Leagues, Team Optimizer, Transfer Planner, My Team Projected Points) automatically load and fetch data from the last searched Manager ID saved in localStorage.
    - Projection Tools Limit: Both team-level and player-level projection tools generate 12 gameweeks of data, defaulting to 6 gameweeks view, showing only future gameweeks.
    - Fixture Analyzer: Shows 6 gameweeks by default with user customization up to GW38.
    - Navigation Cleanup: Player Yellow Cards, Red Cards, Goals Conceded, and Bonus Points tools are integrated into the Player Total Points tool and hidden from sidebar navigation.
    - Mobile Optimization: Comprehensive responsive design across all major pages, including FPL Manager tools and analytics pages, with adaptive column hiding, responsive grids, and optimized touch targets. Transfer Planner pitch view is aggressively optimized for mobile.
    - SEO Optimization: Comprehensive SEO with keyword-rich meta tags, Open Graph, Twitter Card tags, JSON-LD structured data, sitemap.xml, and robots.txt.
    - Loading Experience: Enhanced loading screens using a shared `LoadingExperience` component with 4 variants, standardized UI, contextual messages, and 3-step progress indicators across slow-loading pages.

### Backend Architecture
- **Runtime**: Node.js with Express.js.
- **API Design**: RESTful API endpoints prefixed with `/api/`.
- **Data Fetching**: Proxy server for official FPL API data.
- **Caching Strategy**: Database-backed projection caching with PostgreSQL. Cache-first architecture across projection endpoints for pre-computed aggregated data and team-level predictions, resulting in 10-20x faster loading times.
- **Performance Optimization**: Dedicated `ProjectionService` with intelligent caching and client-side filtering for optimized data retrieval.

### Data Storage Solutions
- **Primary Storage**: In-memory storage (Map and object caching).
- **Database Configuration**: Drizzle ORM for PostgreSQL (Neon Database) for historical data and daily price tracking.
- **Data Persistence**: Automated daily collection of player prices, ownership, and transfer data.
- **Data Consistency**: All projection tools use deterministic calculations based on team ID and gameweek seeds. `MASTER_TEAM_DEFAULTS` serves as the central configuration for projection multipliers.
- **Cache Refresh Strategy**: Daily automated cache refresh at 3 AM for all projection caches. Manual cache refresh available via POST `/api/admin/refresh-cache` endpoint (requires API key authentication). In-memory caches have 30-minute TTL with automatic invalidation.

### API Integration
- **External API**: Official Fantasy Premier League API.
- **Data Validation**: Zod schemas for type-safe API response parsing.
- **Historical Data**: Fetches previous seasons' data from `history_past` field.

### Feature Specifications
- **My Dashboard**: Comprehensive FPL overview combining My Live Rank, My Team, and My Leagues in a single tabbed interface, serving as the home page.
- **Player Projections**: AI-powered projection model for various player statistics (minutes, goals, assists, clean sheets, bonus points, CBIT%), using official FPL API availability data.
- **Team Projections**: Advanced team-level forecasting for goals and clean sheets using spread betting market analysis and statistical modeling.
- **Goal/Assist Share**: Tools showing team expected goals/assists breakdown by player percentage share.
- **Captain Selector**: Enhanced with historical performance data, a 6-factor scoring algorithm, and ownership analysis.
- **Transfer Tracker**: Authentic transfer data analysis using real FPL API data.
- **Open FPL Projections**: Advanced machine learning projection tool with position-specific ensemble models, multi-horizon forecasting, and hourly updates.
- **Price Tracker**: FPL API-based system tracking actual price changes.
- **Twitter Integration**: Automated daily price change posting (risers and fallers) at 7 AM IST using Twitter API v2.
- **Live Goal Tweets**: Automated live goal monitoring via `LiveGoalMonitor` service polling FPL fixtures API every 60 seconds during live matches, tweeting goals, red cards, and defensive contribution points for players with >10% ownership. Bonus points are tweeted upon match finish with 12-hour post-match monitoring for recalculations.
- **Results Projections**: Match prediction tool displaying predicted scores, win probabilities, expected goals, and clean sheet odds for future gameweeks.
- **Results and Fixtures**: Comprehensive match schedule with LIVE indicators, clickable player stats, and automatic background refresh during live matches.
- **Historical Data**: Year selection functionality for player statistics from 2016/17 season onwards.
- **Defensive Contribution Analytics**: Integration of new FPL API defensive data points and a comprehensive projection model.
- **Comprehensive FPL Scoring System**: Implemented probability-based calculations for all official FPL scoring components with a hybrid methodology.
- **Projection Formula Decisions**: Goals/assists use xG/90-primary formula for players with ≥300 minutes; form-based fallback for low-minute players. Includes guards to prevent small-sample inflation and ensure realistic projections.
- **Transfer Planner**: Comprehensive transfer planning tool with gameweek selector, team selection interface, chip planning, draft management, Team Evolution visualization, and Projected Points analysis. Fully implements FPL 2024/25 rule changes including 5 free transfers and GW16 AFCON Free Transfer Top-Up. All user actions are permanently saved to the database.
- **Availability Tracking**: Player availability uses only official FPL API data.

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18+.
- **Build Tools**: Vite, esbuild.
- **Routing**: Wouter.

### UI and Styling
- **Component Library**: Radix UI primitives, shadcn/ui.
- **Styling**: Tailwind CSS, PostCSS.
- **Icons**: Lucide React.
- **Fonts**: Google Fonts.

### Data Management
- **Server State**: TanStack Query.
- **Form Handling**: React Hook Form with Hookform Resolvers.
- **Validation**: Zod.

### Database and ORM
- **ORM**: Drizzle ORM.
- **Database Provider**: Neon Database.
- **Migrations**: Drizzle Kit.

### External APIs
- **FPL API**: Official Fantasy Premier League API.
- **Twitter API v2**: For automated tweets.