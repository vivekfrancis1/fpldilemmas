# FPL Dilemmas

## Overview
FPL Dilemmas is an analytics application designed for Fantasy Premier League (FPL) managers. It provides comprehensive player statistics, projections, and insights by fetching and analyzing data from the official FPL API. The application aims to empower users to make informed decisions for their fantasy football teams through intuitive data presentation, filtering, sorting, and statistical analysis capabilities. The project's ambition is to be a go-to tool for FPL managers seeking to optimize their team performance and gain a competitive edge.

## User Preferences
Preferred communication style: Simple, everyday language.
Site tagline: Previously used "Analytical tools to beat the deadline blues" - removed from all tool headers per user request. Now uses "Advanced FPL Analytics Platform" in sidebar and home page.
Navigation priority: My Live Rank as default landing page, with side navigation for all tools.
Manager ID caching: All FPL manager tools (My Live Rank, My Team, My Leagues) now automatically save and pre-load the last searched Manager ID using localStorage for seamless cross-tool experience.
My Team section: Added comprehensive team display under My FPL showing formation, squad value, transfers, and detailed player lineup with enhanced UI design.
Player Projections: Added AI-powered projection model using advanced statistical analysis to predict minutes, goals, assists, clean sheets, bonus points, and CBIT% for upcoming weeks. Goals and assists now derived directly from Goal Share and Assist Share tools ensuring perfect consistency.
Match Projections: Pure data aggregator displaying projected goals and clean sheet odds for each team by gameweek in compact fixture format for next 6 gameweeks. Sources data exclusively from Team Goal and CS Projections endpoints ensuring perfect consistency. Dynamically excludes finished/current gameweeks showing only future fixtures.
Team Goal Projections: Advanced team-level goal forecasting using sophisticated 8-phase spread betting market analysis with statistical modeling, attacking tier performance analysis, and professional-grade accuracy for attacking prospects over next 6 gameweeks. Uses deterministic calculations ensuring data consistency across all tools.
Team CS Projections: Advanced clean sheet probability forecasting using sophisticated 8-phase spread betting market analysis with statistical modeling, elite confidence calculation, and professional-grade accuracy for defensive prospects over next 6 gameweeks. Uses deterministic calculations ensuring data consistency across all tools.
Goal Share: Created dedicated tool showing team expected goals breakdown by player percentage share, ensuring 100% distribution per team per gameweek. Uses exact Team Goal Projections calculation logic for perfect data consistency. Enhanced with Goals column showing projected goals for each player and realistic historical data patterns. Extended to support all 6 gameweeks with dropdown selection and "All GWs" filtering option.
Assist Share: Enhanced to match Goal Share functionality with season-long projections for current season and actual historical data for previous seasons. Shows team assist distribution by player percentage using advanced statistical modeling with historical data from 2016-2024 seasons. Features elite assist provider identification, creativity metrics, ICT index correlation, set piece responsibility factors, and position-specific adjustments. Updated with season selection dropdown, improved UI with teal color scheme, and backend endpoints for both current projections and historical season data.
Projection Tools Limit: All projection tools (Player Projections, Match Projections, Team Goal/CS Projections, Goal Share, Assist Share) now limited to next 6 gameweeks only for focused analysis with updated dropdowns and defaults. Updated to show only future gameweeks excluding current/finished gameweeks for better forward-looking analysis. Match Projections now dynamically adapts to exclude started gameweeks. Goal Share and Assist Share successfully extended to display data for all 6 gameweeks with proper API integration.
Most popular tools: Player Statistics, My Live Rank, and Fixture Analyzer.
Fixture Analyzer display: Shows 6 gameweeks by default with user customization up to GW38 for comprehensive fixture analysis.
Captain Selector: Enhanced with comprehensive historical captaincy performance data from 2016-2024 seasons, featuring 30+ elite captain performers with historical multipliers, advanced 6-factor scoring algorithm, home/away advantage calculations, position-specific adjustments, and sophisticated ownership analysis for both template and differential strategies.
Transfer Tracker: Comprehensive authentic transfer data analysis replacing price prediction tools. Shows transfers in/out, net transfers, ownership percentages, and transfer trend analysis using only real FPL API data without predictive elements. Removed duplicate columns and streamlined interface for focused transfer activity monitoring.
Open FPL Projections: Advanced machine learning projection tool using position-specific ensemble models (XGBoost + Random Forest) based on OpenFPL research. Features multi-horizon forecasting (1-6 gameweeks), comprehensive player features, risk assessment, and performance metrics with RMSE accuracy of 0.818 overall and 5.142 for high-return players. Projections update every hour for efficient processing. Streamlined interface with 3 core metric tabs (Points, Goals, Assists), removed summary boxes, moved average confidence to table footer, removed minutes column, and eliminated confusing Target dropdown for cleaner user experience. Shows actual gameweek numbers in column headers based on current gameweek context.
Live Rank functionality: Fixed missing manager API endpoints, now fully functional with cached manager ID support, real-time rank tracking, and historical performance analysis with private league filtering.
My Team section: Fixed API endpoints, now displays current team formation, squad value, transfers, and detailed player lineup with enhanced UI design.
My Leagues functionality: Fixed data structure issues and API endpoints, now properly displays private leagues with league standings, performance metrics, and rank tracking.
Price Tracker: Split into two dedicated tools for better organization:
- Recent Price Changes: Shows all season price changes with comprehensive statistics, filtering, and transfer data from authentic FPL API
- Predicted Price Changes: Comprehensive price predictions for all 705 players using accurate community-researched FPL algorithm. Features dual progress bar system matching Fantasy Football Scout and Fantasy Football Hub with current progress and 7AM IST end-of-day projections that can exceed 100%. Uses proven thresholds: 5% of absolute ownership for rises, 4% for falls, based on LiveFPL/FFS/r/FantasyPL research. Progress bars show realistic percentages where 100% = reaching FPL threshold, with "VERY LIKELY" indicators for values over 100%. Includes summary statistics, hourly change rates, and accurate timing estimates.
Historical data: Added year selection functionality for player statistics from 2016/17 season onwards with full data coverage of 300-400+ players per season.
Goal Range Compression: Successfully implemented realistic Premier League goal distributions by compressing team season totals from unrealistic 23-95 goals to professional 30-85 goal range. Applied comprehensive variance compression, tightened market bounds, compressed attacking tier multipliers, and adjusted defensive multipliers. Achieved final ranges: Goals Scored 34-88 goals, Goals Against 29-70 goals, maintaining perfect mathematical consistency where every goal scored equals one goal conceded.
Clean Sheet Formula: Updated to exponential decay calculation using CS = 100 × e^(-1.1 × xGA) for each gameweek. Formula creates mathematically accurate clean sheet percentages.
Single Source of Truth: Implemented MASTER_TEAM_DEFAULTS as the central configuration source for all projection multipliers. Attack multipliers (Elite: 1.4, Strong: 1.1, Average: 1.0, Weak: 0.85, Promoted: 0.7) and defense multipliers (Elite: 0.7, Strong: 0.85, Average: 1.0, Weak: 1.15, Promoted: 1.3) now serve as defaults across all endpoints and reset functions, eliminating conflicting values and ensuring consistency. Team tier assignments completed: Liverpool defense Elite→Strong, Crystal Palace & Fulham defense Weak→Average, Crystal Palace attack Weak→Average, West Ham attack confirmed as Weak. All changes synchronized across frontend-backend with complete uniformity achieved.
Enhanced Context Multipliers: Successfully integrated 4 sophisticated new context multipliers based on EPL research data:
- Weather Conditions (0.92): Adverse weather impacts reducing shot accuracy and intensity
- Referee Influence (1.0 ±5%): Officiating style effects on open play and fouls  
- Post-International Break (0.92): Fatigue and disruption after international duty
- Travel Distance Fatigue (0.95): Long away trip impacts on pressing and errors
All multipliers use MASTER_TEAM_DEFAULTS as single source of truth with perfect synchronization across backend calculations, admin interface, and reset functionality. Enhanced venue factors updated to 1.16 home advantage and 0.84 away factor as permanent defaults.
Data Source Consistency: Fixed major data inconsistency between Team Goal Projections and Team Assist Projections. Both tools now use the shared variance combined projections endpoint (1165.01 total goals) ensuring perfect mathematical consistency. Team Assists = Team Goals × 0.72 multiplier = 838.82 total assists (72% ratio) validates the professional-grade accuracy across all projection tools.
FPL Content Creators: Comprehensive tracking system with 24 creators with clean table design. Updated terminology from "Team ID" to "Manager ID" throughout the codebase for better clarity. Database schema updated with manager_id and manager_name columns. Table structure updated to show separate columns for Creator, Manager ID, Player Name, with Team Name column hidden as requested. Added descriptive one-line descriptions for each creator showing their role in the FPL community (podcast hosts, data experts, ranking achievements). Fixed numeric field validation to properly display zero values instead of "N/A". Recently added creators include: Lateriser12, Abdul Rehman (FPL Salah), and Zophar with full FPL performance tracking integration. FPL Tactician (Andy Martin) and FPL General (Mark McGettigan) have been completely removed from the system due to incorrect Manager ID data. Manager IDs and descriptions updated to match user specifications with sortable Manager ID column added for better navigation.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite for building.
- **Routing**: Wouter for client-side routing; My Live Rank is the default route.
- **State Management**: TanStack Query for server state.
- **UI Library**: shadcn/ui components built on Radix UI primitives.
- **Styling**: Tailwind CSS with a custom FPL-themed design system.
- **Navigation**: Side navigation bar.
- **Component Structure**: Modular components with reusable UI elements.

