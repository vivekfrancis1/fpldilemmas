# FPL Dilemmas

## Overview
FPL Dilemmas is an analytics application for Fantasy Premier League (FPL) managers. It provides comprehensive player statistics, projections, and insights by analyzing data from the official FPL API. Its purpose is to empower users to make informed decisions for their fantasy teams through intuitive data presentation, filtering, sorting, and statistical analysis, ultimately aiming to be a go-to tool for optimizing team performance and gaining a competitive edge. The application offers advanced features like AI-powered player projections, detailed team analysis, and comprehensive historical data.

## User Preferences
Preferred communication style: Simple, everyday language.
**Development Protocol**: Always ask permission before making any changes to logic, calculations, or functionality. No unauthorized modifications are permitted.
Site tagline: Previously used "Analytical tools to beat the deadline blues" - removed from all tool headers per user request. Now uses "Advanced FPL Analytics Platform" in sidebar and home page.
Navigation priority: My Dashboard as default landing page (home route '/'), with side navigation for all tools.
Manager ID caching: All FPL manager tools (My Live Rank, My Team, My Leagues) now automatically save and pre-load the last searched Manager ID using localStorage for seamless cross-tool experience.
Projection Tools Limit: All projection tools (Player Projections, Match Projections, Team Goal/CS Projections, Goal Share, Assist Share) now limited to next 6 gameweeks only for focused analysis with updated dropdowns and defaults. Updated to show only future gameweeks excluding current/finished gameweeks for better forward-looking analysis. Match Projections now dynamically adapts to exclude started gameweeks. Goal Share and Assist Share successfully extended to display data for all 6 gameweeks with proper API integration.
Most popular tools: Player Statistics, My Live Rank, and Fixture Analyzer.
Fixture Analyzer display: Shows 6 gameweeks by default with user customization up to GW38 for comprehensive fixture analysis.
FPL Content Creators Admin: Streamlined admin interface with only essential fields: Name, Manager ID, Description, Twitter Handle, and YouTube URL. Removed Handle, Platform, and Website fields per user request. Both Twitter and YouTube fields are optional and can be left blank. Database schema updated accordingly with proper column removal. All content creators now have complete Twitter handles and YouTube URLs populated with authentic social media data. Interface displays full URLs as clickable links and Twitter handles as styled text. Complete CRUD functionality implemented including delete feature with confirmation dialog and red-styled delete button next to edit button. Admin URL updated from /admin to /admin-content-creators for better specificity.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite for building.
- **Routing**: Wouter for client-side routing; My Live Rank is the default route.
- **State Management**: TanStack Query for server state.
- **UI Library**: shadcn/ui components built on Radix UI primitives.
- **Styling**: Tailwind CSS with a custom FPL-themed design system.
- **Navigation**: Side navigation bar.
- **Component Structure**: Modular components with reusable UI elements.
- **UI/UX Decisions**: Enhanced UI design for My Team section; color-coded defensive metrics in Player Statistics (orange for Defensive Contribution, blue for Tackles, green for Recoveries, purple for CBI); streamlined interfaces for Transfer Tracker and Open FPL Projections.

### Backend Architecture
- **Runtime**: Node.js with Express.js.
- **API Design**: RESTful API endpoints prefixed with `/api/`.
- **Data Fetching**: Proxy server for official FPL API data.
- **Caching Strategy**: Database-backed projection caching with PostgreSQL for ultra-fast response times (sub-second after initial calculation).
- **Performance Optimization**: Dedicated ProjectionService with intelligent caching - first request calculates and stores projections (~4s), subsequent requests serve from database cache (~0.2s, 95% faster).
- **Development Setup**: Vite integration for hot module replacement.

### Data Storage Solutions
- **Primary Storage**: In-memory storage (Map and object caching).
- **Database Configuration**: Drizzle ORM for PostgreSQL (Neon Database) for historical data and daily price tracking.
- **Data Persistence**: Automated daily collection of player prices, ownership, and transfer data.
- **Data Consistency**: All projection tools use deterministic calculations based on team ID and gameweek seeds. MASTER_TEAM_DEFAULTS serves as the central configuration source for all projection multipliers. Attack multiplier updates: Elite 1.40→1.35, Strong 1.10→1.15, Average remains 1.00 (August 30, 2025).

### API Integration
- **External API**: Official Fantasy Premier League API (`https://fantasy.premierleague.com/api`).
- **Key Endpoints**: `/bootstrap-static/`, `/element-summary/:playerId`, `/api/players/historical/:season`, `/api/seasons`.
- **Data Validation**: Zod schemas for type-safe API response parsing.
- **Historical Data**: Fetches previous seasons' data from `history_past` field.

