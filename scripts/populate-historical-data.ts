import { storage } from "../server/storage";

const FPL_BASE_URL = "https://fantasy.premierleague.com/api";

// Available seasons to populate (most recent first)
const SEASONS = [
  "2024/25", "2023/24", "2022/23", "2021/22", "2020/21", 
  "2019/20", "2018/19", "2017/18", "2016/17"
];

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchSeasonData(season: string) {
  console.log(`\n🔄 Fetching ${season} season data...`);
  
  // Check if we already have this data
  const hasData = await storage.hasHistoricalData(season);
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
    const teamMap = new Map(teams.map((t: any) => [t.id, t]));
    const positionMap = new Map(elementTypes.map((et: any) => [et.id, et]));
    
    const dbInsertData = [];
    let processedCount = 0;
    
    for (const player of players) {
      try {
        const playerResponse = await fetch(`${FPL_BASE_URL}/element-summary/${player.id}/`);
        if (playerResponse.ok) {
          const playerData = await playerResponse.json();
          
          if (playerData.history_past && playerData.history_past.length > 0) {
            const seasonData = playerData.history_past.find((h: any) => h.season_name === season);
            
            if (seasonData) {
              const team = teamMap.get(player.team) as any;
              const position = positionMap.get(player.element_type) as any;
              
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
        await delay(25);
        
      } catch (playerError: any) {
        console.warn(`Failed to fetch data for player ${player.id}:`, playerError.message);
      }
    }
    
    // Store data using our storage system
    if (dbInsertData.length > 0) {
      console.log(`💾 Storing ${dbInsertData.length} players in database for ${season}...`);
      await storage.insertHistoricalPlayers(dbInsertData);
      console.log(`✅ Successfully stored ${dbInsertData.length} players for ${season}`);
    } else {
      console.log(`❌ No players found with ${season} data`);
    }
    
  } catch (error: any) {
    console.error(`Error fetching ${season} data:`, error.message);
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
}

// Run the population script
populateAllSeasons().catch(error => {
  console.error("Population script failed:", error);
  process.exit(1);
});