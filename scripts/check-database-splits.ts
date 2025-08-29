#!/usr/bin/env tsx
import { DatabaseStorage } from '../server/storage';

async function checkDatabaseSplits() {
  try {
    const storage = new DatabaseStorage();
    
    console.log('🔍 Checking database for price change splits...');
    
    // Get all price changes
    const allChanges = await storage.getPriceChanges(1000);
    
    // Categorize by price change amount
    const pointOneChanges = allChanges.filter(c => Math.abs(c.priceChange) === 1);
    const pointTwoChanges = allChanges.filter(c => Math.abs(c.priceChange) === 2);
    const otherChanges = allChanges.filter(c => Math.abs(c.priceChange) !== 1 && Math.abs(c.priceChange) !== 2);
    
    console.log('📊 Database Analysis:');
    console.log(`   Total price changes: ${allChanges.length}`);
    console.log(`   0.1 changes (±1): ${pointOneChanges.length}`);
    console.log(`   0.2 changes (±2): ${pointTwoChanges.length}`);
    console.log(`   Other amounts: ${otherChanges.length}`);
    
    if (pointTwoChanges.length > 0) {
      console.log('\n🔄 Found 0.2 changes that need splitting:');
      pointTwoChanges.forEach(change => {
        const direction = change.priceChange > 0 ? 'RISE' : 'FALL';
        console.log(`   ${change.playerName}: ${change.oldPrice} → ${change.newPrice} (${direction} ${change.priceChange})`);
      });
    } else {
      console.log('\n✅ All price changes are properly split into 0.1 increments');
    }
    
    if (otherChanges.length > 0) {
      console.log('\n📋 Other price change amounts found:');
      otherChanges.forEach(change => {
        console.log(`   ${change.playerName}: ${change.oldPrice} → ${change.newPrice} (change: ${change.priceChange})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  }
}

checkDatabaseSplits().then(() => {
  console.log('\n🏁 Database check completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Database check failed:', error);
  process.exit(1);
});