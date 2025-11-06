# FPL Dilemmas

## Overview
FPL Dilemmas is an analytics application for Fantasy Premier League (FPL) managers. It provides comprehensive player statistics, projections, and insights by analyzing data from the official FPL API. Its purpose is to empower users to make informed decisions for their fantasy teams through intuitive data presentation, filtering, sorting, and statistical analysis, ultimately aiming to be a go-to tool for optimizing team performance and gaining a competitive edge. The application offers advanced features like AI-powered player projections, detailed team analysis, and comprehensive historical data.

## User Preferences
Preferred communication style: Simple, everyday language.
**Development Protocol**: Always ask permission before making any changes to logic, calculations, or functionality. No unauthorized modifications are permitted.
Site tagline: "FPL made smarter with predictive analytics." displayed in header.
Navigation priority: Goals and Clean Sheets as default landing page (home route '/'), with side navigation for all tools.
Manager ID caching: All FPL manager tools (My Live Rank, My Team, My Leagues) now automatically save and pre-load the last searched Manager ID using localStorage for seamless cross-tool experience.
Projection Tools Limit: All projection tools (Player Projections, Match Projections, Team Goal/CS Projections, Goal Share, Assist Share) now limited to next 6 gameweeks only for focused analysis. Updated to show only future gameweeks excluding current/finished gameweeks.
Most popular tools: Player Statistics, My Live Rank, and Fixture Analyzer.
Fixture Analyzer display: Shows 6 gameweeks by default with user customization up to GW38.
FPL Content Creators Admin: Streamlined admin interface with only essential fields: Name, Manager ID, Description, Twitter Handle, and YouTube URL. Both Twitter and YouTube fields are optional and can be left blank. Complete CRUD functionality implemented including delete feature. Admin URL updated to /admin-content-creators.
Navigation Cleanup: Hidden Player Yellow Cards, Red Cards, Goals Conceded, and Bonus Points tools from sidebar navigation. These components are now integrated into the comprehensive Player Total Points tool.
Mobile Optimization: Comprehensive responsive design implemented across major pages (Current Standings, Player Statistics, Transfer Planner, My Dashboard, Top 25/50 Managers, Content Creators, Results and Fixtures) with adaptive column hiding, responsive grids, mobile-friendly touch targets, and natural page scrolling. Current Standings hides 10 non-essential columns on mobile (xGF, xGA, AGR, AGAR, tackles, defensive actions, cards, saves, penalties) while maintaining core stats visibility. All manager pages (My Dashboard, Top 25/50 Managers, Content Creators) now use natural page scrolling without nested scroll containers, with transfer cards featuring flex-col sm:flex-row stacking, responsive text/padding/icon sizing (text-xs sm:text-sm, p-3 sm:p-4), and truncation with min-w-0 for proper text overflow handling. Transfer Planner pitch views (Manual and Auto Team Selection) aggressively optimized for maximum mobile screen usage: reduced pitch padding (p-2), compact jerseys (18vw width to fit 5 players per line), zero spacing between players (gap-0 for 5+ player formations), tighter formation row spacing (space-y-2), and dramatically increased text sizes (team: 28px, player: 32px, points: 52px, fixtures: 26px) for optimal visibility on small screens. Results and Fixtures page features responsive statistics cards, arrow-only navigation buttons on mobile, stacked fixture card layouts with vertical team/score display, 44px touch-friendly buttons, and icon-only action buttons.
SEO Optimization: Comprehensive search engine optimization implemented with keyword-rich meta tags targeting FPL predictions, analytics, player projections, team projections, and related search terms. Open Graph and Twitter Card tags for enhanced social media sharing. JSON-LD structured data for search engines. Complete sitemap.xml with all 20+ pages and robots.txt for proper crawling. Primary keywords: FPL predictions, Fantasy Premier League analytics, player projections, team projections, captain selector, transfer planner, price tracker, fixture analyzer.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite for building.
- **Routing**: Wouter for client-side routing; Goals and Clean Sheets is the default route.
- **State Management**: TanStack Query for server state.
- **UI Library**: shadcn/ui components built on Radix UI primitives.
- **Styling**: Tailwind CSS with a custom FPL-themed design system.
- **Navigation**: Side navigation bar.
- **Component Structure**: Modular components with reusable UI elements.
- **UI/UX Decisions**: Enhanced UI design for My Team section; color-coded defensive metrics in Player Statistics; streamlined interfaces for Transfer Tracker and Open FPL Projections. Standardized header system across all application pages. Unified pitch view styling across all pages (My Dashboard, Top 25/50 Managers, Content Creators) with 403x302 SVG canvas, 19% jersey width, consistent text sizes (team: 28px, name: 32px, points: 52px), and single opponent display with (H/A) indicators.

