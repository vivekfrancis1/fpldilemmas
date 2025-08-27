#!/usr/bin/env tsx

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import { fplContentCreators } from '../shared/schema';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema: { fplContentCreators } });

async function updatePlayerNames() {
  try {
    console.log("🔄 Fetching all content creators...");
    
    const creators = await db.select().from(fplContentCreators);
    console.log(`📊 Found ${creators.length} creators to update`);
    
    let updatedCount = 0;
    
    for (const creator of creators) {
      try {
        console.log(`\n📥 Fetching data for ${creator.name} (Manager ID: ${creator.managerId})...`);
        
        // Fetch manager data from FPL API
        const response = await fetch(`https://fantasy.premierleague.com/api/entry/${creator.managerId}/`);
        
        if (!response.ok) {
          console.log(`❌ Failed to fetch data for ${creator.name}`);
          continue;
        }
        
        const managerData = await response.json();
        
        // Extract player name
        const playerName = `${managerData.player_first_name} ${managerData.player_last_name}`.trim();
        const teamName = managerData.name;
        
        console.log(`📝 Updating ${creator.name}:`);
        console.log(`   Player Name: ${playerName}`);
        console.log(`   Team Name: ${teamName}`);
        
        // Update database
        await db
          .update(fplContentCreators)
          .set({ 
            playerName: playerName,
            managerName: teamName // Also update team name in case it changed
          })
          .where(eq(fplContentCreators.id, creator.id));
        
        updatedCount++;
        console.log(`✅ Updated ${creator.name}`);
        
        // Small delay to be respectful to FPL API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Error updating ${creator.name}:`, error);
      }
    }
    
    console.log(`\n🎉 Update complete! Updated ${updatedCount} out of ${creators.length} creators`);
    
  } catch (error) {
    console.error("❌ Script failed:", error);
  } finally {
    await pool.end();
  }
}

// Run the script
updatePlayerNames();