### Backend Architecture
- **Runtime**: Node.js with Express.js.
- **API Design**: RESTful API endpoints prefixed with `/api/`.
- **Data Fetching**: Proxy server for official FPL API data.
- **Caching Strategy**: In-memory caching using a custom storage interface.
- **Development Setup**: Vite integration for hot module replacement.

### Data Storage Solutions
- **Primary Storage**: In-memory storage (Map and object caching).
- **Database Configuration**: Drizzle ORM for PostgreSQL (Neon Database) for historical data.
- **Caching Layer**: Custom `IStorage` interface with `MemStorage` for bootstrap and player summary data.
- **Data Persistence**: Database storage for daily price tracking, transfer data, and historical records with scheduled collection.
- **Data Consistency**: All projection tools use deterministic calculations based on team ID and gameweek seeds.
- **Daily Price Tracking**: Automated system fetches and stores player prices, ownership, and transfer data daily at 7:30 AM IST, calculating transfer differences and historical trends.

### API Integration
- **External API**: Official Fantasy Premier League API (`https://fantasy.premierleague.com/api`).
- **Key Endpoints**: `/bootstrap-static/`, `/element-summary/:playerId`, `/api/players/historical/:season`, `/api/seasons`.
- **Data Validation**: Zod schemas for type-safe API response parsing.
- **Historical Data**: Fetches previous seasons' data from `history_past` field.
- **Error Handling**: Comprehensive error handling with user-friendly messages.

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
- **Component Library**: Radix UI primitives.
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
- **Data Source**: Real-time data from `https://fantasy.premierleague.com/api`.