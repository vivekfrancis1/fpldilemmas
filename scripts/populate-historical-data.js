#!/usr/bin/env node

/**
 * Historical Data Population Script
 * Fetches and stores all historical FPL data (2016/17 - 2024/25) in PostgreSQL
 * This eliminates slow loading by pre-populating the database
 */

const { Pool, neonConfig } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { sql, eq } = require('drizzle-orm');
const ws = require('ws');

neonConfig.webSocketConstructor = ws;

// Database setup
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

const FPL_BASE_URL = "https://fantasy.premierleague.com/api";

// Available seasons to populate
const SEASONS = [
  "2024/25", "2023/24", "2022/23", "2021/22", "2020/21", 
  "2019/20", "2018/19", "2017/18", "2016/17"
];

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkExistingData(season) {
  try {
    const result = await db.execute(sql`SELECT COUNT(*) as count FROM historical_players WHERE season = ${season}`);
    return result.rows[0].count > 0;
  } catch (error) {
    console.error(`Error checking existing data for ${season}:`, error);
    return false;
  }
}

async function fetchSeasonData(season) {
  console.log(`\n🔄 Fetching ${season} season data...`);
  
  // Check if we already have this data
  const hasData = await checkExistingData(season);
  if (hasData) {
    console.log(`✓ ${season} data already exists in database, skipping`);
    return;
  }
  
  try {
    // Get bootstrap data
    const bootstrapResponse = await fetch(`${FPL_BASE_URL}/bootstrap-static/`);
    if (!bootstrapResponse.ok) {
      throw new Error(`FPL API responded with status: ${bootstrapResponse.status}`);
    }
    
    const bootstrapData = await bootstrapResponse.json();
    const players = bootstrapData.elements;
    const teams = bootstrapData.teams;
    const elementTypes = bootstrapData.element_types;
    
    console.log(`Processing ${players.length} players for ${season}...`);
    
    // Create lookup maps
    const teamMap = new Map(teams.map(t => [t.id, t]));
    const positionMap = new Map(elementTypes.map(et => [et.id, et]));
    
    const dbInsertData = [];
    let processedCount = 0;
    
    for (const player of players) {
      try {
        const playerResponse = await fetch(`${FPL_BASE_URL}/element-summary/${player.id}/`);
        if (playerResponse.ok) {
          const playerData = await playerResponse.json();
          
          if (playerData.history_past && playerData.history_past.length > 0) {
            const seasonData = playerData.history_past.find(h => h.season_name === season);
            
            if (seasonData) {
              const team = teamMap.get(player.team);
              const position = positionMap.get(player.element_type);
              
              dbInsertData.push({
                id: `${player.id}_${season}`,
                playerId: player.id,
                season: season,
                firstName: player.first_name,
                secondName: player.second_name,
                webName: player.web_name,
                teamName: team?.name || 'Unknown',
                teamShortName: team?.short_name || 'UNK', 
                positionName: position?.singular_name || 'Unknown',
                seasonName: seasonData.season_name,
                elementCode: seasonData.element_code,
                startCost: seasonData.start_cost,
                endCost: seasonData.end_cost,
                totalPoints: seasonData.total_points,
                minutes: seasonData.minutes,
                goalsScored: seasonData.goals_scored,
                assists: seasonData.assists,
                cleanSheets: seasonData.clean_sheets,
                goalsConceded: seasonData.goals_conceded,
                ownGoals: seasonData.own_goals,
                penaltiesSaved: seasonData.penalties_saved,
                penaltiesMissed: seasonData.penalties_missed,
                yellowCards: seasonData.yellow_cards,
                redCards: seasonData.red_cards,
                saves: seasonData.saves,
                bonus: seasonData.bonus,
                bps: seasonData.bps,
                influence: seasonData.influence?.toString() || '0',
                creativity: seasonData.creativity?.toString() || '0',
                threat: seasonData.threat?.toString() || '0',
                ictIndex: seasonData.ict_index?.toString() || '0',
              });
            }
          }
        }
        
        processedCount++;
        if (processedCount % 100 === 0) {
          console.log(`  Processed ${processedCount}/${players.length} players...`);
        }
        
        // Small delay to be respectful to FPL API
        await delay(30);
        
      } catch (playerError) {
        console.warn(`Failed to fetch data for player ${player.id}:`, playerError.message);
      }
    }
    
    // Insert data into database
    if (dbInsertData.length > 0) {
      console.log(`💾 Storing ${dbInsertData.length} players in database for ${season}...`);
      
      // Insert in batches to avoid query size limits
      const batchSize = 50;
      for (let i = 0; i < dbInsertData.length; i += batchSize) {
        const batch = dbInsertData.slice(i, i + batchSize);
        
        // Create insert statement for batch
        const values = batch.map(player => 
          `('${player.id}', ${player.playerId}, '${player.season}', '${player.firstName}', '${player.secondName}', '${player.webName}', '${player.teamName}', '${player.teamShortName}', '${player.positionName}', '${player.seasonName}', ${player.elementCode}, ${player.startCost}, ${player.endCost}, ${player.totalPoints}, ${player.minutes}, ${player.goalsScored}, ${player.assists}, ${player.cleanSheets}, ${player.goalsConceded}, ${player.ownGoals}, ${player.penaltiesSaved}, ${player.penaltiesMissed}, ${player.yellowCards}, ${player.redCards}, ${player.saves}, ${player.bonus}, ${player.bps}, '${player.influence}', '${player.creativity}', '${player.threat}', '${player.ictIndex}', NOW(), NOW())`
        ).join(', ');
        
        await db.execute(sql.raw(`
          INSERT INTO historical_players (
            id, player_id, season, first_name, second_name, web_name, team_name, 
            team_short_name, position_name, season_name, element_code, start_cost, 
            end_cost, total_points, minutes, goals_scored, assists, clean_sheets, 
            goals_conceded, own_goals, penalties_saved, penalties_missed, yellow_cards, 
            red_cards, saves, bonus, bps, influence, creativity, threat, ict_index, 
            created_at, updated_at
          ) VALUES ${values}
          ON CONFLICT (id) DO NOTHING
        `));
        
        console.log(`  Inserted batch ${Math.ceil((i + 1) / batchSize)}/${Math.ceil(dbInsertData.length / batchSize)}`);
      }
      
      console.log(`✅ Successfully stored ${dbInsertData.length} players for ${season}`);
    } else {
      console.log(`❌ No players found with ${season} data`);
    }
    
  } catch (error) {
    console.error(`Error fetching ${season} data:`, error);
  }
}

async function populateAllSeasons() {
  console.log("🚀 Starting historical data population for all seasons...\n");
  console.log(`Seasons to process: ${SEASONS.join(", ")}`);
  
  const startTime = Date.now();
  
  for (const season of SEASONS) {
    await fetchSeasonData(season);
    // Longer delay between seasons to be extra respectful
    await delay(1000);
  }
  
  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000 / 60);
  
  console.log(`\n🎉 Historical data population completed in ${duration} minutes!`);
  console.log("All future requests will now load instantly from the database.");
  
  await pool.end();
}

// Run the population script
populateAllSeasons().catch(error => {
  console.error("Population script failed:", error);
  process.exit(1);
});