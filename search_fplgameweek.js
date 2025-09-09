#!/usr/bin/env node

// Using Node.js built-in fetch (Node 18+)

const API_BASE = 'http://localhost:5000/api';

async function searchForFPLGameweek() {
  console.log('🔍 Starting search for manager "fplgameweek"...\n');
  
  try {
    // Step 1: Get all content creators
    console.log('📋 Fetching all content creators...');
    const creatorsResponse = await fetch(`${API_BASE}/content-creators`);
    
    if (!creatorsResponse.ok) {
      throw new Error(`Failed to fetch content creators: ${creatorsResponse.status}`);
    }
    
    const creators = await creatorsResponse.json();
    console.log(`✅ Found ${creators.length} content creators\n`);
    
    // Step 2: For each creator, get their leagues and search
    for (let i = 0; i < creators.length; i++) {
      const creator = creators[i];
      console.log(`🎯 Checking ${creator.name} (Manager ID: ${creator.managerId}) [${i + 1}/${creators.length}]`);
      
      try {
        // Get the creator's leagues
        const leaguesResponse = await fetch(`${API_BASE}/manager/${creator.managerId}/leagues`);
        
        if (!leaguesResponse.ok) {
          console.log(`   ⚠️  Could not fetch leagues for ${creator.name}`);
          continue;
        }
        
        const leagues = await leaguesResponse.json();
        const classicLeagues = leagues.classic || [];
        
        console.log(`   📊 Found ${classicLeagues.length} classic leagues`);
        
        // Check each classic league for "fplgameweek"
        for (const league of classicLeagues) {
          try {
            console.log(`      🔍 Searching league: ${league.name} (ID: ${league.id})`);
            
            // Get league standings (all pages if needed)
            let page = 1;
            let hasMorePages = true;
            
            while (hasMorePages) {
              const standingsResponse = await fetch(`${API_BASE}/leagues-classic/${league.id}/standings?page=${page}`);
              
              if (!standingsResponse.ok) {
                console.log(`         ⚠️  Could not fetch standings for league ${league.name}`);
                break;
              }
              
              const standings = await standingsResponse.json();
              const results = standings.standings?.results || [];
              
              // Search for "fplgameweek" in this page
              for (const entry of results) {
                const managerName = (entry.player_name || '').toLowerCase();
                const teamName = (entry.entry_name || '').toLowerCase();
                
                if (managerName.includes('fplgameweek') || teamName.includes('fplgameweek')) {
                  console.log('\n🎉 FOUND MATCH!');
                  console.log(`   Manager Name: ${entry.player_name}`);
                  console.log(`   Team Name: ${entry.entry_name}`);
                  console.log(`   Manager ID: ${entry.entry}`);
                  console.log(`   Found in: ${creator.name}'s league "${league.name}"`);
                  console.log(`   League ID: ${league.id}`);
                  console.log(`   Current Rank: ${entry.rank}`);
                  console.log(`   Total Points: ${entry.total}\n`);
                  
                  return {
                    managerId: entry.entry,
                    managerName: entry.player_name,
                    teamName: entry.entry_name,
                    foundInCreator: creator.name,
                    foundInLeague: league.name,
                    leagueId: league.id,
                    rank: entry.rank,
                    totalPoints: entry.total
                  };
                }
              }
              
              // Check if there are more pages
              if (!standings.standings?.has_next) {
                hasMorePages = false;
              } else {
                page++;
                console.log(`         📄 Moving to page ${page}...`);
              }
              
              // Add small delay to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 200));
            }
            
          } catch (leagueError) {
            console.log(`      ❌ Error searching league ${league.name}: ${leagueError.message}`);
          }
        }
        
      } catch (creatorError) {
        console.log(`   ❌ Error processing ${creator.name}: ${creatorError.message}`);
      }
      
      // Add delay between creators to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n❌ Manager "fplgameweek" not found in any content creator leagues');
    return null;
    
  } catch (error) {
    console.error('❌ Error during search:', error.message);
    return null;
  }
}

// Run the search
searchForFPLGameweek()
  .then(result => {
    if (result) {
      console.log('✅ Search completed successfully!');
      console.log('Manager ID:', result.managerId);
    } else {
      console.log('❌ Search completed - no matches found');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });