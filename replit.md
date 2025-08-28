# FPL Dilemmas

## Overview
FPL Dilemmas is an analytics application for Fantasy Premier League (FPL) managers. It provides comprehensive player statistics, projections, and insights by analyzing data from the official FPL API. Its purpose is to empower users to make informed decisions for their fantasy teams through intuitive data presentation, filtering, sorting, and statistical analysis, ultimately aiming to be a go-to tool for optimizing team performance and gaining a competitive edge. The application offers advanced features like AI-powered player projections, detailed team analysis, and comprehensive historical data.

## User Preferences
Preferred communication style: Simple, everyday language.
Site tagline: Previously used "Analytical tools to beat the deadline blues" - removed from all tool headers per user request. Now uses "Advanced FPL Analytics Platform" in sidebar and home page.
Navigation priority: My Live Rank as default landing page, with side navigation for all tools.
Manager ID caching: All FPL manager tools (My Live Rank, My Team, My Leagues) now automatically save and pre-load the last searched Manager ID using localStorage for seamless cross-tool experience.
Projection Tools Limit: All projection tools (Player Projections, Match Projections, Team Goal/CS Projections, Goal Share, Assist Share) now limited to next 6 gameweeks only for focused analysis with updated dropdowns and defaults. Updated to show only future gameweeks excluding current/finished gameweeks for better forward-looking analysis. Match Projections now dynamically adapts to exclude started gameweeks. Goal Share and Assist Share successfully extended to display data for all 6 gameweeks with proper API integration.
Most popular tools: Player Statistics, My Live Rank, and Fixture Analyzer.
Fixture Analyzer display: Shows 6 gameweeks by default with user customization up to GW38 for comprehensive fixture analysis.
FPL Content Creators: Updated terminology from "Team ID" to "Manager ID" throughout the codebase for better clarity. Table structure updated to show separate columns for Creator, Manager ID, Player Name, with Team Name column hidden as requested. Manager IDs hardcoded to correct authentic values (FPL Harry: 1320, FPL Pras: 2570) ensuring consistency between development and production environments.

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
- **Caching Strategy**: In-memory caching using a custom storage interface.
- **Development Setup**: Vite integration for hot module replacement.

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
- **Player Projections**: AI-powered projection model for minutes, goals, assists, clean sheets, bonus points, and CBIT% for upcoming weeks. Goals and assists derived from Goal Share and Assist Share tools.
- **Player Goals Scored Projections**: Individual player goal projections for next 6 gameweeks (GW3-GW8) with 2 decimal precision, showing both 6-gameweek and season totals. Uses same styling and functionality as Team Goals Scored with clickable column headers for sorting.
- **Match Projections**: Data aggregator displaying projected goals and clean sheet odds for each team by gameweek.
- **Team Goal/Clean Sheet Projections**: Advanced team-level forecasting using 8-phase spread betting market analysis and statistical modeling.
- **Goal/Assist Share**: Dedicated tools showing team expected goals/assists breakdown by player percentage share, extended to 6 gameweeks with historical data.
- **Captain Selector**: Enhanced with historical captaincy performance data (2016-2024), 6-factor scoring algorithm, and ownership analysis.
- **Transfer Tracker**: Authentic transfer data analysis (transfers in/out, net transfers, ownership percentages) using real FPL API data.
- **Open FPL Projections**: Advanced machine learning projection tool using position-specific ensemble models, multi-horizon forecasting, and hourly updates.
- **Price Tracker**: Split into "Recent Price Changes" (actual FPL API data) and "Predicted Price Changes" (community-researched algorithm with dual progress bars).
- **Historical Data**: Year selection functionality for player statistics from 2016/17 season onwards.
- **Defensive Contribution Analytics**: Integration of new FPL API defensive data points (Defensive Contribution, Tackles, Recoveries, CBI, Starts) for 2025/26 season.
- **Goal Range Compression**: Implemented realistic Premier League goal distributions by compressing team season totals (30-85 goal range).
- **Clean Sheet Formula**: Updated to exponential decay calculation (CS = 100 × e^(-1.1 × xGA)).
- **Enhanced Context Multipliers**: Integrated weather, referee influence, post-international break, and travel distance fatigue multipliers.

### Type Safety & Validation
- **Schema Validation**: Zod schemas in `shared/schema.ts` for API responses.
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