### Backend Architecture
- **Runtime**: Node.js with Express.js.
- **API Design**: RESTful API endpoints prefixed with `/api/`.
- **Data Fetching**: Proxy server for official FPL API data.
- **Caching Strategy**: Database-backed projection caching with PostgreSQL for ultra-fast response times.
- **Performance Optimization**: Dedicated ProjectionService with intelligent caching for faster subsequent requests.

### Data Storage Solutions
- **Primary Storage**: In-memory storage (Map and object caching).
- **Database Configuration**: Drizzle ORM for PostgreSQL (Neon Database) for historical data and daily price tracking.
- **Data Persistence**: Automated daily collection of player prices, ownership, and transfer data.
- **Data Consistency**: All projection tools use deterministic calculations based on team ID and gameweek seeds. MASTER_TEAM_DEFAULTS serves as the central configuration source for all projection multipliers.

### API Integration
- **External API**: Official Fantasy Premier League API (`https://fantasy.premierleague.com/api`).
- **Key Endpoints**: `/bootstrap-static/`, `/element-summary/:playerId`, `/api/players/historical/:season`, `/api/seasons`.
- **Data Validation**: Zod schemas for type-safe API response parsing.
- **Historical Data**: Fetches previous seasons' data from `history_past` field.

### Feature Specifications
- **My Dashboard**: Comprehensive FPL overview combining My Live Rank, My Team, and My Leagues in a single tabbed interface, serving as the home page.
- **Player Projections**: AI-powered projection model for minutes, goals, assists, clean sheets, bonus points, and CBIT% for upcoming weeks.
- **Player Goals Scored Projections**: Individual player goal projections with advanced fixture-level hybrid calculation methodology, including penalty taker adjustments.
- **Player Assist Projections**: Individual player assist projections with dual-tab interface and hybrid calculation methodology.
- **Player Total Points Projections**: Comprehensive FPL points projection combining all 10 official FPL scoring components into gameweek table format with advanced pure projection methodology, authentic FPL scoring rules, and optimized cached endpoints.
- **Match Projections**: Data aggregator displaying projected goals and clean sheet odds for each team by gameweek.
- **Team Goal/Clean Sheet Projections**: Advanced team-level forecasting using 8-phase spread betting market analysis and statistical modeling.
- **Goal/Assist Share**: Dedicated tools showing team expected goals/assists breakdown by player percentage share, extended to 6 gameweeks with historical data and proper sorting.
- **Captain Selector**: Enhanced with historical captaincy performance data, 6-factor scoring algorithm, and ownership analysis.
- **Transfer Tracker**: Authentic transfer data analysis using real FPL API data.
- **Open FPL Projections**: Advanced machine learning projection tool with position-specific ensemble models, multi-horizon forecasting, and hourly updates.
- **Price Tracker**: Complete FPL API-based system tracking actual price changes.
- **Results Projections**: Match prediction tool displaying predicted scores, calculated win probabilities, expected goals, and clean sheet odds for future gameweeks only.
- **Historical Data**: Year selection functionality for player statistics from 2016/17 season onwards.
- **Defensive Contribution Analytics**: Integration of new FPL API defensive data points and comprehensive projection model using attacking tier system for fixture-aware variance calculations.
- **Historical Player Stats Database**: Comprehensive PostgreSQL table with complete historical data for all players across 9 seasons (2016/17-2024/25).
- **Goal Range Compression**: Implemented realistic Premier League goal distributions by compressing team season totals.
- **Clean Sheet Formula**: Updated to exponential decay calculation.
- **Enhanced Context Multipliers**: Integrated weather, referee influence, post-international break, and travel distance fatigue multipliers.
- **Comprehensive FPL Scoring System**: Implemented probability-based calculations for all official FPL scoring components with hybrid methodology.
- **Position-Based Share Caps**: Implemented realistic caps for goal and assist share calculations.
- **Perfect Mathematical Balance**: Enhanced normalization system with redistribution logic ensures team and player totals maintain perfect balance.
- **Transfer Planner**: Comprehensive transfer planning tool with database schema, CRUD API endpoints, Manager ID caching, gameweek selector (next 6 GWs), mode selection (Auto/Manual), chip planning, draft management (Base + A-E drafts), Team Evolution visualization (showing team changes across all 6 gameweeks for both Manual and Auto modes), Draft Comparison table, and Projected Points analysis. Section order: Chips Planning → Draft Team Selection (Manual OR Auto based on selected mode) → Team Evolution (visible for both modes) → Draft Comparison → Projected Points.

### Type Safety & Validation
- **Schema Validation**: Zod schemas for API responses.
- **TypeScript Configuration**: Strict TypeScript with path mapping.
- **Shared Types**: Common types and schemas shared between client and server.

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