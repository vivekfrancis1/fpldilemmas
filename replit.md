# FPL Dilemmas

## Overview
FPL Dilemmas is an analytics application for Fantasy Premier League (FPL) managers. Its purpose is to empower users to make informed decisions for their fantasy teams through intuitive data presentation, filtering, sorting, and statistical analysis. The application aims to be a go-to tool for optimizing team performance and gaining a competitive edge, offering advanced features like AI-powered player projections, detailed team analysis, and comprehensive historical data.

## User Preferences
Preferred communication style: Simple, everyday language.
**Development Protocol**: Always ask permission before making any changes to logic, calculations, or functionality. No unauthorized modifications are permitted.
Site tagline: "FPL made smarter with predictive analytics." displayed in header.
Navigation priority: Goals and Clean Sheets as default landing page (home route '/'), with side navigation for all tools.
Manager ID caching: All FPL manager tools (My Live Rank, My Team, My Leagues) now automatically save and pre-load the last searched Manager ID using localStorage for seamless cross-tool experience.
Projection Tools Limit: Both team-level and player-level projection tools now generate 12 gameweeks of data with dropdown filters showing 12 weeks but defaulting to 6 gameweeks view for consistent user experience. All tools show only future gameweeks excluding current/finished gameweeks. Player projection pages (goals, assists, goals scored, bonus points, saves, total points) use shared gameweek utilities with proper validation and loading states.
Most popular tools: Player Statistics, My Live Rank, and Fixture Analyzer.
Fixture Analyzer display: Shows 6 gameweeks by default with user customization up to GW38.
FPL Content Creators Admin: Streamlined admin interface with only essential fields: Name, Manager ID, Description, Twitter Handle, and YouTube URL. Both Twitter and YouTube fields are optional and can be left blank. Complete CRUD functionality implemented including delete feature. Admin URL updated to /admin-content-creators.
Navigation Cleanup: Hidden Player Yellow Cards, Red Cards, Goals Conceded, and Bonus Points tools from sidebar navigation. These components are now integrated into the comprehensive Player Total Points tool.
Mobile Optimization: Comprehensive responsive design implemented across major pages (Current Standings, Player Statistics, Transfer Planner, My Dashboard, Top 25/50 Managers, Content Creators, Results and Fixtures, My Team Projected Points) with adaptive column hiding, responsive grids, mobile-friendly touch targets, and natural page scrolling. Transfer Planner pitch view aggressively optimized for maximum mobile screen usage.
SEO Optimization: Comprehensive search engine optimization implemented with keyword-rich meta tags targeting FPL predictions, analytics, player projections, team projections, and related search terms. Open Graph and Twitter Card tags for enhanced social media sharing. JSON-LD structured data for search engines. Complete sitemap.xml with all 20+ pages and robots.txt for proper crawling. Primary keywords: FPL predictions, Fantasy Premier League analytics, player projections, team projections, captain selector, transfer planner, price tracker, fixture analyzer.
Loading Experience: Enhanced loading screens implemented across all major slow-loading pages using shared LoadingExperience component with 4 variants (analysis, simulation, table, optimization). Standardized loading UI with Loader2 spinning icon, Card-based design, contextual messages, and 3-step progress indicators with staggered animations. Implemented on: Transfer Recommendations, Transfer Planner, Best Free Hit Team, OpenFPL Projections, My Dashboard, Top 25 Managers, Top 50 Managers, and Player Stats pages.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite.
- **Routing**: Wouter for client-side routing; Goals and Clean Sheets is the default route.
- **State Management**: TanStack Query for server state.
- **UI Library**: shadcn/ui components built on Radix UI primitives.
- **Styling**: Tailwind CSS with a custom FPL-themed design system.
- **UI/UX Decisions**: Enhanced UI design for My Team section; color-coded defensive metrics in Player Statistics; streamlined interfaces for Transfer Tracker and Open FPL Projections. Unified pitch view styling and standardized header system.

### Backend Architecture
- **Runtime**: Node.js with Express.js.
- **API Design**: RESTful API endpoints prefixed with `/api/`.
- **Data Fetching**: Proxy server for official FPL API data.
- **Caching Strategy**: Database-backed projection caching with PostgreSQL.
- **Performance Optimization**: Dedicated ProjectionService with intelligent caching.

### Data Storage Solutions
- **Primary Storage**: In-memory storage (Map and object caching).
- **Database Configuration**: Drizzle ORM for PostgreSQL (Neon Database) for historical data and daily price tracking.
- **Data Persistence**: Automated daily collection of player prices, ownership, and transfer data.
- **Data Consistency**: All projection tools use deterministic calculations based on team ID and gameweek seeds. MASTER_TEAM_DEFAULTS serves as the central configuration source for all projection multipliers.

### API Integration
- **External API**: Official Fantasy Premier League API.
- **Data Validation**: Zod schemas for type-safe API response parsing.
- **Historical Data**: Fetches previous seasons' data from `history_past` field.

### Feature Specifications
- **My Dashboard**: Comprehensive FPL overview combining My Live Rank, My Team, and My Leagues in a single tabbed interface, serving as the home page.
- **Player Projections**: AI-powered projection model for various player statistics (minutes, goals, assists, clean sheets, bonus points, CBIT%). **AFCON 2025 Integration**: Automatic availability adjustments for 51 African players traveling to Morocco (December 21, 2025 - January 18, 2026) with graduated return percentages: GW17-19 (0%), GW20 (25%), GW21 (50%), GW22 (75%).
- **Team Projections**: Advanced team-level forecasting for goals and clean sheets using 8-phase spread betting market analysis and statistical modeling.
- **Goal/Assist Share**: Dedicated tools showing team expected goals/assists breakdown by player percentage share.
- **Captain Selector**: Enhanced with historical captaincy performance data, 6-factor scoring algorithm, and ownership analysis.
- **Transfer Tracker**: Authentic transfer data analysis using real FPL API data.
- **Open FPL Projections**: Advanced machine learning projection tool with position-specific ensemble models, multi-horizon forecasting, and hourly updates.
- **Price Tracker**: FPL API-based system tracking actual price changes.
- **Results Projections**: Match prediction tool displaying predicted scores, win probabilities, expected goals, and clean sheet odds for future gameweeks.
- **Results and Fixtures**: Comprehensive match schedule with LIVE match indicators, clickable player stats, and automatic 30-second background refresh during live matches. Player Stats modal displays categorized performance data.
- **Historical Data**: Year selection functionality for player statistics from 2016/17 season onwards.
- **Defensive Contribution Analytics**: Integration of new FPL API defensive data points and comprehensive projection model.
- **Comprehensive FPL Scoring System**: Implemented probability-based calculations for all official FPL scoring components with hybrid methodology.
- **Transfer Planner**: Comprehensive transfer planning tool with gameweek selector, team selection interface, chip planning, draft management (Base + A-E drafts), Team Evolution visualization, and Projected Points analysis. Draft Comparison table intelligently shown only when there are at least 2 unique (non-duplicate) drafts. Fully implements FPL 2024/25 rule changes including 5 free transfers and GW16 AFCON Free Transfer Top-Up. Auto lineup optimization feature has been completely removed to simplify the interface.
- **Tournament Availability Tracking**: AFCON 2025 player availability automatically factored into all projection calculations across 15 participating nations (Egypt, Nigeria, Senegal, Ivory Coast, Cameroon, Morocco, Algeria, DR Congo, Mali, Burkina Faso, Angola, South Africa, Tunisia, Zimbabwe, Mozambique).

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