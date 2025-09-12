// Test script to manually trigger goals cache generation and check position capping
const path = require('path');

async function testPositionCapping() {
  console.log('🧪 Testing position-based capping integration...');
  
  try {
    // Import the projection cache worker
    const workerPath = path.join(__dirname, 'server', 'projection-cache-worker.ts');
    const { ProjectionCacheWorker } = await import('./server/projection-cache-worker.js');
    
    const worker = new ProjectionCacheWorker();
    
    console.log('🔄 Triggering goals projection cache regeneration...');
    await worker.cacheGoalsProjections();
    
    console.log('✅ Goals projection cache regeneration completed!');
    console.log('🔍 Check the logs above to see if Bruno Fernandes was capped properly');
    
  } catch (error) {
    console.error('❌ Error testing position capping:', error);
    
    // Try alternative approach - direct import of the worker function
    try {
      console.log('🔄 Trying alternative import approach...');
      const { projectionCacheWorker } = await import('./server/projection-cache-worker.js');
      
      console.log('🔄 Triggering goals cache regeneration (alternative method)...');
      await projectionCacheWorker.cacheGoalsProjections();
      
      console.log('✅ Alternative cache regeneration completed!');
      
    } catch (altError) {
      console.error('❌ Alternative approach failed:', altError);
      
      // Final attempt - check if the class is exported differently
      console.log('📊 Available exports from projection-cache-worker:');
      const workerModule = await import('./server/projection-cache-worker.js');
      console.log('Available exports:', Object.keys(workerModule));
    }
  }
}

testPositionCapping().catch(console.error);