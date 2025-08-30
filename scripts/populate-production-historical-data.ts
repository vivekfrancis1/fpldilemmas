#!/usr/bin/env tsx

/**
 * Production Historical Data Population Script
 * 
 * This script populates the production database with comprehensive historical player data
 * from the FPL API across all seasons (2016/17 - 2024/25).
 * 
 * Usage: npm run populate-historical-data
 */

import { db } from '../server/db';
import { historicalPlayerStats } from '../shared/schema';

// Import the population functions from routes
async function populateProductionHistoricalData() {
  console.log('🚀 Starting production historical data population...');
  
  const seasons = [
    '2024/25', '2023/24', '2022/23', '2021/22', '2020/21',
    '2019/20', '2018/19', '2017/18', '2016/17'
  ];
  
  for (const season of seasons) {
    console.log(`\n📊 Populating ${season}...`);
    
    try {
      // Call the comprehensive population logic
      const response = await fetch(`${process.env.PRODUCTION_URL || 'https://your-app.replit.app'}/api/historical-player-stats/populate-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ season })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ ${season}: ${result.recordsInserted} records inserted`);
      } else {
        console.error(`❌ ${season}: Failed to populate`);
      }
      
      // Add delay between seasons to respect API limits
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error populating ${season}:`, error);
    }
  }
  
  console.log('\n🎉 Production historical data population completed!');
}

// Run if called directly
if (require.main === module) {
  populateProductionHistoricalData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Population failed:', error);
      process.exit(1);
    });
}

export { populateProductionHistoricalData };