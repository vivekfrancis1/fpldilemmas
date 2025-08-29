#!/usr/bin/env tsx
import { DatabaseStorage } from '../server/storage';

// Initialize storage
const storage = new DatabaseStorage();

async function splitExistingPriceChanges() {
  try {
    console.log("🔄 Splitting existing 0.2 price changes into two 0.1 changes...");
    
    // Clear existing price changes data
    console.log("🗑️ Clearing existing price changes data...");
    await storage.clearPriceChanges();
    
    // Re-sync from FPL API with new splitting logic
    console.log("🔄 Re-syncing price changes from FPL API with split logic...");
    
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
    
    // Prepare player data for price change detection
    const currentPlayerPrices: Array<{
      playerId: number;
      price: number;
      playerName: string;
      teamId?: number;
      teamName?: string;
      position?: string;
      ownership: number;
      transfersIn: number;
      transfersOut: number;
      transfersInGw: number;
      transfersOutGw: number;
      totalSeasonChange: number;
    }> = [];
    
    for (const player of playersWithChanges) {
      const team = teams.find((t: any) => t.id === player.team);
      const position = positions.find((p: any) => p.id === player.element_type);
      
      currentPlayerPrices.push({
        playerId: player.id,
        price: player.now_cost,
        playerName: player.web_name,
        teamId: team?.id,
        teamName: team?.short_name,
        position: position?.singular_name_short,
        ownership: parseFloat(player.selected_by_percent || "0"),
        transfersIn: player.transfers_in || 0,
        transfersOut: player.transfers_out || 0,
        transfersInGw: player.transfers_in_event || 0,
        transfersOutGw: player.transfers_out_event || 0,
        totalSeasonChange: player.cost_change_start || 0
      });
    }
    
    // Use the new detectPriceChanges logic which will split 0.2 changes
    const priceChanges = await storage.detectPriceChanges(currentPlayerPrices);
    
    console.log(`💰 Detected ${priceChanges.length} price changes (including split changes)`);
    
    // Add all price changes to database
    for (const change of priceChanges) {
      await storage.addPriceChange(change);
    }
    
    console.log(`✅ Successfully processed all price changes with 0.2 splits`);
    
    // Verify the results
    const allChanges = await storage.getPriceChanges(1000);
    const splitChanges = allChanges.filter(c => Math.abs(c.priceChange) === 1);
    const originalTwoPointChanges = allChanges.filter(c => Math.abs(c.priceChange) === 2);
    
    console.log(`📊 Final results:`);
    console.log(`   - Total price changes: ${allChanges.length}`);
    console.log(`   - 0.1 changes: ${splitChanges.length}`);
    console.log(`   - 0.2 changes remaining: ${originalTwoPointChanges.length}`);
    
  } catch (error) {
    console.error("❌ Error splitting price changes:", error);
  }
}

// Run the split process
splitExistingPriceChanges().then(() => {
  console.log("🏁 Split process completed");
  process.exit(0);
}).catch((error) => {
  console.error("💥 Split process failed:", error);
  process.exit(1);
});