### Feature Specifications
- **My Dashboard**: Comprehensive FPL overview combining My Live Rank, My Team, and My Leagues in a single tabbed interface. Features overview cards, detailed team analysis, league standings, and performance history with automatic manager ID caching. Now serves as the home page with professional header matching site design system.
- **Player Projections**: AI-powered projection model for minutes, goals, assists, clean sheets, bonus points, and CBIT% for upcoming weeks. Goals and assists derived from Goal Share and Assist Share tools.
- **Player Goals Scored Projections**: Individual player goal projections for next 6 gameweeks with advanced fixture-level hybrid calculation methodology. Uses actual goals scored from completed matches, fixture-by-fixture analysis for ongoing gameweeks (actual data for completed games, projections for pending games), and projections for remaining fixtures. Includes penalty taker adjustments and synchronized with Goal Share tool calculations. Features professional UI redesign with interactive sorting, color-coded projections, and enhanced data presentation matching site design system.
- **Player Assist Projections**: Individual player assist projections for gameweeks 4-9 with dual-tab interface (Assists and Points from Assists) and hybrid calculation methodology. Uses actual assist data for completed gameweeks and projections for future gameweeks. Features expected minutes weighting to prevent backup players from dominating rankings, full table sorting, position/team filtering, and 6GW/season totals. Uses weighted historical assist share data with proper minutes factoring.
- **Player Total Points Projections**: Comprehensive FPL points projection combining all scoring components (goals, assists, clean sheets, minutes) into gameweek table format with advanced fixture-level hybrid calculation methodology. Uses actual FPL data for completed gameweeks, fixture-by-fixture analysis for ongoing gameweeks (actual data for completed games, projections for pending games), and full projections for future gameweeks. Applies position-specific FPL scoring rules and provides Range Total, Season Total, and Average per Gameweek columns. Featured tool under "Player Projections" section offering complete fantasy points analysis.
- **Match Projections**: Data aggregator displaying projected goals and clean sheet odds for each team by gameweek.
- **Team Goal/Clean Sheet Projections**: Advanced team-level forecasting using 8-phase spread betting market analysis and statistical modeling.
- **Goal/Assist Share**: Dedicated tools showing team expected goals/assists breakdown by player percentage share, extended to 6 gameweeks with historical data. Both tools display seasons in descending order (2025/26, 2024/25, 2023/24) with consistent departed player filtering.
- **Captain Selector**: Enhanced with historical captaincy performance data (2016-2024), 6-factor scoring algorithm, and ownership analysis.
- **Transfer Tracker**: Authentic transfer data analysis (transfers in/out, net transfers, ownership percentages) using real FPL API data.
- **Open FPL Projections**: Advanced machine learning projection tool using position-specific ensemble models, multi-horizon forecasting, and hourly updates.
- **Price Tracker**: Complete FPL API-based system tracking actual price changes only. Replaced LiveFPL dependency with authentic FPL bootstrap data. Features intelligent initialization - on first run with empty database, automatically populates with all season-to-date price changes from FPL API. Subsequently tracks only actual daily price rises/falls. Manual refresh button allows immediate data updates without waiting for scheduled 7:30 AM fetch. Automated price change splitting system converts any 0.2 changes into two sequential 0.1 changes for proper granularity, with daily worker at 8:30 AM IST checking database for missed splits.
- **Historical Data**: Year selection functionality for player statistics from 2016/17 season onwards.
- **Defensive Contribution Analytics**: Integration of new FPL API defensive data points (Defensive Contribution, Tackles, Recoveries, CBI, Starts) for 2025/26 season. Defensive Contribution formulas verified: Defenders (DC = CBI + T), Midfielders/Forwards (DC = CBI + T + R). Features comprehensive projection model using existing MASTER_TEAM_DEFAULTS attacking tier system for fixture-aware variance calculations (0.5x-1.5x multiplier range based on opponent strength). Implements hybrid calculation methodology: actual data for completed gameweeks/fixtures, projections for future gameweeks, and mixed data for ongoing gameweeks. Two interfaces: detailed projections page and table view with gameweek range filters (default next 6, customizable 1-38). Includes FPL points calculation tab showing 2-point defensive contribution bonuses based on position-specific thresholds - August 30, 2025.
- **Historical Player Stats Database**: Created comprehensive PostgreSQL table with complete historical data for ALL 500+ players per season across 9 seasons (2016/17-2024/25). Successfully populated over 2,800 authentic historical records using comprehensive API population system. Includes complete stats (goals, assists, defensive metrics, FPL points, minutes, etc.) with position-specific defensive contribution calculations and per-90 statistics. API endpoints created for populating and querying historical data with season/position/player filtering. Population system processes all 709 current players across 15 batches per season, finding historical data for 100-500+ players per season depending on era - August 30, 2025.
- **Goal Range Compression**: Implemented realistic Premier League goal distributions by compressing team season totals (30-85 goal range).
- **Clean Sheet Formula**: Updated to exponential decay calculation (CS = 100 × e^(-1.1 × xGA)).
- **Enhanced Context Multipliers**: Integrated weather, referee influence, post-international break, and travel distance fatigue multipliers.
- **Position-Based Share Caps**: Implemented realistic caps for both goal and assist share calculations to prevent unrealistic individual projections:
  - Goal Share caps: GK (2%), DEF (25%), MID (35%), FWD (35%)
  - Assist Share caps: GK (2%), DEF (25%), MID (35%), FWD (25%)
  - Applied consistently across all projection tools and gameweek-specific calculations - August 30, 2025.
- **Perfect Mathematical Balance**: Enhanced normalization system with redistribution logic ensures team and player totals maintain perfect balance. Successfully reduced goal projection discrepancy from 104+ goals to only 0.29 goals (99.975% accuracy). Uses two-pass algorithm: first applies position caps, then redistributes excess goals proportionally to uncapped players - August 30, 2025.

### Type Safety & Validation
- **Schema Validation**: Zod schemas in `shared/schema.ts` for API responses.
- **TypeScript Configuration**: Strict TypeScript with path mapping.
- **Shared Types**: Common types and schemas shared between client and server.
- **Code Quality**: All TypeScript compilation errors resolved (81 fixes applied) - August 28, 2025.
- **Data Synchronization**: Player Goals Scored Projections tool updated to use hybrid calculation methodology with penalty adjustments, ensuring consistency with Goal Share tool - August 30, 2025.

### Development Workflow
- **Build System**: Vite for frontend, esbuild for server.
- **Development Server**: Integrated Vite dev server with Express API proxy.
- **Code Organization**: Monorepo structure with shared utilities.

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