#!/usr/bin/env tsx

/**
 * Historical Data Export Script
 * 
 * Exports comprehensive historical player data to JSON format for deployment.
 * This script fetches all historical data and creates a portable backup
 * that can be imported into production databases.
 * 
 * Usage: tsx scripts/export-historical-data.ts
 */

import { db } from '../server/db';
import { historicalPlayerStats } from '../shared/schema';
import fs from 'fs/promises';
import path from 'path';

interface HistoricalDataExport {
  metadata: {
    exportDate: string;
    totalRecords: number;
    seasons: string[];
    description: string;
  };
  data: any[];
}

async function exportHistoricalData() {
  console.log('🔍 Starting historical data export...');
  
  try {
    // Fetch all historical data
    console.log('📊 Fetching all historical records...');
    const allData = await db.select().from(historicalPlayerStats);
    
    console.log(`✅ Found ${allData.length} historical records`);
    
    // Get unique seasons for metadata
    const seasons = [...new Set(allData.map(record => record.season))].sort();
    
    // Create export object
    const exportData: HistoricalDataExport = {
      metadata: {
        exportDate: new Date().toISOString(),
        totalRecords: allData.length,
        seasons: seasons,
        description: 'Comprehensive FPL historical player statistics across all seasons'
      },
      data: allData
    };
    
    // Create exports directory if it doesn't exist
    const exportsDir = path.join(process.cwd(), 'exports');
    try {
      await fs.access(exportsDir);
    } catch {
      await fs.mkdir(exportsDir, { recursive: true });
    }
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `historical-player-stats-${timestamp}.json`;
    const filepath = path.join(exportsDir, filename);
    
    // Write to file
    console.log(`💾 Writing data to ${filepath}...`);
    await fs.writeFile(filepath, JSON.stringify(exportData, null, 2), 'utf8');
    
    // Create a "latest" copy for easy access
    const latestFilepath = path.join(exportsDir, 'historical-player-stats-latest.json');
    await fs.writeFile(latestFilepath, JSON.stringify(exportData, null, 2), 'utf8');
    
    // Generate summary
    const seasonSummary = seasons.map(season => {
      const seasonData = allData.filter(record => record.season === season);
      const highPerformers = seasonData.filter(record => record.totalPoints > 100).length;
      const topScore = Math.max(...seasonData.map(record => record.totalPoints));
      
      return {
        season,
        players: seasonData.length,
        highPerformers,
        topScore
      };
    });
    
    console.log('\n📈 Export Summary:');
    console.log('==================');
    console.log(`Total Records: ${allData.length}`);
    console.log(`Seasons Covered: ${seasons.length}`);
    console.log(`Export File: ${filename}`);
    console.log('\nSeason Breakdown:');
    seasonSummary.forEach(summary => {
      console.log(`  ${summary.season}: ${summary.players} players, ${summary.highPerformers} high performers, top score: ${summary.topScore}`);
    });
    
    console.log(`\n✅ Historical data exported successfully to ${filepath}`);
    console.log(`📁 Latest copy available at ${latestFilepath}`);
    
    return {
      filepath,
      latestFilepath,
      recordCount: allData.length,
      seasons: seasons.length
    };
    
  } catch (error) {
    console.error('❌ Export failed:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  exportHistoricalData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Export failed:', error);
      process.exit(1);
    });
}

export { exportHistoricalData };