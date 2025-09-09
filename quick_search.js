#!/usr/bin/env node

const API_BASE = 'http://localhost:5000/api';

async function quickSearchFPLGameweek() {
  console.log('🔍 Quick search for "fplgameweek"...\n');
  
  try {
    // Let's try a different approach - search some smaller, well-known leagues first
    const wellKnownLeagues = [
      { id: 314, name: 'Overall' },  // Overall league
      { id: 633, name: 'Top 10k' }, // Common leagues
      { id: 39972, name: 'FPL Content Creators' },
      { id: 2541, name: 'Elite' },
      { id: 1701, name: 'FPL Generals' }
    ];
    
    console.log('📋 Searching well-known FPL leagues...\n');
    
    for (const league of wellKnownLeagues) {
      console.log(`🔍 Searching ${league.name} (${league.id})...`);
      
      try {
        // Search first few pages only
        for (let page = 1; page <= 5; page++) {
          const response = await fetch(`${API_BASE}/leagues-classic/${league.id}/standings?page=${page}`);
          
          if (!response.ok) {
            console.log(`   ⚠️  Could not access league ${league.name}`);
            break;
          }
          
          const standings = await response.json();
          const results = standings.standings?.results || [];
          
          for (const entry of results) {
            const managerName = (entry.player_name || '').toLowerCase();
            const teamName = (entry.entry_name || '').toLowerCase();
            
            if (managerName.includes('fplgameweek') || teamName.includes('fplgameweek')) {
              console.log('\n🎉 FOUND MATCH!');
              console.log(`   Manager Name: ${entry.player_name}`);
              console.log(`   Team Name: ${entry.entry_name}`);
              console.log(`   Manager ID: ${entry.entry}`);
              console.log(`   Found in: ${league.name}`);
              console.log(`   Current Rank: ${entry.rank}`);
              console.log(`   Total Points: ${entry.total}\n`);
              return entry.entry;
            }
          }
          
          if (!standings.standings?.has_next) break;
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
      } catch (error) {
        console.log(`   ❌ Error searching ${league.name}: ${error.message}`);
      }
    }
    
    // Now let's check content creators more efficiently - only first page of each league
    console.log('\n📋 Quick search through content creator leagues (first page only)...\n');
    
    const creatorsResponse = await fetch(`${API_BASE}/content-creators`);
    const creators = await creatorsResponse.json();
    
    for (const creator of creators.slice(0, 10)) { // Check first 10 creators only
      console.log(`🎯 Quick check: ${creator.name}`);
      
      try {
        const leaguesResponse = await fetch(`${API_BASE}/manager/${creator.managerId}/leagues`);
        const leagues = await leaguesResponse.json();
        const classicLeagues = (leagues.classic || []).slice(0, 3); // First 3 leagues only
        
        for (const league of classicLeagues) {
          const standingsResponse = await fetch(`${API_BASE}/leagues-classic/${league.id}/standings?page=1`);
          
          if (standingsResponse.ok) {
            const standings = await standingsResponse.json();
            const results = standings.standings?.results || [];
            
            for (const entry of results) {
              const managerName = (entry.player_name || '').toLowerCase();
              const teamName = (entry.entry_name || '').toLowerCase();
              
              if (managerName.includes('fplgameweek') || teamName.includes('fplgameweek')) {
                console.log('\n🎉 FOUND MATCH!');
                console.log(`   Manager Name: ${entry.player_name}`);
                console.log(`   Team Name: ${entry.entry_name}`);
                console.log(`   Manager ID: ${entry.entry}`);
                console.log(`   Found in: ${creator.name}'s league "${league.name}"`);
                return entry.entry;
              }
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
    
    console.log('\n❌ "fplgameweek" not found in quick search');
    console.log('💡 Try running the full search script if needed, or check if the name is spelled differently');
    return null;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

quickSearchFPLGameweek()
  .then(managerId => {
    if (managerId) {
      console.log(`✅ Manager ID for fplgameweek: ${managerId}`);
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });