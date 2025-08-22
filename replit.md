# FPL Dilemmas

## Overview

FPL Dilemmas is a Fantasy Premier League (FPL) analytics application that provides comprehensive player statistics and insights to help fantasy football managers make informed decisions. The app fetches data from the official FPL API and presents it through an intuitive interface with filtering, sorting, and statistical analysis capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.
Site tagline: "Analytical tools to beat the deadline blues" (updated December 2024)
Navigation priority: Player Statistics as default landing page, with side navigation for all tools (updated December 2024)
Manager ID caching: All FPL manager tools (My Live Rank, My Team, My Leagues) now automatically save and pre-load the last searched Manager ID using localStorage for seamless cross-tool experience (implemented January 2025, enhanced August 2025)
My Team section: Added comprehensive team display under My FPL showing formation, squad value, transfers, and detailed player lineup with enhanced UI design (January 2025)
Player Projections: Added AI-powered projection model using advanced statistical analysis to predict minutes, goals, assists, clean sheets, bonus points, and CBIT% for upcoming weeks - renamed from "Projections" for clarity with data consistency across all projection tools. Goals and assists now derived directly from Goal Share and Assist Share tools ensuring perfect consistency (January 2025)
Match Odds: Pure data aggregator displaying projected goals and clean sheet odds for each team by gameweek in compact fixture format for next 6 gameweeks. Sources data exclusively from Team Goal and CS Projections endpoints ensuring perfect consistency. Dynamically excludes finished/current gameweeks showing only future fixtures (January 2025, August 2025)
Team Goal Projections: Advanced team-level goal forecasting using sophisticated 8-phase spread betting market analysis with statistical modeling, attacking tier performance analysis, and professional-grade accuracy for attacking prospects over next 6 gameweeks. Uses deterministic calculations ensuring data consistency across all tools (January 2025)
Team CS Projections: Advanced clean sheet probability forecasting using sophisticated 8-phase spread betting market analysis with statistical modeling, elite confidence calculation, and professional-grade accuracy for defensive prospects over next 6 gameweeks. Uses deterministic calculations ensuring data consistency across all tools (January 2025)
Goal Share: Created dedicated tool showing team expected goals breakdown by player percentage share, ensuring 100% distribution per team per gameweek. Uses exact Team Goal Projections calculation logic for perfect data consistency. Enhanced with Goals column showing projected goals for each player and realistic historical data patterns. Extended to support all 6 gameweeks (GW2-GW7) with dropdown selection and "All GWs" filtering option (January 2025, August 2025)
Assist Share: Added complementary tool to Goal Share showing team expected assists breakdown by player percentage, weighted by creativity and assist history with 100% team distribution, ensuring assists ≤ goals constraint for logical consistency. Extended to support all 6 gameweeks (GW2-GW7) with dropdown selection and team filtering capabilities. Enhanced with comprehensive historical assist data from 2016-2024 seasons, elite assist provider identification (40+ players), advanced creativity metrics, ICT index correlation, set piece responsibility factors, and position-specific adjustments for fullbacks vs center-backs (January 2025, August 2025)
Projection Tools Limit: All projection tools (Player Projections, Match Odds, Team Goal/CS Projections, Goal Share, Assist Share) now limited to next 6 gameweeks only for focused analysis with updated dropdowns and defaults. Updated to show only future gameweeks excluding current/finished gameweeks for better forward-looking analysis. Match Odds now dynamically adapts to exclude started gameweeks (e.g., GW2 excluded when current). Goal Share and Assist Share successfully extended to display data for all 6 gameweeks with proper API integration (August 2025)
Most popular tools: Player Statistics, My Live Rank, and Fixtures (updated January 2025)
Captain Selector: Enhanced with comprehensive historical captaincy performance data from 2016-2024 seasons, featuring 30+ elite captain performers with historical multipliers, advanced 6-factor scoring algorithm (form 30%, fixtures 25%, ICT 20%, consistency 10%, momentum 10%, ownership 5%), home/away advantage calculations, position-specific adjustments, and sophisticated ownership analysis for both template and differential strategies (August 2025)
Transfer Planner: Enhanced with comprehensive historical transfer performance data from 2016-2024 seasons, featuring 30+ reliable transfer targets with historical multipliers, advanced 8-factor scoring algorithm (form 25%, value 20%, fixtures 20%, ICT 15%, consistency 10%, momentum 5%, price change 3%, reliability 2%), position-specific value adjustments, weighted fixture analysis with home advantage, injury risk assessment, and sophisticated transfer momentum analysis (August 2025)
Live Rank functionality: Fixed missing manager API endpoints, now fully functional with cached manager ID support, real-time rank tracking, and historical performance analysis with private league filtering (August 2025)
My Team section: Fixed API endpoints, now displays current team formation, squad value, transfers, and detailed player lineup with enhanced UI design (August 2025)
My Leagues functionality: Fixed data structure issues and API endpoints, now properly displays private leagues with league standings, performance metrics, and rank tracking (August 2025)
Price Tracker: Enhanced with sophisticated ownership percentage-based price prediction algorithm using transfer velocity, dynamic thresholds (5% of owned players with minimums), price tier multipliers, and authentic FPL price change data from cost_change_event field sorted by recency. Now includes daily price tracking system that fetches data at 7:30 AM IST, storing historical prices, ownership, transfers, and calculating daily transfer differences for comprehensive price analysis. Price predictions adhere to official FPL limits: maximum 0.1m per day, 0.3m per gameweek (August 2025)
Historical data: Added year selection functionality for player statistics from 2016/17 season onwards with full data coverage of 300-400+ players per season (fully functional August 2025)


## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing with Player Statistics as default route (/)
- **State Management**: TanStack Query (React Query) for server state management
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with a custom design system featuring FPL-themed colors
- **Navigation**: Side navigation bar with Layout component wrapping all pages
- **Component Structure**: Modular components in `client/src/components/` with reusable UI components in `client/src/components/ui/`

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **API Design**: RESTful API endpoints prefixed with `/api/`
- **Data Fetching**: Proxy server that fetches data from the official Fantasy Premier League API
- **Caching Strategy**: In-memory caching using a custom storage interface to reduce API calls
- **Development Setup**: Vite integration for hot module replacement in development

### Data Storage Solutions
- **Primary Storage**: In-memory storage using Map and object caching
- **Database Configuration**: Drizzle ORM configured for PostgreSQL (via Neon Database) with active database storage for historical data
- **Caching Layer**: Custom `IStorage` interface with `MemStorage` implementation for bootstrap data and player summaries
- **Data Persistence**: Database storage for daily price tracking, transfer data, and historical records with scheduled data collection
- **Data Consistency**: All projection tools use deterministic calculations based on team ID and gameweek seeds, ensuring identical values across multiple API calls (August 2025)
- **Daily Price Tracking**: Automated system fetching player prices, ownership, and transfer data at 7:30 AM IST daily, calculating daily transfer differences and storing historical trends for comprehensive price analysis. Recent Price Changes now shows all season price changes sorted by recency (most recent first), displaying start price, current price, total season change, and recent gameweek changes. Price Predictions shows players likely to rise/fall based on transfer activity and ownership thresholds (August 2025)

### API Integration
- **External API**: Fantasy Premier League official API (`https://fantasy.premierleague.com/api`)
- **Key Endpoints**:
  - `/bootstrap-static/` - Complete player, team, and position data
  - `/element-summary/:playerId` - Individual player fixtures and history
  - `/api/players/historical/:season` - Historical player statistics by season
  - `/api/seasons` - Available historical seasons list

- **Data Validation**: Zod schemas for type-safe API response parsing
- **Historical Data**: Fetches previous seasons data from `history_past` field in player summaries

- **Error Handling**: Comprehensive error handling with user-friendly error messages

### Type Safety & Validation
- **Schema Validation**: Zod schemas in `shared/schema.ts` for API responses
- **TypeScript Configuration**: Strict TypeScript with path mapping for clean imports
- **Shared Types**: Common types and schemas shared between client and server

### Development Workflow
- **Build System**: Vite for frontend bundling, esbuild for server bundling
- **Development Server**: Integrated Vite dev server with Express API proxy
- **Code Organization**: Monorepo structure with shared utilities and clear separation of concerns

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18+ with React DOM and TypeScript support
- **Build Tools**: Vite for frontend development and building, esbuild for server bundling
- **Routing**: Wouter for lightweight client-side routing

### UI and Styling
- **Component Library**: Radix UI primitives for accessible component foundations
- **Styling**: Tailwind CSS with PostCSS for utility-first styling
- **Icons**: Lucide React for consistent iconography
- **Fonts**: Google Fonts integration for typography

### Data Management
- **Server State**: TanStack Query for caching and synchronizing server state
- **Form Handling**: React Hook Form with Hookform Resolvers for form validation
- **Validation**: Zod for runtime type checking and schema validation

### Database and ORM
- **ORM**: Drizzle ORM configured for PostgreSQL
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Migrations**: Drizzle Kit for database schema management

### Development and Build Tools
- **TypeScript**: Full TypeScript support with strict configuration
- **Session Management**: Express session with connect-pg-simple (configured but not actively used)
- **Development Utilities**: Replit-specific plugins for development environment integration

### External APIs
- **FPL API**: Official Fantasy Premier League API for all player and game data
- **Data Source**: Real-time data from `https://fantasy.premierleague.com/api`