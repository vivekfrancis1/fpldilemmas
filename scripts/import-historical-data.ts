#!/usr/bin/env tsx

/**
 * Historical Data Import Script
 * 
 * Imports comprehensive historical player data from JSON export files.
 * This script populates the production database with pre-exported data.
 * 
 * Usage: tsx scripts/import-historical-data.ts [filename]
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

async function importHistoricalData(filename?: string) {
  console.log('📥 Starting historical data import...');
  
  try {
    // Determine import file
    const exportsDir = path.join(process.cwd(), 'exports');
    const importFile = filename 
      ? path.join(exportsDir, filename)
      : path.join(exportsDir, 'historical-player-stats-latest.json');
    
    console.log(`📁 Reading data from ${importFile}...`);
    
    // Check if file exists
    try {
      await fs.access(importFile);
    } catch {
      throw new Error(`Import file not found: ${importFile}`);
    }
    
    // Read and parse the export file
    const fileContent = await fs.readFile(importFile, 'utf8');
    const exportData: HistoricalDataExport = JSON.parse(fileContent);
    
    console.log(`📊 Found ${exportData.metadata.totalRecords} records from ${exportData.metadata.exportDate}`);
    console.log(`🗓️  Seasons: ${exportData.metadata.seasons.join(', ')}`);
    
    // Check current database state
    const existingRecords = await db.select().from(historicalPlayerStats);
    console.log(`🔍 Current database has ${existingRecords.length} records`);
    
    if (existingRecords.length > 0) {
      console.log('⚠️  Database already contains historical data');
      console.log('   This import will add new records and skip duplicates');
    }
    
    // Import data in batches
    const batchSize = 100;
    let importedCount = 0;
    let skippedCount = 0;
    
    console.log(`🔄 Importing data in batches of ${batchSize}...`);
    
    for (let i = 0; i < exportData.data.length; i += batchSize) {
      const batch = exportData.data.slice(i, i + batchSize);
      
      try {
        // Use onConflictDoNothing to skip duplicates
        const result = await db
          .insert(historicalPlayerStats)
          .values(batch)
          .onConflictDoNothing();
        
        const batchImported = batch.length;
        importedCount += batchImported;
        
        const progress = Math.round(((i + batch.length) / exportData.data.length) * 100);
        console.log(`   Batch ${Math.floor(i/batchSize) + 1}: ${batchImported} records (${progress}% complete)`);
        
      } catch (error) {
        console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} failed:`, error);
        skippedCount += batch.length;
      }
    }
    
    // Final verification
    const finalRecords = await db.select().from(historicalPlayerStats);
    const newRecords = finalRecords.length - existingRecords.length;
    
    console.log('\n📈 Import Summary:');
    console.log('==================');
    console.log(`Records in export: ${exportData.metadata.totalRecords}`);
    console.log(`Records imported: ${newRecords}`);
    console.log(`Total records now: ${finalRecords.length}`);
    console.log(`Seasons covered: ${exportData.metadata.seasons.length}`);
    
    // Verify by season
    const seasonCounts = await db
      .select()
      .from(historicalPlayerStats);
    
    const seasonSummary = exportData.metadata.seasons.map(season => {
      const count = seasonCounts.filter(record => record.season === season).length;
      return { season, count };
    });
    
    console.log('\nSeason Verification:');
    seasonSummary.forEach(summary => {
      console.log(`  ${summary.season}: ${summary.count} players`);
    });
    
    console.log('\n✅ Historical data import completed successfully!');
    
    return {
      imported: newRecords,
      total: finalRecords.length,
      seasons: exportData.metadata.seasons
    };
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const filename = process.argv[2]; // Optional filename argument
  
  importHistoricalData(filename)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Import failed:', error);
      process.exit(1);
    });
}

export { importHistoricalData };