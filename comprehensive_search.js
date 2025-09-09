#!/usr/bin/env node

const API_BASE = 'http://localhost:5000/api';

async function comprehensiveSearch() {
  console.log('🔍 Comprehensive search for "fplgameweek" and variations...\n');
  
  // Search variations
  const searchTerms = [
    'fplgameweek',
    'fpl gameweek',
    'gameweek',
    'fpl-gameweek',
    'fplgw',
    'fpl gw'
  ];
  
  try {
    // First, let's try some specific FPL community leagues
    const communityLeagues = [
      { id: 633, name: 'Top 10k Mini League' },
      { id: 1701, name: 'FPL Generals' },
      { id: 39972, name: 'FPL Content Creators' },
      { id: 2541, name: 'Elite 64' },
      { id: 32885, name: '#Elite64' },
      { id: 387095, name: 'Elite FPL' },
      { id: 100312, name: 'League of Champions' },
      { id: 760, name: 'FPL Community' }
    ];
    
    console.log('📋 Searching FPL community leagues...\n');
    
    for (const league of communityLeagues) {
      console.log(`🔍 Searching ${league.name} (${league.id})...`);
      
      try {
        // Search first 10 pages of each league
        for (let page = 1; page <= 10; page++) {
          const response = await fetch(`${API_BASE}/leagues-classic/${league.id}/standings?page=${page}`);
          
          if (!response.ok) {
            if (response.status === 404) {
              console.log(`   ⚠️  League ${league.name} not found`);
            }
            break;
          }
          
          const standings = await response.json();
          const results = standings.standings?.results || [];
          
          for (const entry of results) {
            const managerName = (entry.player_name || '').toLowerCase();
            const teamName = (entry.entry_name || '').toLowerCase();
            
            // Check against all search terms
            for (const term of searchTerms) {
              if (managerName.includes(term) || teamName.includes(term)) {
                console.log('\n🎉 POTENTIAL MATCH FOUND!');
                console.log(`   Manager Name: ${entry.player_name}`);
                console.log(`   Team Name: ${entry.entry_name}`);
                console.log(`   Manager ID: ${entry.entry}`);
                console.log(`   Found in: ${league.name}`);
                console.log(`   Current Rank: ${entry.rank}`);
                console.log(`   Total Points: ${entry.total}`);
                console.log(`   Matched term: "${term}"\n`);
                
                // If exact match, return immediately
                if (managerName.includes('fplgameweek') || teamName.includes('fplgameweek')) {
                  console.log('✅ EXACT MATCH for "fplgameweek"!');
                  return entry.entry;
                }
              }
            }
          }
          
          if (!standings.standings?.has_next) break;
          
          // Show progress for large leagues
          if (page % 5 === 0) {
            console.log(`      📄 Searched ${page} pages...`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 150));
        }
        
      } catch (error) {
        console.log(`   ❌ Error searching ${league.name}: ${error.message}`);
      }
    }
    
    // Now search through some high-profile content creators' primary leagues
    console.log('\n📋 Searching high-profile content creator leagues...\n');
    
    const priorityCreators = [
      'Ben Crellin',
      'FPL Harry', 
      'FPL Focal',
      'Az Phillips',
      'FPL Mate'
    ];
    
    const creatorsResponse = await fetch(`${API_BASE}/content-creators`);
    const creators = await creatorsResponse.json();
    
    for (const creatorName of priorityCreators) {
      const creator = creators.find(c => c.name.includes(creatorName));
      if (!creator) continue;
      
      console.log(`🎯 Deep search: ${creator.name}`);
      
      try {
        const leaguesResponse = await fetch(`${API_BASE}/manager/${creator.managerId}/leagues`);
        const leagues = await leaguesResponse.json();
        const classicLeagues = (leagues.classic || []).slice(0, 5); // Top 5 leagues
        
        for (const league of classicLeagues) {
          console.log(`      🔍 Searching league: ${league.name}`);
          
          // Search first 20 pages of each league
          for (let page = 1; page <= 20; page++) {
            const standingsResponse = await fetch(`${API_BASE}/leagues-classic/${league.id}/standings?page=${page}`);
            
            if (!standingsResponse.ok) break;
            
            const standings = await standingsResponse.json();
            const results = standings.standings?.results || [];
            
            for (const entry of results) {
              const managerName = (entry.player_name || '').toLowerCase();
              const teamName = (entry.entry_name || '').toLowerCase();
              
              for (const term of searchTerms) {
                if (managerName.includes(term) || teamName.includes(term)) {
                  console.log('\n🎉 POTENTIAL MATCH FOUND!');
                  console.log(`   Manager Name: ${entry.player_name}`);
                  console.log(`   Team Name: ${entry.entry_name}`);
                  console.log(`   Manager ID: ${entry.entry}`);
                  console.log(`   Found in: ${creator.name}'s league "${league.name}"`);
                  console.log(`   Matched term: "${term}"\n`);
                  
                  if (managerName.includes('fplgameweek') || teamName.includes('fplgameweek')) {
                    console.log('✅ EXACT MATCH for "fplgameweek"!');
                    return entry.entry;
                  }
                }
              }
            }
            
            if (!standings.standings?.has_next) break;
            
            if (page % 10 === 0) {
              console.log(`         📄 Searched ${page} pages...`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 150));
          }
        }
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
    
    console.log('\n❌ "fplgameweek" not found in comprehensive search');
    console.log('💡 Suggestions:');
    console.log('   - The manager might use a different spelling');
    console.log('   - They might be in a private league not checked');
    console.log('   - The account might be inactive or renamed');
    console.log('   - Try searching for "gameweek" or "fplgw" variations');
    
    return null;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

comprehensiveSearch()
  .then(managerId => {
    if (managerId) {
      console.log(`\n🎯 FINAL RESULT: Manager ID for fplgameweek is ${managerId}`);
    } else {
      console.log('\n❌ Search completed - no exact match found');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });