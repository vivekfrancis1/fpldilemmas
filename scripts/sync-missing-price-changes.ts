#!/usr/bin/env tsx
import { DatabaseStorage } from '../server/storage';

// Initialize storage
const storage = new DatabaseStorage();

async function syncMissingPriceChanges() {
  try {
    console.log("🔄 Syncing missing price changes from FPL API...");
    
    // Fetch current FPL data
    const response = await fetch("https://fantasy.premierleague.com/api/bootstrap-static/");
    if (!response.ok) {
      throw new Error(`FPL API responded with status: ${response.status}`);
    }
    
    const bootstrapData = await response.json();
    const players = bootstrapData.elements;
    const teams = bootstrapData.teams;
    const positions = bootstrapData.element_types;
    
    // Get players who have season changes
    const playersWithChanges = players.filter((p: any) => p.cost_change_start !== 0);
    console.log(`📊 FPL API shows ${playersWithChanges.length} players with season price changes`);
    
    // Get existing player IDs from our database
    const existingChanges = await storage.getPriceChanges(1000);
    const existingPlayerIds = new Set(existingChanges.map(c => c.playerId));
    console.log(`📊 Database has ${existingPlayerIds.size} players with price changes`);
    
    // Find missing players
    const missingPlayers = playersWithChanges.filter((p: any) => !existingPlayerIds.has(p.id));
    console.log(`📊 Found ${missingPlayers.length} missing players to add`);
    
    if (missingPlayers.length === 0) {
      console.log("✅ No missing players found. Database is already in sync with FPL API.");
      return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    let addedCount = 0;
    
    // Add missing players
    for (const player of missingPlayers) {
      const team = teams.find((t: any) => t.id === player.team);
      const position = positions.find((p: any) => p.id === player.element_type);
      
      const originalPrice = player.now_cost - player.cost_change_start;
      
      const priceChange = {
        playerId: player.id,
        playerName: player.web_name,
        teamId: team?.id || null,
        teamName: team?.short_name || null,
        position: position?.singular_name_short || null,
        oldPrice: originalPrice,
        newPrice: player.now_cost,
        priceChange: player.cost_change_start,
        changeDate: today,
        ownership: (player.selected_by_percent || 0).toString(),
        transfersIn: player.transfers_in || 0,
        transfersOut: player.transfers_out || 0,
        transfersInGw: player.transfers_in_event || 0,
        transfersOutGw: player.transfers_out_event || 0,
        totalSeasonChange: player.cost_change_start
      };
      
      await storage.addPriceChange(priceChange);
      addedCount++;
      
      const changeType = player.cost_change_start > 0 ? "RISE" : "FALL";
      console.log(`➕ Added ${changeType}: ${player.web_name} (${team?.short_name}) ${originalPrice/10}m → ${player.now_cost/10}m = ${player.cost_change_start > 0 ? '+' : ''}${(player.cost_change_start/10).toFixed(1)}m`);
    }
    
    console.log(`✅ Successfully added ${addedCount} missing price changes`);
    console.log(`📊 Total database records: ${existingPlayerIds.size + addedCount}`);
    console.log(`📊 Total FPL API records: ${playersWithChanges.length}`);
    
    // Verify the sync
    const finalChanges = await storage.getPriceChanges(1000);
    console.log(`🔍 Verification: Database now contains ${finalChanges.length} price change records`);
    
  } catch (error) {
    console.error("❌ Error syncing missing price changes:", error);
  }
}

// Run the sync
syncMissingPriceChanges().then(() => {
  console.log("🏁 Sync process completed");
  process.exit(0);
}).catch((error) => {
  console.error("💥 Fatal error:", error);
  process.exit(1);
});