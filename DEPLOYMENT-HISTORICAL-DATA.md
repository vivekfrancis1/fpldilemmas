# Historical Data Deployment Guide

This guide explains how to transfer your comprehensive historical FPL data (2,175+ records across 9 seasons) to production during deployment.

## Quick Start

### Option 1: Export/Import Scripts (Recommended)

**Development (before deployment):**
```bash
# Export current historical data
tsx scripts/export-historical-data.ts
```

**Production (after deployment):**
```bash
# Import historical data
tsx scripts/import-historical-data.ts
```

### Option 2: Admin Interface

1. Deploy your application
2. Visit: `https://your-app.replit.app/admin-data-population`
3. Click "Populate All Seasons"
4. Wait for automatic population (5-10 minutes)

### Option 3: Manual API Calls

```bash
# Run these in production environment
curl -X POST https://your-app.replit.app/api/historical-player-stats/populate-all \
  -H "Content-Type: application/json" \
  -d '{"season": "2024/25"}'

# Repeat for all seasons: 2023/24, 2022/23, 2021/22, 2020/21, 2019/20, 2018/19, 2017/18, 2016/17
```

## Data Overview

The historical database contains:

| Season  | Players | High Performers | Top Score |
|---------|---------|-----------------|-----------|
| 2024/25 | 537     | 119            | 344       |
| 2023/24 | 437     | 97             | 244       |
| 2022/23 | 352     | 87             | 272       |
| 2021/22 | 251     | 64             | 265       |
| 2020/21 | 194     | 60             | 244       |
| 2019/20 | 149     | 41             | 233       |
| 2018/19 | 115     | 31             | 259       |
| 2017/18 | 82      | 20             | 303       |
| 2016/17 | 58      | 10             | 174       |

**Total: 2,175 authentic historical records**

## Script Details

### Export Script (`scripts/export-historical-data.ts`)
- Exports all historical data to JSON format
- Creates timestamped backup files
- Generates comprehensive metadata
- Creates `exports/historical-player-stats-latest.json` for easy access

### Import Script (`scripts/import-historical-data.ts`)
- Imports data from JSON export files
- Handles duplicate detection (skips existing records)
- Provides detailed import progress and verification
- Safe to run multiple times

### Combined Script (`scripts/deploy-historical-setup.ts`)
```bash
# Export from development
tsx scripts/deploy-historical-setup.ts export

# Import in production
tsx scripts/deploy-historical-setup.ts import
```

## Database Schema

Table: `historical_player_stats`

**Key Features:**
- Complete player metrics (goals, assists, points, minutes)
- Defensive analytics (tackles, recoveries, defensive contribution)
- Expected stats (xG, xA, xGC)
- Per-90 calculations for all metrics
- ICT components (influence, creativity, threat)
- Position-specific defensive contribution formulas

## Troubleshooting

**Import fails with "file not found":**
- Ensure export was run first in development
- Check that `exports/` directory exists
- Verify file permissions

**Slow population via API:**
- Each season takes 5-10 seconds (batch processing)
- Total time: ~2-3 minutes for all seasons
- Monitor logs for progress

**Duplicate data concerns:**
- All import methods use `onConflictDoNothing()`
- Safe to run multiple times
- Only new records are inserted

## Next Steps After Population

1. Verify data: Check `/admin-data-population` for status
2. Test queries: Ensure historical endpoints return data
3. Monitor performance: Historical queries should be fast
4. Enable features: Historical data powers projection tools

## Files Created

- `exports/historical-player-stats-YYYY-MM-DD.json` - Timestamped backup
- `exports/historical-player-stats-latest.json` - Latest export for deployment
- Database table: `historical_player_stats` with 2,175+ records