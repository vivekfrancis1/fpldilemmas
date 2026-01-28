# FPL Dilemmas Projection System Documentation

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture & Data Flow](#architecture--data-flow)
3. [Core Projection Algorithms](#core-projection-algorithms)
4. [Configuration System](#configuration-system)
5. [Caching Strategy](#caching-strategy)
6. [API Endpoints](#api-endpoints)
7. [Scheduling & Automation](#scheduling--automation)
8. [Database Schema](#database-schema)
9. [Performance Optimizations](#performance-optimizations)
10. [Troubleshooting Guide](#troubleshooting-guide)

---

## System Overview

FPL Dilemmas uses a sophisticated multi-layered projection system that combines statistical modeling, machine learning algorithms, and real-time data processing to generate accurate Fantasy Premier League player and team projections.

### Key Principles

1. **Data-Driven**: All projections based on official FPL API data and historical statistics
2. **Mathematical Balance**: Team and player totals maintain perfect mathematical consistency
3. **Fixture-Aware**: Projections consider opponent strength, venue, and context
4. **Position-Specific**: Different algorithms and caps for different player positions
5. **Cache-Optimized**: Multi-tier caching for sub-second response times

### Supported Projection Types

- **Team Goal Projections**: 8-phase algorithm with market dynamics
- **Player Goal Projections**: Pure projection methodology with penalty adjustments
- **Player Assist Projections**: Dual-tab interface with position-based caps
- **Player Minutes**: Fixture-aware rotation and injury risk modeling
- **Player Total Points**: Comprehensive FPL scoring (all 10 components)
- **Defensive Contributions**: Position-specific tick mark calculations
- **Clean Sheet Probabilities**: Exponential decay calculations
- **Match Predictions**: Win probabilities and predicted scores

---

## Architecture & Data Flow

### High-Level Architecture

```
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│   FPL API Source    │────│  Data Ingestion      │────│   Raw Data Cache    │
│                     │    │  - Bootstrap Static  │    │                     │
│ - Bootstrap Static  │    │  - Fixtures          │    │ - Player Data       │
│ - Fixtures          │    │  - Element Summary   │    │ - Team Data         │
│ - Element Summary   │    │  - Historical Data   │    │ - Historical Stats  │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
                                        │
                                        ▼
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│  Static Cache       │    │   Projection Engine  │    │ Dynamic Cache       │
│                     │    │                      │    │                     │
│ - Next 12 GWs       │◄───│ - Team Projections   │────│ - Individual Cache  │
│ - Pre-calculated    │    │ - Player Projections │    │ - Range Cache       │
│ - 80% Faster        │    │ - Match Predictions  │    │ - Component Cache   │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
                                        │
                                        ▼
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│   Database Cache    │    │    API Endpoints     │    │   Frontend Apps     │
│                     │    │                      │    │                     │
│ - PostgreSQL        │◄───│ - RESTful APIs       │────│ - React UI          │
│ - Drizzle ORM       │    │ - Admin Endpoints    │    │ - Real-time Updates │
│ - Batch Operations  │    │ - Cache Management   │    │ - Interactive Tools │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
```

### Data Flow Process

1. **Data Ingestion** (Every 5 minutes)
   - Fetch latest FPL API data
   - Process and validate incoming data
   - Store in raw data cache

2. **Projection Calculation** (Hourly/Scheduled)
   - Load configuration parameters
   - Apply algorithms to raw data
   - Generate projections with mathematical balance

3. **Cache Population** (Real-time)
   - Store results in multiple cache layers
   - Update database with batch operations
   - Maintain cache freshness thresholds

4. **API Serving** (Sub-second)
   - Check static cache first (80% faster)
   - Fallback to dynamic cache
   - Calculate fresh if cache miss

---

## Core Projection Algorithms

### Team Goal Projections (Season Data Formula)

The team goal projection system uses verified season data from the official FPL Current Standings API with no estimations.

#### Core Formula

```javascript
// Base expected goals calculation using ONLY verified season data
baseExpectedGoals = (
  teamAvgGoalsPerGame +      // Team's actual goals scored / games played
  teamAvgXGPerGame +         // Team's actual xG for / games played
  opponentAvgGCPerGame +     // Opponent's actual goals conceded / games played
  opponentAvgXGCPerGame      // Opponent's actual xGC / games played
) × 0.25;

// Then apply venue multiplier
venueMultiplier = isHome ? 1.16 : 0.84;
adjustedGoals = baseExpectedGoals × venueMultiplier;
```

#### Data Sources (All from Official FPL API)

| Metric | Source | Description |
|--------|--------|-------------|
| Team Goals/Game | `/api/current-standings` | `goalsFor / played` |
| Team xG/Game | `/api/current-standings` | `expectedGoalsFor / played` |
| Opponent GC/Game | `/api/current-standings` | `goalsAgainst / played` |
| Opponent xGC/Game | `/api/current-standings` | `expectedGoalsAgainst / played` |

**Note**: Previous versions used a blended average with "last 6 games" data. This has been removed because the FPL API doesn't provide per-match xG data - only season totals. The estimation was based on a formula `(actual goals × 0.7) + (league average × 0.3)` which was not accurate. The current implementation uses only verified season data.

#### Venue Multipliers

```javascript
const venueMultipliers = {
  home: 1.16,   // Home advantage boost
  away: 0.84    // Away penalty
};
```

#### Context Multipliers

After calculating the base expected goals with venue adjustment, the system applies context multipliers based on match type and team form:

##### Team Form Multiplier
```javascript
// Based on wins in last 5 games
function calculateTeamForm(teamId, fixturesData) {
  const recentGames = getLastNGames(teamId, 5, fixturesData);
  const wins = countWins(recentGames, teamId);
  
  if (wins >= 3) return 1.06;      // Good form boost
  if (wins <= 1) return 0.94;      // Poor form penalty
  return 1.00;                      // Neutral form
}
```

##### Match Type Multipliers
```javascript
const matchTypeMultipliers = {
  derbyMatch: 0.87,        // Rivalry matches - tighter, fewer goals
  topSixClash: 1.12,       // Top 6 vs Top 6 matches - more open, more goals
  relegationBattle: 0.83   // Bottom 5 vs Bottom 5 - tighter defensive games
};

// Applied in priority order (first match wins):
// 1. Derby Matches (rivalry multiplier 0.87):
//    - Arsenal (1) vs Tottenham (18) - North London Derby
//    - Liverpool (12) vs Everton (8) - Merseyside Derby
//    - Man City (13) vs Man United (14) - Manchester Derby
// 2. Top Six Battle (multiplier 1.12):
//    - Any match between: Arsenal (1), Chelsea (6), Liverpool (12), 
//      Man City (13), Man United (14), Tottenham (18)
// 3. Relegation Battle (multiplier 0.83):
//    - Any match between bottom 5 teams (IDs 17, 20, 19, 4, 5)
```

##### Season Context Multipliers
```javascript
const seasonContextMultipliers = {
  seasonFinale: 1.05   // GW37-38 (higher scoring end of season)
};
```

**Note**: Previous versions included additional context multipliers (weather, travel distance, post-European fatigue, early/late kickoff timing, new manager bounce) which have been removed. These were synthetic calculations not based on official FPL API data. The current implementation only uses factors that can be verified from official sources.

#### Final Bounds
```javascript
// Ensure projections stay within realistic limits
const absoluteMin = 0.0;   // Minimum goals projection
const absoluteMax = 7.0;   // Maximum goals projection
finalGoals = Math.max(absoluteMin, Math.min(absoluteMax, adjustedGoals));
```

### Player Goal Projections (Full Season Share Formula)

The player goal projection system uses verified full season goal share data from the official FPL API with no estimations.

#### Core Formula

```javascript
// Base player goals calculation using ONLY verified full season data
playerProjectedGoals = teamProjectedGoals * (playerSeasonGoalShare / 100);
```

**Note**: Previous versions used a blended average with "last 6 games" data. This has been removed to ensure projections are based on verified, non-estimated season-long performance metrics.

#### Set Piece Taker Bonus (Goal Share)

Penalty taker and direct freekick taker adjustments use official FPL API data to boost goal share for designated set piece takers (no normalization - individuals are boosted without adjusting others).

```javascript
// Penalty taker bonus (penalties_order)
const penaltyOrder = player.penalties_order || 99;
let penaltyBonus = 0;
if (penaltyOrder === 1) {
  // Primary penalty taker - significant goal advantage
  penaltyBonus = 0.8 + goalsScored * 0.04;
} else if (penaltyOrder === 2) {
  // Secondary penalty taker
  penaltyBonus = 0.5 + goalsScored * 0.03;
}
penaltyBonus = Math.min(1.5, Math.max(0, penaltyBonus)); // Cap at 1.5

// Direct freekick taker bonus (direct_freekicks_order)
const freekickOrder = player.direct_freekicks_order || 99;
let freekickBonus = 0;
if (freekickOrder === 1) {
  // Primary direct freekick taker
  freekickBonus = 0.3 + goalsScored * 0.02;
} else if (freekickOrder === 2) {
  // Secondary direct freekick taker
  freekickBonus = 0.2 + goalsScored * 0.015;
}
freekickBonus = Math.min(0.4, Math.max(0, freekickBonus)); // Cap at 0.4

// Add to goal share (no normalization)
goalShare += penaltyBonus + freekickBonus;
```

This boosts goal share for penalty specialists like Salah, Saka, Bruno Fernandes and direct freekick specialists like Bruno Fernandes, Declan Rice.

**Note**: Corners and indirect freekicks are NOT included in goal share bonus - they are applied to assist share instead as they primarily create chances rather than direct scoring opportunities.

### Player Assist Projections (Full Season Share Formula)

#### Core Formula

```javascript
// Base assist calculation using team creativity
const teamAssists = calculateTeamAssists(teamId, gameweekRange); // 85% of team goals
const playerSeasonAssistShare = getPlayerSeasonAssistShare(playerId);
```

**Note**: The team assist projection factor is set to 85% of team goals. FPL's unique assist criteria (penalties won, rebounds, etc.) results in significantly more assists than traditional data providers, but on average remains below one assist per goal.

#### Set Piece Taker Bonus (Assist Share)

Corner and indirect free kick taker adjustments use official FPL API data (`corners_and_indirect_freekicks_order`) to boost assist share for designated set piece takers (no normalization - individuals are boosted without adjusting others).

```javascript
// Applied during assist share calculation (no normalization)
const cornerOrder = player.corners_and_indirect_freekicks_order || 99;
let setPieceBonus = 0;
if (cornerOrder === 1) {
  // Primary corner/indirect freekick taker - significant assist advantage
  setPieceBonus = 0.8 + assists * 0.04;
} else if (cornerOrder === 2) {
  // Secondary taker
  setPieceBonus = 0.5 + assists * 0.03;
} else if (cornerOrder === 3) {
  // Tertiary taker
  setPieceBonus = 0.3 + assists * 0.02;
}
setPieceBonus = Math.min(1.2, Math.max(0, setPieceBonus)); // Cap at 1.2

// Add to assist share (no normalization)
assistShare += setPieceBonus;
```

This boosts assist share for creative set piece specialists like Bruno Fernandes and Bukayo Saka who take corners and indirect free kicks.

### Player Saves Projections (Full Season Formula)

#### Core Formula

```javascript
// Step 1: Calculate full season saves per team game
savesPerTeamGame = currentSeasonSaves / teamGamesPlayed;

// Step 2: Apply opponent difficulty factor
expectedSaves = savesPerTeamGame * (opponentAGR / 1.35);
```

### Player Bonus Points Projections (Full Season BPS Ratio)

#### Core Formula

```javascript
// Step 1: Calculate player's BPS share of total match BPS (Season Data)
bpsRatio = playerSeasonBPS / (totalHomeTeamSeasonBPS + totalAwayTeamSeasonBPS);

// Step 2: Project bonus points
gwBonusPoints = bpsRatio * 6;
```

**Note**: Both Saves and Bonus Points projections were updated to use only full season FPL data, removing "last 6 games" element-summary fetching. This significantly improves API performance by eliminating hundreds of individual player-summary network calls per request.

### Player Total Points Algorithm

The comprehensive Player Total Points system combines all 10 official FPL scoring components:

#### Component Breakdown
```javascript
const fplScoringComponents = {
  goals: {
    points: { goalkeeper: 6, defender: 6, midfielder: 5, forward: 4 },
    calculation: 'pure_projection'
  },
  assists: {
    points: 3,
    calculation: 'pure_projection'
  },
  cleanSheets: {
    points: { goalkeeper: 4, defender: 4, midfielder: 1, forward: 0 },
    calculation: 'probability_based'
  },
  minutes: {
    points: { '60+': 2, '1-59': 1 },
    calculation: 'rotation_model'
  },
  saves: {
    points: { per3saves: 1 },
    calculation: 'database_cached'
  },
  goalsConceded: {
    points: { per2conceded: -1 },
    calculation: 'database_cached'
  },
  yellowCards: {
    points: -1,
    calculation: 'database_cached'
  },
  redCards: {
    points: -3,
    calculation: 'database_cached'
  },
  ownGoals: {
    points: -2,
    calculation: 'rare_events'
  },
  bonusPoints: {
    points: 'variable',
    calculation: 'probability_based'
  }
};
```

#### Hybrid Calculation Methodology
```javascript
function calculatePlayerTotalPoints(playerId, gameweekRange) {
  const projections = {
    goals: getGoalProjections(playerId, gameweekRange),
    assists: getAssistProjections(playerId, gameweekRange),
    minutes: getMinutesProjections(playerId, gameweekRange),
    defensive: getDefensiveProjections(playerId, gameweekRange),
    cleanSheets: getCleanSheetProbability(playerId, gameweekRange)
  };
  
  // Get cached FPL scoring components
  const fplScoring = {
    saves: getCachedPlayerSaves(playerId, gameweekRange),
    goalsConceded: getCachedGoalsConceded(playerId, gameweekRange),
    yellowCards: getCachedYellowCards(playerId, gameweekRange),
    redCards: getCachedRedCards(playerId, gameweekRange),
    bonusPoints: getBonusProbability(playerId, gameweekRange)
  };
  
  return calculateFPLPoints(projections, fplScoring);
}
```

### Clean Sheet Probability Algorithm

#### Exponential Decay Calculation
```javascript
function calculateCleanSheetProbability(teamId, opponent, venue) {
  const baseDefensiveStrength = getDefensiveStrength(teamId);
  const opponentAttackStrength = getAttackStrength(opponent);
  
  // Exponential decay formula
  const goalsConcededProbability = Math.exp(-baseDefensiveStrength / opponentAttackStrength);
  const cleanSheetProbability = Math.exp(-goalsConcededProbability);
  
  // Apply venue factor
  const venueFactor = venue === 'home' ? 1.15 : 0.85;
  
  return Math.min(0.8, cleanSheetProbability * venueFactor);
}
```

---

## Configuration System

### Master Configuration Source

The `MASTER_TEAM_DEFAULTS` object serves as the single source of truth for all projection parameters:

```javascript
const MASTER_TEAM_DEFAULTS = {
  // Base Settings
  averageBaseXGPerTeamPerGame: 1.5,
  defaultTeamVariance: 0.45,
  defaultExpectedGoalsPerGame: 1.3,
  globalTierMultiplier: 1.25,
  
  // Venue Factors
  homeAdvantageGoalsMultiplier: 1.12,
  awayFactorGoalsMultiplier: 0.88,
  
  // Team Classifications
  eliteAttackTeams: [12, 13],        // Liverpool, Manchester City
  strongAttackTeams: [1, 7, 15, 18], // Arsenal, Chelsea, Newcastle, Tottenham
  averageAttackTeams: [6, 14, 4, 5, 10, 8, 2, 9],
  weakAttackTeams: [16, 19, 20],
  promotedAttackTeams: [3, 11, 17],
  
  // Attack Multipliers
  eliteAttackMultiplier: 1.35,
  strongAttackMultiplier: 1.15,
  averageAttackMultiplier: 1.00,
  weakAttackMultiplier: 0.85,
  promotedAttackMultiplier: 0.7,
  
  // Defense Classifications & Multipliers
  eliteDefenseTeams: [1],             // Arsenal
  strongDefenseTeams: [12, 13, 7, 15], // Top defensive teams
  eliteDefenseMultiplier: 0.7,
  strongDefenseMultiplier: 0.85,
  averageDefenseMultiplier: 1,
  weakDefenseMultiplier: 1.15,
  promotedDefenseMultiplier: 1.3,
  
  // Context Multipliers
  derbyGoalsMultiplier: 0.87,
  topSixGoalsMultiplier: 1.12,
  relegationBattleGoalsMultiplier: 0.83,
  earlyKickoffGoalsMultiplier: 0.94,
  lateKickoffGoalsMultiplier: 1.07,
  postEuropeanGoalsMultiplier: 0.88,
  weatherConditionsGoalsMultiplier: 0.92,
  refereeInfluenceMultiplier: 1.0,
  postInternationalBreakMultiplier: 0.92,
  travelDistanceFatigueMultiplier: 0.95,
  
  // Market Bounds
  marketFloorMultiplier: 0.4,
  marketCeilingMultiplier: 2,
  absoluteMinGoals: 0,
  absoluteMaxGoals: 7
};
```

### Admin Configuration APIs

#### Goal Projection Settings
```javascript
// GET /api/admin/goal-scored-settings
const adminGoalSettings = {
  averageBaseXGPerTeamPerGame: 1.5,
  defaultTeamVariance: 0.45,
  globalTierMultiplier: 1.25,
  homeAdvantageGoalsMultiplier: 1.12,
  awayFactorGoalsMultiplier: 0.88,
  // ... all MASTER_TEAM_DEFAULTS values
};
```

#### Clean Sheet Settings
```javascript
// GET /api/admin/cs-settings
const adminCSSettings = {
  decayFactor: 0.02,
  weakDefenseBoost: 3.0,
  averageDefenseBoost: 1.75,
  strongDefenseBoost: 1.3,
  eliteDefensiveFloor: 25,
  strongDefensiveFloor: 22,
  averageDefensiveFloor: 18,
  weakDefensiveFloor: 16,
  promotedDefensiveFloor: 15,
  derbyCSMultiplier: 0.82,
  topSixCSMultiplier: 0.88
};
```

#### Assist Projection Settings
```javascript
const adminAssistSettings = {
  globalAssistMultiplier: 1.0,
  creativityBoost: 1.15,
  lowCreativityThreshold: 0.65,
  eliteAttackMultiplier: 1.25,
  strongAttackMultiplier: 1.15,
  averageAttackMultiplier: 1.0,
  weakAttackMultiplier: 0.85,
  minAssistsPerGame: 0.3,
  maxAssistsPerGame: 2.5
};
```

### Position-Based Configuration

#### Goal Share Caps
```javascript
export const DEFAULT_GOAL_SHARE_CAPS = {
  goalkeeper: 2,    // Max 2% share for GKs
  defender: 10,     // Max 10% share for defenders
  midfielder: 30,   // Max 30% share for midfielders
  forward: 40       // Max 40% share for forwards
};
```

#### Assist Share Caps
```javascript
export const DEFAULT_ASSIST_SHARE_CAPS = {
  goalkeeper: 2,    // Max 2% share for GKs
  defender: 15,     // Max 15% share for defenders
  midfielder: 40,   // Max 40% share for midfielders
  forward: 25       // Max 25% share for forwards
};
```

#### Defensive Contribution Thresholds
```javascript
const defensiveThresholds = {
  defenders: {
    tickMarks: 10,    // Points needed for tick mark
    scaling: 'linear'
  },
  midfielders: {
    tickMarks: 12,    // Points needed for tick mark
    scaling: 'linear'
  },
  forwards: {
    tickMarks: 12,    // Points needed for tick mark
    scaling: 'linear'
  }
};
```

---

## Caching Strategy

### Multi-Tier Cache Architecture

#### Tier 1: Static Cache (Fastest - 80% Performance Gain)
```javascript
// Next 12 gameweeks pre-calculated cache
class StaticCacheService {
  async getCachedProjections(startGw, endGw) {
    // Check if range falls within next 12 gameweeks
    const next12Range = await this.getNext12GameweeksRange();
    
    if (startGw >= next12Range.start && endGw <= next12Range.end) {
      return this.loadFromStaticCache(startGw, endGw);
    }
    
    return null; // Fall through to lower tiers
  }
}
```

#### Tier 2: Dynamic Cache (Fast - In-Memory)
```javascript
// Range-specific caching with Map structure
const totalPointsCache = new Map();

function getCacheKey(startGw, endGw) {
  return `${startGw}-${endGw}`;
}

function cacheProjections(startGw, endGw, data) {
  const key = getCacheKey(startGw, endGw);
  totalPointsCache.set(key, {
    data: data,
    timestamp: new Date().toISOString()
  });
}
```

#### Tier 3: Database Cache (Persistent)
```javascript
// PostgreSQL with Drizzle ORM
const playerProjectionsTable = pgTable('player_projections', {
  playerId: integer('player_id').notNull(),
  playerName: varchar('player_name').notNull(),
  startGameweek: integer('start_gameweek').notNull(),
  endGameweek: integer('end_gameweek').notNull(),
  season: varchar('season').notNull().default('2025/26'),
  totalPoints: real('total_points').notNull(),
  gameweekBreakdown: jsonb('gameweek_breakdown'),
  lastUpdated: timestamp('last_updated').defaultNow()
});
```

### Cache Invalidation Strategy

#### Time-Based Invalidation
```javascript
const cacheThresholds = {
  STALE_THRESHOLD: 4 * 60 * 60 * 1000,    // 4 hours
  FRESH_THRESHOLD: 30 * 60 * 1000,        // 30 minutes
  STATIC_THRESHOLD: 12 * 60 * 60 * 1000   // 12 hours for static cache
};

function isCacheStale(lastUpdated) {
  return Date.now() - new Date(lastUpdated).getTime() > cacheThresholds.STALE_THRESHOLD;
}
```

#### Event-Based Invalidation
```javascript
// Invalidate cache on:
const invalidationEvents = [
  'fixture_result',      // Match finish
  'injury_update',       // Player injury
  'team_news',          // Lineup changes
  'admin_settings_change', // Configuration update
  'gameweek_rollover'    // New gameweek starts
];
```

### Cache Population Strategy

#### Batch Operations
```javascript
class ProjectionCacheWorker {
  private readonly BATCH_SIZE = 50;
  
  async cacheGoalsProjections() {
    const goalsData = await this.fetchGoalsData();
    
    // Process in batches to avoid memory issues
    for (let i = 0; i < goalsData.length; i += this.BATCH_SIZE) {
      const batch = goalsData.slice(i, i + this.BATCH_SIZE);
      await db.insert(playerGoalsProjections).values(batch);
      console.log(`📊 Inserted goals batch ${Math.ceil(i/this.BATCH_SIZE) + 1}/${Math.ceil(goalsData.length/this.BATCH_SIZE)}`);
    }
  }
}
```

---

## API Endpoints

### Core Projection APIs

#### Team Projections
```
GET /api/team-goal-projections
- Returns: Team goal projections for next 12 gameweeks
- Algorithm: 8-phase calculation with market dynamics
- Cache: Force disabled for admin changes
- Response: Array of team objects with home/away goals

GET /api/team-cs-projections
- Returns: Clean sheet probabilities by team
- Algorithm: Exponential decay calculation
- Parameters: ?startGameweek=4&endGameweek=9
- Response: Team clean sheet percentages
```

#### Player Projections
```
GET /api/player-goals-scored-projections
- Returns: Individual player goal projections
- Algorithm: Pure projection methodology
- Features: Penalty taker adjustments
- Cache: Database-backed with range caching

GET /api/player-assist-projections
- Returns: Player assist projections
- Algorithm: Creativity-based with position caps
- Features: Set piece adjustments
- Response: Dual-tab compatible format

GET /api/player-minutes-projections
- Returns: Expected minutes and rotation risk
- Algorithm: Fixture-aware rotation modeling
- Features: Injury risk consideration
- Cache: Real-time updates

GET /api/player-total-points
- Returns: Comprehensive FPL points projections
- Algorithm: All 10 scoring components
- Features: Gameweek breakdowns, tooltips
- Cache: Multi-tier with static cache priority
```

#### Specialized APIs
```
GET /api/defensive-contribution-projections
- Returns: Defensive points projections
- Algorithm: Position-specific thresholds
- Features: Attacking tier variance
- Cache: Database-backed

GET /api/projected-scores
- Returns: Match outcome predictions
- Algorithm: Team projections + Poisson
- Features: Win probabilities, expected goals
- Response: Fixture-level predictions
```

### Admin APIs

#### Configuration Management
```
GET /api/admin/goal-scored-settings
PUT /api/admin/goal-scored-settings
- Manages: Goal projection parameters
- Security: Requires admin authentication
- Features: Real-time configuration updates

GET /api/admin/cs-settings
PUT /api/admin/cs-settings
- Manages: Clean sheet parameters
- Features: Defensive tier configuration

GET /api/admin/assist-settings
PUT /api/admin/assist-settings
- Manages: Assist projection settings
- Features: Creativity thresholds
```

#### Cache Management
```
GET /api/admin/cache/status
- Returns: Cache statistics for all projection types
- Security: Admin authentication required
- Response: Count, last updated, stale status

POST /api/admin/cache/refresh/{type}
- Triggers: Manual cache refresh for specific type
- Types: goals, assists, minutes, total-points, etc.
- Response: Success status and refresh time

POST /api/admin/cache/refresh/all
- Triggers: Complete cache refresh for all projections
- Duration: 30-60 seconds for full refresh
- Features: Progress tracking
```

### Cache-Optimized APIs

#### Database-Backed APIs
```
GET /api/goals-projections-cached
GET /api/assist-projections-cached
GET /api/minutes-projections-cached
GET /api/defensive-contribution-projections-cached
- Purpose: Ultra-fast cached responses
- Cache: Database-backed with batch updates
- Performance: Sub-second response times
```

---

## Scheduling & Automation

### Projection Cache Scheduler

#### Schedule Configuration
```javascript
class ProjectionCacheScheduler {
  private readonly SCHEDULE_TIMES = [
    { hour: 6, minute: 0 },   // 6:00 AM
    { hour: 12, minute: 0 },  // 12:00 PM
    { hour: 18, minute: 0 },  // 6:00 PM
    { hour: 23, minute: 0 }   // 11:00 PM
  ];
  
  private readonly HOURLY_UPDATE_INTERVAL = 60 * 60 * 1000; // 1 hour
  private readonly FULL_UPDATE_THRESHOLD = 8 * 60 * 60 * 1000; // 8 hours
}
```

#### Update Types

**Full Updates (4 times daily)**
- Complete recalculation of all projections
- Database cache refresh
- Static cache regeneration
- Duration: 30-60 seconds

**Light Updates (Hourly)**
- Essential projections only (Goals, Assists, Minutes)
- Incremental updates
- Duration: 10-20 seconds

### Daily Projections Scheduler

#### 3 AM Daily Job
```javascript
class DailyProjectionsScheduler {
  async runDailyCalculations() {
    // Calculate and store team projections
    await this.calculateTeamProjections(today);
    
    // Calculate and store goal shares
    await this.calculateGoalShares(today);
    
    // Calculate and store assist shares
    await this.calculateAssistShares(today);
    
    // Pre-calculate static cache ranges
    await staticCacheService.preCalculateNext12Gameweeks();
  }
}
```

### FPL Scoring Cache Scheduler

#### Twice Daily Updates
```javascript
class FPLScoringCacheScheduler {
  private readonly SCHEDULE_TIMES = [
    { hour: 6, minute: 30 },   // 6:30 AM
    { hour: 18, minute: 30 }   // 6:30 PM
  ];
  
  async updateAllScoringData() {
    await Promise.all([
      this.cachePlayerSaves(),
      this.cachePlayerGoalsConceded(),
      this.cachePlayerYellowCards(),
      this.cachePlayerRedCards(),
      this.cachePlayerBonusPoints()
    ]);
  }
}
```

---

## Database Schema

### Core Projection Tables

#### Player Projections
```sql
CREATE TABLE player_goals_projections (
  player_id INTEGER NOT NULL,
  player_name VARCHAR NOT NULL,
  team_name VARCHAR NOT NULL,
  position VARCHAR NOT NULL,
  gameweek INTEGER NOT NULL,
  projected_goals REAL NOT NULL,
  penalty_adjustment REAL DEFAULT 0,
  set_piece_adjustment REAL DEFAULT 0,
  fixture_difficulty REAL DEFAULT 1,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE player_assist_projections (
  player_id INTEGER NOT NULL,
  player_name VARCHAR NOT NULL,
  team_name VARCHAR NOT NULL,
  position VARCHAR NOT NULL,
  gameweek INTEGER NOT NULL,
  projected_assists REAL NOT NULL,
  creativity_score REAL NOT NULL,
  set_piece_bonus REAL DEFAULT 0,
  position_cap REAL NOT NULL,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE player_minutes_projections (
  player_id INTEGER NOT NULL,
  player_name VARCHAR NOT NULL,
  team_name VARCHAR NOT NULL,
  position VARCHAR NOT NULL,
  gameweek INTEGER NOT NULL,
  expected_minutes REAL NOT NULL,
  rotation_risk REAL NOT NULL,
  injury_risk REAL NOT NULL,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Team Projections
```sql
CREATE TABLE team_projections (
  team_id INTEGER NOT NULL,
  team_name VARCHAR NOT NULL,
  gameweek INTEGER NOT NULL,
  home_goals REAL NOT NULL,
  away_goals REAL NOT NULL,
  clean_sheet_probability REAL NOT NULL,
  attack_strength REAL NOT NULL,
  defense_strength REAL NOT NULL,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### FPL Scoring Cache
```sql
CREATE TABLE cached_player_saves (
  player_id INTEGER NOT NULL,
  player_name VARCHAR NOT NULL,
  team_name VARCHAR NOT NULL,
  position VARCHAR NOT NULL,
  gameweek_data JSONB NOT NULL,
  points_data JSONB NOT NULL,
  total_value REAL NOT NULL,
  total_points REAL NOT NULL,
  average_per_gameweek REAL NOT NULL,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cached_player_bonus_points (
  player_id INTEGER NOT NULL,
  player_name VARCHAR NOT NULL,
  team_name VARCHAR NOT NULL,
  position VARCHAR NOT NULL,
  gameweek_data JSONB NOT NULL,
  points_data JSONB NOT NULL,
  total_value REAL NOT NULL,
  total_points REAL NOT NULL,
  average_per_gameweek REAL NOT NULL,
  probability_data JSONB,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Static Cache Tables
```sql
CREATE TABLE static_projection_ranges (
  id SERIAL PRIMARY KEY,
  range_name VARCHAR NOT NULL UNIQUE,
  projection_type VARCHAR NOT NULL,
  start_gameweek INTEGER NOT NULL,
  end_gameweek INTEGER NOT NULL,
  season VARCHAR NOT NULL,
  calculation_status VARCHAR NOT NULL DEFAULT 'pending',
  last_calculated TIMESTAMP,
  cache_size INTEGER DEFAULT 0
);

CREATE TABLE static_projection_data (
  id SERIAL PRIMARY KEY,
  range_id INTEGER REFERENCES static_projection_ranges(id),
  player_id INTEGER NOT NULL,
  projection_data JSONB NOT NULL,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Historical Data Tables

```sql
CREATE TABLE historical_player_stats (
  id SERIAL PRIMARY KEY,
  player_id INTEGER NOT NULL,
  season VARCHAR NOT NULL,
  first_name VARCHAR,
  second_name VARCHAR,
  web_name VARCHAR,
  team_id INTEGER,
  team_name VARCHAR,
  element_type INTEGER,
  total_points INTEGER DEFAULT 0,
  minutes INTEGER DEFAULT 0,
  goals_scored INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  clean_sheets INTEGER DEFAULT 0,
  goals_conceded INTEGER DEFAULT 0,
  own_goals INTEGER DEFAULT 0,
  penalties_saved INTEGER DEFAULT 0,
  penalties_missed INTEGER DEFAULT 0,
  yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  bonus INTEGER DEFAULT 0,
  bps INTEGER DEFAULT 0,
  influence REAL DEFAULT 0,
  creativity REAL DEFAULT 0,
  threat REAL DEFAULT 0,
  ict_index REAL DEFAULT 0,
  expected_goals REAL DEFAULT 0,
  expected_assists REAL DEFAULT 0,
  expected_goal_involvements REAL DEFAULT 0,
  expected_goals_conceded REAL DEFAULT 0
);
```

---

## Performance Optimizations

### Caching Optimizations

#### 1. Static Cache Priority
```javascript
// 80% performance improvement for common ranges
async getPlayerTotalPoints(startGameweek, endGameweek) {
  // Check static cache first (next 12 gameweeks)
  const staticCached = await staticCacheService.getCachedProjections(startGameweek, endGameweek);
  if (staticCached) {
    console.log(`🚀 STATIC CACHE HIT: 80% faster response`);
    return staticCached;
  }
  
  // Fallback to dynamic cache
  // ... rest of logic
}
```

#### 2. Range-Specific Caching
```javascript
// Separate caches for different gameweek ranges
const totalPointsCache = new Map();

// GW4-6 cached separately from GW4-9
cacheProjections(4, 6, data1);
cacheProjections(4, 9, data2);

// Perfect cache isolation prevents conflicts
```

#### 3. Batch Database Operations
```javascript
// Insert in batches to avoid memory issues
const BATCH_SIZE = 50;
for (let i = 0; i < projections.length; i += BATCH_SIZE) {
  const batch = projections.slice(i, i + BATCH_SIZE);
  await db.insert(playerGoalsProjections).values(batch);
}
```

### Algorithm Optimizations

#### 1. Pre-calculated Shortcuts
```javascript
// Avoid expensive calculations with pre-computed values
export const PLAYER_GOAL_SHARES = {
  12: { 253: 25.3, 254: 18.7, 255: 15.2 }, // Liverpool
  13: { 303: 28.1, 304: 21.4, 305: 14.8 }  // Man City
};

export const TEAM_STRENGTH = {
  attack: {
    tier1: [12, 13],     // Instant lookup
    tier2: [1, 7, 15, 18]
  }
};
```

#### 2. Concurrent API Calls
```javascript
// Parallel data fetching
const [bootstrapResponse, fixturesResponse] = await Promise.all([
  fetch("https://fantasy.premierleague.com/api/bootstrap-static/"),
  fetch("https://fantasy.premierleague.com/api/fixtures/")
]);
```

#### 3. Memory-Efficient Processing
```javascript
// Process data in streams to avoid memory peaks
async function processProjectionsInBatches(projections) {
  const results = [];
  const CONCURRENT_LIMIT = 3;
  
  for (let i = 0; i < projections.length; i += CONCURRENT_LIMIT) {
    const batch = projections.slice(i, i + CONCURRENT_LIMIT);
    const batchResults = await Promise.all(batch.map(processProjection));
    results.push(...batchResults);
  }
  
  return results;
}
```

### Database Optimizations

#### 1. Efficient Indexes
```sql
-- Composite indexes for common queries
CREATE INDEX idx_player_projections_lookup ON player_goals_projections (player_id, gameweek);
CREATE INDEX idx_team_projections_gw ON team_projections (team_id, gameweek);
CREATE INDEX idx_static_cache_range ON static_projection_ranges (range_name, calculation_status);
```

#### 2. Query Optimization
```javascript
// Use direct SQL for performance-critical queries
const projections = await db.execute(sql`
  SELECT * FROM player_projections 
  WHERE start_gameweek = ${startGameweek} 
    AND end_gameweek = ${endGameweek} 
    AND season = '2025/26'
  ORDER BY total_points DESC
  LIMIT 1000
`);
```

#### 3. Connection Pooling
```javascript
// Efficient database connections
const db = drizzle(new Pool({
  connectionString: DATABASE_URL,
  max: 20,        // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
}));
```

---

## Troubleshooting Guide

### Common Issues & Solutions

#### 1. Cache Showing 0 Records

**Problem**: Admin cache management shows 0 records despite working API

**Root Causes**:
- Variable shadowing (local vs exported cache variables)
- Authentication errors (403 responses silently handled)
- Type name mismatches between frontend/backend

**Solutions**:
```javascript
// Fix variable shadowing
// ❌ Wrong: Creates local variable
const totalPointsCache = new Map();

// ✅ Correct: Use exported variable
import { totalPointsCache } from './projection-cache-worker';

// Fix frontend type mapping
// ❌ Wrong: 'Total Points'
'total-points': 'Total Points'

// ✅ Correct: 'Player Total Points'
'total-points': 'Player Total Points'

// Add proper authentication error handling
if (response.status === 403) {
  toast({
    title: "Authentication Required",
    description: "Please log in as admin to view cache status",
    variant: "destructive"
  });
}
```

#### 2. Projection Calculation Timeouts

**Problem**: API requests timeout during projection calculation

**Root Causes**:
- Complex calculations taking too long
- Database connection issues
- Memory exhaustion

**Solutions**:
```javascript
// Increase timeout limits
const timeout = 300000; // 5 minutes for complex calculations

// Use batch processing
const BATCH_SIZE = 50;
for (let i = 0; i < players.length; i += BATCH_SIZE) {
  await processBatch(players.slice(i, i + BATCH_SIZE));
}

// Implement circuit breaker pattern
async function calculateWithRetry(calculation, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await calculation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await sleep(attempt * 1000); // Exponential backoff
    }
  }
}
```

#### 3. Mathematical Balance Issues

**Problem**: Team totals don't match sum of player projections

**Root Causes**:
- Rounding errors in calculations
- Position cap enforcement breaking balance
- Missing normalization steps

**Solutions**:
```javascript
// Implement redistribution after capping
function enforcePositionCapsWithBalance(teamPlayers, teamTotal) {
  let totalAfterCapping = 0;
  
  // Apply position caps
  teamPlayers.forEach(player => {
    const cap = getPositionCap(player.position);
    const cappedShare = Math.min(player.share, cap);
    player.cappedShare = cappedShare;
    totalAfterCapping += cappedShare;
  });
  
  // Redistribute the difference
  const redistributionFactor = teamTotal / totalAfterCapping;
  teamPlayers.forEach(player => {
    player.finalShare = player.cappedShare * redistributionFactor;
  });
}
```

#### 4. Cache Staleness Issues

**Problem**: Users seeing outdated data despite recent updates

**Root Causes**:
- Frontend caching in browsers
- CDN caching issues
- Incorrect cache invalidation

**Solutions**:
```javascript
// Force cache busting
res.set('Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0');
res.set('Pragma', 'no-cache');
res.set('Expires', '0');
res.set('ETag', `"${Date.now()}"`);

// Implement cache versioning
const cacheKey = `projections:${gameweekRange}:v${CACHE_VERSION}`;

// Add cache freshness checks
function isCacheStale(lastUpdated, thresholdMs = 4 * 60 * 60 * 1000) {
  return Date.now() - new Date(lastUpdated).getTime() > thresholdMs;
}
```

### Performance Monitoring

#### 1. Logging Strategy
```javascript
// Comprehensive performance logging
console.time('projection-calculation');
console.log(`DEBUG: Processing ${players.length} players for GW${startGw}-${endGw}`);

// Track cache hit rates
const cacheHits = 0;
const cacheMisses = 0;
console.log(`Cache hit rate: ${(cacheHits / (cacheHits + cacheMisses) * 100).toFixed(1)}%`);

console.timeEnd('projection-calculation');
```

#### 2. Error Tracking
```javascript
// Structured error logging
function logProjectionError(error, context) {
  console.error('PROJECTION ERROR:', {
    error: error.message,
    stack: error.stack,
    context: context,
    timestamp: new Date().toISOString(),
    gameweek: context.gameweek,
    playerId: context.playerId
  });
}
```

#### 3. Health Checks
```javascript
// API health monitoring
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    await db.select().from(playerGoalsProjections).limit(1);
    
    // Check cache status
    const cacheStats = await projectionCacheWorker.getCacheStats();
    
    // Check external API
    const fplResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
    
    res.json({
      status: 'healthy',
      database: 'connected',
      cache: cacheStats,
      fplApi: fplResponse.ok ? 'available' : 'unavailable',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
```

---

## Best Practices

### Development Guidelines

1. **Configuration Changes**: Always update `MASTER_TEAM_DEFAULTS` first, then sync admin settings
2. **Cache Management**: Use range-specific caching to avoid conflicts
3. **Error Handling**: Implement graceful fallbacks for API failures
4. **Testing**: Validate mathematical balance in all projection calculations
5. **Performance**: Use batch operations for database updates
6. **Monitoring**: Log performance metrics and cache hit rates

### Production Deployment

1. **Database Migration**: Use `npm run db:push --force` for schema updates
2. **Cache Warming**: Pre-populate static cache ranges on startup
3. **Health Monitoring**: Implement comprehensive health checks
4. **Rollback Strategy**: Maintain previous cache versions for quick rollback
5. **Performance Baseline**: Monitor response times and set alerts

---

*Last Updated: September 2025*
*Version: 1.0*
*Maintained by: FPL Dilemmas Development Team*