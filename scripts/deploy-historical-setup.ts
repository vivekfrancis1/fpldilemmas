#!/usr/bin/env tsx

/**
 * Deployment Historical Data Setup Script
 * 
 * Complete solution for setting up historical data during deployment.
 * This script handles both export from development and import to production.
 * 
 * Usage: 
 *   Development: tsx scripts/deploy-historical-setup.ts export
 *   Production:  tsx scripts/deploy-historical-setup.ts import
 */

import { exportHistoricalData } from './export-historical-data';
import { importHistoricalData } from './import-historical-data';

async function deploymentSetup() {
  const mode = process.argv[2]; // 'export' or 'import'
  
  if (!mode || !['export', 'import'].includes(mode)) {
    console.log('Usage: tsx scripts/deploy-historical-setup.ts [export|import]');
    console.log('');
    console.log('Commands:');
    console.log('  export  - Export current historical data to JSON (run in development)');
    console.log('  import  - Import historical data from JSON (run in production)');
    process.exit(1);
  }
  
  try {
    if (mode === 'export') {
      console.log('🔄 Running development export...');
      const result = await exportHistoricalData();
      console.log(`\n📦 Export complete: ${result.recordCount} records across ${result.seasons} seasons`);
      console.log('📋 Next steps:');
      console.log('   1. Deploy your application to production');
      console.log('   2. Copy the export file to production environment');
      console.log('   3. Run: tsx scripts/deploy-historical-setup.ts import');
      
    } else if (mode === 'import') {
      console.log('🔄 Running production import...');
      const result = await importHistoricalData();
      console.log(`\n🎉 Import complete: ${result.imported} new records imported`);
      console.log(`📊 Total database records: ${result.total}`);
      console.log(`🗓️  Seasons available: ${result.seasons.join(', ')}`);
      console.log('\n✅ Production database is now ready with comprehensive historical data!');
    }
    
  } catch (error) {
    console.error(`❌ ${mode} failed:`, error);
    process.exit(1);
  }
}

// Run the deployment setup
deploymentSetup();